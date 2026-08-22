# Architecture

## Two entry points, one app

[src/app.ts](../../src/app.ts)'s `createApp()` builds and returns the fully-configured Express `app` — every middleware, every mounted route, the error handlers. Nothing else in the repo builds a second copy of this stack, so the two ways this API actually runs both go through it:

- **[src/server.ts](../../src/server.ts)** — the traditional path (`npm start` / `npm run dev`). Calls `connectToMongo()`, then `createApp().listen(env.PORT)`, and registers `SIGTERM`/`SIGINT` handlers that close the HTTP server before `process.exit(0)` (graceful shutdown; in-flight requests get to finish, no new connections are accepted).
- **[api/index.ts](../../api/index.ts)** — the Vercel serverless entry point (`vercel.json` rewrites every request to `/api`). Builds the same `createApp()` app once at module load (cold start), then on each invocation lazily awaits a **module-scoped** `connectionPromise` before calling `app(req, res)` directly as a raw Node request handler (no `.listen()` — Vercel's runtime owns the HTTP server). The `connectionPromise` being created once, outside the handler function, is what lets a warm serverless instance skip reconnecting to Mongo on every invocation; only a cold start pays the connection cost.

Both entry points read configuration through [src/config/env.ts](../../src/config/env.ts) (see below) and log through [src/config/logger.ts](../../src/config/logger.ts) (`pino`, pretty-printed in `development`, silent in `test`, structured JSON otherwise).

## Middleware stack (`createApp()`, in order)

1. `helmet()` — standard security headers.
2. `compression()` — gzip response bodies.
3. `pinoHttp({ logger })` — structured request/response logging.
4. `cors(...)` — see "CORS" below.
5. `express.json({ limit: "10mb" })`, then `express.urlencoded({ extended: false })`.
6. `cookieParser()` — required for `req.cookies.Token` (see [auth.md](./auth.md)) to exist anywhere downstream.
7. `passport.initialize()` — required for the Google OAuth route (`passport.authenticate("google", ...)` in `auth.routes.ts`); note there's no `passport.session()` — OAuth is `{ session: false }`, so Passport never touches `req.session` and this app has no server-side session store at all.
8. `apiLimiter` (`src/middleware/rate-limit.ts`) — a **global** rate limit, 300 requests / 15 min per IP, applied to every route below it. `authLimiter` (20 requests / 15 min) is a second, stricter limiter applied only inside `auth.routes.ts` on top of the global one. Both are `skip`ped entirely when `env.NODE_ENV === "test"`, so Jest runs never trip them regardless of how many requests one test file makes.
9. `GET /` → `"HELLO FROM API"` (plain text, liveness smoke check) and `GET /health` → `{ status: "ok", mongo: "connected" | "disconnected" }` (reads `mongoose.connection.readyState` live, not cached) — both **unauthenticated, unversioned**, mounted before the module routers.
10. `/docs` → `swagger-ui-express` serving `swaggerSpec` (see "API docs" below).
11. `routes` (`src/routes/index.ts`) — every module router, see the table below.
12. `notFoundHandler` — catches anything unmatched, `404` + `STATUS_MESSAGE.NOT_FOUND`.
13. `errorHandler` — the single place that turns a thrown/rejected error into an HTTP response; see "Error handling" below. Must stay last (Express identifies error-handling middleware by its 4-arg signature and by *registration order* being after everything else).

### CORS

`origin` is a callback, not a static value: if `env.IGNORE_ORIGINS === true`, every origin is allowed (`callback(null, true)`); otherwise only `env.ORIGIN_URL` (a single string, not an array) is allowed. `credentials: true` is required for the frontend's `withCredentials: true` axios calls to actually receive/send the `Token` cookie cross-origin. `IGNORE_ORIGINS` is meant for local dev (`.env.example` sets it `true`) — production should run with it unset/`false` so `ORIGIN_URL` is enforced.

## Config (`src/config/`)

- **`env.ts`** — a Zod schema (`envSchema`) validates `process.env` once at module load; `loadEnv()` throws a formatted multi-line error (one bullet per bad/missing var) if validation fails, so the process refuses to start with a broken config rather than surfacing `undefined` deep in a request handler later. `PORT` defaults to `5000`; every other var (`MONGO_URI`, `JWT_SECRET`, `SECRET_KEY`, `CLIENT_ID`, `CLIENT_SECRET`, `CALLBACK_URL`, `successURL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ORIGIN_URL`, `ORIGIN_DOMAIN`) is required with no default. `IGNORE_ORIGINS` is the one boolean-ish var, and it's read as a **string** (`"true"`/anything else) then transformed — passing an actual boolean in a `.env` file wouldn't parse the same way `.env.example`'s `IGNORE_ORIGINS=true` (unquoted) does; keep it as the literal string `true`. `SECRET_KEY` is validated as required but **not read anywhere else in the codebase** — grep confirms only `env.ts` references it; likely vestigial (perhaps once used for `express-session` or a different signing scheme) — don't assume it does anything today.
- **`database.ts`** — `connectToMongo()`, one `mongoose.connect(env.MONGO_URI)` call, logs and rethrows on failure (so `server.ts`'s `main().catch(...)` / `api/index.ts`'s awaited promise both see the error).
- **`logger.ts`** — see above.
- **`passport.ts`** — registers exactly one strategy, `GoogleStrategy`, wired to `authService.findOrCreateGoogleUser`. See [auth.md](./auth.md#google-oauth-flow) for the full callback flow, including the `req.query.state` → `userType` smuggling.
- **`swagger.ts`** — globs `*.routes.ts` (or `*.routes.js` post-build — `__filename.endsWith(".js")` decides which) under `src/modules/**` for `@openapi` JSDoc blocks. `securitySchemes.cookieAuth` documents the `Token` cookie; individual route blocks opt into `security: [{ cookieAuth: [] }]` by hand — nothing enforces that a route actually protected by `requireAuth` remembers to declare this, so treat the Swagger doc as best-effort, not authoritative, for "is this route protected."

## Error handling

[src/middleware/error-handler.ts](../../src/middleware/error-handler.ts) exports `AppError` (a typed `{ statusCode, message }` throwable — every module's service layer throws this for expected failure cases: not found, conflict, unauthorized, etc.) and the terminal `errorHandler` middleware, which pattern-matches the caught error in this order:

1. `AppError` → its own `statusCode` + `message`.
2. `ZodError` (a `validate()` middleware failure that reached here — see below) → `400` with a `{ path, message }[]` array built from `err.issues`.
3. `mongoose.Error.ValidationError` (a Mongoose schema validation failure, e.g. a required field missing on `.save()`) → `400` with a flat array of message strings.
4. A Mongo duplicate-key error (`err.code === 11000`, e.g. a race on a `unique` field) → `409` generic message.
5. Anything else → logged via `logger.error`, `500` with the generic `STATUS_MESSAGE.INTERNAL_SERVER_ERROR` (never leaks the raw error to the client).

Every route handler is wrapped in [`asyncHandler`](../../src/utils/async-handler.ts), which `.catch(next)`s a rejected promise so an `await`ed throw inside a controller/service reaches this chain instead of crashing the process or hanging the request. `asyncHandler<Req>` is generic so a route that runs after `requireAuth` can be typed `asyncHandler<AuthenticatedRequest>(handler)` — see [auth.md](./auth.md#requireauth-middleware).

Note: `validate()` ([src/middleware/validate.ts](../../src/middleware/validate.ts)) calls `schema.parse(...)` directly (not `.safeParse`), so a validation failure **throws synchronously inside Express middleware**, not inside an `asyncHandler`-wrapped async function. Express 4 does catch a synchronous throw from regular (non-async) middleware and forward it to the error-handler chain on its own, so this still reaches `errorHandler`'s `ZodError` branch correctly — but it's a different mechanism than the `asyncHandler` path, worth knowing if you ever refactor `validate()` to be async.

## Pagination

[src/utils/pagination.ts](../../src/utils/pagination.ts) is the one shared mechanism every "list everything" endpoint uses — `GET /user` (no `userName`), `GET /clubs` (no `userName`), `GET /display/users`, `GET /display/clubs`, `GET /events` (no `uid`/`slug`), `GET /product/allproducts`. Single-item lookups (`?userName=`, `?uid=`, `/:productSlug`, etc.) don't paginate.

- `paginationQuerySchema` (`{ page: number (default 1), limit: number (default 20, max 100) }`, both `z.coerce.number()`) is `.merge()`d into each of those routes' existing query-validation schema, so an invalid value (`page=abc`, `limit=500`) fails through the normal `validate()` → `ZodError` → `400` path with no extra error-handling code.
- `toSkipLimit({ page, limit })` converts to Mongoose's `.skip()/.limit()` pair.
- `buildPaginationMeta({ page, limit, total })` returns `{ page, limit, total, totalPages }` for the response envelope.
- Every affected service function returns `{ data, total }` (a `Promise.all([Model.find(...).skip().limit(), Model.countDocuments()])` pair, not two sequential awaits), and every affected controller responds `{ data, pagination: buildPaginationMeta(...) }` instead of a bare array — this is a deliberate, intentional response-shape change from what these routes used to return (a bare array); see [known-issues.md](./known-issues.md#pagination) for which frontend call sites (if any) need updating for it.
- `userService.findByType("club", ...)` is shared by both `clubs`' and `directory`'s club-listing routes — fixed once in the service layer, so both paginate identically rather than risking drift between two separate implementations.

## Routing table

[src/routes/index.ts](../../src/routes/index.ts) mounts each module's router at a base path:

| Base path | Router | Notes |
|---|---|---|
| `/user` | `users` routes, **then** `reports` routes (both mounted at `/user`) | `GET /user`, `GET /user/profile`, `PATCH /user/update`, `PATCH /user/complete` (users) + `POST /user/report` (reports) — two different modules sharing one path prefix |
| `/auth` | `auth` routes | signup/signin/update-password/Google OAuth/logout |
| `/clubs` | `clubs` routes | `GET /clubs`, `GET /clubs/dashboard` |
| `/display` | `directory` routes | `GET /display/users`, `GET /display/clubs` |
| `/payment` | `payments` routes | `POST /payment/razorpay` |
| `/product` | `products` routes | `POST /product/addproduct`, `GET /product/allproducts`, `POST /product/cart/add`, `GET /product/:productSlug` |
| `/events` | `events` routes | `GET /events`, `POST /events/create` |

See [api-contract.md](./api-contract.md) for the full method+path+body+response reference and how each of these lines up against what the frontend actually calls.

## Data layer

One Mongoose connection (`src/config/database.ts`), opened once at boot, reused by every module — there is no per-request connection or pooling logic to reason about beyond Mongoose's own default pool. [`requireAuth`](../../src/middleware/auth.ts) is the one piece of middleware that reads the DB itself (a minimal `.select("tokenVersion")` lookup, for session revocation — see [auth.md](./auth.md#signtoken-and-session-revocation)); every other middleware in the stack above is purely in-process.
Four collections exist: `user` (model name `"user"`, [users.md](./users.md)), `Event` ([events.md](./events.md)), `Products` (model name `"Products"`, [products.md](./products.md)), `report` (model name `"report"`, [reports.md](./reports.md)).
**`clubs`, `directory`, and `auth` own no collection of their own** — all three read/write through `users`' `User` model (`clubs`/`directory` query it filtered by `userType`; `auth` creates/reads/updates it directly). See [users.md](./users.md#the-user-model-is-shared-by-five-modules) for the full list of modules that touch `User` and how.

### Indexes

Every field a service actually filters/looks up by is indexed: `User.email` (`unique: true`, also the login/`requireAuth` lookup key), `User.userName` and `User.userType` (both plain, added alongside the pagination work — see [users.md](./users.md#the-user-model-is-shared-by-five-modules)), `Event.uid` (`unique: true`), `Product.productSlug` (`unique: true`), and a compound `ReportProblem.{ email, createdAt }` backing `hasReportedRecently`'s cooldown check (see [reports.md](./reports.md)). There's no explicit migration tooling in this repo (no `migrate-mongo` or equivalent) — indexes take effect the same way `email`'s/`uid`'s/`productSlug`'s `unique: true` indexes always have, via Mongoose's default `autoIndex` behavior building them in the background the first time a model is used against a given database. Verified against a real (in-memory) Mongo via `Model.collection.indexes()`, not just read from the schema, when this was added.

## Build, lint, test, deploy

- **`npm run dev`** — `tsx watch src/server.ts`, hot-reloads on file change.
- **`npm run build`** — `tsc -p tsconfig.json`, emits `dist/`. `tsconfig.json` includes `src/**/*.ts` and `api/**/*.ts`, excludes `tests/**/*.ts` — the test suite is never part of the production build.
- **`npm start`** — `node dist/src/server.js` (post-build; this is what the `main` field in `package.json` also points at).
- **`npm run typecheck`** — `tsc --noEmit`, not part of `build`; run it explicitly (or via CI) to catch type errors without emitting.
- **`npm run lint`** — `eslint . --ext .ts` per [.eslintrc.js](../../.eslintrc.js) (`eslint:recommended` + `@typescript-eslint/recommended`, `no-unused-vars` allows a leading-`_`-prefixed ignore pattern — see `_req`/`_next` throughout the middleware for that convention in use).
- **Husky** (`prepare: husky install`) runs `lint-staged` (`eslint --fix` + implicitly whatever else is configured) pre-commit on staged `.ts` files; `commitlint.config.js` enforces Conventional Commits via a `commit-msg` hook, same as the frontend.
- **Deploy**: `vercel.json` rewrites all traffic to `/api` (→ `api/index.ts`). This is the production path (see the README's "Production Release" badge pointing at a Vercel-hosted URL). `npm start` is the fallback for any non-Vercel host (a VM, a container, etc.) — nothing in the codebase assumes one deploy target over the other beyond that one `vercel.json` file.

### Testing

`tests/*.test.ts` (Jest + `ts-jest` + Supertest, config in [jest.config.js](../../jest.config.js)) build the app via `buildTestApp()` ([tests/helpers/test-app.ts](../../tests/helpers/test-app.ts), which just calls `createApp()` — the exact same app the two real entry points build, so tests exercise the real middleware stack) and drive it with `request(app).post(...)`/`.get(...)` from Supertest, no server actually listening on a port.
[tests/helpers/env.setup.ts](../../tests/helpers/env.setup.ts) (a Jest `setupFiles` entry, runs before the test framework loads) stubs every required env var with a placeholder so `env.ts`'s Zod validation passes in CI without real secrets.
[tests/helpers/jest.setup.ts](../../tests/helpers/jest.setup.ts) (`setupFilesAfterEnv`) spins up `mongodb-memory-server` once per test file (`beforeAll`), wipes every collection after each test (`afterEach`), and tears the in-memory server down (`afterAll`) — so tests never touch a real MongoDB instance and don't need one running locally.
**`auth.test.ts`, `events.test.ts`, `products.test.ts`, and `users.test.ts` exist today.** `clubs`, `directory`, `payments`, and `reports` still have zero test coverage — treat changes there as unverified by CI beyond `typecheck`/`lint` until tests are added. If you add tests for another module, follow the existing files' pattern (`buildTestApp()` + Supertest, no mocking of Mongoose — real writes against the in-memory Mongo).
