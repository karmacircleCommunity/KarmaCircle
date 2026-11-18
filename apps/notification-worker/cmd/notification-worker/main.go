// Command notification-worker sends the emails that wait on a Redis queue:
// reminders before an event, and notices when one changes or is cancelled.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/config"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/health"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/mail"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/probe"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/queue"
	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/worker"
)

func main() {
	// `notification-worker healthcheck`: what the container's health check
	// runs. It asks the running process for /healthz and exits 0 or 1.
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8081"
		}
		if err := probe.Check(probe.URL(port), 3*time.Second); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}

	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load(os.LookupEnv)
	if err != nil {
		log.Error("refusing to start", "error", err.Error())
		os.Exit(1)
	}
	redisOptions, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Error("refusing to start", "error", "REDIS_URL is not a valid Redis URL")
		os.Exit(1)
	}
	rdb := redis.NewClient(redisOptions)
	defer rdb.Close()
	q := queue.New(rdb)

	var sender mail.Sender = mail.Log{Logger: log}
	senderName := "log"
	if cfg.ResendAPIKey != "" {
		sender = mail.NewResend(cfg.ResendAPIKey, cfg.ResendBaseURL)
		senderName = "resend"
	} else {
		log.Warn("RESEND_API_KEY is not set: emails are only written to the log, none are sent")
	}

	w := worker.New(q, sender, worker.Settings{
		Concurrency: cfg.Concurrency, Poll: cfg.PollInterval, Lease: cfg.Lease, MaxAttempts: cfg.MaxAttempts,
		BackoffBase: cfg.BackoffBase, BackoffMax: cfg.BackoffMax, SiteURL: cfg.SiteURL, EmailFrom: cfg.EmailFrom,
	}, log)

	mux := http.NewServeMux()
	mux.Handle("GET /healthz", health.Handler(q, w.Counters, senderName))
	httpServer := &http.Server{
		Addr: ":" + cfg.Port, Handler: mux,
		ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second,
	}

	stop, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	go func() {
		log.Info("health endpoint listening", "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("health endpoint stopped", "error", err.Error())
			cancel()
		}
	}()
	go logStats(stop, q, w, log)

	log.Info("notification worker started", "sender", senderName, "concurrency", cfg.Concurrency)
	w.Run(stop) // returns after the signal, once the jobs in hand are done
	log.Info("shutting down")

	shutdown, done := context.WithTimeout(context.Background(), 5*time.Second)
	defer done()
	_ = httpServer.Shutdown(shutdown)
}

// logStats writes the queue size once a minute, so a growing queue or a
// pile of dead jobs shows up in the logs even without a monitor.
func logStats(ctx context.Context, q *queue.Queue, w *worker.Worker, log *slog.Logger) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			stats, err := q.Stats(ctx)
			if err != nil {
				log.Warn("could not read the queue size", "error", err.Error())
				continue
			}
			log.Info("queue",
				"due", stats.Due, "inflight", stats.Inflight, "dead", stats.Dead, "oldest_due_seconds", stats.OldestDueSeconds,
				"sent", w.Counters.Sent.Load(), "retried", w.Counters.Retried.Load())
		}
	}
}
