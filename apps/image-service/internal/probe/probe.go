// Package probe is the container health check. The runtime image has no shell
// and no curl, so the service itself answers "are you healthy": the container
// runs `<binary> healthcheck`, which asks the running process for /healthz.
package probe

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

// Check asks url for a 200 within the timeout.
func Check(url string, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("%s answered %d", url, res.StatusCode)
	}
	return nil
}

// URL is where the service listens on its own machine.
func URL(port string) string { return "http://127.0.0.1:" + port + "/healthz" }
