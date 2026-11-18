package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/queue"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/testredis"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/worker"
)

func TestReportsTheQueueWhenRedisAnswers(t *testing.T) {
	rdb := testredis.Client(t)
	q := queue.New(rdb)
	_, err := q.Enqueue(context.Background(), job.Job{
		ID: "a", Kind: job.KindReminder, RunAt: time.Now().Add(-5 * time.Second), To: "a@b.co",
		Event: job.Event{UID: "u", Name: "n", StartTime: time.Now().Add(time.Hour)},
	})
	if err != nil {
		t.Fatal(err)
	}
	counters := &worker.Counters{}
	counters.Sent.Store(7)

	rec := httptest.NewRecorder()
	Handler(q, counters, "resend").ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	var report Report
	if err := json.Unmarshal(rec.Body.Bytes(), &report); err != nil {
		t.Fatal(err)
	}
	if rec.Code != 200 || report.Status != "ok" || report.Redis != "connected" || report.Sender != "resend" {
		t.Fatalf("%d %+v", rec.Code, report)
	}
	if report.Queue == nil || report.Queue.Due != 1 || report.Queue.OldestDueSeconds < 4 || report.Counters.Sent != 7 {
		t.Fatalf("unexpected numbers %+v", report)
	}
}

func TestAnswers503WhenRedisIsNotThere(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1", MaxRetries: -1, DialTimeout: 100 * time.Millisecond})
	defer rdb.Close()

	rec := httptest.NewRecorder()
	Handler(queue.New(rdb), &worker.Counters{}, "log").ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	var report Report
	_ = json.Unmarshal(rec.Body.Bytes(), &report)
	if rec.Code != 503 || report.Status != "degraded" || report.Redis != "unreachable" || report.Queue != nil {
		t.Fatalf("%d %+v", rec.Code, report)
	}
}
