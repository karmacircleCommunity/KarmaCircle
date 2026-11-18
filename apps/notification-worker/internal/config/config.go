// Package config reads the worker's settings from the environment and
// refuses to start on a bad one, listing every problem at once.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Config is everything the worker needs.
type Config struct {
	Port     string
	RedisURL string

	// SiteURL is the public address of the web app, for the links in emails.
	SiteURL string

	// ResendAPIKey selects real sending. Without it emails are only logged,
	// which is what development wants.
	ResendAPIKey  string
	ResendBaseURL string
	EmailFrom     string

	Concurrency  int
	PollInterval time.Duration
	// Lease is how long a worker may hold a job before it is given to another.
	Lease       time.Duration
	MaxAttempts int
	BackoffBase time.Duration
	BackoffMax  time.Duration
}

// Load reads the configuration from a lookup function such as os.LookupEnv.
func Load(lookup func(string) (string, bool)) (Config, error) {
	get := func(key, fallback string) string {
		if v, ok := lookup(key); ok && strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
		return fallback
	}
	var problems []string
	fail := func(format string, args ...any) { problems = append(problems, fmt.Sprintf(format, args...)) }

	cfg := Config{
		Port:          get("PORT", "8081"),
		RedisURL:      get("REDIS_URL", ""),
		SiteURL:       strings.TrimRight(get("SITE_URL", ""), "/"),
		ResendAPIKey:  get("RESEND_API_KEY", ""),
		ResendBaseURL: strings.TrimRight(get("RESEND_BASE_URL", "https://api.resend.com"), "/"),
		EmailFrom:     get("EMAIL_FROM", ""),
	}

	if !strings.HasPrefix(cfg.RedisURL, "redis://") && !strings.HasPrefix(cfg.RedisURL, "rediss://") {
		fail("REDIS_URL is required and must be a redis:// or rediss:// URL")
	}
	if u, err := url.Parse(cfg.SiteURL); cfg.SiteURL == "" || err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		fail("SITE_URL is required and must be an http or https URL, for example https://www.example.org")
	}
	if cfg.ResendAPIKey != "" && cfg.EmailFrom == "" {
		fail("EMAIL_FROM is required when RESEND_API_KEY is set")
	}

	number := func(key string, fallback int) int {
		raw := get(key, "")
		if raw == "" {
			return fallback
		}
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			fail("%s must be a positive whole number", key)
			return fallback
		}
		return n
	}
	duration := func(key string, fallback time.Duration) time.Duration {
		raw := get(key, "")
		if raw == "" {
			return fallback
		}
		d, err := time.ParseDuration(raw)
		if err != nil || d <= 0 {
			fail("%s must be a duration such as 30s or 5m", key)
			return fallback
		}
		return d
	}

	cfg.Concurrency = number("WORKER_CONCURRENCY", 4)
	cfg.MaxAttempts = number("MAX_ATTEMPTS", 6)
	cfg.PollInterval = duration("POLL_INTERVAL", time.Second)
	cfg.Lease = duration("LEASE", time.Minute)
	cfg.BackoffBase = duration("BACKOFF_BASE", 30*time.Second)
	cfg.BackoffMax = duration("BACKOFF_MAX", 30*time.Minute)

	if len(problems) > 0 {
		return Config{}, errors.New("invalid configuration:\n  - " + strings.Join(problems, "\n  - "))
	}
	return cfg, nil
}
