// Package render writes the emails. Every value that came from a person (an
// event name, a place) goes through html/template, which escapes it for the
// context it lands in, so an event called `<script>` stays text.
package render

import (
	"bytes"
	"fmt"
	htmltemplate "html/template"
	"net/url"
	"strings"
	texttemplate "text/template"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
)

// Email is a finished message, without its sender and receiver.
type Email struct {
	Subject string
	HTML    string
	Text    string
}

type changeView struct {
	Label string
	From  string
	To    string
}

type view struct {
	Heading    string
	Greeting   string
	Lead       string
	EventName  string
	When       string
	Where      string
	Changes    []changeView
	URL        string
	ButtonText string
	Closing    string
}

const htmlBody = `<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
  <h2>{{.Heading}}</h2>
  <p>{{.Greeting}}</p>
  <p>{{.Lead}}</p>
  <p><strong>{{.EventName}}</strong><br />{{.When}}{{if .Where}}<br />{{.Where}}{{end}}</p>
  {{- if .Changes}}
  <ul>
    {{- range .Changes}}
    <li>{{.Label}}: was <s>{{.From}}</s>, now <strong>{{.To}}</strong></li>
    {{- end}}
  </ul>
  {{- end}}
  <p><a href="{{.URL}}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">{{.ButtonText}}</a></p>
  <p>{{.Closing}}<br />KarmaCircle</p>
</div>`

const textBody = `{{.Heading}}

{{.Greeting}}

{{.Lead}}

{{.EventName}}
{{.When}}{{if .Where}}
{{.Where}}{{end}}
{{- if .Changes}}
{{range .Changes}}
- {{.Label}}: was {{.From}}, now {{.To}}{{end}}
{{- end}}

{{.ButtonText}}: {{.URL}}

{{.Closing}}
KarmaCircle
`

var (
	htmlTemplate = htmltemplate.Must(htmltemplate.New("email").Parse(htmlBody))
	// Plain text: nothing is escaped, and nothing is interpreted as markup.
	textTemplate = texttemplate.Must(texttemplate.New("email").Parse(textBody))
)

// Render writes the email for a job. siteURL is the public address of the web
// app, without a trailing slash.
func Render(j job.Job, siteURL string) (Email, error) {
	loc, zoneName := location(j.Event.Timezone)
	when := formatTime(j.Event.StartTime, loc)
	greeting := "Hi there,"
	if name := strings.TrimSpace(j.Name); name != "" {
		greeting = fmt.Sprintf("Hi %s,", name)
	}

	v := view{
		Greeting:  greeting,
		EventName: j.Event.Name,
		When:      when,
		Where:     j.Event.Place,
		URL:       siteURL + "/events/" + url.PathEscape(j.Event.UID),
	}

	var subject string
	switch j.Kind {
	case job.KindReminder:
		subject = fmt.Sprintf("Reminder: %s starts %s", j.Event.Name, shortTime(j.Event.StartTime, loc))
		v.Heading = "Your event is coming up"
		v.Lead = "A reminder that you are signed up for:"
		v.ButtonText = "View event details"
		v.Closing = "See you there,"
	case job.KindChanged:
		subject = fmt.Sprintf("Update: %s has changed", j.Event.Name)
		v.Heading = "Your event has changed"
		v.Lead = "The organizer changed something about an event you are signed up for. It now reads:"
		v.ButtonText = "View event details"
		v.Closing = "If the new plan does not work for you, you can leave the event from its page."
		for _, c := range j.Changes {
			v.Changes = append(v.Changes, changeFor(c, loc))
		}
	case job.KindCancelled:
		subject = fmt.Sprintf("Cancelled: %s", j.Event.Name)
		v.Heading = "Your event was cancelled"
		v.Lead = "We are sorry: the organizer cancelled an event you were signed up for. It was due to be:"
		v.ButtonText = "View event page"
		v.Closing = "Thank you for your interest."
	default:
		return Email{}, fmt.Errorf("%w: unknown kind %q", job.ErrInvalid, j.Kind)
	}
	_ = zoneName

	var htmlOut, textOut bytes.Buffer
	if err := htmlTemplate.Execute(&htmlOut, v); err != nil {
		return Email{}, err
	}
	if err := textTemplate.Execute(&textOut, v); err != nil {
		return Email{}, err
	}
	return Email{Subject: oneLine(subject), HTML: htmlOut.String(), Text: textOut.String()}, nil
}

// location returns the event's own timezone, or UTC, said plainly, when it has
// none or the name is not one this machine knows.
func location(name string) (*time.Location, string) {
	if name != "" {
		if loc, err := time.LoadLocation(name); err == nil {
			return loc, name
		}
	}
	return time.UTC, "UTC"
}

func formatTime(t time.Time, loc *time.Location) string {
	return t.In(loc).Format("Monday 2 January 2006, 3:04 PM MST")
}

func shortTime(t time.Time, loc *time.Location) string {
	return t.In(loc).Format("Mon 2 Jan, 3:04 PM MST")
}

func changeFor(c job.Change, loc *time.Location) changeView {
	label := map[string]string{
		"start": "Start time", "end": "End time", "place": "Place", "mode": "Format", "link": "Link",
	}[c.Field]
	if label == "" {
		label = c.Field
	}
	from, to := c.From, c.To
	if c.Field == "start" || c.Field == "end" {
		from, to = reformat(from, loc), reformat(to, loc)
	}
	if from == "" {
		from = "not set"
	}
	if to == "" {
		to = "not set"
	}
	return changeView{Label: label, From: from, To: to}
}

// reformat shows an RFC 3339 time in the event's zone, and leaves anything
// else as it was.
func reformat(value string, loc *time.Location) string {
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return formatTime(t, loc)
	}
	return value
}

// oneLine keeps a subject on one line: a line break in a header is how
// someone could add a header of their own.
func oneLine(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
