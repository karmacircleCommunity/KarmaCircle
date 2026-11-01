## Cross-agent source of truth

- `AGENTS.md` is the shared project instruction source for Codex and Claude.
- `CLAUDE.md` imports `AGENTS.md` using Claude Code's native import syntax and adds repository navigation and coding conventions.
- Consult the relevant `CLAUDE.md` navigation or convention section when working in an area it covers; shared rules belong in `AGENTS.md`.
- When instructions conflict, follow `AGENTS.md` and update `CLAUDE.md` to remove the conflict.
- Track repository readiness work in [docs/agentic-readiness-checklist.md](./docs/agentic-readiness-checklist.md).

## Communication

- Use Caveman at full intensity for prose; stop only when Tamal says `stop caveman` or `normal mode`.
- Keep updates short and product-focused.
- Do not use the em dash character.
- When writing or substantially editing long Markdown files, put each full sentence on its own line.
- Never mention AI assistant or agent names in user-facing messages.

## GitHub actions and external effects

- For Tamal's work, use `main` directly by default. Do not create a branch or pull request for his changes unless he explicitly asks for one or names another branch.
- This Tamal-specific rule overrides any other repository instruction that would require a branch or pull request, or prevent work on `main` for his task.
- Every other contributor must submit changes to `main` through a pull request. GitHub requires one approval, resolved review threads, and the `validate` check; only Tamal has a ruleset bypass for direct pushes.
- Do not create branches, pull requests, merge branches or pull requests, or push to shared branches unless Tamal explicitly authorizes that action for the current task.
- When working for Tamal on `main`, do not ask which branch to use.
- For other contributors, do not create a branch automatically; use their checked-out branch or get explicit authorization for a new branch.
- Authorization for one action does not authorize a different action or a later task.
- Before committing, verify signing is enabled and that the signing key matches the GitHub account for the commit identity.
- Never create an unsigned commit or alter commit dates to fabricate contribution activity.
- Do not add an AI assistant as a PR author, co-author, or collaborator.
- Do not send messages to other people through GitHub or external services without explicit authorization.

## UI quality and verification

- Follow the [UI quality checklist](./docs/agentic-readiness-checklist.md#4-ui-quality-checklist) and the [design system](./docs/specs/design-system/README.md) for user-facing UI changes.
- Do not open a local browser or test the UI until Tamal explicitly authorizes it.
- If UI verification is not authorized, say visual review is still pending; do not claim it passed.

## agentic workflow

- This is a monorepo: `apps/web` (frontend, `karmacircle-frontend`) and `apps/api` (backend, `karmacircle-api`). Read [docs/specs/README.md](./docs/specs/README.md) for the frontend's master map, and [apps/api/docs/specs/README.md](./apps/api/docs/specs/README.md) for the backend's — each covers only its own app.
- Read [docs/specs/known-issues.md](./docs/specs/known-issues.md) (frontend) and/or [apps/api/docs/specs/known-issues.md](./apps/api/docs/specs/known-issues.md) (backend) before touching any area either flags — duplicated implementations, dead code, unrouted pages, and validation that doesn't actually block submission are all cataloged there so you don't rediscover them the hard way.
- For anything touching a route path, method, or request/response shape, read [apps/api/docs/specs/api-contract.md](./apps/api/docs/specs/api-contract.md) first — it cross-references every backend route against exactly what the frontend calls, and documents where they currently disagree. Don't assume a route "just works" for the frontend without checking that file.
- There is no `PRODUCT_SPEC.md`, task-spec template, or Definition-of-Done doc in this repo yet — each app's `docs/specs/` is the closest thing to a source of truth today.
- There is one graphify knowledge graph at [graphify-out/](./graphify-out/), covering both apps' code (AST) plus `docs/specs/` and the top-level docs. Read `graphify-out/GRAPH_REPORT.md` before answering architecture questions — see the "graphify" section in `CLAUDE.md` for how to query and keep it updated.
- For UI tasks, use the [UI quality checklist](./docs/agentic-readiness-checklist.md#4-ui-quality-checklist) alongside the feature spec and design system.
- See "Testing — when, how, and where the data comes from" below before touching either app's test suite, or before claiming something is "tested."

## local development login

- When Tamal explicitly requests local login, account setup, or onboarding, use the local development app and database and complete the requested flow without asking again for permission. Never use production or a remote database for this workflow.
- If [local-agent-credentials.md](./local-agent-credentials.md) exists, use its local development credentials for sign-in. The file is excluded through `.git/info/exclude`; never copy its contents into tracked files or chat.
- Passwords in the database are bcrypt hashes and cannot be read back. For sign-in, use the saved local credentials or a documented development seed that matches the account. Do not brute-force, bypass authentication, or change an existing account password to make login work.
- For a new account, complete all setup steps that do not require entering a new password. If the computer-use environment requires Tamal to enter and submit that new credential, leave the form ready and hand off only that step, then continue onboarding when it is complete.
- Do not send real password-reset email from a local workflow.

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

The `CI` workflow runs workspace lint, API and frontend type checks, builds, and both test suites for pull requests.
The active GitHub ruleset for `main` requires the `validate` check for pull requests; a workflow file alone does not block merges.
When working locally, "I made this change" and "I ran the tests for this change" are different claims; report exactly what ran.

## git / branching

- For Tamal's tasks, work directly on `main` unless he explicitly names another branch.
- Do not create a pull request for Tamal's changes unless he explicitly asks for one.
- For all other contributors, changes targeting `main` must go through a pull request.
- Do not create a branch automatically for other contributors; use their checked-out branch or get explicit authorization for a new branch.

## the apps/web ↔ apps/api boundary

Both apps live in this one repo now, but they're still independently deployed services with their own `package.json`, and `apps/api` remains the source of truth for request/response shapes — don't guess at a contract beyond what [apps/api/docs/specs/api-contract.md](./apps/api/docs/specs/api-contract.md) and the actual route code show.
When a change touches both sides (a new field, a renamed route, a changed status code), update the spec file on **both** sides in the same change: the relevant `apps/api/docs/specs/<module>.md` + `api-contract.md`, and the frontend's own [docs/specs/api-integration.md](./docs/specs/api-integration.md) (plus whichever feature spec calls the affected endpoint).

## repo-specific guardrails

Concrete "don't reintroduce this" rules, accumulated as issues get found and fixed. Add to this list as you go — see the "Keep the specs honest" section in `CLAUDE.md`.

**Frontend (`apps/web`):**
- For new frontend auth-gated UI, use `useSelector(selectIsLoggedIn)` as the saved app-session check. Do not require `Cookies.get("Token")`: Google OAuth sets that cookie as `httpOnly`, so browser JavaScript cannot read it. `Events.tsx` still has an extra cookie check on its create-event control; do not copy that inconsistency into new UI. Backend routes must still enforce access through `requireAuth`. See `docs/specs/state-management.md`.
- Don't add another logout cleanup path. The routed `Navbar.tsx` calls `Logout()`, then clears local storage and dispatches `resetUserData()`; the unrouted `UserProfile.tsx` calls `Logout()` but does not reset Redux state. If you touch logout, prefer consolidating into one shared helper and check both call sites.
- Don't wire new event-creation UI to `updateUserProfile`/`PATCH /user/update`. The routed `CreateEvent.tsx` modal does this today by mistake. `CreateEvents.tsx` calls the real `POST /events/create` endpoint but is not routed; confirm the intended form behavior before wiring it in.
- `organizationEndpoints.details(userName)` is a legacy endpoint builder with no active frontend call site. The public organization page uses `organizationEndpoints.byHandle()`.

**Backend (`apps/api`):**
- Don't add a new ad-hoc auth check. `requireAuth` (`apps/api/src/middleware/auth.ts`) reading the `Token` cookie is the one mechanism this API uses — see `apps/api/docs/specs/auth.md`.
- Don't return a raw Mongoose `User` document to a client. Always go through `userService.sanitize()` or the `PUBLIC_FIELDS` projection — see `apps/api/docs/specs/users.md`.
- Don't add a new "create X, checking uniqueness first" flow that assumes the existence-check-then-save pattern is race-safe — it isn't (see the `uid`/`userName`/`productSlug` races cataloged in `apps/api/docs/specs/known-issues.md`); rely on the schema's own `unique: true` index and handle the resulting Mongo-11000 error if you need this to be truly race-safe.
- Don't wire a new mutation to identify "which user" purely by an `email` string in the request body without also gating it behind `requireAuth`. `POST /product/cart/add` already does this and it's cataloged as the most significant access-control gap in the codebase, not a pattern to repeat — see `apps/api/docs/specs/known-issues.md#products`.

## when you're not sure which duplicate a request means

See the "When two implementations exist, ask" section in `CLAUDE.md` — don't silently pick one. This mainly applies to `apps/web`; `apps/api` doesn't currently have duplicated/competing implementations of the same route.
