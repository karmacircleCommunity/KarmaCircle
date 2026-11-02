@AGENTS.md

# Repository navigation and conventions

The import above loads the shared project instructions from `AGENTS.md` into Claude Code.
This file adds repository navigation and coding conventions only; shared rules belong in `AGENTS.md`.

## Monorepo layout

This repo holds two independently deployed apps: `apps/web` (the frontend, `karmacircle-frontend` — React/Vite SPA) and `apps/api` (the backend, `karmacircle-api` — Express/TypeScript/MongoDB). They share this repo, CI, and top-level tooling (this file, `AGENTS.md`, the graphify graph), but each keeps its own `package.json`, its own `docs/specs/` map, and its own deploy target. `apps/api` is the source of truth for the API contract; don't guess at a request/response shape beyond what `apps/api/docs/specs/api-contract.md` and the route code show. See [AGENTS.md](./AGENTS.md) for the fuller agentic workflow around working across both.

## graphify — check the knowledge graph first

This repo has a graphify knowledge graph at [graphify-out/](./graphify-out/), built from the code (AST) across both `apps/web` and `apps/api`, plus every doc in `docs/specs/`/`apps/api/docs/specs/` and the top-level `.md` files. It exists so you don't have to guess what depends on what.

Before answering an architecture or "what impacts what" question, or before touching a feature:
- Read [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) for navigation clues such as connected concepts, communities, inferred relationships, and suggested questions.
- Verify important claims against current code and relevant specs before relying on them. Community labels may be generic, AST nodes may describe removed or renamed code, and inferred hyperedges may preserve old architecture or routes.
- The 2026-11-02 audit found node/link counts consistent with `graph.json`, but stale local-setup, API-layer, auth, and profile-flow descriptions. Count consistency does not prove semantic freshness.
- For a specific concept/file/function, use graphify traversal commands as discovery aids: `/graphify explain "NodeName"`, `/graphify query "<question>"`, `/graphify path "A" "B"`; verify results in source and specs.
- `graphify-out/graph.json` is the raw graph for programmatic inspection; `graphify-out/graph.html` shows its visual layout.
- A `PreToolUse` hook (`.claude/settings.json`) reminds readers that the graph exists. Post-commit/post-checkout Husky hooks (`.husky/post-commit`, `.husky/post-checkout`) rebuild the AST graph without semantic analysis, so labels and inferred summaries can be generic or stale.
- **Do not proactively run `/graphify . --update` (or `graphify update .`) after routine edits.** It costs tokens and dispatches subagents, and Tamal does not want the graph refreshed on every small change. Only run a full semantic update when he explicitly asks for one (e.g. "update the graph" after finishing a feature) — the same applies to re-labeling communities. Reading the (possibly slightly stale) report is still always fine and expected; regenerating it is not something to do unprompted.
- Same rule for `docs/specs/known-issues.md`: if you fix something it calls out, update that file per "Keep the specs honest" below, but don't also trigger a graph update on your own — that happens the next time Tamal asks for one.

## Responsive design — mandatory for every component

Use the [agentic readiness checklist](./docs/agentic-readiness-checklist.md#4-ui-quality-checklist) for the reusable UI review steps.

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

`apps/web` has several overlapping or retired implementations (two profile-edit modals, two create-event forms, two auth-validation systems, and an unrouted legacy user-profile prototype alongside the live organization profile).
If a request is ambiguous about which form or flow it means, check the route table and feature specs, then ask before editing an alternate or unrouted implementation.
`apps/api` doesn't currently have this problem — each module has exactly one code path per route.

## Coding conventions — apps/web (frontend)

These are drawn from how the *majority* of the existing code already does things — match them in new/changed code rather than introducing a third pattern:

- **Imports:** prefer the `@/`, `@app/`, `@features/`, `@components/`, `@services/`, `@statics/`, `@hooks/`, `@utils/`, `@styles/`, `@assets/` aliases (defined in both `vite.config.mjs` and `tsconfig.json` — keep them in sync if you add one) over relative paths in new code.
- **TypeScript:** the frontend conversion is complete; keep new and edited frontend code typed, and check the feature's spec for its current type layout ([docs/specs/README.md](./docs/specs/README.md#typescript), [docs/specs/architecture.md](./docs/specs/architecture.md#typescript)).
  Features with a `types/` folder keep feature types there; genuinely shared types belong in `apps/web/src/types/`.
  Inside those folders, follow the repository convention of separating interfaces, enums, and type aliases by kind:
  - `interfaces.ts` — all `interface` declarations
  - `enums.ts` — all `enum` declarations
  - `types.ts` — all type aliases (`type X = ...`)

  Don't reach for `any` or inline object-shape props when the feature already has a type defined nearby.
- **Folder structure:** the codebase is organized feature-first under `apps/web/src/features/<name>/` (each with its own `pages/`, `components/`, `hooks/`, `services/`, `utils/`, `constants/` as needed), not by page/component/hook type. `apps/web/src/app/` is the app shell (entry, root component, routes, store). `apps/web/src/components/`, `apps/web/src/services/`, `apps/web/src/statics/`, `apps/web/src/styles/`, `apps/web/src/utils/`, `apps/web/src/assets/` hold code shared across more than one feature. See [docs/specs/architecture.md](./docs/specs/architecture.md).
- **API calls:** add new backend calls to `apps/web/src/services/KarmaCircleApi.ts` following its existing pattern (plain `axios`, catch and return `error.response` rather than throwing, `withCredentials: true` on writes).
  The feature-level `services/Organizations.ts` and `services/Events.ts` helpers go through `apps/web/src/services/ApiConnector.ts` and are not called by routed pages today.
  See `docs/specs/api-integration.md` before adding or changing a call.
- **Reads inside components:** use `useSWR(endpoint, fetcher)` with `apps/web/src/utils/Fetcher.ts` where it fits the feature's existing pattern.
  Routed examples include `Events.tsx`, `OrganizationProfile.tsx`, and `Dashboard.tsx`.
  Don't add new `@tanstack/react-query` usage; the provider is mounted but no component uses its query hooks yet.
- **Status codes:** compare against `STATUSCODE` from `apps/web/src/statics/Constants.ts` (e.g. `STATUSCODE.OK`) rather than a bare `200`.
- **Toasts:** use `showSuccessToast`/`showErrorToast` from `apps/web/src/utils/Toasts.ts` for API-triggered feedback; they already handle the offline case.
- **Buttons:** use the shared `Button` component (`apps/web/src/components/buttons/Button.tsx`) and its `onClickfunction` prop where its behavior fits.
- **Styling:** use Tailwind CSS utility classes directly in `className` — this is now the convention across the whole app, no `.scss` files and no CSS Modules remain. **Before writing or changing any UI, read [docs/specs/design-system/README.md](./docs/specs/design-system/README.md)** — the design system covers tokens, hex values, type, spacing, radii, shadows, breakpoints, shared-component specs, recipes, and known deviations. It carries the resolution order (shared component → pattern → token → Tailwind default → arbitrary value) and a hard "never do this" list. [docs/specs/ui-kit.md](./docs/specs/ui-kit.md) is now only a navigation map into it, kept for its anchors.
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
If you build out something a spec marks as an unused or unwired stub (e.g. wiring `getOrganizations()`/`getEvents()` into routed pages, or finishing the unrouted `UserProfile.tsx` prototype), update that spec to describe the new, real behavior instead of the old placeholder.
If a fix touches the API contract between the two apps, update the spec on **both** sides — see "the apps/web ↔ apps/api boundary" in `AGENTS.md`.
If you notice something new and wrong while working nearby, add it to the relevant `known-issues.md` rather than leaving it undocumented.
