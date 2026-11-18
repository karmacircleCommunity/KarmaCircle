package mail

import (
	"context"
	"log/slog"
)

// Log writes the email to the log instead of sending it. For development, so
// no real address is ever emailed from a laptop.
type Log struct{ Logger *slog.Logger }

func (l Log) Send(_ context.Context, m Message) error {
	l.Logger.Info("email (not sent, logging only)",
		"subject", m.Subject, "to_domain", domainOf(m.To), "idempotency_key", m.IdempotencyKey, "text", m.Text)
	return nil
}

func domainOf(address string) string {
	for i := len(address) - 1; i >= 0; i-- {
		if address[i] == '@' {
			return address[i+1:]
		}
	}
	return ""
}
