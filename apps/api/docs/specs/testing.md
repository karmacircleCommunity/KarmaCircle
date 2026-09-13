# Testing

This backend has two separate, independent test setups, for two different jobs:

1. **Jest + Supertest** (`tests/*.test.ts`) — fast, in-process, one module at a time. This is what `npm test` / `pnpm --filter karmacircle-api test` runs, and what CI should run on every change.
2. **A standalone e2e server** (`tests/e2e/server.ts`) — a real, listening instance of this API, that exists purely so `apps/web`'s Playwright suite has something real to drive a browser against. Jest never uses this; Playwright never uses Jest's harness. See [../../../../docs/specs/testing.md](../../../../docs/specs/testing.md) (`apps/web`'s testing spec) for the full picture of how the two apps' test suites fit together — this file only covers the `apps/api` side of that.

## Jest + Supertest

`tests/*.test.ts` (Jest + `ts-jest` + Supertest, config in [jest.config.js](../../jest.config.js)) build the app via `buildTestApp()` ([tests/helpers/test-app.ts](../../tests/helpers/test-app.ts), which just calls `createApp()` — the exact same app the two real entry points build, so tests exercise the real middleware stack) and drive it with `request(app).post(...)`/`.get(...)` from Supertest. Nothing actually listens on a port; Supertest talks to the Express app object directly, in-process.

[tests/helpers/env.setup.ts](../../tests/helpers/env.setup.ts) (a Jest `setupFiles` entry, runs before the test framework loads) stubs every required env var with a placeholder so `env.ts`'s Zod validation passes in CI without real secrets.

[tests/helpers/jest.setup.ts](../../tests/helpers/jest.setup.ts) (`setupFilesAfterEnv`) spins up `mongodb-memory-server` once per test file (`beforeAll`), wipes every collection after each test (`afterEach`), and tears the in-memory server down (`afterAll`) — so tests never touch a real MongoDB instance and don't need one running locally.

`apiLimiter`/`authLimiter` ([rate-limit.ts](../../src/middleware/rate-limit.ts)) are `skip`ped entirely when `env.NODE_ENV === "test"`, so a test file making many requests across its suite never trips a rate limit unrelated to what it's actually checking.

### Module coverage

| Module | Test file |
|---|---|
| `auth` | [tests/auth.test.ts](../../tests/auth.test.ts) |
| `directory` | [tests/directory.test.ts](../../tests/directory.test.ts) |
| `events` | [tests/events.test.ts](../../tests/events.test.ts) |
| `organizations` | [tests/organizations.test.ts](../../tests/organizations.test.ts) |
| `payments` | [tests/payments.test.ts](../../tests/payments.test.ts) |
| `products` | [tests/products.test.ts](../../tests/products.test.ts) |
| `reports` | [tests/reports.test.ts](../../tests/reports.test.ts) |
| `users` | [tests/users.test.ts](../../tests/users.test.ts) |

Every module has a test file (as of September 2026 — `directory`, `payments`, and `reports` were the last three added). If you add a ninth module, follow the existing files' pattern: `buildTestApp()` + Supertest, no mocking of Mongoose (real writes against the in-memory Mongo) — the one standing exception is `payments.test.ts`, which mocks the `razorpay` package itself (see below), since that's a real external payment API, not a database.

**`payments.test.ts`'s Razorpay mock and its singleton gotcha.** `payment.service.ts` constructs its Razorpay client lazily and caches it as a module-level singleton (`let razorpay: Razorpay | null = null`, built once on first use) — deliberately, so the whole API doesn't crash at boot if `RAZORPAY_KEY_ID`/`SECRET` aren't set (see that file's own comment). That means the mocked constructor (`jest.mock("razorpay")`) only ever actually runs **once** across a whole test file, no matter how many `it()` blocks call the route. The test file works around this by keeping one stable `ordersCreate = jest.fn()` at module scope and wiring `MockedRazorpay.mockImplementation()` to always return an object referencing it, rather than trying to read a fresh mock instance out of `MockedRazorpay.mock.results` per test — the latter breaks the moment `clearMocks: true` (this repo's jest config) wipes `mock.results` between tests while the service's cached client (and the mock instance it was built with) lives on unchanged. If you add a test for another lazily-singleton-cached service, use the same pattern.

## The e2e server (`tests/e2e/server.ts`)

A real, listening instance of this API, started only by Playwright (`apps/web/playwright.config.ts`'s `webServer` array) or manually via `pnpm --filter karmacircle-api run test:e2e-server`. It exists because a real browser driven by Playwright makes real HTTP requests to a real URL — Jest's in-process Supertest approach has nothing to bind to.

- **Backed by `mongodb-memory-server`**, the same library Jest's own `jest.setup.ts` uses — so an e2e run never touches a real MongoDB and needs nothing running locally beyond `pnpm install`.
- **A dedicated port (5051 by default)**, deliberately different from local dev's 5050 — see [tests/e2e/env.setup.ts](../../tests/e2e/env.setup.ts). This process must be able to run *alongside* a developer's real `pnpm dev` session without colliding with it or touching its real MongoDB data. `ORIGIN_URL` is likewise overridden to `http://localhost:3001` (apps/web's own dedicated e2e port — see `apps/web/e2e/env.ts`), so CORS actually allows the e2e web server's origin rather than local dev's `:3000`.
- **A test-only reset route.** `createApp()` ([../../src/app.ts](../../src/app.ts)) registers `POST /__test__/reset` — wipes every collection — but only `if (env.NODE_ENV === "test")`, so it can never exist in a real deployment. Playwright's `apps/web/e2e/global-setup.ts` calls it once before the whole suite runs, giving Playwright the same "start from an empty database" guarantee Jest gets for free from a fresh `mongodb-memory-server` per test file. It isn't called between individual spec files — see the `apps/web` testing spec for why (parallelism, and the unique-data-per-run pattern that avoids needing it).
- **Unlike the real entry points** (`src/server.ts`, `api/index.ts`), this script connects to Mongo itself via `mongoServer.getUri()` rather than `config/database.ts`'s `connectToMongo()` — mirroring exactly what `jest.setup.ts` does, for the same reason (an ephemeral, self-contained instance, not the real deployment's connection logic).

If you change what `createApp()` needs at boot (a new required env var, a new startup side effect), check both `tests/helpers/env.setup.ts` (Jest) and `tests/e2e/env.setup.ts` (Playwright's server) — they're meant to carry the same placeholder values (the e2e one literally `import`s the Jest one and adds `PORT`/`ORIGIN_URL` on top), but nothing enforces that beyond this note.

## Keeping this file honest

If you add or remove a module's test file, update the coverage table above. If you change anything about how the e2e server boots (port, env, the reset route), update this file and `apps/web`'s [testing.md](../../../../docs/specs/testing.md) in the same change — they describe two ends of one integration and are easy to let drift apart.
