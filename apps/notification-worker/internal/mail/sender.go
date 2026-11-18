// Package mail sends the finished emails.
package mail

import (
	"context"
	"errors"
	"time"
)

// Message is one email, already written.
type Message struct {
	From    string
	To      string
	Subject string
	HTML    string
	Text    string
	// IdempotencyKey lets the provider recognise a repeat of the same email,
	// so a retry after a lost answer does not send it twice.
	IdempotencyKey string
}

// Sender sends a message. An error from it is either a *SendError, which
// says whether trying again can help, or something unexpected that is treated
// as worth trying again.
type Sender interface {
	Send(ctx context.Context, m Message) error
}

// SendError describes why a message was not sent.
type SendError struct {
	Message string
	// Retryable is true when the same message may succeed later (network
	// trouble, a busy provider) and false when it never will (a refused
	// address, a rejected key).
	Retryable bool
	// RetryAfter is how long the provider asked us to wait. Zero when it did not.
	RetryAfter time.Duration
	// Status is the HTTP status, or 0 when there was no answer.
	Status int
}

func (e *SendError) Error() string { return e.Message }

// IsRetryable reports whether trying again can help.
func IsRetryable(err error) bool {
	var sendErr *SendError
	if errors.As(err, &sendErr) {
		return sendErr.Retryable
	}
	return true
}

// RetryAfterOf returns the wait the provider asked for, or zero.
func RetryAfterOf(err error) time.Duration {
	var sendErr *SendError
	if errors.As(err, &sendErr) {
		return sendErr.RetryAfter
	}
	return 0
}
