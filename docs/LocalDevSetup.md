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

This guide starts both apps against a MongoDB server running on your computer.
It does not need a MongoDB Atlas account, production credentials, or personal data.

## 0. Prerequisites

- Node.js 20.19+ or 22.12+, and pnpm 11.22.0 as pinned in the root package manifest.
- A local MongoDB server. Install MongoDB on your computer, use an existing local MongoDB, or use the optional Docker shortcut below.

## 1. Install dependencies

From the repository root, install the pinned pnpm version and workspace dependencies:

```bash
npm install --global pnpm@11.22.0
pnpm install --frozen-lockfile
```

## 2. Start MongoDB

The API needs MongoDB running, but it does not need pre-existing records.
An empty local database is enough to start the apps; organizations and events will show no results until you create or add data.

If MongoDB is already installed on your computer, start its service and confirm it answers locally:

```bash
mongosh "mongodb://localhost:27017/karmacircle" --quiet --eval "db.runCommand({ping:1})"
```

Or use Docker as a shortcut if you have a Docker-compatible runtime installed and running:

```bash
docker compose -f docker-compose.local.yml up -d
```

This starts a `mongo:7` container (`karmacircle-local-mongo`) on `localhost:27017`, with a named Docker volume so your local development data survives restarts.
This optional local-only database is not used in CI or production.

Confirm it's actually up:

```bash
docker exec karmacircle-local-mongo mongosh --quiet --eval "db.runCommand({ping:1})"
```

Should print `{ ok: 1 }`.

## 3. Set up the backend (`apps/api`)

```bash
cp apps/api/.env.example apps/api/.env
```

The example file contains working local defaults for the API and local MongoDB.
It contains development-only placeholder secrets, not credentials for a real account or deployment.
Keep these values local and use a separate development database.
Never point `MONGO_URI` at production or a database containing important personal data.

| Variable | Local setting | Notes |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/karmacircle` | Local MongoDB from step 2, whether installed directly or run through Docker. |
| `PORT` | `5050` | API port; keep callback and frontend URLs in sync if changed. |
| `JWT_SECRET`, `SECRET_KEY` | Local-only placeholders in example | Required to boot. Replace with random local values before using real accounts; never reuse in production. |
| `CLIENT_ID`, `CLIENT_SECRET` | Local placeholders in example | Required to boot, but Google sign-in works only with your own Google Cloud OAuth credentials and registered callback. |
| `CALLBACK_URL` | `http://localhost:5050/auth/google/callback` | Must match API port and Google Cloud callback when using OAuth. |
| `successURL` | `http://localhost:3000/` | OAuth redirect destination. |
| `ORIGIN_URL` | `http://localhost:3000` | Frontend origin, CORS origin, and password-reset link base. Keep `http` for local auth cookies. |
| `CORS_ORIGINS` | Empty | Optional comma-separated extra browser origins. Leave empty for the default local setup. |
| `ORIGIN_DOMAIN` | Empty | Keep empty for localhost so the browser accepts auth cookies. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Empty | Optional. Add test-account keys only when testing payments. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Empty | Not needed locally. Development captures reset links and does not send email. |
| `NODE_ENV` | Defaults to `development` | Do not set to `production` for local development. |

If you want real Google sign-in, set `CLIENT_ID` and `CLIENT_SECRET` from your own Google Cloud project and register the exact `CALLBACK_URL` there.
Never use production OAuth credentials for local development.

## 4. Set up the frontend (`apps/web`)

```bash
cp apps/web/.env.example apps/web/.env
```

The example file sets `VITE_API_URL` to the local API.
Keep it in sync with the API `PORT` if you change that port.

```
VITE_API_URL="http://localhost:5050"
```

`VITE_RAZORPAY_KEY_ID` can stay empty unless testing payments.
`VITE_GEOAPIFY_API_KEY` is optional and client-visible; use your own provider key with suitable restrictions, or leave it empty to use plain text address input.

## 5. Run both

Run both apps from the repository root:

```bash
pnpm dev
```

The root command runs each app's `dev` script through Turborepo.
The API uses port `5050`; the frontend uses port `3000`.
Stop both with `Ctrl-C`.

## 6. Verify it's actually working

```bash
curl http://localhost:5050/health
# {"status":"ok","mongo":"connected"}
```

This confirms the API and MongoDB connection.
The frontend development server reports `http://localhost:3000/` when ready.
No browser account or real email is needed for this startup check.
`http://localhost:5050/docs` provides Swagger UI when you want to inspect API routes.

## Stopping / cleaning up

- Stop the dev servers: `Ctrl-C` in each terminal.
- If using Docker, stop Mongo while keeping its data: `docker compose -f docker-compose.local.yml stop`.
- Remove the Docker MongoDB container and volume only when you intend to erase its data: `docker compose -f docker-compose.local.yml down -v`.

## Known gotchas

- **Port 5000 is often already taken on macOS** by the system's AirPlay Receiver (`ControlCenter` process) - you'll get `EADDRINUSE` even though nothing in this repo is using it. Easiest fix: run the backend on a different port (this guide uses `5050`), rather than disabling AirPlay Receiver. Check what's squatting on a port with `lsof -i :5000 -sTCP:LISTEN`.
- Google OAuth placeholders in `apps/api/.env.example` let the API boot but cannot authenticate users. Use your own Google Cloud OAuth credentials only if you want to test Google sign-in.
- Razorpay keys are optional in `src/config/env.ts`; local development and tests can run without them.
