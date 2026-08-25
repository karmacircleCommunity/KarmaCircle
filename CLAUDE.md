## Monorepo layout

This repo holds two independently deployed apps: `apps/web` (the frontend, `milan-frontend` — React/Vite SPA) and `apps/api` (the backend, `milan-api` — Express/TypeScript/MongoDB). They share this repo, CI, and top-level tooling (this file, `AGENTS.md`, the graphify graph), but each keeps its own `package.json`, its own `docs/specs/` map, and its own deploy target. `apps/api` is the source of truth for the API contract; don't guess at a request/response shape beyond what `apps/api/docs/specs/api-contract.md` and the route code show. See [AGENTS.md](./AGENTS.md) for the fuller agentic workflow around working across both.

## graphify — check the knowledge graph first

This repo has a graphify knowledge graph at [graphify-out/](./graphify-out/), built from the code (AST) across both `apps/web` and `apps/api`, plus every doc in `docs/specs/`/`apps/api/docs/specs/` and the top-level `.md` files. It exists so you don't have to guess what depends on what.

Before answering an architecture or "what impacts what" question, or before touching a feature:
- Read [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) first — God Nodes (the most-connected concepts), Communities (2-5 word cluster names with their member nodes), Surprising Connections, and Suggested Questions. It's plain text, no tool needed.
- For a specific concept/file/function, use the graphify skill's traversal commands instead of grepping blind: `/graphify explain "NodeName"` (everything connected to one node), `/graphify query "<question>"` (broad BFS context), `/graphify path "A" "B"` (how two concepts connect).
- `graphify-out/graph.json` is the raw graph if you need to query it programmatically; `graphify-out/graph.html` opens in a browser for the visual layout.
- A `PreToolUse` hook (`.claude/settings.json`) already reminds you of this before any Glob/Grep call, and a post-commit/post-checkout Husky hook (`.husky/post-commit`, `.husky/post-checkout`) auto-rebuilds the code side of the graph after every commit and branch switch — no LLM cost, AST only. Known limitation: that AST-only rebuild has no LLM step, so it resets every community's plain-language name back to generic "Community N" each time it runs. Live with it between real updates rather than trying to patch it back by hand.
- **Do not proactively run `/graphify . --update` (or `graphify update .`) after routine edits.** It costs tokens and dispatches subagents, and Tamal does not want the graph refreshed on every small change. Only run a full semantic update when he explicitly asks for one (e.g. "update the graph" after finishing a feature) — the same applies to re-labeling communities. Reading the (possibly slightly stale) report is still always fine and expected; regenerating it is not something to do unprompted.
- Same rule for `docs/specs/known-issues.md`: if you fix something it calls out, update that file per "Keep the specs honest" below, but don't also trigger a graph update on your own — that happens the next time Tamal asks for one.

## Caveman — always run ultra mode in this repo

This repo runs [Caveman](https://github.com/JuliusBrussee/caveman) at its most aggressive `ultra` compression level for every session — Tamal wants this on regardless of the tradeoff below.

- At the start of every session in this repo, invoke `/caveman ultra` before doing anything else.
- Caveman compresses prose *output* only — code, commands, and reasoning tokens are untouched. It does not make you think less carefully, only write up findings more tersely.
- Caveman's own docs (`docs/HONEST-NUMBERS.md` in its repo) disclose the skill adds roughly 1,000-1,500 input tokens of overhead per turn, so on already-terse, single-file tasks whole-session savings can go net negative. This has been surfaced to Tamal; he still wants it always on here.
- The CLI's `think.mode` proxy setting has no `ultra` level (only `compress | record | pixel`) and is enabled machine-wide via `~/.claude/settings.json`/`ANTHROPIC_BASE_URL` rerouting to `caveman-proxy` on `127.0.0.1:8787` — that part is not, and cannot be, scoped to just this repo. `ultra` itself only exists as the skill-level `/caveman ultra` invocation, which is what this rule wires in per-repo.
- Undo: `caveman disable claude` removes the machine-wide proxy hook; deleting this section stops the per-repo `/caveman ultra` invocation.

## Git workflow

Never create a new branch on your own initiative, including when about to commit while sitting on `main`.
Work and commit directly on whatever branch is currently checked out — `main` included — and stay there.
Only branch off if Tamal explicitly tells you to (e.g. "make a branch for this," "branch off main").
This overrides any general instinct to branch before committing on a default branch.

## Responsive design — mandatory for every component

Every new or changed UI component (`apps/web`, either framework in use) must work cleanly across the full screen-size range, from small mobiles (~320px) up through large desktop and 4K/5K monitors.
This applies regardless of which agent or model is building it — Claude, OpenAI, or anyone else working in this repo.
Design and build mobile-first, then verify the desktop/wide breakpoints, not the other way around: shrinking a desktop layout down tends to hide the cases that only show up at 320-375px (columns that no longer fit side by side, padding that reads as cramped, text that wraps badly).
For very large screens, cap content width with a centered container (`mx-auto` + a `max-w-*`) rather than letting text/line-lengths stretch edge to edge — that alone covers 4K/5K without extra breakpoints in most cases.

**Alignment on mobile:** default to left-aligned text and controls on mobile, not centered.
This matches how most major sites (GitHub, Stripe, Vercel, Airbnb, Apple) actually handle mobile body/footer/list content — centered text is harder to scan since the eye has to re-find the start of each ragged line, and centering is normally reserved for short hero/marketing taglines, not for footers, forms, or lists.
Left-aligned content sits flush against the container edge with no auto-margin illusion of breathing room, so give it real horizontal padding — don't reuse a padding value that was only ever tuned for a centered layout.
The mobile horizontal padding standard across `apps/web` is `px-9` (36px) — that's what `Landing.tsx`'s hero and `Footer.tsx` both use as of August 2026 (briefly `px-10`/40px, brought down a notch on direct feedback that it read as too much); match it in new sections rather than picking a fresh value, so different parts of the same page don't visibly disagree on their left/right margin (exactly the bug those two had before being aligned to each other).

**Verify the padding you asked for is the padding you got — a Tailwind utility can silently lose.** A CSS rule written outside any `@layer` block always outranks a rule inside one (e.g. `@layer utilities`, where all of Tailwind's own utility classes live), regardless of selector specificity or source order. `apps/web/src/styles/index.css` had exactly this bug: a hand-written `.container` class (a Bootstrap replica, unlayered) was silently overriding a `px-*` utility placed right next to it in the same `className` — the utility was in the JSX and doing nothing. If you add hand-written global CSS (`index.css` or similar) that shares a class with anything Tailwind-generated, wrap it in `@layer base` (or `components`), or verify the computed style in a real browser rather than trusting the className alone.

**Watch for scroll-linked/transform effects (parallax, GSAP ScrollTrigger, etc.) on short mobile viewports.**
The same `yPercent`/translate value covers a much bigger share of a much shorter viewport than it does on desktop, and can visibly eat into padding or margins as the page scrolls — see `Footer.tsx`'s parallax, gated to `lg:` and up for exactly this reason ([layout-navigation.md](./docs/specs/layout-navigation.md#footer)).
Either gate the effect to larger breakpoints or verify its extremes (0% and 100% scroll progress) don't collide with nearby content on a small viewport.

**Length and hierarchy on mobile:** stacking every section vertically on a narrow screen can turn a component that reads fine on desktop into something long and undifferentiated.
Tighten vertical padding/gaps at the mobile breakpoint rather than reusing desktop spacing values, and use a divider, spacing, or typographic weight to group related content so a long mobile stack still has visible structure.

## Read this first

Before making any change, read the spec map for the app you're touching: [docs/specs/README.md](./docs/specs/README.md) for `apps/web`, or [apps/api/docs/specs/README.md](./apps/api/docs/specs/README.md) for `apps/api` — each is the map of every feature/module in that app and how it actually works today, including what's broken, unused, or half-wired.
Read the specific spec file for whatever you're touching, plus that app's `known-issues.md` ([docs/specs/known-issues.md](./docs/specs/known-issues.md) or [apps/api/docs/specs/known-issues.md](./apps/api/docs/specs/known-issues.md)).
See [AGENTS.md](./AGENTS.md) for the fuller workflow around this.

## When two implementations exist, ask

`apps/web` has several places where two components or hooks do overlapping things (two profile-edit modals, two "create event" forms, two auth-validation systems, two public-profile pages — all cataloged in its `known-issues.md`).
If a request is ambiguous about which one it means ("add a field to the create-event form", "fix the profile page"), ask which one before writing code, rather than guessing or editing both.
`apps/api` doesn't currently have this problem — each module has exactly one code path per route.

## Coding conventions — apps/web (frontend)

These are drawn from how the *majority* of the existing code already does things — match them in new/changed code rather than introducing a third pattern:

- **Imports:** prefer the `@/`, `@app/`, `@features/`, `@components/`, `@services/`, `@statics/`, `@hooks/`, `@utils/`, `@styles/`, `@assets/` aliases (defined in both `vite.config.mjs` and `tsconfig.json` — keep them in sync if you add one) over relative paths in new code.
- **TypeScript:** the repo is converting to TypeScript feature by feature (`authentication` and `organizations` are done — see [docs/specs/README.md](./docs/specs/README.md#typescript) and [docs/specs/architecture.md](./docs/specs/architecture.md#typescript)). Every feature has (or should have) a `types/` folder colocated at `apps/web/src/features/<name>/types/` (or `apps/web/src/types/` for types genuinely shared across features). Inside that folder, split declarations by kind into separate files rather than one combined `index.ts`:
  - `interfaces.ts` — all `interface` declarations
  - `enums.ts` — all `enum` declarations
  - `types.ts` — all type aliases (`type X = ...`)

  Never mix interfaces, enums, and type aliases into a single file — keeping them segregated avoids confusion as a feature's type surface grows. When touching a feature that still has the old combined `types/index.ts`, split it into these three files as part of your change rather than adding to the combined file. Don't reach for `any` or inline object-shape props when a converted feature already has the type defined nearby.
- **Folder structure:** the codebase is organized feature-first under `apps/web/src/features/<name>/` (each with its own `pages/`, `components/`, `hooks/`, `services/`, `utils/`, `constants/` as needed), not by page/component/hook type. `apps/web/src/app/` is the app shell (entry, root component, routes, store). `apps/web/src/components/`, `apps/web/src/services/`, `apps/web/src/statics/`, `apps/web/src/styles/`, `apps/web/src/utils/`, `apps/web/src/assets/` hold code shared across more than one feature. See [docs/specs/architecture.md](./docs/specs/architecture.md).
- **API calls:** add new backend calls to `apps/web/src/services/MilanApi.js` following its existing pattern (plain `axios`, catch and return `error.response` rather than throwing, `withCredentials: true` on writes) — not the feature-level `services/` fetchers (`apps/web/src/features/organizations/services/Organizations.js`, `apps/web/src/features/events/services/Events.js`) + `apps/web/src/services/ApiConnector.js` layer, which is only used by two dead-end helpers today. See `docs/specs/api-integration.md`.
- **Reads inside components:** use `useSWR(endpoint, fetcher)` (from `apps/web/src/utils/Fetcher.js`), matching `Dashboard.jsx`/`Profile.jsx`. Don't add new `@tanstack/react-query` usage — the provider is mounted but nothing uses it yet.
- **Status codes:** compare against `STATUSCODE` from `apps/web/src/statics/Constants.js` (e.g. `STATUSCODE.OK`) rather than a bare `200`.
- **Toasts:** use `showSuccessToast`/`showErrorToast` from `apps/web/src/utils/Toasts.js` for any API-triggered feedback, not `toast.success`/`toast.error` directly — they already handle the offline case.
- **Buttons:** use the shared `Button` component (`apps/web/src/components/buttons/globalbutton/Button.jsx`) and its `onClickfunction` prop, not a raw `<button onClick>`, for anything that should look like the rest of the app.
- **Styling:** use Tailwind CSS utility classes directly in `className` — this is now the convention across the whole app, no `.scss` files remain. `Button.module.css`/`Modal.module.css` are the sole leftover CSS Modules exception; match them only if you're extending those specific components. See [docs/specs/ui-kit.md](./docs/specs/ui-kit.md#styling-conventions) for design tokens (`text-brand`, `font-outfit`, etc.) and the handful of things that still need hand-written global CSS (react-select/MUI internals, the signup toggle switch) because Tailwind's scanner can't reach them.
- **Validation on submit:** if you fix a form's validation, make sure a non-empty `errors` object actually blocks the API call — several existing forms compute errors but call the API anyway (see `known-issues.md`); don't copy that pattern into new code.

## Coding conventions — apps/api (backend)

Drawn from how the existing code already does things — match them in new/changed code:

- **Module structure:** a new domain concept gets its own `apps/api/src/modules/<name>/` folder with the same file split the existing eight modules use — `<name>.routes.ts` (Express `Router` + `@openapi` JSDoc), `<name>.controller.ts` (thin HTTP layer, no business logic), `<name>.service.ts` (business logic + Mongoose queries), `<name>.validation.ts` (Zod schemas + `z.infer` types), and `<name>.model.ts` only if the module owns its own collection. See [apps/api/docs/specs/README.md](./apps/api/docs/specs/README.md#folder-structure).
- **Validation:** every route that accepts a body/query should go through `validate(schema, part)` (`apps/api/src/middleware/validate.ts`) with a Zod schema colocated in that module's `.validation.ts` — don't hand-roll validation in a controller.
- **Errors:** throw `AppError(statusCode, message)` (`apps/api/src/middleware/error-handler.ts`) from a service for any expected failure (not found, conflict, unauthorized) rather than manually setting `res.status(...)` deep in a service function — let the global `errorHandler` be the one place that shapes the HTTP response. Reach for `STATUS_CODE`/`STATUS_MESSAGE` (`apps/api/src/constants/http-status.ts`) instead of bare numbers/strings.
- **Async routes:** wrap every route handler in `asyncHandler(...)` (`apps/api/src/utils/async-handler.ts`) so a thrown/rejected error reaches the error handler instead of crashing the process; use `asyncHandler<AuthenticatedRequest>(...)` for handlers behind `requireAuth`.
- **Auth:** gate a route with `requireAuth` (`apps/api/src/middleware/auth.ts`) when it should require the `Token` cookie; read the caller's identity as `req.auth.email` (see `apps/api/docs/specs/auth.md` for why it's named `email`, not `id`, despite the JWT payload's own field name). Don't add a new ad-hoc "is this user logged in" check — this is the one mechanism this API uses.
- **Sensitive fields:** never return a raw Mongoose `User` document to a client — go through `userService.sanitize()` or the `PUBLIC_FIELDS` projection (`-password -__v`), matching whichever one the existing route you're touching already uses (they return slightly different shapes — see `apps/api/docs/specs/users.md`).
- **Swagger:** add an `@openapi` JSDoc block to any new/changed route, matching the existing style in that module's `.routes.ts` file — but don't treat an existing block as a guarantee it matches its neighboring Zod schema; verify against the actual schema, not just the doc comment (see `apps/api/docs/specs/known-issues.md`).

## Keep the specs honest

If you fix something a `known-issues.md` calls out ([docs/specs/known-issues.md](./docs/specs/known-issues.md) for `apps/web`, [apps/api/docs/specs/known-issues.md](./apps/api/docs/specs/known-issues.md) for `apps/api`), remove that entry and update the relevant feature/module spec in the same change.
If you build out something a spec marks as an unused/unwired stub (e.g. wiring `getOrganizations()`/`getEvents()` into the real pages, finishing `UserProfile.jsx`), update that spec to describe the new, real behavior instead of the old placeholder.
If a fix touches the API contract between the two apps, update the spec on **both** sides — see "the apps/web ↔ apps/api boundary" in `AGENTS.md`.
If you notice something new and wrong while working nearby, add it to the relevant `known-issues.md` rather than leaving it undocumented.
