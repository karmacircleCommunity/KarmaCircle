# Image service

A small Go service that takes event cover pictures from the browser, checks them, makes the sizes the site needs, and serves them back.
It exists because the old way (the browser sends the picture as text inside the event form) put every cover inside the event document, so the events list carried every picture.
Now the event keeps one short link.

## How a cover gets from the browser to an event

```
 browser                      API (Node)                  image service (Go)            storage
    |  POST /events/cover-upload  |                              |                        |
    |---------------------------->|  checks the session and      |                        |
    |                             |  that this is an organization|                        |
    |<--- { uploadUrl, token } ---|  signs a 5 minute token      |                        |
    |                                                            |                        |
    |  POST uploadUrl  (file + Authorization: Bearer token)      |                        |
    |----------------------------------------------------------->|  checks the token      |
    |                                                            |  checks the bytes      |
    |                                                            |  makes 3 JPEG sizes -->|
    |<--------------- { id, variants: { thumb, card, large } } --|                        |
    |                                                                                     |
    |  POST /events/create  { coverImage: <card url>, ... }  ->  API (stores the link only)
```

Why the browser talks to this service directly:
the API runs as serverless functions with a small request size limit, and a photo should not pass through it.
The API is still the only thing that knows who is signed in, so this service needs no database and never sees a session cookie.

## What it does to a picture

| Step | Why |
|---|---|
| Reads only the file header first, and refuses images over `MAX_PIXELS` | A small file can claim to be enormous and use gigabytes of memory when opened (a decompression bomb). |
| Decides the format from the bytes, never from the file name or `Content-Type` | A script renamed `cover.png` is still a script. Only JPEG, PNG, GIF and WebP pass. |
| Turns the picture upright from its EXIF orientation | A portrait photo from a phone is not stored on its side. |
| Puts transparent pixels on white | JPEG has no transparency, and they would turn black. |
| Makes `thumb` (400 px), `card` (800 px) and `large` (1600 px) wide JPEGs, never enlarging | The page asks for the size it needs. A small original stays sharp. |
| Writes new files, nothing is copied from the upload | All metadata is dropped, including the GPS position and camera details a phone records. |

Only a few pictures are processed at once (`MAX_CONCURRENT_JOBS`), because opening a big photo needs roughly `pixels x 8` bytes of memory.
The rest wait up to five seconds and then get `503` with `Retry-After`.

## API

| Route | Auth | What |
|---|---|---|
| `POST /v1/images` | `Authorization: Bearer <upload token>` | multipart form, field `file`. `201` with `{ id, width, height, variants: { thumb, card, large } }`, each with `url`, `width`, `height`, `bytes`. |
| `GET /v1/images/{id}/{variant}` | none | The JPEG. `Cache-Control: public, max-age=31536000, immutable`, an `ETag`, and `304` on a repeat visit. The id is random and the bytes never change. |
| `GET /healthz` | none | `200` when storage answers, `503` otherwise. |

Errors are `{ "error": "..." }`.
`401` bad or expired token, `413` too large or too many pixels, `415` not a supported image, `422` damaged image, `503` busy or storage down.

The upload token is an HS256 JWT signed by the API with the shared `IMAGE_SERVICE_SECRET`.
Claims: issuer `karmacircle-api`, audience `image-service`, `purpose: "event-cover"`, a `sub` that is a hash of the caller (never their email), an expiry of at most five minutes.
The service accepts HS256 only, so `alg: none` and algorithm-swap tricks fail.
The API's side is `apps/api/src/modules/events/cover-upload.service.ts`.

`image-service healthcheck` asks the running process for `/healthz` and exits 0 or 1: it is the container's health check, because the runtime image has no shell or curl.

Every request has an `X-Request-Id`; the web app sends the one the API gave the upload, so the API's log and this service's share an id.
One that the API sends is kept (if it is plain letters, digits, `.`, `_` or `-`), otherwise one is made, and it is in every log line and the response.
Logs are JSON on stdout.
The token and the `Authorization` header are never logged.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `IMAGE_SERVICE_SECRET` | required | 32 characters or more. Must equal the API's `IMAGE_SERVICE_SECRET`. |
| `PUBLIC_BASE_URL` | required | Where browsers reach this service, in the URLs it returns, for example `https://images.example.org`. |
| `ALLOWED_ORIGINS` | none | Comma separated sites that may upload from a browser (CORS). No credentials are allowed. |
| `PORT` | `8080` | |
| `STORAGE` | `fs` | `fs` (a folder) or `s3` (any S3 compatible bucket: S3, Cloudflare R2, MinIO). |
| `STORAGE_DIR` | `./data` | Folder for `STORAGE=fs`. |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | required for s3 | Endpoint is `host[:port]` with no scheme. |
| `S3_REGION` | `auto` | |
| `S3_USE_SSL` | `true` | `false` for a local MinIO. |
| `MAX_UPLOAD_BYTES` | `5242880` | Keep in step with the API's `COVER_MAX_BYTES`. |
| `MAX_PIXELS` | `40000000` | |
| `MAX_CONCURRENT_JOBS` | `2` | |

The service refuses to start and lists every problem if the settings are wrong.

## Run it

```bash
cd apps/image-service

# Without Docker: files go in ./data
IMAGE_SERVICE_SECRET="a-shared-secret-of-at-least-32-chars!!" \
PUBLIC_BASE_URL=http://localhost:8080 \
ALLOWED_ORIGINS=http://localhost:3000 \
go run ./cmd/image-service
```

Then give the API the same pair in `apps/api/.env`:

```
IMAGE_SERVICE_URL="http://localhost:8080"
IMAGE_SERVICE_SECRET="a-shared-secret-of-at-least-32-chars!!"
```

With Docker, a MinIO bucket and this service together:
`docker compose -f docker-compose.local.yml --profile images up -d` from the repository root.

## Tests

```bash
go vet ./... && go test -race ./...
```

They need no network and no storage service: an in-memory store stands in for the bucket.
They cover the token (expired, wrong secret, `alg: none`, wrong purpose, swapped payload), the picture handling (formats, orientation, metadata, transparency, size limits, a bomb refused before decoding), the HTTP behavior (limits, CORS, busy, storage failure, request ids, no token in logs) and path safety for the folder store.
The S3 store is the one piece they do not exercise, because it needs a real bucket.

## Not done yet

- A picture uploaded and then never attached to an event stays in storage. A bucket lifecycle rule or a periodic sweep would remove them.
- Nothing rate limits uploads per person except the five minute token that the API hands out.
- Existing events that still hold an inline base64 cover are not moved.
