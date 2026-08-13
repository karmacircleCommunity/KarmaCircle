## agentic workflow

- Read [docs/specs/README.md](./docs/specs/README.md) first — it's the master map of this codebase: architecture, state management, the API layer, and one file per feature.
- Read [docs/specs/known-issues.md](./docs/specs/known-issues.md) before touching any area it flags — duplicated implementations, dead code, unrouted pages, and validation that doesn't actually block submission are all cataloged there so you don't rediscover them the hard way or accidentally build on top of the broken half of a duplicate pair.
- There is no `PRODUCT_SPEC.md`, task-spec template, or Definition-of-Done doc in this repo yet — `docs/specs/` is the closest thing to a source of truth today. If this repo grows one later, this file should point to it.
- There is a graphify knowledge graph at [graphify-out/](./graphify-out/) (code AST + `docs/specs/` + top-level docs). Read `graphify-out/GRAPH_REPORT.md` before answering architecture questions — see the "graphify" section at the top of `CLAUDE.md` for how to query and keep it updated.
- This repo has no automated unit-test runner (no `test` script) — `cypress:run`/`cypress:open` (Cypress e2e, one minimal spec today) is the only test tooling. Don't claim something is "tested" without running it through that or manually verifying.

## git / branching

- Never create a new branch on your own initiative. Always work on the branch Tamal has already checked out or explicitly named for the task.
- If you're on `main` and about to commit, stop and ask which branch to use instead of branching automatically.
- Creating a branch requires explicit consent for that specific instance — being told to branch once earlier in a session doesn't authorize doing it again later unasked.

## backend boundary

This repo is frontend-only (`milan-frontend`). The backend is a separate repo, [NGOWorld-Backend](https://github.com/ngoworldcommunity/NGOWorld-Backend), not checked out locally.
Don't guess at request/response shapes beyond what `src/services/ApiEndpoints.js` and the existing call sites already show — if a change needs a new/changed backend contract, say so explicitly rather than inventing fields.

## repo-specific guardrails

Concrete "don't reintroduce this" rules, accumulated as issues get found and fixed. Add to this list as you go — see the "Keep the specs honest" section in `CLAUDE.md`.

- Don't add a third "is the user logged in" check. The existing ones are: `useSelector(selectIsLoggedIn)` (Redux only), `Cookies.get("Token") && isLoggedIn` (cookie + Redux, used by the route guard and Navbar — prefer this for new auth-gated UI), and a legacy `Cookies.get("isLoggedIn")` cookie used only by the orphaned Donate page (do not extend this one). See `docs/specs/state-management.md`.
- Don't add a fourth logout cleanup path. `Navbar.jsx`, `Profile.jsx`, and `UserProfile.jsx` each dispatch `resetUserData()` plus a slightly different extra cleanup step (`localStorage.clear()`, `Cookies.remove("skipProfileCompletion")`, or nothing). If you touch logout, prefer consolidating into one shared helper over adding a fourth variant.
- Don't wire new event-creation UI to `updateUserProfile`/`PATCH /user/update`. `src/features/events/components/CreateEvent.jsx` does this today by mistake (it was cloned from the profile-edit form and the endpoint was never swapped). The correct pattern — MUI date/time pickers, `useEvent` hook, real `POST /events/create` call — is `src/features/events/components/CreateEvents.jsx`; build from that one.
- Don't assume `clubEndpoints.details(userName)` is club-only. It's queried for both individual and club profiles today (`Profile.jsx` uses it for `/user/:userName` and `/club/:userName` alike), despite the name.

## when you're not sure which duplicate a request means

See the "When two implementations exist, ask" section in `CLAUDE.md` — don't silently pick one.
