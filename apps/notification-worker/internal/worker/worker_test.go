package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/mail"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/queue"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/testredis"
)

// fakeSender records every message and fails on demand.
type fakeSender struct {
	mu       sync.Mutex
	messages []mail.Message
	// results is consumed one per call; when empty, calls succeed.
	results []error
	delay   time.Duration
}

func (f *fakeSender) Send(ctx context.Context, m mail.Message) error {
	if f.delay > 0 {
		time.Sleep(f.delay)
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.messages = append(f.messages, m)
	if len(f.results) > 0 {
		err := f.results[0]
		f.results = f.results[1:]
		return err
	}
	return nil
}

func (f *fakeSender) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.messages)
}

func (f *fakeSender) keys() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]string, len(f.messages))
	for i, m := range f.messages {
		out[i] = m.IdempotencyKey
	}
	return out
}

type harness struct {
	q      *queue.Queue
	rdb    *redis.Client
	sender *fakeSender
	w      *Worker
}

func newHarness(t *testing.T, change func(*Settings)) *harness {
	t.Helper()
	rdb := testredis.Client(t)
	q := queue.New(rdb)
	sender := &fakeSender{}
	settings := Settings{
		Concurrency: 2, Poll: 5 * time.Millisecond, Lease: 400 * time.Millisecond, MaxAttempts: 4,
		BackoffBase: 20 * time.Millisecond, BackoffMax: 200 * time.Millisecond,
		SiteURL: "https://www.example.org", EmailFrom: "KarmaCircle <hello@example.org>",
	}
	if change != nil {
		change(&settings)
	}
	w := New(q, sender, settings, slog.New(slog.NewTextHandler(io.Discard, nil)))
	w.jitter = func() float64 { return 0.5 } // no randomness: the delay is exactly the base
	return &harness{q: q, rdb: rdb, sender: sender, w: w}
}

func (h *harness) start(t *testing.T) (stop func()) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { h.w.Run(ctx); close(done) }()
	var once sync.Once
	stop = func() {
		once.Do(func() {
			cancel()
			select {
			case <-done:
			case <-time.After(5 * time.Second):
				t.Error("the worker did not stop")
			}
		})
	}
	t.Cleanup(stop)
	return stop
}

func reminder(id string) job.Job {
	return job.Job{
		ID: id, Kind: job.KindReminder, RunAt: time.Now().Add(-time.Second), To: "asha@example.com", Name: "Asha",
		Event: job.Event{UID: "beach-day", Name: "Beach clean-up", StartTime: time.Now().Add(24 * time.Hour), Timezone: "Asia/Kolkata", Place: "Juhu"},
	}
}

func (h *harness) enqueue(t *testing.T, j job.Job) {
	t.Helper()
	if _, err := h.q.Enqueue(context.Background(), j); err != nil {
		t.Fatal(err)
	}
}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for: %s", what)
}

func (h *harness) idle() bool {
	s, _ := h.q.Stats(context.Background())
	return s.Due == 0 && s.Inflight == 0
}

var (
	transient = &mail.SendError{Message: "the provider is busy", Retryable: true, Status: 503}
	refused   = &mail.SendError{Message: "invalid address", Retryable: false, Status: 422}
)

func TestSendsADueJobOnceWithItsIdempotencyKey(t *testing.T) {
	h := newHarness(t, nil)
	h.enqueue(t, reminder("reminder:a"))
	h.start(t)

	waitFor(t, "the email to be sent", func() bool { return h.sender.count() == 1 && h.idle() })

	m := h.sender.messages[0]
	if m.To != "asha@example.com" || m.IdempotencyKey != "reminder:a" || m.From != "KarmaCircle <hello@example.org>" {
		t.Fatalf("unexpected message %+v", m)
	}
	if !strings.Contains(m.Subject, "Beach clean-up") || m.HTML == "" || m.Text == "" {
		t.Fatalf("the email was not written: %+v", m)
	}
	if h.w.Counters.Sent.Load() != 1 {
		t.Fatal("the sent counter did not move")
	}
}

func TestAJobQueuedTwiceIsEmailedOnce(t *testing.T) {
	h := newHarness(t, nil)
	h.enqueue(t, reminder("reminder:a"))
	h.enqueue(t, reminder("reminder:a"))
	h.start(t)
	waitFor(t, "the queue to drain", func() bool { return h.sender.count() >= 1 && h.idle() })

	time.Sleep(100 * time.Millisecond)
	// Even after it was sent, queuing it again does nothing.
	h.enqueue(t, reminder("reminder:a"))
	time.Sleep(100 * time.Millisecond)

	if h.sender.count() != 1 {
		t.Fatalf("sent %d emails, want 1", h.sender.count())
	}
}

func TestATemporaryFailureIsRetriedWithTheSameKeyUntilItWorks(t *testing.T) {
	h := newHarness(t, nil)
	h.sender.results = []error{transient, errors.New("connection reset"), nil}
	h.enqueue(t, reminder("reminder:a"))
	h.start(t)

	waitFor(t, "the third attempt", func() bool { return h.sender.count() == 3 && h.idle() })

	for _, key := range h.sender.keys() {
		if key != "reminder:a" {
			t.Fatalf("a retry used a different idempotency key: %v", h.sender.keys())
		}
	}
	if h.w.Counters.Retried.Load() != 2 || h.w.Counters.Sent.Load() != 1 || h.w.Counters.Dead.Load() != 0 {
		t.Fatalf("counters: retried=%d sent=%d dead=%d", h.w.Counters.Retried.Load(), h.w.Counters.Sent.Load(), h.w.Counters.Dead.Load())
	}
}

func TestARefusalForGoodIsNotRetried(t *testing.T) {
	h := newHarness(t, nil)
	h.sender.results = []error{refused}
	h.enqueue(t, reminder("reminder:a"))
	h.start(t)

	waitFor(t, "the job to be given up on", func() bool { return h.w.Counters.Dead.Load() == 1 && h.idle() })

	time.Sleep(150 * time.Millisecond)
	if h.sender.count() != 1 {
		t.Fatalf("tried %d times, want 1", h.sender.count())
	}
	dead, _ := h.q.DeadLetters(context.Background(), 10)
	if len(dead) != 1 || !strings.Contains(dead[0].Reason, "invalid address") {
		t.Fatalf("unexpected dead letters %+v", dead)
	}
}

func TestGivesUpAfterTheLastAttemptAndKeepsTheReason(t *testing.T) {
	h := newHarness(t, nil)
	h.sender.results = []error{transient, transient, transient, transient, transient, transient}
	h.enqueue(t, reminder("reminder:a"))
	h.start(t)

	waitFor(t, "the job to give up", func() bool { return h.w.Counters.Dead.Load() == 1 && h.idle() })

	if h.sender.count() != 4 {
		t.Fatalf("tried %d times, want MaxAttempts (4)", h.sender.count())
	}
	dead, _ := h.q.DeadLetters(context.Background(), 10)
	if len(dead) != 1 || !strings.Contains(dead[0].Reason, "gave up after 4 attempts") || !strings.Contains(dead[0].Reason, "busy") {
		t.Fatalf("unexpected dead letters %+v", dead)
	}
	var kept job.Job
	if err := json.Unmarshal([]byte(dead[0].Job), &kept); err != nil || kept.Attempts != 4 {
		t.Fatalf("the dead job does not show how often it was tried: %+v %v", kept, err)
	}
}

func TestBackoffGrowsDoublesAndIsCapped(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.BackoffBase = time.Second; s.BackoffMax = 10 * time.Second })
	got := []time.Duration{h.w.backoff(1, 0), h.w.backoff(2, 0), h.w.backoff(3, 0), h.w.backoff(4, 0), h.w.backoff(5, 0), h.w.backoff(40, 0)}
	want := []time.Duration{time.Second, 2 * time.Second, 4 * time.Second, 8 * time.Second, 10 * time.Second, 10 * time.Second}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("attempt %d waits %v, want %v", i+1, got[i], want[i])
		}
	}
}

func TestBackoffSpreadsRetriesOutWithinAFifth(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.BackoffBase = time.Second; s.BackoffMax = time.Minute })
	h.w.jitter = func() float64 { return 0 }
	if d := h.w.backoff(1, 0); d != 800*time.Millisecond {
		t.Errorf("lowest %v", d)
	}
	h.w.jitter = func() float64 { return 0.999999 }
	if d := h.w.backoff(1, 0); d < 1190*time.Millisecond || d > 1200*time.Millisecond {
		t.Errorf("highest %v", d)
	}
}

func TestBackoffNeverGoesBelowWhatTheProviderAsked(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.BackoffBase = time.Second })
	if d := h.w.backoff(1, 45*time.Second); d != 45*time.Second {
		t.Errorf("waited %v, the provider asked for 45s", d)
	}
}

func TestAnUnreadableJobGoesToTheDeadListAndTheNextOneIsStillSent(t *testing.T) {
	h := newHarness(t, nil)
	ctx := context.Background()
	h.rdb.Set(ctx, "{notif}:job:junk", "{not json", 0)
	h.rdb.ZAdd(ctx, "{notif}:due", redis.Z{Score: float64(time.Now().Add(-time.Minute).UnixMilli()), Member: "junk"})
	h.enqueue(t, reminder("reminder:good"))
	h.start(t)

	waitFor(t, "the good job", func() bool { return h.sender.count() == 1 && h.idle() })

	dead, _ := h.q.DeadLetters(ctx, 10)
	if len(dead) != 1 || dead[0].ID != "junk" {
		t.Fatalf("unexpected dead letters %+v", dead)
	}
}

func TestAReminderForAnEventThatAlreadyStartedIsDroppedNotSent(t *testing.T) {
	h := newHarness(t, nil)
	late := reminder("reminder:late")
	late.Event.StartTime = time.Now().Add(-time.Minute)
	h.enqueue(t, late)
	h.start(t)

	waitFor(t, "the job to be dropped", func() bool { return h.w.Counters.Expired.Load() == 1 && h.idle() })

	if h.sender.count() != 0 {
		t.Fatal("a reminder was sent for an event that had started")
	}
}

func TestACancellationNoticeIsStillSentAfterTheEventWasMeantToStart(t *testing.T) {
	h := newHarness(t, nil)
	notice := reminder("cancel:a")
	notice.Kind = job.KindCancelled
	notice.Event.StartTime = time.Now().Add(-time.Hour)
	h.enqueue(t, notice)
	h.start(t)

	waitFor(t, "the notice", func() bool { return h.sender.count() == 1 && h.idle() })
}

func TestAJobCancelledBeforeItsTimeIsNeverSent(t *testing.T) {
	h := newHarness(t, nil)
	soon := reminder("reminder:a")
	soon.RunAt = time.Now().Add(150 * time.Millisecond)
	h.enqueue(t, soon)
	h.start(t)

	h.rdb.Del(context.Background(), "{notif}:job:reminder:a") // what the API does to cancel
	time.Sleep(500 * time.Millisecond)

	if h.sender.count() != 0 {
		t.Fatal("a cancelled job was sent")
	}
	if !h.idle() {
		t.Fatal("the cancelled job is still on the queue")
	}
}

func TestAFutureJobWaitsForItsTime(t *testing.T) {
	h := newHarness(t, nil)
	later := reminder("reminder:a")
	later.RunAt = time.Now().Add(300 * time.Millisecond)
	h.enqueue(t, later)
	h.start(t)

	time.Sleep(150 * time.Millisecond)
	if h.sender.count() != 0 {
		t.Fatal("sent before its time")
	}
	waitFor(t, "its time to come", func() bool { return h.sender.count() == 1 })
}

func TestManyJobsAndWorkersSendEachEmailExactlyOnce(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.Concurrency = 6 })
	const total = 60
	for i := 0; i < total; i++ {
		h.enqueue(t, reminder(fmt.Sprintf("reminder:%02d", i)))
	}
	h.start(t)

	waitFor(t, "all emails", func() bool { return h.sender.count() >= total && h.idle() })
	time.Sleep(100 * time.Millisecond)

	seen := map[string]int{}
	for _, key := range h.sender.keys() {
		seen[key]++
	}
	if len(seen) != total {
		t.Fatalf("%d different emails, want %d", len(seen), total)
	}
	for key, n := range seen {
		if n != 1 {
			t.Fatalf("%s was sent %d times", key, n)
		}
	}
}

func TestAJobHeldByAWorkerThatDiedIsSentByAnother(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.Lease = 150 * time.Millisecond })
	h.enqueue(t, reminder("reminder:a"))
	// A worker takes it and is killed before it answers.
	if c, err := h.q.Claim(context.Background(), 150*time.Millisecond); err != nil || c == nil {
		t.Fatalf("setup: %v %v", c, err)
	}
	h.start(t)

	waitFor(t, "the job to be taken back and sent", func() bool { return h.sender.count() == 1 && h.idle() })

	time.Sleep(200 * time.Millisecond)
	if h.sender.count() != 1 {
		t.Fatalf("sent %d emails, want 1", h.sender.count())
	}
}

func TestStoppingFinishesTheEmailInHandAndLeavesTheRestQueued(t *testing.T) {
	h := newHarness(t, func(s *Settings) { s.Concurrency = 1 })
	h.sender.delay = 250 * time.Millisecond
	h.enqueue(t, reminder("reminder:first"))
	stop := h.start(t)
	waitFor(t, "the first email to start", func() bool {
		s, _ := h.q.Stats(context.Background())
		return s.Inflight == 1
	})
	h.enqueue(t, reminder("reminder:second"))

	stop() // told to stop while the first is being sent

	if h.sender.count() != 1 {
		t.Fatalf("sent %d, want only the one in hand", h.sender.count())
	}
	s, _ := h.q.Stats(context.Background())
	if s.Inflight != 0 || s.Due != 1 {
		t.Fatalf("after stopping: %+v, want the first done and the second still queued", s)
	}
}

func TestAChangeNoticeCarriesTheChanges(t *testing.T) {
	h := newHarness(t, nil)
	j := reminder("changed:a")
	j.Kind = job.KindChanged
	j.Changes = []job.Change{{Field: "place", From: "Juhu", To: "Versova"}}
	h.enqueue(t, j)
	h.start(t)

	waitFor(t, "the notice", func() bool { return h.sender.count() == 1 })

	if !strings.Contains(h.sender.messages[0].Text, "Place: was Juhu, now Versova") {
		t.Fatalf("text %q", h.sender.messages[0].Text)
	}
}

func TestMaskEmailHidesTheName(t *testing.T) {
	if got := maskEmail("asha.rao@example.com"); got != "a***@example.com" {
		t.Errorf("got %q", got)
	}
	if maskEmail("nonsense") != "***" {
		t.Error("an address without @ should be fully hidden")
	}
}

func TestLogLinesCarryTheRequestIDOfTheAPIRequestThatQueuedTheJob(t *testing.T) {
	h := newHarness(t, nil)
	var logs syncBuffer
	h.w.Log = slog.New(slog.NewJSONHandler(&logs, nil))
	traced := reminder("reminder:traced")
	traced.RequestID = "req-from-api-42"
	hostile := reminder("reminder:hostile")
	hostile.RequestID = "bad id\nwith newline"
	h.enqueue(t, traced)
	h.enqueue(t, hostile)
	h.start(t)

	waitFor(t, "both emails", func() bool { return h.sender.count() == 2 && h.idle() })

	text := logs.String()
	if !strings.Contains(text, `"request_id":"req-from-api-42"`) {
		t.Fatalf("the request id is not in the log:\n%s", text)
	}
	if strings.Contains(text, "newline") && strings.Contains(text, `"request_id":"bad`) {
		t.Fatalf("an unsafe request id reached the log:\n%s", text)
	}
}

// syncBuffer is a log destination that several workers can write to at once.
type syncBuffer struct {
	mu  sync.Mutex
	buf strings.Builder
}

func (s *syncBuffer) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.buf.Write(p)
}

func (s *syncBuffer) String() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.buf.String()
}
