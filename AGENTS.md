## agentic workflow

- This is a monorepo: `apps/web` (frontend, `karmacircle-frontend`) and `apps/api` (backend, `karmacircle-api`). Read [docs/specs/README.md](./docs/specs/README.md) for the frontend's master map, and [apps/api/docs/specs/README.md](./apps/api/docs/specs/README.md) for the backend's — each covers only its own app.
- Read [docs/specs/known-issues.md](./docs/specs/known-issues.md) (frontend) and/or [apps/api/docs/specs/known-issues.md](./apps/api/docs/specs/known-issues.md) (backend) before touching any area either flags — duplicated implementations, dead code, unrouted pages, and validation that doesn't actually block submission are all cataloged there so you don't rediscover them the hard way.
- For anything touching a route path, method, or request/response shape, read [apps/api/docs/specs/api-contract.md](./apps/api/docs/specs/api-contract.md) first — it cross-references every backend route against exactly what the frontend calls, and documents where they currently disagree. Don't assume a route "just works" for the frontend without checking that file.
- There is no `PRODUCT_SPEC.md`, task-spec template, or Definition-of-Done doc in this repo yet — each app's `docs/specs/` is the closest thing to a source of truth today.
- There is one graphify knowledge graph at [graphify-out/](./graphify-out/), covering both apps' code (AST) plus `docs/specs/` and the top-level docs. Read `graphify-out/GRAPH_REPORT.md` before answering architecture questions — see the "graphify" section in `CLAUDE.md` for how to query and keep it updated.
- Test tooling differs per app: `apps/web` has no unit-test runner, only `cypress:run`/`cypress:open` (one minimal e2e spec). `apps/api` has Jest + Supertest (`npm test`), but only the `auth`, `events`, `products`, and `users` modules currently have test files — `organizations`, `directory`, `payments`, and `reports` are untested. Don't claim something is "tested" without running it through the relevant tooling or manually verifying.

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
