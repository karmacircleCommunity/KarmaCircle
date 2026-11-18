package config

import (
	"strings"
	"testing"
	"time"
)

func lookup(env map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) { v, ok := env[key]; return v, ok }
}

var valid = map[string]string{"REDIS_URL": "redis://localhost:6379", "SITE_URL": "https://www.example.org/"}

func with(extra map[string]string) map[string]string {
	env := map[string]string{}
	for k, v := range valid {
		env[k] = v
	}
	for k, v := range extra {
		env[k] = v
	}
	return env
}

func TestLoadsDefaults(t *testing.T) {
	cfg, err := Load(lookup(valid))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.SiteURL != "https://www.example.org" || cfg.Concurrency != 4 || cfg.MaxAttempts != 6 ||
		cfg.BackoffBase != 30*time.Second || cfg.BackoffMax != 30*time.Minute || cfg.ResendAPIKey != "" {
		t.Fatalf("unexpected %+v", cfg)
	}
}

func TestSendingForRealNeedsASender(t *testing.T) {
	if _, err := Load(lookup(with(map[string]string{"RESEND_API_KEY": "re_x"}))); err == nil || !strings.Contains(err.Error(), "EMAIL_FROM") {
		t.Fatalf("got %v", err)
	}
	if _, err := Load(lookup(with(map[string]string{"RESEND_API_KEY": "re_x", "EMAIL_FROM": "KarmaCircle <hi@example.org>"}))); err != nil {
		t.Fatal(err)
	}
}

func TestListsEveryProblemAndNeverPrintsTheKey(t *testing.T) {
	_, err := Load(lookup(map[string]string{
		"REDIS_URL": "localhost", "SITE_URL": "nope", "RESEND_API_KEY": "re_super_secret",
		"WORKER_CONCURRENCY": "0", "LEASE": "soon",
	}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, want := range []string{"REDIS_URL", "SITE_URL", "EMAIL_FROM", "WORKER_CONCURRENCY", "LEASE"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("does not mention %s:\n%v", want, err)
		}
	}
	if strings.Contains(err.Error(), "re_super_secret") {
		t.Error("the API key was printed")
	}
}
