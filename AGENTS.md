## agentic workflow

- This is a monorepo: `apps/web` (frontend, `karmacircle-frontend`) and `apps/api` (backend, `karmacircle-api`). Read [docs/specs/README.md](./docs/specs/README.md) for the frontend's master map, and [apps/api/docs/specs/README.md](./apps/api/docs/specs/README.md) for the backend's — each covers only its own app.
- Read [docs/specs/known-issues.md](./docs/specs/known-issues.md) (frontend) and/or [apps/api/docs/specs/known-issues.md](./apps/api/docs/specs/known-issues.md) (backend) before touching any area either flags — duplicated implementations, dead code, unrouted pages, and validation that doesn't actually block submission are all cataloged there so you don't rediscover them the hard way.
- For anything touching a route path, method, or request/response shape, read [apps/api/docs/specs/api-contract.md](./apps/api/docs/specs/api-contract.md) first — it cross-references every backend route against exactly what the frontend calls, and documents where they currently disagree. Don't assume a route "just works" for the frontend without checking that file.
- There is no `PRODUCT_SPEC.md`, task-spec template, or Definition-of-Done doc in this repo yet — each app's `docs/specs/` is the closest thing to a source of truth today.
- There is one graphify knowledge graph at [graphify-out/](./graphify-out/), covering both apps' code (AST) plus `docs/specs/` and the top-level docs. Read `graphify-out/GRAPH_REPORT.md` before answering architecture questions — see the "graphify" section in `CLAUDE.md` for how to query and keep it updated.
- See "Testing — when, how, and where the data comes from" below before touching either app's test suite, or before claiming something is "tested."

## Testing — when, how, and where the data comes from

This repo is worked on by multiple AI agents (and humans), often in separate sessions with no shared memory of what a previous session already checked. This section exists so any agent — new to this repo or not — can answer "do I need to test this, and if so, how" without guessing. Read it once; don't rediscover it per session.

**What exists, in one sentence each:**
- `apps/api`: Jest + Supertest, every module covered, runs in-process against `mongodb-memory-server` — `npm test` / `pnpm --filter karmacircle-api test`.
- `apps/web`: Playwright E2E, organized feature-first under `apps/web/e2e/<feature>/` (mirroring `apps/web/src/features/<feature>/`), each folder with its own `README.md` — `pnpm test` (from `apps/web`) or `npx playwright test e2e/<folder>/` for one feature.
- Root `pnpm test` runs **both**, concurrently, via Turborepo — the API and the UI, at the same time, no server needs to be running beforehand. This is the one command to reach for by default.

**The full picture — read before writing or changing a test, not just before running one:**
[docs/specs/testing.md](./docs/specs/testing.md) (`apps/web`, and how the two apps' suites relate) and [apps/api/docs/specs/testing.md](./apps/api/docs/specs/testing.md) (`apps/api`). `docs/specs/testing.md` has a table pointing at every `apps/web/e2e/<feature>/README.md` — **check whether the feature you're touching already has one before writing new coverage**; it names what's covered, what's deliberately skipped (often because the underlying app code is unreachable/dead, not because testing it was skipped), and feature-specific test-data gotchas. A feature with no `e2e/` folder yet has no E2E coverage at all (see `docs/specs/testing.md#what-this-doesnt-cover`) — that's a gap to flag or fill, not to assume is covered elsewhere.

**Deciding whether to run tests for a given change:**
- Touched `apps/api/src/**`? Run `apps/api`'s Jest suite (`pnpm --filter karmacircle-api test`) at minimum. If you touched a module with no test file (check the coverage table in `apps/api/docs/specs/testing.md`), that's a gap — consider adding one rather than shipping the module still untested.
- Touched `apps/web/src/features/<name>/**`? Check whether `apps/web/e2e/<name>/` exists. If it does, run it (`npx playwright test e2e/<name>/`) and update it if the change affects behavior that folder's README says is covered. If it doesn't exist yet, the change is going out with zero automated coverage — say so plainly rather than implying it's tested.
- Touched something both sides depend on (a route contract, shared config, `app.ts`, `env.ts`) — run the full `pnpm test` from the repo root.
- Before claiming a bug is fixed or a feature works: reproduce it (or the feature's happy path) through the relevant test tooling or a manual check first — see CLAUDE.md's "start with reproducing the bug" rule. A claim of "tested" that wasn't actually run through anything is worse than saying it wasn't tested.

**Never point a test — new or existing — at real local dev.** Both suites are self-contained by design specifically so an agent can run them without touching a developer's actual running `pnpm dev` session or its real MongoDB data: dedicated ports (3001/5051 vs. local dev's 3000/5050), `mongodb-memory-server` instead of a real database, and a test-only mail outbox instead of real email. If you're ever tempted to hardcode `localhost:3000`/`:5050` into a test, that's a sign something's wired wrong — see `docs/specs/testing.md`'s isolation table.

**CI does not run either suite automatically yet** (as of September 2026 — a deliberate, separate decision, not an oversight). Until that changes, "I made this change" and "I ran the tests for this change" are two different claims — make the second one explicitly, or say you didn't.

## git / branching

- Never create a new branch on your own initiative. Always work on the branch Tamal has already checked out or explicitly named for the task.
- If you're on `main` and about to commit, stop and ask which branch to use instead of branching automatically.
- Creating a branch requires explicit consent for that specific instance — being told to branch once earlier in a session doesn't authorize doing it again later unasked.

## the apps/web ↔ apps/api boundary

Both apps live in this one repo now, but they're still independently deployed services with their own `package.json`, and `apps/api` remains the source of truth for request/response shapes — don't guess at a contract beyond what [apps/api/docs/specs/api-contract.md](./apps/api/docs/specs/api-contract.md) and the actual route code show.
When a change touches both sides (a new field, a renamed route, a changed status code), update the spec file on **both** sides in the same change: the relevant `apps/api/docs/specs/<module>.md` + `api-contract.md`, and the frontend's own [docs/specs/api-integration.md](./docs/specs/api-integration.md) (plus whichever feature spec calls the affected endpoint).

## repo-specific guardrails

Concrete "don't reintroduce this" rules, accumulated as issues get found and fixed. Add to this list as you go — see the "Keep the specs honest" section in `CLAUDE.md`.

**Frontend (`apps/web`):**
- Don't add a third "is the user logged in" check. The existing ones are: `useSelector(selectIsLoggedIn)` (Redux only), `Cookies.get("Token") && isLoggedIn` (cookie + Redux, used by the route guard and Navbar — prefer this for new auth-gated UI), and a legacy `Cookies.get("isLoggedIn")` cookie used only by the orphaned Donate page (do not extend this one). See `docs/specs/state-management.md`.
- Don't add a fourth logout cleanup path. `Navbar.tsx`, `Profile.tsx`, and `UserProfile.tsx` each dispatch `resetUserData()` plus a slightly different extra cleanup step (`localStorage.clear()`, `Cookies.remove("skipProfileCompletion")`, or nothing). If you touch logout, prefer consolidating into one shared helper over adding a fourth variant.
- Don't wire new event-creation UI to `updateUserProfile`/`PATCH /user/update`. `apps/web/src/features/events/components/CreateEvent.jsx` does this today by mistake (it was cloned from the profile-edit form and the endpoint was never swapped). The correct pattern — MUI date/time pickers, `useEvent` hook, real `POST /events/create` call — is `apps/web/src/features/events/components/CreateEvents.jsx`; build from that one.
- Don't assume `organizationEndpoints.details(userName)` is organization-only. It's queried for both individual and organization profiles today (`Profile.tsx` uses it for `/user/:userName` and `/organization/:userName` alike), despite the name.

**Backend (`apps/api`):**
- Don't add a new ad-hoc auth check. `requireAuth` (`apps/api/src/middleware/auth.ts`) reading the `Token` cookie is the one mechanism this API uses — see `apps/api/docs/specs/auth.md`.
- Don't return a raw Mongoose `User` document to a client. Always go through `userService.sanitize()` or the `PUBLIC_FIELDS` projection — see `apps/api/docs/specs/users.md`.
- Don't add a new "create X, checking uniqueness first" flow that assumes the existence-check-then-save pattern is race-safe — it isn't (see the `uid`/`userName`/`productSlug` races cataloged in `apps/api/docs/specs/known-issues.md`); rely on the schema's own `unique: true` index and handle the resulting Mongo-11000 error if you need this to be truly race-safe.
- Don't wire a new mutation to identify "which user" purely by an `email` string in the request body without also gating it behind `requireAuth`. `POST /product/cart/add` already does this and it's cataloged as the most significant access-control gap in the codebase, not a pattern to repeat — see `apps/api/docs/specs/known-issues.md#products`.

## when you're not sure which duplicate a request means

See the "When two implementations exist, ask" section in `CLAUDE.md` — don't silently pick one. This mainly applies to `apps/web`; `apps/api` doesn't currently have duplicated/competing implementations of the same route.
