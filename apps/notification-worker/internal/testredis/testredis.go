// Package testredis gives tests a real Redis. It uses REDIS_TEST_URL when set
// (CI starts a Redis service), otherwise starts a throwaway redis-server on a
// free port when one is installed.
package testredis

import (
	"context"
	"net"
	"os"
	"os/exec"
	"strconv"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// Client returns a client on a clean Redis, or skips the test, loudly, when
// none is available.
func Client(t *testing.T) *redis.Client {
	t.Helper()
	url := os.Getenv("REDIS_TEST_URL")
	if url == "" {
		if _, err := exec.LookPath("redis-server"); err != nil {
			t.Skip("no redis-server installed and REDIS_TEST_URL is not set: this test was NOT run")
		}
		url = start(t)
	}
	options, err := redis.ParseURL(url)
	if err != nil {
		t.Fatal(err)
	}
	// Database 15, so a Redis shared with other tests (CI) is not wiped: the
	// API's tests use the first few. Packages must run one at a time against
	// a shared Redis (`go test -p 1`), since they all use this database.
	options.DB = 15
	rdb := redis.NewClient(options)
	t.Cleanup(func() { rdb.Close() })
	if err := rdb.FlushDB(context.Background()).Err(); err != nil {
		t.Fatal(err)
	}
	return rdb
}

func start(t *testing.T) string {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	cmd := exec.Command("redis-server", "--port", strconv.Itoa(port), "--bind", "127.0.0.1", "--save", "", "--appendonly", "no")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = cmd.Process.Kill(); _, _ = cmd.Process.Wait() })

	url := "redis://127.0.0.1:" + strconv.Itoa(port)
	options, _ := redis.ParseURL(url)
	probe := redis.NewClient(options)
	defer probe.Close()
	for i := 0; i < 50; i++ {
		if probe.Ping(context.Background()).Err() == nil {
			return url
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("redis-server did not become ready")
	return ""
}
