// Package config reads the service's settings from environment variables and
// refuses to start on a bad one, the same way the API does.
package config

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

const minSecretLength = 32

// Config is everything the service needs to run.
type Config struct {
	Port string

	// Secret signs the upload tokens the API hands to the browser. The API and
	// this service must share it.
	Secret string

	// PublicBaseURL is where browsers reach this service. It is put in front of
	// the image paths in responses.
	PublicBaseURL string

	// AllowedOrigins may call the upload endpoint from a browser.
	AllowedOrigins []string

	MaxUploadBytes    int64
	MaxPixels         int
	MaxConcurrentJobs int
	Storage           StorageConfig
}

// StorageConfig picks where the finished images are kept.
type StorageConfig struct {
	Kind string // "fs" or "s3"

	Dir string // fs

	Endpoint  string // s3: host[:port], no scheme
	Bucket    string
	AccessKey string
	SecretKey string
	Region    string
	UseSSL    bool
}

// Load reads the configuration from a lookup function such as os.LookupEnv.
// It reports every problem at once.
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
		Port:          get("PORT", "8080"),
		Secret:        get("IMAGE_SERVICE_SECRET", ""),
		PublicBaseURL: strings.TrimRight(get("PUBLIC_BASE_URL", ""), "/"),
	}

	if len(cfg.Secret) < minSecretLength {
		fail("IMAGE_SERVICE_SECRET must be at least %d characters and match the API's value", minSecretLength)
	}

	if cfg.PublicBaseURL == "" {
		fail("PUBLIC_BASE_URL is required, for example https://images.example.org")
	} else if u, err := url.Parse(cfg.PublicBaseURL); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		fail("PUBLIC_BASE_URL must be an http or https URL")
	}

	for _, origin := range strings.Split(get("ALLOWED_ORIGINS", ""), ",") {
		if origin = strings.TrimRight(strings.TrimSpace(origin), "/"); origin != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, origin)
		}
	}

	var err error
	if cfg.MaxUploadBytes, err = intSetting(get, "MAX_UPLOAD_BYTES", 5<<20); err != nil {
		fail("%v", err)
	}
	maxPixels, err := intSetting(get, "MAX_PIXELS", 40_000_000)
	if err != nil {
		fail("%v", err)
	}
	cfg.MaxPixels = int(maxPixels)
	jobs, err := intSetting(get, "MAX_CONCURRENT_JOBS", 2)
	if err != nil {
		fail("%v", err)
	}
	cfg.MaxConcurrentJobs = int(jobs)

	cfg.Storage = StorageConfig{
		Kind:      get("STORAGE", "fs"),
		Dir:       get("STORAGE_DIR", "./data"),
		Endpoint:  get("S3_ENDPOINT", ""),
		Bucket:    get("S3_BUCKET", ""),
		AccessKey: get("S3_ACCESS_KEY", ""),
		SecretKey: get("S3_SECRET_KEY", ""),
		Region:    get("S3_REGION", "auto"),
		UseSSL:    get("S3_USE_SSL", "true") != "false",
	}
	switch cfg.Storage.Kind {
	case "fs":
	case "s3":
		for name, value := range map[string]string{
			"S3_ENDPOINT": cfg.Storage.Endpoint, "S3_BUCKET": cfg.Storage.Bucket,
			"S3_ACCESS_KEY": cfg.Storage.AccessKey, "S3_SECRET_KEY": cfg.Storage.SecretKey,
		} {
			if value == "" {
				fail("%s is required when STORAGE=s3", name)
			}
		}
	default:
		fail("STORAGE must be fs or s3, got %q", cfg.Storage.Kind)
	}

	if len(problems) > 0 {
		return Config{}, errors.New("invalid configuration:\n  - " + strings.Join(problems, "\n  - "))
	}
	return cfg, nil
}

func intSetting(get func(string, string) string, key string, fallback int64) (int64, error) {
	raw := get(key, "")
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("%s must be a positive whole number", key)
	}
	return n, nil
}
