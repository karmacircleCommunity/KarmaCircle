package job

import (
	"os"
	"path/filepath"
	"testing"
)

// The API tests (apps/api/tests/notification-jobs.test.ts) check that what the
// API builds equals these files. Here the worker checks that it can read them.
// Change the shape on one side only and one of the two fails.
func TestWorkerReadsEveryJobTheAPIBuilds(t *testing.T) {
	cases := map[string]string{
		"reminder.json":  KindReminder,
		"changed.json":   KindChanged,
		"cancelled.json": KindCancelled,
	}
	for file, kind := range cases {
		raw, err := os.ReadFile(filepath.Join("..", "..", "testdata", "contract", file))
		if err != nil {
			t.Fatal(err)
		}
		j, err := Parse(raw)
		if err != nil {
			t.Fatalf("%s: %v", file, err)
		}
		if j.Kind != kind || j.Event.UID != "beach-day" || j.To != "asha@example.com" {
			t.Errorf("%s: read as %+v", file, j)
		}
		if j.Event.StartTime.IsZero() || j.RunAt.IsZero() {
			t.Errorf("%s: times were not read", file)
		}
	}
}
