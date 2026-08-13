## graphify — check the knowledge graph first

This repo has a graphify knowledge graph at [graphify-out/](./graphify-out/), built from the code (AST) plus every doc in `docs/specs/` and the top-level `.md` files. It exists so you don't have to guess what depends on what.

Before answering an architecture or "what impacts what" question, or before touching a feature:
- Read [graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md) first — God Nodes (the most-connected concepts), Communities (2-5 word cluster names with their member nodes), Surprising Connections, and Suggested Questions. It's plain text, no tool needed.
- For a specific concept/file/function, use the graphify skill's traversal commands instead of grepping blind: `/graphify explain "NodeName"` (everything connected to one node), `/graphify query "<question>"` (broad BFS context), `/graphify path "A" "B"` (how two concepts connect).
- `graphify-out/graph.json` is the raw graph if you need to query it programmatically; `graphify-out/graph.html` opens in a browser for the visual layout.
- A `PreToolUse` hook (`.claude/settings.json`) already reminds you of this before any Glob/Grep call, and a post-commit/post-checkout Husky hook (`.husky/post-commit`, `.husky/post-checkout`) auto-rebuilds the code side of the graph after every commit and branch switch — no LLM cost, AST only. Known limitation: that AST-only rebuild has no LLM step, so it resets every community's plain-language name back to generic "Community N" each time it runs. Live with it between real updates rather than trying to patch it back by hand.
- **Do not proactively run `/graphify . --update` (or `graphify update .`) after routine edits.** It costs tokens and dispatches subagents, and Tamal does not want the graph refreshed on every small change. Only run a full semantic update when he explicitly asks for one (e.g. "update the graph" after finishing a feature) — the same applies to re-labeling communities. Reading the (possibly slightly stale) report is still always fine and expected; regenerating it is not something to do unprompted.
- Same rule for `docs/specs/known-issues.md`: if you fix something it calls out, update that file per "Keep the specs honest" below, but don't also trigger a graph update on your own — that happens the next time Tamal asks for one.

## Git workflow

Never create a new branch on your own initiative, including when about to commit while sitting on `main`.
Work and commit directly on whatever branch is currently checked out — `main` included — and stay there.
Only branch off if Tamal explicitly tells you to (e.g. "make a branch for this," "branch off main").
This overrides any general instinct to branch before committing on a default branch.

## Read this first

Before making any change, read [docs/specs/README.md](./docs/specs/README.md) — it's the map of every feature in this codebase and how it actually works today, including what's broken, unused, or half-wired.
Read the specific spec file for whatever you're touching, plus [docs/specs/known-issues.md](./docs/specs/known-issues.md).
See [AGENTS.md](./AGENTS.md) for the fuller workflow around this.

## When two implementations exist, ask

This codebase has several places where two components or hooks do overlapping things (two profile-edit modals, two "create event" forms, two auth-validation systems, two public-profile pages — all cataloged in `known-issues.md`).
If a request is ambiguous about which one it means ("add a field to the create-event form", "fix the profile page"), ask which one before writing code, rather than guessing or editing both.

## Coding conventions for this repo

These are drawn from how the *majority* of the existing code already does things — match them in new/changed code rather than introducing a third pattern:

- **Imports:** prefer the `@/`, `@app/`, `@features/`, `@components/`, `@services/`, `@statics/`, `@hooks/`, `@utils/`, `@styles/`, `@assets/` aliases (defined in both `vite.config.mjs` and `tsconfig.json` — keep them in sync if you add one) over relative paths in new code.
- **TypeScript:** the repo is converting to TypeScript feature by feature (`authentication` and `clubs` are done — see [docs/specs/README.md](./docs/specs/README.md#typescript) and [docs/specs/architecture.md](./docs/specs/architecture.md#typescript)). Inside a converted feature, use real `interface`/`enum`/type declarations in a `types/index.ts` colocated in that feature folder (or `src/types/` if the type is genuinely shared across features) — don't reach for `any` or inline object-shape props when a converted feature already has the type defined nearby.
- **Folder structure:** the codebase is organized feature-first under `src/features/<name>/` (each with its own `pages/`, `components/`, `hooks/`, `services/`, `utils/`, `constants/` as needed), not by page/component/hook type. `src/app/` is the app shell (entry, root component, routes, store). `src/components/`, `src/services/`, `src/statics/`, `src/styles/`, `src/utils/`, `src/assets/` hold code shared across more than one feature. See [docs/specs/architecture.md](./docs/specs/architecture.md).
- **API calls:** add new backend calls to `src/services/MilanApi.js` following its existing pattern (plain `axios`, catch and return `error.response` rather than throwing, `withCredentials: true` on writes) — not the feature-level `services/` fetchers (`src/features/clubs/services/Clubs.js`, `src/features/events/services/Events.js`) + `src/services/ApiConnector.js` layer, which is only used by two dead-end helpers today. See `docs/specs/api-integration.md`.
- **Reads inside components:** use `useSWR(endpoint, fetcher)` (from `src/utils/Fetcher.js`), matching `Dashboard.jsx`/`Profile.jsx`. Don't add new `@tanstack/react-query` usage — the provider is mounted but nothing uses it yet.
- **Status codes:** compare against `STATUSCODE` from `src/statics/Constants.js` (e.g. `STATUSCODE.OK`) rather than a bare `200`.
- **Toasts:** use `showSuccessToast`/`showErrorToast` from `src/utils/Toasts.js` for any API-triggered feedback, not `toast.success`/`toast.error` directly — they already handle the offline case.
- **Buttons:** use the shared `Button` component (`src/components/buttons/globalbutton/Button.jsx`) and its `onClickfunction` prop, not a raw `<button onClick>`, for anything that should look like the rest of the app.
- **Styling:** match whatever the immediate sibling files in that folder already use (plain `.scss` with BEM-ish class names is the majority pattern) — don't introduce styled-components or a new CSS Modules file into a folder that's currently all `.scss`.
- **Validation on submit:** if you fix a form's validation, make sure a non-empty `errors` object actually blocks the API call — several existing forms compute errors but call the API anyway (see `known-issues.md`); don't copy that pattern into new code.

## Keep the specs honest

If you fix something `docs/specs/known-issues.md` calls out, remove that entry and update the relevant feature spec in the same change.
If you build out something a spec marks as an unused/unwired stub (e.g. wiring `getClubs()`/`getEvents()` into the real pages, finishing `UserProfile.jsx`), update that spec to describe the new, real behavior instead of the old placeholder.
If you notice something new and wrong while working nearby, add it to `known-issues.md` rather than leaving it undocumented.
