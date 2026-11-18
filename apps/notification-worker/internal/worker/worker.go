// Package worker takes jobs off the queue, writes and sends the email, and
// decides what happens when that goes wrong.
package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"math/rand/v2"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/mail"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/queue"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/render"
)

// Settings are the knobs of the worker.
type Settings struct {
	Concurrency int
	// Poll is how long a worker waits before asking again when the queue is empty.
	Poll time.Duration
	// Lease is how long a job may be held before it is given to another worker.
	Lease       time.Duration
	MaxAttempts int
	BackoffBase time.Duration
	BackoffMax  time.Duration
	SiteURL     string
	EmailFrom   string
	// SendTimeout bounds one call to the mail provider.
	SendTimeout time.Duration
}

// Counters are totals since the worker started, for the health endpoint and
// the log.
type Counters struct {
	Sent    atomic.Int64
	Retried atomic.Int64
	Dead    atomic.Int64
	Expired atomic.Int64
}

// Worker runs the loop.
type Worker struct {
	Queue    *queue.Queue
	Sender   mail.Sender
	Settings Settings
	Log      *slog.Logger
	Counters *Counters

	now func() time.Time
	// jitter returns a number in [0, 1). A field so tests can pin it.
	jitter func() float64
}

// New returns a Worker.
func New(q *queue.Queue, sender mail.Sender, s Settings, log *slog.Logger) *Worker {
	if s.SendTimeout == 0 {
		s.SendTimeout = 20 * time.Second
	}
	return &Worker{
		Queue: q, Sender: sender, Settings: s, Log: log,
		Counters: &Counters{}, now: time.Now, jitter: rand.Float64,
	}
}

// Run works until ctx is cancelled, then finishes the jobs it is holding and
// returns. Jobs it never claimed stay on the queue, and a job it was holding
// when it was killed comes back when its lease ends.
func (w *Worker) Run(ctx context.Context) {
	var group sync.WaitGroup
	for i := 0; i < w.Settings.Concurrency; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			w.loop(ctx)
		}()
	}
	group.Add(1)
	go func() {
		defer group.Done()
		w.reapLoop(ctx)
	}()
	group.Wait()
}

func (w *Worker) loop(ctx context.Context) {
	for ctx.Err() == nil {
		claimed, err := w.Queue.Claim(ctx, w.Settings.Lease)
		if err != nil {
			if ctx.Err() == nil {
				w.Log.Error("could not take a job from the queue", "error", err.Error())
			}
			sleep(ctx, w.Settings.Poll)
			continue
		}
		if claimed == nil {
			sleep(ctx, w.Settings.Poll)
			continue
		}
		// A job that was taken is finished even when the worker is told to
		// stop: cancelling here could drop an email after it left.
		w.handle(context.WithoutCancel(ctx), claimed)
	}
}

func (w *Worker) reapLoop(ctx context.Context) {
	every := w.Settings.Lease / 3
	if every < 10*time.Millisecond {
		every = 10 * time.Millisecond
	}
	for ctx.Err() == nil {
		if !sleep(ctx, every) {
			return
		}
		reaped, err := w.Queue.ReapExpired(ctx, w.Settings.MaxAttempts, 0)
		if err != nil && ctx.Err() == nil {
			w.Log.Error("could not check for abandoned jobs", "error", err.Error())
			continue
		}
		if reaped.Requeued+reaped.Dead > 0 {
			w.Log.Warn("took back jobs whose worker did not answer", "requeued", reaped.Requeued, "dead", reaped.Dead)
			w.Counters.Dead.Add(int64(reaped.Dead))
		}
	}
}

// sleep waits, and returns false if ctx ended first.
func sleep(ctx context.Context, d time.Duration) bool {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func (w *Worker) handle(ctx context.Context, claimed *queue.Claimed) {
	j, err := job.Parse(claimed.Raw)
	if err != nil {
		// Cannot be sent however often it is tried.
		w.die(ctx, claimed.ID, "", claimed.Raw, err.Error())
		return
	}
	log := w.Log.With("job", j.ID, "kind", j.Kind, "attempt", j.Attempts+1, "to", maskEmail(j.To))

	if j.Expired(w.now()) {
		log.Info("dropped: the event has already started")
		w.Counters.Expired.Add(1)
		if err := w.Queue.Ack(ctx, j); err != nil {
			log.Error("could not remove a dropped job", "error", err.Error())
		}
		return
	}

	email, err := render.Render(j, w.Settings.SiteURL)
	if err != nil {
		w.die(ctx, j.ID, j.Event.UID, claimed.Raw, "could not write the email: "+err.Error())
		return
	}

	sendCtx, cancel := context.WithTimeout(ctx, w.Settings.SendTimeout)
	err = w.Sender.Send(sendCtx, mail.Message{
		From: w.Settings.EmailFrom, To: j.To, Subject: email.Subject, HTML: email.HTML, Text: email.Text,
		IdempotencyKey: j.ID,
	})
	cancel()

	if err == nil {
		if ackErr := w.Queue.Ack(ctx, j); ackErr != nil {
			// The email left but the queue was not told. The lease will end and
			// the job will be sent again with the same idempotency key, which
			// the provider recognises.
			log.Error("sent, but could not mark the job done", "error", ackErr.Error())
			return
		}
		w.Counters.Sent.Add(1)
		log.Info("sent")
		return
	}

	j.Attempts++
	j.LastError = truncate(err.Error(), 300)
	switch {
	case !mail.IsRetryable(err):
		log.Error("not sent, the provider refused it for good", "error", j.LastError)
		w.die(ctx, j.ID, j.Event.UID, mustJSON(j), j.LastError)
	case j.Attempts >= w.Settings.MaxAttempts:
		log.Error("not sent, out of attempts", "error", j.LastError)
		w.die(ctx, j.ID, j.Event.UID, mustJSON(j), fmt.Sprintf("gave up after %d attempts: %s", j.Attempts, j.LastError))
	default:
		delay := w.backoff(j.Attempts, mail.RetryAfterOf(err))
		log.Warn("not sent, will try again", "error", j.LastError, "in", delay.Round(time.Millisecond).String())
		if retryErr := w.Queue.Retry(ctx, j, w.now().Add(delay)); retryErr != nil {
			log.Error("could not schedule the retry", "error", retryErr.Error())
			return
		}
		w.Counters.Retried.Add(1)
	}
}

func (w *Worker) die(ctx context.Context, id, eventUID string, raw []byte, reason string) {
	w.Counters.Dead.Add(1)
	w.Log.Error("job moved to the dead letter list", "job", id, "reason", reason)
	if err := w.Queue.Dead(ctx, id, eventUID, raw, reason); err != nil {
		w.Log.Error("could not move a job to the dead letter list", "job", id, "error", err.Error())
	}
}

// backoff is how long to wait before attempt n+1: the base doubled for each
// attempt so far, capped, with up to a fifth added or taken off so many
// failed jobs do not all come back in the same second. When the provider said
// how long to wait, that is the minimum.
func (w *Worker) backoff(attempts int, retryAfter time.Duration) time.Duration {
	steps := math.Pow(2, float64(attempts-1))
	delay := time.Duration(float64(w.Settings.BackoffBase) * steps)
	if delay > w.Settings.BackoffMax || delay <= 0 {
		delay = w.Settings.BackoffMax
	}
	delay = time.Duration(float64(delay) * (0.8 + 0.4*w.jitter()))
	if retryAfter > delay {
		delay = retryAfter
	}
	return delay
}

// maskEmail keeps logs useful without holding a person's address.
func maskEmail(address string) string {
	at := strings.LastIndex(address, "@")
	if at <= 0 {
		return "***"
	}
	return address[:1] + "***" + address[at:]
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func mustJSON(j job.Job) []byte {
	raw, err := json.Marshal(j)
	if err != nil {
		return []byte(fmt.Sprintf(`{"id":%q}`, j.ID))
	}
	return raw
}
