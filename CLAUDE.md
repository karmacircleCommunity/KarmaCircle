## Read this first

Before making any change, read [docs/specs/README.md](./docs/specs/README.md) — it's the map of every feature in this codebase and how it actually works today, including what's broken, unused, or half-wired.
Read the specific spec file for whatever you're touching, plus [docs/specs/known-issues.md](./docs/specs/known-issues.md).
See [AGENTS.md](./AGENTS.md) for the fuller workflow around this.

## When two implementations exist, ask

This codebase has several places where two components or hooks do overlapping things (two profile-edit modals, two "create event" forms, two auth-validation systems, two public-profile pages — all cataloged in `known-issues.md`).
If a request is ambiguous about which one it means ("add a field to the create-event form", "fix the profile page"), ask which one before writing code, rather than guessing or editing both.

## Coding conventions for this repo

These are drawn from how the *majority* of the existing code already does things — match them in new/changed code rather than introducing a third pattern:

- **Imports:** prefer the `@/`, `@components/`, `@hooks/`, `@pages/`, `@redux/`, `@service/`, `@utils/`, `@styles/` aliases (defined in both `vite.config.mjs` and `jsconfig.json` — keep them in sync if you add one) over relative paths in new code.
- **API calls:** add new backend calls to `src/service/MilanApi.js` following its existing pattern (plain `axios`, catch and return `error.response` rather than throwing, `withCredentials: true` on writes) — not the `src/integrations/*` + `ApiConnector` layer, which is only used by two dead-end helpers today. See `docs/specs/api-integration.md`.
- **Reads inside components:** use `useSWR(endpoint, fetcher)` (from `src/utils/Fetcher.js`), matching `Dashboard.jsx`/`Profile.jsx`. Don't add new `@tanstack/react-query` usage — the provider is mounted but nothing uses it yet.
- **Status codes:** compare against `STATUSCODE` from `src/static/Constants.js` (e.g. `STATUSCODE.OK`) rather than a bare `200`.
- **Toasts:** use `showSuccessToast`/`showErrorToast` from `src/utils/Toasts.js` for any API-triggered feedback, not `toast.success`/`toast.error` directly — they already handle the offline case.
- **Buttons:** use the shared `Button` component (`src/components/shared/buttons/globalbutton/Button.jsx`) and its `onClickfunction` prop, not a raw `<button onClick>`, for anything that should look like the rest of the app.
- **Styling:** match whatever the immediate sibling files in that folder already use (plain `.scss` with BEM-ish class names is the majority pattern) — don't introduce styled-components or a new CSS Modules file into a folder that's currently all `.scss`.
- **Validation on submit:** if you fix a form's validation, make sure a non-empty `errors` object actually blocks the API call — several existing forms compute errors but call the API anyway (see `known-issues.md`); don't copy that pattern into new code.

## Keep the specs honest

If you fix something `docs/specs/known-issues.md` calls out, remove that entry and update the relevant feature spec in the same change.
If you build out something a spec marks as an unused/unwired stub (e.g. wiring `getClubs()`/`getEvents()` into the real pages, finishing `UserProfile.jsx`), update that spec to describe the new, real behavior instead of the old placeholder.
If you notice something new and wrong while working nearby, add it to `known-issues.md` rather than leaving it undocumented.
