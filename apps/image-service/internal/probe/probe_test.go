package probe

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHealthyServiceIsHealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) }))
	defer server.Close()

	if err := Check(server.URL, time.Second); err != nil {
		t.Fatal(err)
	}
}

func TestAServiceThatAnswersNot200IsNotHealthy(t *testing.T) {
	for _, status := range []int{500, 503, 404, 302} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(status) }))
		err := Check(server.URL, time.Second)
		server.Close()
		if err == nil {
			t.Errorf("status %d counted as healthy", status)
		}
	}
}

func TestNothingListeningIsNotHealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	url := server.URL
	server.Close()

	if err := Check(url, time.Second); err == nil {
		t.Fatal("a closed port counted as healthy")
	}
}

func TestAServiceThatHangsIsNotHealthyAndDoesNotHangTheCheck(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { time.Sleep(500 * time.Millisecond) }))
	defer server.Close()
	started := time.Now()

	err := Check(server.URL, 50*time.Millisecond)

	if err == nil || time.Since(started) > 400*time.Millisecond {
		t.Fatalf("err=%v after %v", err, time.Since(started))
	}
}

func TestURLPointsAtTheServiceOnItsOwnMachine(t *testing.T) {
	if got := URL("8081"); got != "http://127.0.0.1:8081/healthz" || !strings.HasSuffix(got, "/healthz") {
		t.Fatal(got)
	}
}
