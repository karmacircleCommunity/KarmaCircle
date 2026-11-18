package job

import (
	"errors"
	"strings"
	"testing"
	"time"
)

var start = time.Date(2026, 11, 22, 1, 30, 0, 0, time.UTC)

func valid() Job {
	return Job{ID: "reminder:a", Kind: KindReminder, To: "asha@example.com", Event: Event{UID: "beach", Name: "Beach", StartTime: start}}
}

func TestParseReadsWhatTheAPIWrites(t *testing.T) {
	raw := `{"id":"changed:a:1","kind":"event_changed","runAt":"2026-11-18T12:00:00Z","to":"asha@example.com","name":"Asha",
	"event":{"uid":"beach","name":"Beach","startTime":"2026-11-22T01:30:00Z","timezone":"Asia/Kolkata","mode":"Offline","place":"Juhu"},
	"changes":[{"field":"place","from":"Juhu","to":"Versova"}],"attempts":0}`

	j, err := Parse([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	if j.ID != "changed:a:1" || j.Event.Timezone != "Asia/Kolkata" || len(j.Changes) != 1 || !j.Event.StartTime.Equal(start) {
		t.Fatalf("unexpected job %+v", j)
	}
}

func TestParseRefusesWhatCanNeverBeSent(t *testing.T) {
	cases := map[string]string{
		"not json":           `{nope`,
		"empty":              `{}`,
		"unknown kind":       `{"id":"x","kind":"newsletter","to":"a@b.co","event":{"uid":"u","name":"n","startTime":"2026-11-22T01:30:00Z"}}`,
		"no event":           `{"id":"x","kind":"event_reminder","to":"a@b.co"}`,
		"bad address":        `{"id":"x","kind":"event_reminder","to":"Asha <a@b.co>","event":{"uid":"u","name":"n","startTime":"2026-11-22T01:30:00Z"}}`,
		"no start":           `{"id":"x","kind":"event_reminder","to":"a@b.co","event":{"uid":"u","name":"n"}}`,
		"change w/o changes": `{"id":"x","kind":"event_changed","to":"a@b.co","event":{"uid":"u","name":"n","startTime":"2026-11-22T01:30:00Z"}}`,
	}
	for name, raw := range cases {
		if _, err := Parse([]byte(raw)); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: got %v, want ErrInvalid", name, err)
		}
	}
}

func TestAnAddressWithAHeaderInjectionIsRefused(t *testing.T) {
	j := valid()
	j.To = "a@b.co\r\nBcc: x@evil.example"
	if err := j.Validate(); err == nil || !strings.Contains(err.Error(), "address") {
		t.Fatalf("got %v", err)
	}
}

func TestExpiredOnlyAppliesToThingsThatStopMattering(t *testing.T) {
	before, after := start.Add(-time.Hour), start.Add(time.Hour)

	reminder := valid()
	if reminder.Expired(before) || !reminder.Expired(after) || !reminder.Expired(start) {
		t.Error("a reminder is useless once the event has started")
	}
	changed := valid()
	changed.Kind = KindChanged
	if !changed.Expired(after) {
		t.Error("a change notice is useless once the event has started")
	}
	cancelled := valid()
	cancelled.Kind = KindCancelled
	if cancelled.Expired(after) {
		t.Error("a cancellation still matters after the start time")
	}
}
