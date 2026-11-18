package config

import (
	"strings"
	"testing"
)

func lookup(env map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) { v, ok := env[key]; return v, ok }
}

var valid = map[string]string{
	"IMAGE_SERVICE_SECRET": "0123456789abcdef0123456789abcdef",
	"PUBLIC_BASE_URL":      "https://images.example.org/",
}

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
	if cfg.Port != "8080" || cfg.PublicBaseURL != "https://images.example.org" || cfg.Storage.Kind != "fs" {
		t.Fatalf("unexpected defaults %+v", cfg)
	}
	if cfg.MaxUploadBytes != 5<<20 || cfg.MaxConcurrentJobs != 2 {
		t.Fatalf("unexpected limits %+v", cfg)
	}
}

func TestReadsAllowedOriginsWithoutTrailingSlashes(t *testing.T) {
	cfg, err := Load(lookup(with(map[string]string{"ALLOWED_ORIGINS": " https://a.example.org/ , http://localhost:3000,, "})))
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.AllowedOrigins) != 2 || cfg.AllowedOrigins[0] != "https://a.example.org" {
		t.Fatalf("got %v", cfg.AllowedOrigins)
	}
}

func TestRefusesToStartAndListsEveryProblem(t *testing.T) {
	_, err := Load(lookup(map[string]string{
		"IMAGE_SERVICE_SECRET": "short",
		"PUBLIC_BASE_URL":      "ftp://nope",
		"STORAGE":              "s3",
		"MAX_UPLOAD_BYTES":     "-4",
	}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, want := range []string{"IMAGE_SERVICE_SECRET", "PUBLIC_BASE_URL", "S3_BUCKET", "S3_ENDPOINT", "MAX_UPLOAD_BYTES"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error does not mention %s:\n%v", want, err)
		}
	}
	if strings.Contains(err.Error(), "short") && strings.Contains(err.Error(), "IMAGE_SERVICE_SECRET=short") {
		t.Error("the secret value must not be printed")
	}
}

func TestRefusesAnUnknownStorage(t *testing.T) {
	if _, err := Load(lookup(with(map[string]string{"STORAGE": "ftp"}))); err == nil {
		t.Fatal("expected an error")
	}
}
