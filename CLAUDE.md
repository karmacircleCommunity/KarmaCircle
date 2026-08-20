## What this repo is

This is `milan-api` (product name "Milan", org name "NgoWorld"), the Express + TypeScript + MongoDB backend for a platform connecting NGOs, charities, clubs, and individual users. It has one consumer: [KarmaCircle](../KarmaCircle) (checked out as a sibling directory), a Vite + React SPA — `milan-frontend`. There is no server-rendered UI here; this repo is a pure JSON API. The frontend repo is also set up for agentic coding the same way this one now is (specs + graphify) — see "Working across both repos" below.

## Read this first

Before making any change, read [docs/specs/README.md](./docs/specs/README.md) — it's the map of every module in this codebase (`auth`, `users`, `clubs`, `directory`, `events`, `payments`, `products`, `reports`) and how each one actually works today, including what's broken, unauthenticated when it maybe shouldn't be, or diverges from what the frontend expects. Read the specific module spec for whatever you're touching, plus [docs/specs/known-issues.md](./docs/specs/known-issues.md) and, for anything touching a route path, method, or request/response shape, [docs/specs/api-contract.md](./docs/specs/api-contract.md) — that file cross-references every route here against exactly what the frontend calls, and documents several live, load-bearing frontend calls that don't currently work against this backend (a method mismatch on the profile-update route, a missing profile-completion route, a dashboard fetch pointed at a route that doesn't exist). Don't assume a route "just works" for the frontend without checking that file first.

## Working across both repos

This repo and [KarmaCircle](../KarmaCircle) are developed and graphified independently — their `docs/specs/` trees and `graphify-out/` graphs are **not merged** and can drift out of sync with each other. When a change touches both sides of the API contract (a new field, a renamed route, a changed status code), update the spec file on **both** sides in the same change: this repo's relevant `docs/specs/<module>.md` + `api-contract.md`, and the frontend's own `docs/specs/api-integration.md` (and whichever feature spec calls the affected endpoint). If a question spans both sides of the stack, check the frontend's own [graphify-out/GRAPH_REPORT.md](../KarmaCircle/graphify-out/GRAPH_REPORT.md) too rather than assuming this repo's graph or specs cover it.

## graphify — check the knowledge graph first

This repo has a graphify knowledge graph at [graphify-out/](./graphify-out/), built from the code (AST, all of `src/` and `api/`) plus every doc in `docs/` and the top-level `.md` files.
It exists so you don't have to guess what depends on what.

Before answering an architecture or "what impacts what" question, or before touching a feature:
- Read [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) first — God Nodes (the most-connected concepts), Communities (2-5 word cluster names with their member nodes), Surprising Connections, and Suggested Questions. It's plain text, no tool needed.
- For a specific concept/file/function, use the graphify skill's traversal commands instead of grepping blind: `/graphify explain "NodeName"` (everything connected to one node), `/graphify query "<question>"` (broad BFS context), `/graphify path "A" "B"` (how two concepts connect).
- `graphify-out/graph.json` is the raw graph if you need to query it programmatically; `graphify-out/graph.html` opens in a browser for the visual layout.
- A `PreToolUse` hook (`.claude/settings.json`) already reminds you of this before any Glob/Grep call, and a post-commit/post-checkout Husky hook (`.husky/post-commit`, `.husky/post-checkout`) auto-rebuilds the code side of the graph after every commit and branch switch — no LLM cost, AST only. Known limitation: that AST-only rebuild has no LLM step, so it resets every community's plain-language name back to generic "Community N" each time it runs. Live with it between real updates rather than trying to patch it back by hand.
- **Do not proactively run `/graphify . --update` (or `graphify update .`) after routine edits.** It costs tokens and dispatches subagents, and Tamal does not want the graph refreshed on every small change. Only run a full semantic update when he explicitly asks for one (e.g. "update the graph" after finishing a feature) — the same applies to re-labeling communities. Reading the (possibly slightly stale) report is still always fine and expected; regenerating it is not something to do unprompted.
- This is the backend for [KarmaCircle](../KarmaCircle) (the frontend repo, also graphified). If a question spans both sides of the stack (e.g. an API contract, an auth flow that touches both apps), check the frontend's own `graphify-out/GRAPH_REPORT.md` there too rather than assuming this graph covers it — the two graphs are separate and not merged.

## Git workflow

Never create a new branch on your own initiative, including when about to commit while sitting on `main`.
Work and commit directly on whatever branch is currently checked out — `main` included — and stay there.
Only branch off if Tamal explicitly tells you to (e.g. "make a branch for this," "branch off main").
This overrides any general instinct to branch before committing on a default branch.

## Coding conventions for this repo

Drawn from how the existing code already does things — match them in new/changed code:

- **Module structure:** a new domain concept gets its own `src/modules/<name>/` folder with the same file split the existing eight modules use — `<name>.routes.ts` (Express `Router` + `@openapi` JSDoc), `<name>.controller.ts` (thin HTTP layer, no business logic), `<name>.service.ts` (business logic + Mongoose queries), `<name>.validation.ts` (Zod schemas + `z.infer` types), and `<name>.model.ts` only if the module owns its own collection. See [docs/specs/README.md](./docs/specs/README.md#folder-structure).
- **Validation:** every route that accepts a body/query should go through `validate(schema, part)` ([src/middleware/validate.ts](./src/middleware/validate.ts)) with a Zod schema colocated in that module's `.validation.ts` — don't hand-roll validation in a controller.
- **Errors:** throw `AppError(statusCode, message)` ([src/middleware/error-handler.ts](./src/middleware/error-handler.ts)) from a service for any expected failure (not found, conflict, unauthorized) rather than manually setting `res.status(...)` deep in a service function — let the global `errorHandler` be the one place that shapes the HTTP response. Reach for `STATUS_CODE`/`STATUS_MESSAGE` ([src/constants/http-status.ts](./src/constants/http-status.ts)) instead of bare numbers/strings.
- **Async routes:** wrap every route handler in `asyncHandler(...)` ([src/utils/async-handler.ts](./src/utils/async-handler.ts)) so a thrown/rejected error reaches the error handler instead of crashing the process; use `asyncHandler<AuthenticatedRequest>(...)` for handlers behind `requireAuth`.
- **Auth:** gate a route with `requireAuth` ([src/middleware/auth.ts](./src/middleware/auth.ts)) when it should require the `Token` cookie; read the caller's identity as `req.auth.email` (see [docs/specs/auth.md](./docs/specs/auth.md) for why it's named `email`, not `id`, despite the JWT payload's own field name). Don't add a new ad-hoc "is this user logged in" check — this is the one mechanism this API uses.
- **Sensitive fields:** never return a raw Mongoose `User` document to a client — go through `userService.sanitize()` or the `PUBLIC_FIELDS` projection (`-password -__v`), matching whichever one the existing route you're touching already uses (they return slightly different shapes — see [docs/specs/users.md](./docs/specs/users.md)).
- **Swagger:** add an `@openapi` JSDoc block to any new/changed route, matching the existing style in that module's `.routes.ts` file — but don't treat an existing block as a guarantee it matches its neighboring Zod schema; verify against the actual schema, not just the doc comment (see [docs/specs/known-issues.md](./docs/specs/known-issues.md#build--config)).

## Keep the specs honest

If you fix something `docs/specs/known-issues.md` or `docs/specs/api-contract.md` calls out, remove that entry and update the relevant module spec in the same change. If the fix touches the API contract with the frontend, update the frontend's own `docs/specs/api-integration.md` (and any feature spec referencing the endpoint) too — see "Working across both repos" above. If you notice something new and wrong while working nearby, add it to `docs/specs/known-issues.md` rather than leaving it undocumented.
