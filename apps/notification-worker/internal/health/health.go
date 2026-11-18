// Package health serves the one endpoint an uptime monitor needs.
package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/queue"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/worker"
)

// Report is the body of the answer.
type Report struct {
	Status string `json:"status"`
	Redis  string `json:"redis"`
	// Sender is "resend" when emails go out, "log" when they are only logged.
	Sender   string       `json:"sender"`
	Queue    *queue.Stats `json:"queue,omitempty"`
	Counters Counters     `json:"sinceStart"`
}

// Counters mirror worker.Counters.
type Counters struct {
	Sent    int64 `json:"sent"`
	Retried int64 `json:"retried"`
	Dead    int64 `json:"dead"`
	Expired int64 `json:"expired"`
}

// Handler answers 200 when Redis answers and 503 when it does not. The queue
// numbers are there so a monitor can also alert on a queue that keeps growing
// (`queue.oldestDueSeconds`) or on jobs that gave up (`queue.dead`).
func Handler(q *queue.Queue, c *worker.Counters, sender string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		report := Report{
			Sender: sender,
			Counters: Counters{
				Sent: c.Sent.Load(), Retried: c.Retried.Load(), Dead: c.Dead.Load(), Expired: c.Expired.Load(),
			},
		}
		status := http.StatusOK
		if stats, err := q.Stats(ctx); err != nil {
			report.Status, report.Redis = "degraded", "unreachable"
			status = http.StatusServiceUnavailable
		} else {
			report.Status, report.Redis, report.Queue = "ok", "connected", &stats
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(report)
	})
}
