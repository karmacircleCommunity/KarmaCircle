<!-- TOC -->

- [Local dev setup (frontend + backend + MongoDB)](#local-dev-setup-frontend--backend--mongodb)
  - [0. Prerequisites](#0-prerequisites)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Start MongoDB](#2-start-mongodb)
  - [3. Set up the backend (`apps/api`)](#3-set-up-the-backend-appsapi)
  - [4. Set up the frontend (`apps/web`)](#4-set-up-the-frontend-appsweb)
  - [5. Run both](#5-run-both)
  - [6. Verify it's actually working](#6-verify-its-actually-working)
  - [Stopping / cleaning up](#stopping--cleaning-up)
  - [Known gotchas](#known-gotchas)

<!-- /TOC -->

# Local dev setup (frontend + backend + MongoDB)

The fastest path to a fully working local stack - no MongoDB Atlas account needed, just a local Mongo container. Written to be followed top to bottom without needing to know anything else about the repo first.

## 0. Prerequisites

- Node.js 20.19+ or 22.12+, and pnpm 11.22.0.
- [OrbStack](https://orbstack.dev/) (or Docker Desktop - anything that gives you a working `docker` CLI) installed and running. If OrbStack is installed but not running: `open -a OrbStack`, then wait a few seconds for `docker info` to succeed.

## 1. Install dependencies

From the repository root, install the pinned pnpm version and workspace dependencies:

```bash
npm install --global pnpm@11.22.0
pnpm install --frozen-lockfile
```

## 2. Start MongoDB

One command, from the repo root:

```bash
docker compose -f docker-compose.local.yml up -d
```

This starts a `mongo:7` container (`karmacircle-local-mongo`) on `localhost:27017`, with a named Docker volume so your data survives restarts. It's local-dev-only infra - not used in CI or production.

Confirm it's actually up:

```bash
docker exec karmacircle-local-mongo mongosh --quiet --eval "db.runCommand({ping:1})"
```

Should print `{ ok: 1 }`.

## 3. Set up the backend (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

| Var | What to put |
|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/karmacircle` (points at the container from step 1) |
| `PORT` | `5050` - **not** `5000`, see [Known gotchas](#known-gotchas) |
| `CALLBACK_URL` | `http://localhost:5050/auth/google/callback` (must match `PORT`) |
| `JWT_SECRET` | Any random string - the example file's default is fine |
| `SECRET_KEY`, `CLIENT_ID`, `CLIENT_SECRET` | **Must be non-empty** even if you're not testing Google OAuth - any placeholder string works, e.g. `"local-dev-placeholder"`. The example file ships these as `""`, which fails startup validation - see [Known gotchas](#known-gotchas). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Same - must be non-empty, placeholder is fine unless testing payments |
| Everything else (`ORIGIN_URL`, `ORIGIN_DOMAIN`, `CORS_ORIGINS`, `successURL`) | Leave as the example file's defaults. `ORIGIN_DOMAIN` in particular must stay **empty** locally, or the browser will reject the auth cookies |

## 4. Set up the frontend (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` - the example file already sets `VITE_API_URL` to a placeholder; point it at your backend port:

```
VITE_API_URL="http://localhost:5050"
```

(`5050` to match the backend's `PORT` from step 2.) `VITE_RAZORPAY_KEY_ID` can stay empty or be placeholders unless you're testing the donate flow.

## 5. Run both

Run the apps in separate terminals so each service has its own logs:

```bash
# terminal 1
pnpm --filter karmacircle-api dev
# → API is running on port 5050, logs "Connected to MongoDB"

# terminal 2
pnpm --filter karmacircle-frontend dev
# → Local: http://localhost:3000/
```

## 6. Verify it's actually working

```bash
curl http://localhost:5050/health
# {"status":"ok","mongo":"connected"}
```

Then open `http://localhost:3000` in a browser and try signing up / signing in - that exercises the full path (frontend → CORS → backend → Mongo → JWT cookie) in one go. `http://localhost:5050/docs` gives you Swagger UI if you want to hit backend routes directly without the frontend.

## Stopping / cleaning up

- Stop the dev servers: `Ctrl-C` in each terminal.
- Stop Mongo (keeps your data for next time): `docker compose -f docker-compose.local.yml stop`
- Stop **and delete** Mongo's data: `docker compose -f docker-compose.local.yml down -v`

## Known gotchas

- **Port 5000 is often already taken on macOS** by the system's AirPlay Receiver (`ControlCenter` process) - you'll get `EADDRINUSE` even though nothing in this repo is using it. Easiest fix: run the backend on a different port (this guide uses `5050`), rather than disabling AirPlay Receiver. Check what's squatting on a port with `lsof -i :5000 -sTCP:LISTEN`.
- **`apps/api/.env.example` ships `SECRET_KEY`/`CLIENT_ID`/`CLIENT_SECRET`/`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` as empty strings**, but `src/config/env.ts`'s Zod schema requires all of them non-empty (`.min(1)`) - the server won't boot at all until you fill in at least a placeholder for each, even if you have no intention of using Google OAuth or Razorpay locally.
