package mail

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func message() Message {
	return Message{From: "KarmaCircle <hello@example.org>", To: "asha@example.com", Subject: "Hi", HTML: "<p>Hi</p>", Text: "Hi", IdempotencyKey: "reminder:abc"}
}

func serve(t *testing.T, handler http.HandlerFunc) *Resend {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return NewResend("re_secret", server.URL)
}

func TestSendsTheMessageWithTheKeyAndTheIdempotencyKey(t *testing.T) {
	var got struct {
		auth, idem, ctype, path string
		body                    map[string]any
	}
	sender := serve(t, func(w http.ResponseWriter, r *http.Request) {
		got.auth, got.idem, got.ctype, got.path = r.Header.Get("Authorization"), r.Header.Get("Idempotency-Key"), r.Header.Get("Content-Type"), r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&got.body)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"em_1"}`))
	})

	if err := sender.Send(context.Background(), message()); err != nil {
		t.Fatal(err)
	}

	if got.path != "/emails" || got.auth != "Bearer re_secret" || got.idem != "reminder:abc" || got.ctype != "application/json" {
		t.Fatalf("unexpected request %+v", got)
	}
	to, _ := got.body["to"].([]any)
	if len(to) != 1 || to[0] != "asha@example.com" || got.body["subject"] != "Hi" || got.body["text"] != "Hi" {
		t.Fatalf("unexpected body %+v", got.body)
	}
}

func TestWhichAnswersAreWorthRetrying(t *testing.T) {
	cases := []struct {
		status    int
		retryable bool
	}{
		{500, true}, {502, true}, {503, true}, {408, true}, {429, true},
		{400, false}, {401, false}, {403, false}, {404, false}, {422, false},
	}
	for _, c := range cases {
		sender := serve(t, func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(c.status)
			_, _ = w.Write([]byte(`{"message":"no"}`))
		})
		err := sender.Send(context.Background(), message())
		var sendErr *SendError
		if !errors.As(err, &sendErr) || sendErr.Retryable != c.retryable || sendErr.Status != c.status {
			t.Errorf("status %d: got %+v, want retryable=%v", c.status, err, c.retryable)
		}
		if IsRetryable(err) != c.retryable {
			t.Errorf("status %d: IsRetryable disagrees", c.status)
		}
	}
}

func TestHonoursRetryAfterOnATooManyRequestsAnswer(t *testing.T) {
	sender := serve(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Retry-After", "42")
		w.WriteHeader(http.StatusTooManyRequests)
	})
	err := sender.Send(context.Background(), message())
	if RetryAfterOf(err) != 42*time.Second {
		t.Fatalf("RetryAfter = %v", RetryAfterOf(err))
	}
}

func TestNoAnswerAtAllIsRetryable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	url := server.URL
	server.Close() // nothing is listening any more

	err := NewResend("k", url).Send(context.Background(), message())

	if err == nil || !IsRetryable(err) {
		t.Fatalf("got %v, want a retryable error", err)
	}
}

func TestATimeoutIsRetryable(t *testing.T) {
	sender := serve(t, func(w http.ResponseWriter, _ *http.Request) { time.Sleep(300 * time.Millisecond) })
	sender.Client = &http.Client{Timeout: 50 * time.Millisecond}

	err := sender.Send(context.Background(), message())

	if err == nil || !IsRetryable(err) {
		t.Fatalf("got %v", err)
	}
}

func TestAnUnexpectedErrorCountsAsWorthRetrying(t *testing.T) {
	if !IsRetryable(errors.New("something odd")) {
		t.Fatal("unknown errors should be retried")
	}
}
