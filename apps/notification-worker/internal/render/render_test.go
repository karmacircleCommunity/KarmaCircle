package render

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
)

const site = "https://www.example.org"

// 7:00 in the morning in Kolkata is 01:30 UTC.
var start = time.Date(2026, 11, 22, 1, 30, 0, 0, time.UTC)

func sample(kind string) job.Job {
	return job.Job{
		ID: "x", Kind: kind, To: "asha@example.com", Name: "Asha",
		Event: job.Event{UID: "beach-day", Name: "Beach clean-up", StartTime: start, Timezone: "Asia/Kolkata", Place: "Juhu, India"},
	}
}

func TestReminderShowsTheTimeInTheEventsOwnZone(t *testing.T) {
	email, err := Render(sample(job.KindReminder), site)
	if err != nil {
		t.Fatal(err)
	}
	if email.Subject != "Reminder: Beach clean-up starts Sun 22 Nov, 7:00 AM IST" {
		t.Errorf("subject %q", email.Subject)
	}
	for _, want := range []string{"Sunday 22 November 2026, 7:00 AM IST", "Juhu, India", "Hi Asha,", "https://www.example.org/events/beach-day"} {
		if !strings.Contains(email.HTML, want) {
			t.Errorf("html is missing %q", want)
		}
		if !strings.Contains(email.Text, want) {
			t.Errorf("text is missing %q", want)
		}
	}
}

func TestAnEventWithoutAZoneIsShownInUTCAndSaysSo(t *testing.T) {
	j := sample(job.KindReminder)
	j.Event.Timezone = ""
	email, _ := Render(j, site)
	if !strings.Contains(email.Text, "1:30 AM UTC") {
		t.Errorf("text %q", email.Text)
	}

	j.Event.Timezone = "Not/AZone"
	email, _ = Render(j, site)
	if !strings.Contains(email.Text, "1:30 AM UTC") {
		t.Errorf("an unknown zone should fall back to UTC: %q", email.Text)
	}
}

func TestChangeNoticeListsWhatChangedAndConvertsTimes(t *testing.T) {
	j := sample(job.KindChanged)
	j.Changes = []job.Change{
		{Field: "start", From: "2026-11-22T01:30:00Z", To: "2026-11-22T04:30:00Z"},
		{Field: "place", From: "Juhu, India", To: "Versova, India"},
		{Field: "link", From: "", To: "https://meet.example.org/x"},
	}

	email, err := Render(j, site)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		"Start time: was Sunday 22 November 2026, 7:00 AM IST, now Sunday 22 November 2026, 10:00 AM IST",
		"Place: was Juhu, India, now Versova, India",
		"Link: was not set, now https://meet.example.org/x",
	} {
		if !strings.Contains(email.Text, want) {
			t.Errorf("text is missing %q\n%s", want, email.Text)
		}
	}
	if email.Subject != "Update: Beach clean-up has changed" {
		t.Errorf("subject %q", email.Subject)
	}
}

func TestCancellationNotice(t *testing.T) {
	email, _ := Render(sample(job.KindCancelled), site)
	if email.Subject != "Cancelled: Beach clean-up" || !strings.Contains(email.Text, "cancelled an event") {
		t.Errorf("unexpected email %+v", email)
	}
}

func TestWhatAPersonTypedIsEscapedInHTMLAndLeftAloneInText(t *testing.T) {
	j := sample(job.KindReminder)
	j.Event.Name = `<script>alert("x")</script> & Co`
	j.Name = `"><img src=x onerror=alert(1)>`
	j.Event.Place = `<b>Pier</b>`

	email, _ := Render(j, site)

	for _, raw := range []string{"<script>", "<img", "<b>Pier"} {
		if strings.Contains(email.HTML, raw) {
			t.Errorf("html contains the unescaped %q", raw)
		}
	}
	if !strings.Contains(email.HTML, "&lt;script&gt;") {
		t.Error("html does not show the name as text")
	}
	if !strings.Contains(email.Text, `<script>alert("x")</script> & Co`) {
		t.Error("the plain text version should keep the name as typed")
	}
}

func TestTheEventAddressCannotBreakOutOfTheLink(t *testing.T) {
	j := sample(job.KindReminder)
	j.Event.UID = `a"b c/../d`
	email, _ := Render(j, site)
	if strings.Contains(email.HTML, `a"b`) {
		t.Errorf("the uid was put in the link unescaped: %s", email.HTML)
	}
}

func TestASubjectIsAlwaysOneLine(t *testing.T) {
	j := sample(job.KindCancelled)
	j.Event.Name = "Beach\r\nBcc: someone@evil.example\nclean-up"
	email, _ := Render(j, site)
	if strings.ContainsAny(email.Subject, "\r\n") {
		t.Errorf("subject has a line break: %q", email.Subject)
	}
}

func TestGreetsAnUnnamedAttendeeGenerically(t *testing.T) {
	j := sample(job.KindReminder)
	j.Name = "  "
	email, _ := Render(j, site)
	if !strings.Contains(email.Text, "Hi there,") {
		t.Errorf("text %q", email.Text)
	}
}

func TestRefusesAnUnknownKind(t *testing.T) {
	if _, err := Render(sample("newsletter"), site); err == nil {
		t.Fatal("expected an error")
	}
}

func TestWritesAnEmailForEveryJobTheAPIBuilds(t *testing.T) {
	for _, file := range []string{"reminder.json", "changed.json", "cancelled.json"} {
		raw, err := os.ReadFile(filepath.Join("..", "..", "testdata", "contract", file))
		if err != nil {
			t.Fatal(err)
		}
		j, err := job.Parse(raw)
		if err != nil {
			t.Fatalf("%s: %v", file, err)
		}
		email, err := Render(j, site)
		if err != nil {
			t.Fatalf("%s: %v", file, err)
		}
		if email.Subject == "" || !strings.Contains(email.Text, "Beach clean-up") || !strings.Contains(email.Text, "Mumbai") && !strings.Contains(email.Text, "Versova") {
			t.Errorf("%s: unexpected email %+v", file, email)
		}
	}
}
