// Package server is the HTTP side: upload, serve, health, and the plumbing
// every request goes through (request id, log, CORS, panic recovery).
package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/auth"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/config"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/imageproc"
	"github.com/karmacirclecommunity/karmacircle/apps/image-service/internal/storage"
)

const (
	// multipartOverhead is room for the form's boundaries and headers on top
	// of the file itself.
	multipartOverhead = 64 << 10

	// defaultQueueWait is how long an upload waits for a free processing slot
	// before the service says "busy".
	defaultQueueWait = 5 * time.Second
)

var (
	idPattern     = regexp.MustCompile(`^[0-9a-f]{32}$`)
	requestIDSafe = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)
)

// Server holds what the handlers share.
type Server struct {
	cfg      config.Config
	store    storage.Store
	verifier *auth.Verifier
	log      *slog.Logger
	slots    chan struct{}

	// queueWait is how long an upload waits for a free processing slot.
	queueWait time.Duration
}

// New builds the handler for the whole service.
func New(cfg config.Config, store storage.Store, log *slog.Logger) http.Handler {
	return newServer(cfg, store, log).handler()
}

func newServer(cfg config.Config, store storage.Store, log *slog.Logger) *Server {
	return &Server{
		cfg:       cfg,
		store:     store,
		verifier:  auth.NewVerifier(cfg.Secret),
		log:       log,
		slots:     make(chan struct{}, cfg.MaxConcurrentJobs),
		queueWait: defaultQueueWait,
	}
}

func (s *Server) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/images", s.upload)
	mux.HandleFunc("GET /v1/images/{id}/{variant}", s.serve)
	mux.HandleFunc("GET /healthz", s.health)

	return s.requestID(s.recoverPanics(s.accessLog(s.cors(mux))))
}

// ---- responses -------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// ---- upload ----------------------------------------------------------------

type variantInfo struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Bytes  int    `json:"bytes"`
}

type uploadResponse struct {
	ID       string                 `json:"id"`
	Width    int                    `json:"width"`
	Height   int                    `json:"height"`
	Variants map[string]variantInfo `json:"variants"`
}

func (s *Server) upload(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	log := s.log.With("request_id", requestIDFrom(r.Context()))

	token, ok := bearerToken(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "an upload token is required")
		return
	}
	claims, err := s.verifier.Verify(token)
	if err != nil {
		log.Info("upload token refused", "reason", err.Error())
		writeError(w, http.StatusUnauthorized, "the upload token is invalid or has expired")
		return
	}

	mediaType, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if mediaType != "multipart/form-data" {
		writeError(w, http.StatusUnsupportedMediaType, "send the image as multipart/form-data in a field named file")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxUploadBytes+multipartOverhead)
	data, err := readFilePart(r, s.cfg.MaxUploadBytes)
	if err != nil {
		s.uploadReadError(w, log, err)
		return
	}

	release, ok := s.acquire(r.Context())
	if !ok {
		w.Header().Set("Retry-After", "5")
		writeError(w, http.StatusServiceUnavailable, "the service is busy, try again in a few seconds")
		return
	}
	defer release()

	source, outputs, err := imageproc.Process(r.Context(), data, s.cfg.MaxPixels)
	if err != nil {
		s.processError(w, log, err)
		return
	}

	id, err := newID()
	if err != nil {
		log.Error("could not create an id", "error", err)
		writeError(w, http.StatusInternalServerError, "could not store the image")
		return
	}

	response := uploadResponse{ID: id, Width: source.Width, Height: source.Height, Variants: map[string]variantInfo{}}
	for _, out := range outputs {
		if err := s.store.Put(r.Context(), objectKey(id, out.Name), out.Data, "image/jpeg"); err != nil {
			log.Error("could not store a variant", "id", id, "variant", out.Name, "error", err)
			writeError(w, http.StatusBadGateway, "could not store the image")
			return
		}
		response.Variants[out.Name] = variantInfo{
			URL:    fmt.Sprintf("%s/v1/images/%s/%s", s.cfg.PublicBaseURL, id, out.Name),
			Width:  out.Width,
			Height: out.Height,
			Bytes:  len(out.Data),
		}
	}

	log.Info("image stored",
		"id", id, "subject", claims.Subject, "format", source.Format,
		"width", source.Width, "height", source.Height,
		"input_bytes", len(data), "duration_ms", time.Since(started).Milliseconds())
	writeJSON(w, http.StatusCreated, response)
}

// acquire waits for one of the processing slots. Decoding a big photo takes
// a lot of memory, so only a few run at once and the rest wait their turn.
func (s *Server) acquire(ctx context.Context) (release func(), ok bool) {
	timer := time.NewTimer(s.queueWait)
	defer timer.Stop()
	select {
	case s.slots <- struct{}{}:
		return func() { <-s.slots }, true
	case <-timer.C:
		return nil, false
	case <-ctx.Done():
		return nil, false
	}
}

var errNoFile = errors.New("no file field in the upload")

// errTooLarge means the file part is bigger than the limit.
var errTooLarge = errors.New("the file is too large")

// readFilePart streams the form and reads only the part named "file", up to
// limit bytes. Reading it as a stream means a huge upload is cut off at the
// limit instead of being read into memory first.
func readFilePart(r *http.Request, limit int64) ([]byte, error) {
	reader, err := r.MultipartReader()
	if err != nil {
		return nil, err
	}
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			return nil, errNoFile
		}
		if err != nil {
			return nil, err
		}
		if part.FormName() != "file" {
			continue
		}
		data, err := io.ReadAll(io.LimitReader(part, limit+1))
		if err != nil {
			return nil, err
		}
		if int64(len(data)) > limit {
			return nil, errTooLarge
		}
		if len(data) == 0 {
			return nil, errNoFile
		}
		return data, nil
	}
}

func (s *Server) uploadReadError(w http.ResponseWriter, log *slog.Logger, err error) {
	var tooBig *http.MaxBytesError
	switch {
	case errors.Is(err, errTooLarge) || errors.As(err, &tooBig):
		writeError(w, http.StatusRequestEntityTooLarge,
			fmt.Sprintf("the image is larger than %d MB", s.cfg.MaxUploadBytes>>20))
	case errors.Is(err, errNoFile):
		writeError(w, http.StatusBadRequest, "send the image in a form field named file")
	default:
		log.Info("could not read the upload", "error", err.Error())
		writeError(w, http.StatusBadRequest, "the upload could not be read")
	}
}

func (s *Server) processError(w http.ResponseWriter, log *slog.Logger, err error) {
	switch {
	case errors.Is(err, imageproc.ErrNotImage), errors.Is(err, imageproc.ErrUnsupported):
		writeError(w, http.StatusUnsupportedMediaType, "only JPEG, PNG, GIF and WebP images are accepted")
	case errors.Is(err, imageproc.ErrTooManyPixels):
		writeError(w, http.StatusRequestEntityTooLarge, "the image has too many pixels, resize it and try again")
	case errors.Is(err, imageproc.ErrCorrupt), errors.Is(err, imageproc.ErrEmptyDimension):
		writeError(w, http.StatusUnprocessableEntity, "the image is damaged and could not be read")
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		writeError(w, http.StatusServiceUnavailable, "the upload was cancelled")
	default:
		log.Error("could not process an image", "error", err)
		writeError(w, http.StatusInternalServerError, "could not process the image")
	}
}

func bearerToken(r *http.Request) (string, bool) {
	scheme, token, found := strings.Cut(r.Header.Get("Authorization"), " ")
	if !found || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(token) == "" {
		return "", false
	}
	return strings.TrimSpace(token), true
}

func newID() (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

func objectKey(id, variant string) string { return "images/" + id + "/" + variant + ".jpg" }

// ---- serve -----------------------------------------------------------------

func (s *Server) serve(w http.ResponseWriter, r *http.Request) {
	id, variant := r.PathValue("id"), r.PathValue("variant")
	if !idPattern.MatchString(id) || !knownVariant(variant) {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}

	// The id is random and the bytes under it never change, so the browser and
	// any CDN may keep a copy for good.
	etag := `"` + id + "-" + variant + `"`
	if r.Header.Get("If-None-Match") == etag {
		w.Header().Set("ETag", etag)
		w.WriteHeader(http.StatusNotModified)
		return
	}

	object, size, err := s.store.Get(r.Context(), objectKey(id, variant))
	if errors.Is(err, storage.ErrNotFound) {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	if err != nil {
		s.log.Error("could not read an image", "id", id, "variant", variant, "error", err)
		writeError(w, http.StatusBadGateway, "could not read the image")
		return
	}
	defer object.Close()

	h := w.Header()
	h.Set("Content-Type", "image/jpeg")
	h.Set("Content-Length", fmt.Sprint(size))
	h.Set("Cache-Control", "public, max-age=31536000, immutable")
	h.Set("ETag", etag)
	// The site is on another origin and shows these in <img> tags.
	h.Set("Cross-Origin-Resource-Policy", "cross-origin")
	_, _ = io.Copy(w, object)
}

func knownVariant(name string) bool {
	for _, v := range imageproc.Variants {
		if v.Name == name {
			return true
		}
	}
	return false
}

// ---- health ----------------------------------------------------------------

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		s.log.Error("storage check failed", "error", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "storage": "unreachable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "storage": "connected"})
}

// ---- middleware ------------------------------------------------------------

type ctxKey int

const requestIDKey ctxKey = 0

func requestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// requestID keeps the id the API sent, so one request can be followed across
// both services, or makes one. Only plain characters are kept, since the
// value is written to logs and headers.
func (s *Server) requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if !requestIDSafe.MatchString(id) {
			id, _ = newID()
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}

func (rec *statusRecorder) Write(p []byte) (int, error) {
	if rec.status == 0 {
		rec.status = http.StatusOK
	}
	n, err := rec.ResponseWriter.Write(p)
	rec.bytes += n
	return n, err
}

// accessLog writes one line per request. It never writes the Authorization
// header or the query string.
func (s *Server) accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		s.log.Info("request",
			"request_id", requestIDFrom(r.Context()),
			"method", r.Method, "path", r.URL.Path,
			"status", rec.status, "bytes", rec.bytes,
			"duration_ms", time.Since(started).Milliseconds())
	})
}

func (s *Server) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				s.log.Error("panic", "request_id", requestIDFrom(r.Context()), "panic", fmt.Sprint(recovered))
				writeError(w, http.StatusInternalServerError, "something went wrong")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// cors lets the listed sites call the upload from a browser. Anything else
// gets no CORS headers, and the browser blocks the call.
func (s *Server) cors(next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, origin := range s.cfg.AllowedOrigins {
		allowed[origin] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		origin := r.Header.Get("Origin")
		w.Header().Add("Vary", "Origin")
		if origin != "" && allowed[origin] {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Expose-Headers", "X-Request-Id")
			if r.Method == http.MethodOptions {
				h.Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id")
				h.Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		} else if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
