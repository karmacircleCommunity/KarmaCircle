// Command image-service accepts event cover uploads from the browser,
// validates them, makes the sizes the site needs and serves them back.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/config"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/server"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/storage"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load(os.LookupEnv)
	if err != nil {
		log.Error("refusing to start", "error", err.Error())
		os.Exit(1)
	}

	store, err := newStore(cfg.Storage)
	if err != nil {
		log.Error("could not open storage", "error", err.Error())
		os.Exit(1)
	}

	httpServer := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: server.New(cfg, store, log),
		// A client that sends headers or a body very slowly must not hold a
		// connection open for ever.
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	stop, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	go func() {
		log.Info("image service listening", "port", cfg.Port, "storage", cfg.Storage.Kind)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server stopped", "error", err.Error())
			os.Exit(1)
		}
	}()

	<-stop.Done()
	log.Info("shutting down")
	// Let uploads that are running finish, but not for ever.
	ctx, done := context.WithTimeout(context.Background(), 10*time.Second)
	defer done()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Error("shutdown did not finish cleanly", "error", err.Error())
		os.Exit(1)
	}
}

func newStore(cfg config.StorageConfig) (storage.Store, error) {
	if cfg.Kind == "s3" {
		return storage.NewS3(storage.S3Options{
			Endpoint: cfg.Endpoint, Bucket: cfg.Bucket,
			AccessKey: cfg.AccessKey, SecretKey: cfg.SecretKey,
			Region: cfg.Region, UseSSL: cfg.UseSSL,
		})
	}
	return storage.NewFS(cfg.Dir)
}
