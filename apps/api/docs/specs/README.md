# Milan Backend — Feature Specs

This directory is a map of the codebase for AI coding agents and new contributors.
Each file documents one module: what it does, which files implement it, the exact request/response shapes, and any known gaps or inconsistencies.
These specs describe the code as it exists today, including its rough edges — they are not aspirational.
When you change a module, update its spec file in the same PR so this map stays trustworthy.

This directory mirrors the structure of the frontend's own `docs/specs/` (see below) on purpose, so an agent working across both apps finds the same shape of map in each.

## What this project is

This is `milan-api`, the Express/TypeScript/MongoDB backend for **Milan** (product name; org name "NgoWorld"), a platform that connects NGOs, charities, clubs, and individual users.
It's one of two apps in this monorepo — its consumer is [apps/web](../../../web) (package name `milan-frontend`), a Vite + React SPA.
There is no server-rendered UI in this repo — it is a pure JSON API.
See [../../../../CLAUDE.md](../../../../CLAUDE.md) for how the two apps relate and how to read the frontend's own graph/specs when a change touches both sides.

## Tech stack

- **Express 4** on **Node** (`>=18`), written in **TypeScript** (`strict: true`), compiled with `tsc` for production and run via `tsx watch` in dev.
- **MongoDB** via **Mongoose 7** — one connection, opened once at boot (`src/config/database.ts`), reused by every module.
- **Zod** for request validation (`src/middleware/validate.ts` + one `<module>.validation.ts` per module) — also used to parse/validate `process.env` at startup (`src/config/env.ts`), so a missing/malformed env var fails fast with a readable error instead of `undefined` propagating into runtime code.
- **JWT (`jsonwebtoken`) + a browser cookie named `Token`** for session auth — not sessions/Redis, not `express-session`. See [auth.md](./auth.md).
- **Passport** (`passport-google-oauth20`) for the Google OAuth login flow, mounted alongside the JWT scheme — see [auth.md](./auth.md).
- **bcryptjs** for password hashing (10 salt rounds).
- **Razorpay** SDK for payment-order creation — see [payments.md](./payments.md).
- **Helmet, compression, cors, express-rate-limit, pino/pino-http** for the standard middleware stack — see [architecture.md](./architecture.md).
- **swagger-jsdoc + swagger-ui-express** — every route file carries `@openapi` JSDoc blocks; the generated spec is served at `/docs`. Treat a route's JSDoc block as documentation of intent, not as a guarantee it matches the Zod schema next to it — cross-check both when in doubt.
- **Jest + ts-jest + Supertest + mongodb-memory-server** for tests (`tests/*.test.ts`) — an in-memory Mongo instance per test run, no real database needed. Only `auth` and `events` have test files today; every other module is currently untested. See [architecture.md](./architecture.md#testing).
- **Vercel serverless** is the production deploy target (`api/index.ts` wraps `createApp()` as a handler, `vercel.json` rewrites everything to it); `npm start` (plain `node dist/src/server.ts` after `npm run build`) is the non-Vercel path. Both boot the exact same `createApp()` from `src/app.ts`. See [architecture.md](./architecture.md).

## Folder structure

The codebase is organized **module-first** under `src/modules/<name>/`, one folder per domain concept: `auth`, `users`, `clubs`, `directory`, `events`, `payments`, `products`, `reports`.
Every module folder follows the same file-per-concern pattern (not every module needs every file):

| File | Role |
|---|---|
| `<name>.routes.ts` | Express `Router`, path definitions, middleware wiring, `@openapi` JSDoc |
| `<name>.controller.ts` | Thin HTTP layer — reads `req`, calls the service, shapes the response. No business logic. |
| `<name>.service.ts` | Business logic and all Mongoose queries |
| `<name>.validation.ts` | Zod schemas + their inferred `z.infer` types, used by both `validate()` middleware and the controller's request-body casts |
| `<name>.model.ts` | Mongoose `Schema`/`model`, only in modules that own a collection (`users`, `events`, `products`, `reports` — `clubs`/`directory`/`auth`/`payments` don't have one; see below) |

`src/config/` (env, database, logger, passport, swagger), `src/middleware/` (auth, error-handler, rate-limit, validate), `src/constants/` (`STATUS_CODE`/`STATUS_MESSAGE`), and `src/utils/` (`asyncHandler`, `pagination`) hold everything shared across modules — see [architecture.md](./architecture.md) for what each does.
`src/routes/index.ts` mounts every module's router onto its base path; `src/app.ts` assembles the whole Express app (middleware stack + mounted routes); `src/server.ts` and `api/index.ts` are the two ways that app actually gets served (see [architecture.md](./architecture.md#two-entry-points)).

## Module map

| Spec | Covers | Mongoose model? | Auth required? |
|---|---|---|---|
| [architecture.md](./architecture.md) | App shell, middleware stack, config, two entry points, build/deploy, testing | — | — |
| [auth.md](./auth.md) | Email/password signup+signin, password update, Google OAuth (Passport), JWT issuance, cookie shapes, `requireAuth` middleware | reuses `users`' `User` model | mixed (see file) |
| [users.md](./users.md) | Look up a user (or list individuals) by username, fetch/update/complete the authenticated user's own profile, the shared `User` model (used by `auth`/`clubs`/`directory`/`events`/`products` too) | ✅ `User` | `GET /user/profile`, `PATCH /user/update`, `PATCH /user/complete` |
| [clubs.md](./clubs.md) | Look up a club (or list all clubs) — same `User` collection, filtered by `userType`; the authenticated club's own dashboard | reuses `users`' `User` model | `GET /clubs/dashboard` only |
| [directory.md](./directory.md) | Public, unfiltered "list every user" / "list every club" endpoints — no pagination, no auth | reuses `users`' `User` model | no |
| [events.md](./events.md) | List all events / one event by `uid`, create an event as the authenticated host | ✅ `Event` | `POST /events/create` only |
| [payments.md](./payments.md) | Create a Razorpay order (amount → order id) | — (Razorpay is the system of record) | no |
| [products.md](./products.md) | Add a product, list/get products, add a product to a user's cart (writes into `User.cart`) | ✅ `Product` | `POST /product/cart/add` only |
| [reports.md](./reports.md) | "Report a problem" form submission, rate-limited per email | ✅ `ReportProblem` | no |
| [api-contract.md](./api-contract.md) | Every route this API exposes, cross-referenced against exactly what the frontend calls (`src/services/ApiEndpoints.ts` / `MilanApi.ts` in the KarmaCircle repo) — **read this before changing any route path, method, or response shape** | — | — |
| [known-issues.md](./known-issues.md) | Cross-cutting bugs and gaps found while writing these specs (most now resolved — the file tracks what's still open vs. fixed) — read this before touching `auth`/`users` | — | — |

Unlike the frontend, this backend does **not** use a two-tier "short cross-feature summary here, deep colocated `SPEC.md` inside the folder" split.
Each module here is small enough (typically under ~150 lines total across its `.controller`/`.service`/`.routes`/`.validation` files) that a single `docs/specs/<module>.md` file already serves as the file-by-file deep reference.
If a module ever grows past that, add a colocated `src/modules/<name>/SPEC.md` then, mirroring [the frontend's pattern](../../../../docs/specs/README.md#deeper-colocated-specs), and turn this directory's copy into the short summary.

## How this relates to the frontend's specs

The frontend (`apps/web`, this repo's other app) has its own `docs/specs/` at the repo root describing the same product from the client's point of view — see [../../../../docs/specs/README.md](../../../../docs/specs/README.md).
The two directories are **not automatically kept in sync** — that's exactly what [api-contract.md](./api-contract.md) and [known-issues.md](./known-issues.md) exist to catch and keep visible.
When a change touches both sides (a new field, a changed status code, a renamed route), update the spec file on **both** sides in the same change, the same way each app's own "keep the specs honest" rule already asks for within itself.

## How to use this with an AI agent

Point the agent at the spec for the module it is changing, plus [architecture.md](./architecture.md) for shared middleware/config context.
If the change is driven by (or affects) a frontend call site, also read [api-contract.md](./api-contract.md) and the matching feature spec in the frontend's `docs/specs/` — the frontend specs name the exact endpoint constants and call sites; this repo is the source of truth for what those endpoints actually accept and return.
Where a spec calls out a bug, a dead route, or a contract mismatch, treat that as authoritative unless you've just fixed it — then update the relevant spec file(s) (on whichever side(s) actually changed) in the same change.
