package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/testredis"
)

var t0 = time.Date(2026, 11, 18, 12, 0, 0, 0, time.UTC)

type harness struct {
	q     *Queue
	rdb   *redis.Client
	clock time.Time
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	rdb := testredis.Client(t)
	h := &harness{rdb: rdb, clock: t0}
	h.q = New(rdb)
	h.q.now = func() time.Time { return h.clock }
	return h
}

func sample(id string, runAt time.Time) job.Job {
	return job.Job{
		ID: id, Kind: job.KindReminder, RunAt: runAt, To: "person@example.com", Name: "Asha",
		Event: job.Event{UID: "beach-day", Name: "Beach clean-up", StartTime: t0.Add(48 * time.Hour), Timezone: "Asia/Kolkata"},
	}
}

func (h *harness) enqueue(t *testing.T, j job.Job) bool {
	t.Helper()
	added, err := h.q.Enqueue(context.Background(), j)
	if err != nil {
		t.Fatal(err)
	}
	return added
}

func (h *harness) claim(t *testing.T, lease time.Duration) *Claimed {
	t.Helper()
	c, err := h.q.Claim(context.Background(), lease)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestEnqueueAddsAJobOnce(t *testing.T) {
	h := newHarness(t)
	if !h.enqueue(t, sample("reminder:a", t0)) {
		t.Fatal("first enqueue should add")
	}
	if h.enqueue(t, sample("reminder:a", t0)) {
		t.Fatal("the same id must not be queued twice")
	}
	if n, _ := h.rdb.ZCard(context.Background(), keyDue).Result(); n != 1 {
		t.Fatalf("%d jobs queued, want 1", n)
	}
}

func TestEnqueueRefusesABrokenJob(t *testing.T) {
	h := newHarness(t)
	bad := sample("x", t0)
	bad.To = "not an address"
	if _, err := h.q.Enqueue(context.Background(), bad); err == nil {
		t.Fatal("expected an error")
	}
}

func TestClaimOnlyHandsOutJobsThatAreDue(t *testing.T) {
	h := newHarness(t)
	if h.claim(t, time.Minute) != nil {
		t.Fatal("an empty queue handed out a job")
	}
	h.enqueue(t, sample("later", t0.Add(time.Hour)))
	if h.claim(t, time.Minute) != nil {
		t.Fatal("a job for the future was handed out")
	}
	h.clock = t0.Add(time.Hour)
	if c := h.claim(t, time.Minute); c == nil || c.ID != "later" {
		t.Fatalf("got %+v, want the job that is now due", c)
	}
}

func TestClaimGoesEarliestFirst(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("second", t0.Add(-time.Minute)))
	h.enqueue(t, sample("first", t0.Add(-time.Hour)))

	if c := h.claim(t, time.Minute); c.ID != "first" {
		t.Fatalf("got %s first", c.ID)
	}
	if c := h.claim(t, time.Minute); c.ID != "second" {
		t.Fatalf("got %s second", c.ID)
	}
}

func TestEveryJobIsClaimedExactlyOnceByManyWorkers(t *testing.T) {
	h := newHarness(t)
	const total = 80
	for i := 0; i < total; i++ {
		h.enqueue(t, sample(fmt.Sprintf("job-%02d", i), t0))
	}

	var mu sync.Mutex
	var got []string
	var wg sync.WaitGroup
	for w := 0; w < 8; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				c, err := h.q.Claim(context.Background(), time.Minute)
				if err != nil || c == nil {
					return
				}
				mu.Lock()
				got = append(got, c.ID)
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	sort.Strings(got)
	if len(got) != total {
		t.Fatalf("claimed %d jobs, want %d", len(got), total)
	}
	for i := 1; i < len(got); i++ {
		if got[i] == got[i-1] {
			t.Fatalf("job %s was handed to two workers", got[i])
		}
	}
}

func TestACancelledJobIsSkippedNotHandedOut(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("cancelled", t0.Add(-time.Hour)))
	h.enqueue(t, sample("kept", t0.Add(-time.Minute)))
	h.rdb.Del(context.Background(), jobPrefix+"cancelled") // what the API does to cancel

	c := h.claim(t, time.Minute)

	if c == nil || c.ID != "kept" {
		t.Fatalf("got %+v, want the job that was not cancelled", c)
	}
	if n, _ := h.rdb.ZCard(context.Background(), keyDue).Result(); n != 0 {
		t.Fatalf("the cancelled id was left in the queue (%d)", n)
	}
}

func TestAckRemovesTheJobAndRemembersItWasSent(t *testing.T) {
	h := newHarness(t)
	j := sample("reminder:a", t0)
	h.enqueue(t, j)
	h.claim(t, time.Minute)

	if err := h.q.Ack(context.Background(), j); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	if n, _ := h.rdb.ZCard(ctx, keyInflight).Result(); n != 0 {
		t.Error("still in flight after ack")
	}
	if n, _ := h.rdb.Exists(ctx, jobPrefix+j.ID).Result(); n != 0 {
		t.Error("the job body is still stored")
	}
	if n, _ := h.rdb.SIsMember(ctx, eventPrefix+j.Event.UID, j.ID).Result(); n {
		t.Error("still listed under its event")
	}
	if h.enqueue(t, j) {
		t.Fatal("a job that was already sent was queued again")
	}
}

func TestRetryPutsTheJobBackForLater(t *testing.T) {
	h := newHarness(t)
	j := sample("reminder:a", t0)
	h.enqueue(t, j)
	c := h.claim(t, time.Minute)
	parsed, _ := job.Parse(c.Raw)
	parsed.Attempts = 1
	parsed.LastError = "timeout"

	if err := h.q.Retry(context.Background(), parsed, t0.Add(2*time.Minute)); err != nil {
		t.Fatal(err)
	}

	if h.claim(t, time.Minute) != nil {
		t.Fatal("a retried job came back before its time")
	}
	h.clock = t0.Add(2 * time.Minute)
	again := h.claim(t, time.Minute)
	if again == nil {
		t.Fatal("the retried job never came back")
	}
	back, _ := job.Parse(again.Raw)
	if back.Attempts != 1 || back.LastError != "timeout" {
		t.Fatalf("the attempt count and error were lost: %+v", back)
	}
}

func TestRetryDoesNotResurrectACancelledJob(t *testing.T) {
	h := newHarness(t)
	j := sample("reminder:a", t0)
	h.enqueue(t, j)
	h.claim(t, time.Minute)
	h.rdb.Del(context.Background(), jobPrefix+j.ID) // cancelled while being sent

	if err := h.q.Retry(context.Background(), j, t0); err != nil {
		t.Fatal(err)
	}

	if n, _ := h.rdb.ZCard(context.Background(), keyDue).Result(); n != 0 {
		t.Fatal("a cancelled job was put back on the queue")
	}
}

func TestDeadKeepsTheJobAndTheReason(t *testing.T) {
	h := newHarness(t)
	j := sample("reminder:a", t0)
	h.enqueue(t, j)
	c := h.claim(t, time.Minute)

	if err := h.q.Dead(context.Background(), j.ID, j.Event.UID, c.Raw, "the address was refused"); err != nil {
		t.Fatal(err)
	}

	dead, _ := h.q.DeadLetters(context.Background(), 10)
	if len(dead) != 1 || dead[0].ID != j.ID || dead[0].Reason != "the address was refused" {
		t.Fatalf("unexpected dead letters %+v", dead)
	}
	var kept job.Job
	if err := json.Unmarshal([]byte(dead[0].Job), &kept); err != nil || kept.To != j.To {
		t.Fatal("the job body was not kept for inspection")
	}
	if n, _ := h.rdb.ZCard(context.Background(), keyInflight).Result(); n != 0 {
		t.Error("a dead job is still in flight")
	}
}

func TestDeadListIsCapped(t *testing.T) {
	h := newHarness(t)
	for i := 0; i < deadMax+25; i++ {
		_ = h.q.Dead(context.Background(), fmt.Sprint(i), "", []byte("{}"), "x")
	}
	if n, _ := h.rdb.LLen(context.Background(), keyDead).Result(); n != deadMax {
		t.Fatalf("dead list holds %d, want at most %d", n, deadMax)
	}
}

func TestReaperGivesAnAbandonedJobToSomeoneElseAndCountsAnAttempt(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("reminder:a", t0))
	h.claim(t, time.Minute) // the worker takes it and then dies

	if r, _ := h.q.ReapExpired(context.Background(), 5, 0); r.Requeued != 0 {
		t.Fatal("a job with a live lease was taken away")
	}

	h.clock = t0.Add(2 * time.Minute)
	r, err := h.q.ReapExpired(context.Background(), 5, 0)
	if err != nil || r.Requeued != 1 {
		t.Fatalf("got %+v, %v", r, err)
	}
	if r2, _ := h.q.ReapExpired(context.Background(), 5, 0); r2.Requeued != 0 {
		t.Fatal("the same job was requeued twice")
	}

	again := h.claim(t, time.Minute)
	if again == nil {
		t.Fatal("the reaped job was not available")
	}
	back, _ := job.Parse(again.Raw)
	if back.Attempts != 1 {
		t.Fatalf("attempts = %d, want 1", back.Attempts)
	}
}

func TestAJobThatKeepsKillingItsWorkerEndsUpDead(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("reminder:a", t0))

	for i := 0; i < 3; i++ {
		h.claim(t, time.Minute)
		h.clock = h.clock.Add(2 * time.Minute)
		if _, err := h.q.ReapExpired(context.Background(), 3, 0); err != nil {
			t.Fatal(err)
		}
	}

	dead, _ := h.q.DeadLetters(context.Background(), 10)
	if len(dead) != 1 {
		t.Fatalf("%d dead jobs, want 1", len(dead))
	}
	if h.claim(t, time.Minute) != nil {
		t.Fatal("a dead job is still being handed out")
	}
}

func TestReaperMovesAnUnreadableJobToTheDeadList(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	h.rdb.Set(ctx, jobPrefix+"junk", "{not json", 0)
	h.rdb.ZAdd(ctx, keyInflight, redis.Z{Score: float64(ms(t0.Add(-time.Minute))), Member: "junk"})

	r, _ := h.q.ReapExpired(ctx, 5, 0)

	dead, _ := h.q.DeadLetters(ctx, 10)
	if r.Dead != 1 || len(dead) != 1 || dead[0].ID != "junk" {
		t.Fatalf("got %+v and %+v", r, dead)
	}
}

func TestReaperDropsALeaseWhoseJobWasCancelled(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("reminder:a", t0))
	h.claim(t, time.Minute)
	h.rdb.Del(context.Background(), jobPrefix+"reminder:a")
	h.clock = t0.Add(2 * time.Minute)

	h.q.ReapExpired(context.Background(), 5, 0)

	if n, _ := h.rdb.ZCard(context.Background(), keyInflight).Result(); n != 0 {
		t.Fatal("a cancelled job is still leased")
	}
}

func TestStatsShowTheSizeAndHowLateTheQueueIs(t *testing.T) {
	h := newHarness(t)
	h.enqueue(t, sample("overdue", t0.Add(-90*time.Second)))
	h.enqueue(t, sample("future", t0.Add(time.Hour)))
	h.claim(t, time.Minute)
	h.enqueue(t, sample("overdue-2", t0.Add(-30*time.Second)))

	s, err := h.q.Stats(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if s.Due != 2 || s.Inflight != 1 || s.Dead != 0 || s.OldestDueSeconds != 30 {
		t.Fatalf("unexpected stats %+v", s)
	}
}
