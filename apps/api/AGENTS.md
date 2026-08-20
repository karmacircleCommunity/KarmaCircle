## agentic workflow

- Read [docs/specs/README.md](./docs/specs/README.md) first — it's the master map of this codebase: one file per module (`auth`, `users`, `clubs`, `directory`, `events`, `payments`, `products`, `reports`), plus [architecture.md](./docs/specs/architecture.md) for the app shell/middleware/config.
- Read [docs/specs/known-issues.md](./docs/specs/known-issues.md) before touching any area it flags, and [docs/specs/api-contract.md](./docs/specs/api-contract.md) before touching any route's path, method, or request/response shape — it documents several live frontend calls that don't currently work against this backend.
- There is no `PRODUCT_SPEC.md`, task-spec template, or Definition-of-Done doc in this repo — `docs/specs/` is the closest thing to a source of truth today.
- There is a graphify knowledge graph at [graphify-out/](./graphify-out/) (code AST + `docs/specs/` + top-level docs). Read `graphify-out/GRAPH_REPORT.md` before answering architecture questions — see the "graphify" section in `CLAUDE.md` for how to query and keep it updated.
- Only `auth` and `events` have test coverage today (`npm test`, Jest + Supertest + an in-memory MongoDB). Don't claim something is "tested" without running it through that or manually verifying — see [docs/specs/architecture.md#testing](./docs/specs/architecture.md#testing).

## git / branching

- Never create a new branch on your own initiative. Always work on the branch Tamal has already checked out or explicitly named for the task.
- If you're on `main` and about to commit, stop and ask which branch to use instead of branching automatically.
- Creating a branch requires explicit consent for that specific instance — being told to branch once earlier in a session doesn't authorize doing it again later unasked.

## frontend boundary

This repo is backend-only (`milan-api`) and is the **source of truth** for request/response shapes. The frontend is a separate repo, [KarmaCircle](../KarmaCircle) (`milan-frontend`, checked out as a sibling directory), not merged with this one — its own `docs/specs/` and `graphify-out/` are independent of this repo's.
Don't guess at what the frontend expects beyond what [docs/specs/api-contract.md](./docs/specs/api-contract.md) already traces — if you're changing a route in a way that affects the frontend, say so explicitly (and check the frontend repo's own specs) rather than assuming no one downstream cares.

## repo-specific guardrails

Concrete "don't reintroduce this" rules, accumulated as issues get found and fixed. Add to this list as you go — see the "Keep the specs honest" section in `CLAUDE.md`.

- Don't add a new ad-hoc auth check. `requireAuth` ([src/middleware/auth.ts](./src/middleware/auth.ts)) reading the `Token` cookie is the one mechanism this API uses — see [docs/specs/auth.md](./docs/specs/auth.md).
- Don't return a raw Mongoose `User` document to a client. Always go through `userService.sanitize()` or the `PUBLIC_FIELDS` projection — see [docs/specs/users.md](./docs/specs/users.md).
- Don't add a new "create X, checking uniqueness first" flow that assumes the existence-check-then-save pattern is race-safe — it isn't (see the `uid`/`userName`/`productSlug` races cataloged in [docs/specs/known-issues.md](./docs/specs/known-issues.md)); rely on the schema's own `unique: true` index and handle the resulting Mongo-11000 error if you need this to be truly race-safe.
- Don't wire a new mutation to identify "which user" purely by an `email` string in the request body without also gating it behind `requireAuth`. `POST /product/cart/add` already does this and it's cataloged as the most significant access-control gap in the codebase, not a pattern to repeat — see [docs/specs/known-issues.md#products](./docs/specs/known-issues.md#products).

## when you're not sure which duplicate a request means

Unlike the frontend, this backend doesn't currently have duplicated/competing implementations of the same feature — each module has exactly one code path per route. If that ever changes, follow the frontend's own "When two implementations exist, ask" convention (see its `CLAUDE.md`) rather than guessing.
