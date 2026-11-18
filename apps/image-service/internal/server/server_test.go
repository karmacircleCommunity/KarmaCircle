package server

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/auth"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/config"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/storage"
)

const (
	testSecret = "0123456789abcdef0123456789abcdef"
	publicBase = "https://images.example.org"
	siteOrigin = "https://www.example.org"
)

type harness struct {
	server  *Server
	handler http.Handler
	store   *storage.Memory
	logs    *bytes.Buffer
}

func newHarness(t *testing.T, change func(*config.Config)) *harness {
	t.Helper()
	cfg := config.Config{
		Secret: testSecret, PublicBaseURL: publicBase, AllowedOrigins: []string{siteOrigin},
		MaxUploadBytes: 1 << 20, MaxPixels: 4_000_000, MaxConcurrentJobs: 2,
	}
	if change != nil {
		change(&cfg)
	}
	logs := &bytes.Buffer{}
	store := storage.NewMemory()
	s := newServer(cfg, store, slog.New(slog.NewJSONHandler(logs, nil)))
	return &harness{server: s, handler: s.handler(), store: store, logs: logs}
}

func token(t *testing.T, mutate func(*auth.Claims)) string {
	t.Helper()
	now := time.Now()
	claims := auth.Claims{Purpose: auth.PurposeEventCover, RegisteredClaims: jwt.RegisteredClaims{
		Issuer: auth.Issuer, Subject: "user-1", Audience: jwt.ClaimStrings{auth.Audience},
		IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
	}}
	if mutate != nil {
		mutate(&claims)
	}
	raw, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func pngBytes(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.NRGBA{R: uint8(x), G: uint8(y), B: 90, A: 255})
		}
	}
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func multipartBody(t *testing.T, field string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	header := textproto.MIMEHeader{}
	header.Set("Content-Disposition", `form-data; name="`+field+`"; filename="cover.png"`)
	header.Set("Content-Type", "application/octet-stream")
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatal(err)
	}
	part.Write(data)
	writer.Close()
	return &body, writer.FormDataContentType()
}

func (h *harness) upload(t *testing.T, bearer, field string, data []byte, headers ...string) *httptest.ResponseRecorder {
	t.Helper()
	body, contentType := multipartBody(t, field, data)
	req := httptest.NewRequest(http.MethodPost, "/v1/images", body)
	req.Header.Set("Content-Type", contentType)
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	return rec
}

func (h *harness) get(path string, headers ...string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	return rec
}

func errorOf(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("not a JSON error: %q", rec.Body.String())
	}
	return body["error"]
}

// ---- the happy path --------------------------------------------------------

func TestUploadStoresEverySizeAndServesThemBack(t *testing.T) {
	h := newHarness(t, nil)

	rec := h.upload(t, token(t, nil), "file", pngBytes(t, 900, 600))

	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var out uploadResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.ID) != 32 || out.Width != 900 || out.Height != 600 {
		t.Fatalf("unexpected response %+v", out)
	}
	if len(out.Variants) != 3 || len(h.store.Keys()) != 3 {
		t.Fatalf("variants %d, stored %d", len(out.Variants), len(h.store.Keys()))
	}
	card := out.Variants["card"]
	if card.URL != publicBase+"/v1/images/"+out.ID+"/card" || card.Width != 800 || card.Height != 533 {
		t.Fatalf("unexpected card %+v", card)
	}

	served := h.get("/v1/images/" + out.ID + "/card")
	if served.Code != http.StatusOK || served.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("serve: %d %s", served.Code, served.Header().Get("Content-Type"))
	}
	if !strings.Contains(served.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("Cache-Control %q", served.Header().Get("Cache-Control"))
	}
	if _, err := jpeg.Decode(served.Body); err != nil {
		t.Fatalf("served bytes are not a JPEG: %v", err)
	}
	if served.Header().Get("Cross-Origin-Resource-Policy") != "cross-origin" {
		t.Error("the site could not show the image from another origin")
	}
}

func TestServeAnswers304ForARepeatVisit(t *testing.T) {
	h := newHarness(t, nil)
	var out uploadResponse
	json.Unmarshal(h.upload(t, token(t, nil), "file", pngBytes(t, 100, 100)).Body.Bytes(), &out)
	first := h.get("/v1/images/" + out.ID + "/thumb")

	again := h.get("/v1/images/"+out.ID+"/thumb", "If-None-Match", first.Header().Get("ETag"))

	if again.Code != http.StatusNotModified || again.Body.Len() != 0 {
		t.Fatalf("got %d with %d bytes", again.Code, again.Body.Len())
	}
}

// ---- who may upload --------------------------------------------------------

func TestUploadNeedsAValidToken(t *testing.T) {
	h := newHarness(t, nil)
	png := pngBytes(t, 50, 50)
	expired := token(t, func(c *auth.Claims) {
		c.IssuedAt = jwt.NewNumericDate(time.Now().Add(-10 * time.Minute))
		c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-5 * time.Minute))
	})
	wrongPurpose := token(t, func(c *auth.Claims) { c.Purpose = "other" })

	for name, bearer := range map[string]string{"none": "", "garbage": "not-a-token", "expired": expired, "wrong purpose": wrongPurpose} {
		rec := h.upload(t, bearer, "file", png)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s: status %d, want 401", name, rec.Code)
		}
	}
	if len(h.store.Keys()) != 0 {
		t.Error("something was stored without a valid token")
	}
}

func TestTheAnswerToABadTokenDoesNotSayWhy(t *testing.T) {
	h := newHarness(t, nil)
	rec := h.upload(t, "not-a-token", "file", pngBytes(t, 20, 20))
	if strings.Contains(strings.ToLower(errorOf(t, rec)), "signature") {
		t.Error("the answer explains how the token failed")
	}
}

// ---- what may be uploaded --------------------------------------------------

func TestUploadRefusesBadFiles(t *testing.T) {
	h := newHarness(t, func(c *config.Config) { c.MaxUploadBytes = 4096; c.MaxPixels = 10_000 })
	good := token(t, nil)

	cases := []struct {
		name   string
		field  string
		data   []byte
		status int
	}{
		{"text", "file", []byte("hello, not a picture"), http.StatusUnsupportedMediaType},
		{"script named like an image", "file", []byte("<script>alert(1)</script>"), http.StatusUnsupportedMediaType},
		{"over the size limit", "file", bytes.Repeat([]byte{0x89}, 5000), http.StatusRequestEntityTooLarge},
		{"too many pixels", "file", pngBytes(t, 200, 200), http.StatusRequestEntityTooLarge},
		{"damaged picture", "file", append(pngBytes(t, 40, 40)[:60], bytes.Repeat([]byte{1}, 64)...), http.StatusUnprocessableEntity},
		{"wrong field name", "photo", pngBytes(t, 40, 40), http.StatusBadRequest},
		{"empty file", "file", nil, http.StatusBadRequest},
	}
	for _, c := range cases {
		rec := h.upload(t, good, c.field, c.data)
		if rec.Code != c.status {
			t.Errorf("%s: status %d, want %d (%s)", c.name, rec.Code, c.status, rec.Body)
		}
	}
	if len(h.store.Keys()) != 0 {
		t.Errorf("refused uploads left %d objects behind", len(h.store.Keys()))
	}
}

func TestUploadRefusesAnythingButMultipart(t *testing.T) {
	h := newHarness(t, nil)
	req := httptest.NewRequest(http.MethodPost, "/v1/images", strings.NewReader(`{"file":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token(t, nil))
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestAHugeBodyIsCutOffNotReadIntoMemory(t *testing.T) {
	h := newHarness(t, func(c *config.Config) { c.MaxUploadBytes = 1024 })
	// 200 KB against a 1 KB limit (plus the form overhead allowance).
	rec := h.upload(t, token(t, nil), "file", bytes.Repeat([]byte{7}, 200<<10))
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status %d", rec.Code)
	}
}

// ---- failure and load ------------------------------------------------------

func TestAStorageFailureIsReportedAndNothingIsClaimed(t *testing.T) {
	h := newHarness(t, nil)
	h.store.FailPut = errors.New("disk full")

	rec := h.upload(t, token(t, nil), "file", pngBytes(t, 60, 60))

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "disk full") {
		t.Error("the internal error text reached the caller")
	}
}

func TestWhenEverySlotIsBusyTheServiceSaysSoInsteadOfPilingUp(t *testing.T) {
	h := newHarness(t, func(c *config.Config) { c.MaxConcurrentJobs = 1 })
	h.server.queueWait = 30 * time.Millisecond
	h.server.slots <- struct{}{} // one upload is "being processed"

	rec := h.upload(t, token(t, nil), "file", pngBytes(t, 60, 60))

	if rec.Code != http.StatusServiceUnavailable || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("status %d, Retry-After %q", rec.Code, rec.Header().Get("Retry-After"))
	}
	<-h.server.slots
	if again := h.upload(t, token(t, nil), "file", pngBytes(t, 60, 60)); again.Code != http.StatusCreated {
		t.Fatalf("after the slot freed, status %d", again.Code)
	}
}

// ---- serving ---------------------------------------------------------------

func TestServeOnlyAnswersForRealIDsAndKnownSizes(t *testing.T) {
	h := newHarness(t, nil)
	good := strings.Repeat("a", 32)
	for _, path := range []string{
		"/v1/images/" + good + "/card",    // valid shape, nothing stored
		"/v1/images/" + good + "/huge",    // unknown size
		"/v1/images/short/card",           // not an id
		"/v1/images/%2e%2e%2f%2e%2e/card", // traversal attempt
		"/v1/images/" + strings.ToUpper(good) + "/card",
	} {
		if rec := h.get(path); rec.Code != http.StatusNotFound {
			t.Errorf("%s: status %d, want 404", path, rec.Code)
		}
	}
}

// ---- plumbing --------------------------------------------------------------

func TestHealth(t *testing.T) {
	h := newHarness(t, nil)
	if rec := h.get("/healthz"); rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	h.server.store = brokenStore{h.store}
	rec := h.get("/healthz")
	if rec.Code != http.StatusServiceUnavailable || !strings.Contains(rec.Body.String(), "degraded") {
		t.Fatalf("status %d body %s", rec.Code, rec.Body)
	}
}

type brokenStore struct{ *storage.Memory }

func (brokenStore) Ping(context.Context) error { return errors.New("bucket gone") }

func TestRequestIDIsKeptWhenSafeAndReplacedWhenNot(t *testing.T) {
	h := newHarness(t, nil)
	if got := h.get("/healthz", "X-Request-Id", "api-req-123").Header().Get("X-Request-Id"); got != "api-req-123" {
		t.Errorf("a clean id was not kept: %q", got)
	}
	got := h.get("/healthz", "X-Request-Id", "bad id\"with{stuff}").Header().Get("X-Request-Id")
	if len(got) != 32 || strings.ContainsAny(got, " \"{}") {
		t.Errorf("an unsafe id was not replaced: %q", got)
	}
}

func TestTheLogNeverHoldsTheToken(t *testing.T) {
	h := newHarness(t, nil)
	secretToken := token(t, nil)

	h.upload(t, secretToken, "file", pngBytes(t, 60, 60))
	h.upload(t, secretToken+"x", "file", pngBytes(t, 60, 60))

	logged := h.logs.String()
	if logged == "" || strings.Contains(logged, secretToken) || strings.Contains(logged, "Authorization") {
		t.Fatalf("log is empty or leaks the token:\n%s", logged)
	}
}

func TestCORSAllowsOnlyListedSites(t *testing.T) {
	h := newHarness(t, nil)

	preflight := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, "/v1/images", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "POST")
		rec := httptest.NewRecorder()
		h.handler.ServeHTTP(rec, req)
		return rec
	}

	ok := preflight(siteOrigin)
	if ok.Code != http.StatusNoContent || ok.Header().Get("Access-Control-Allow-Origin") != siteOrigin ||
		!strings.Contains(ok.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Fatalf("listed site: %d %v", ok.Code, ok.Header())
	}
	if blocked := preflight("https://evil.example.com"); blocked.Code != http.StatusForbidden ||
		blocked.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("unlisted site: %d %v", blocked.Code, blocked.Header())
	}

	rec := h.upload(t, token(t, nil), "file", pngBytes(t, 60, 60), "Origin", siteOrigin)
	if rec.Header().Get("Access-Control-Allow-Origin") != siteOrigin {
		t.Error("the real upload response is missing the CORS header")
	}
	if rec.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Error("credentials must not be allowed: the upload uses a bearer token, not cookies")
	}
}

func TestAPanicBecomesA500NotACrash(t *testing.T) {
	h := newHarness(t, nil)
	h.server.store = panicStore{h.store}
	rec := h.get("/healthz")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", rec.Code)
	}
	if body, _ := io.ReadAll(rec.Body); strings.Contains(string(body), "boom") {
		t.Error("the panic text reached the caller")
	}
}

type panicStore struct{ *storage.Memory }

func (panicStore) Ping(context.Context) error { panic("boom") }
