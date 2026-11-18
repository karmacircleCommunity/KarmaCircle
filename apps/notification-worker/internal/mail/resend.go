package mail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// Resend sends through the Resend HTTP API.
type Resend struct {
	APIKey  string
	BaseURL string
	Client  *http.Client
}

// NewResend returns a sender with a client that gives up after 15 seconds.
func NewResend(apiKey, baseURL string) *Resend {
	return &Resend{APIKey: apiKey, BaseURL: baseURL, Client: &http.Client{Timeout: 15 * time.Second}}
}

type resendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
}

func (r *Resend) Send(ctx context.Context, m Message) error {
	body, err := json.Marshal(resendRequest{From: m.From, To: []string{m.To}, Subject: m.Subject, HTML: m.HTML, Text: m.Text})
	if err != nil {
		return &SendError{Message: "could not build the request: " + err.Error()}
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.BaseURL+"/emails", bytes.NewReader(body))
	if err != nil {
		return &SendError{Message: "could not build the request: " + err.Error()}
	}
	req.Header.Set("Authorization", "Bearer "+r.APIKey)
	req.Header.Set("Content-Type", "application/json")
	if m.IdempotencyKey != "" {
		req.Header.Set("Idempotency-Key", m.IdempotencyKey)
	}

	res, err := r.Client.Do(req)
	if err != nil {
		// No answer at all: the connection broke or timed out. The email may or
		// may not have been sent, which is why the retry carries the same
		// idempotency key.
		return &SendError{Message: "no answer from the mail provider: " + err.Error(), Retryable: true}
	}
	defer res.Body.Close()
	answer, _ := io.ReadAll(io.LimitReader(res.Body, 2048))

	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}

	sendErr := &SendError{
		Status:  res.StatusCode,
		Message: fmt.Sprintf("the mail provider answered %d: %s", res.StatusCode, bytes.TrimSpace(answer)),
	}
	switch {
	case res.StatusCode == http.StatusTooManyRequests:
		sendErr.Retryable = true
		if seconds, err := strconv.Atoi(res.Header.Get("Retry-After")); err == nil && seconds > 0 {
			sendErr.RetryAfter = time.Duration(seconds) * time.Second
		}
	case res.StatusCode >= 500, res.StatusCode == http.StatusRequestTimeout:
		sendErr.Retryable = true
	}
	// 4xx other than those: the request itself is wrong, a repeat cannot fix it.
	return sendErr
}
