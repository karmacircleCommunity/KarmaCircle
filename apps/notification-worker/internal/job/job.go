// Package job is the message the API puts on the queue and the worker reads.
// It is the contract between the two: apps/api/src/modules/notifications
// writes exactly this shape, see its README section in
// apps/notification-worker/README.md.
package job

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

// Kinds of notification.
const (
	KindReminder  = "event_reminder"
	KindChanged   = "event_changed"
	KindCancelled = "event_cancelled"
)

// Change is one thing that is different about an event. For the "start" and
// "end" fields From and To are RFC 3339 times, for the others they are plain
// text.
type Change struct {
	Field string `json:"field"`
	From  string `json:"from"`
	To    string `json:"to"`
}

// Event is the part of an event an email needs. A snapshot taken when the job
// was queued, so the worker needs no database.
type Event struct {
	UID       string    `json:"uid"`
	Name      string    `json:"name"`
	StartTime time.Time `json:"startTime"`
	Timezone  string    `json:"timezone,omitempty"`
	Mode      string    `json:"mode,omitempty"`
	// Place is where it is held, or the platform for an online event.
	Place string `json:"place,omitempty"`
}

// Job is one email to send.
type Job struct {
	// ID is also the de-duplication key: the same ID is never queued twice and
	// is sent to the mail provider as its idempotency key.
	ID       string    `json:"id"`
	Kind     string    `json:"kind"`
	RunAt    time.Time `json:"runAt"`
	To       string    `json:"to"`
	Name     string    `json:"name,omitempty"`
	Event    Event     `json:"event"`
	Changes  []Change  `json:"changes,omitempty"`
	Attempts int       `json:"attempts"`
	// LastError is the reason of the latest failed attempt, for people.
	LastError string `json:"lastError,omitempty"`
}

// ErrInvalid marks a job that can never be sent, however many times it is tried.
var ErrInvalid = errors.New("invalid job")

// Parse reads and checks a job. A job that fails here is a poison message: it
// goes to the dead letter list, not back on the queue.
func Parse(raw []byte) (Job, error) {
	var j Job
	if err := json.Unmarshal(raw, &j); err != nil {
		return Job{}, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	return j, j.Validate()
}

// Validate checks what the worker relies on.
func (j Job) Validate() error {
	switch {
	case strings.TrimSpace(j.ID) == "":
		return fmt.Errorf("%w: no id", ErrInvalid)
	case j.Kind != KindReminder && j.Kind != KindChanged && j.Kind != KindCancelled:
		return fmt.Errorf("%w: unknown kind %q", ErrInvalid, j.Kind)
	case j.Event.UID == "" || j.Event.Name == "":
		return fmt.Errorf("%w: event needs a uid and a name", ErrInvalid)
	case j.Event.StartTime.IsZero():
		return fmt.Errorf("%w: event has no start time", ErrInvalid)
	}
	if address, err := mail.ParseAddress(j.To); err != nil || address.Address != j.To {
		return fmt.Errorf("%w: not a plain email address", ErrInvalid)
	}
	if j.Kind == KindChanged && len(j.Changes) == 0 {
		return fmt.Errorf("%w: a change notice needs at least one change", ErrInvalid)
	}
	return nil
}

// Expired reports whether sending now would be pointless. A reminder or a
// change notice about an event that has already started is only noise.
func (j Job) Expired(now time.Time) bool {
	if j.Kind == KindCancelled {
		return false
	}
	return !now.Before(j.Event.StartTime)
}
