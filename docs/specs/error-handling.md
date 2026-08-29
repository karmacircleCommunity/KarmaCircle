# Error Handling & Misc Pages

## 404

[apps/web/src/features/error-handling/pages/Error404.tsx](../../apps/web/src/features/error-handling/pages/Error404.tsx), matched by the `*` catch-all route in `routesConfig.tsx`.

**Rebuilt August 2026.** It is now a typographic page carrying the normal site chrome: `<Helmet>` (title "KarmaCircle | Page not found" + meta description), `<Navbar />`, an eyebrow chip, an `<h1>`, one sentence of explanation, a primary `Button` (`to="/"`) back to home, quiet text links to `/organizations` and `/events`, and `<Footer />`.
Its layout is deliberately the same shape as `EventNotFound` in [apps/web/src/features/events/pages/DetailedEvent.tsx](../../apps/web/src/features/events/pages/DetailedEvent.tsx), so the global 404 and the in-page not-found state read as one product.
All styling is Tailwind utilities in `className`; the page owns no CSS file.

The version it replaced was a full-bleed Freepik illustration (`error404.svg`) plus a bare `Button`, styled by a hand-written `Error404.css`. Four things were wrong with it, all fixed and all worth not reintroducing:
- The `Button` was passed no `className`, and the shared `Button` component ships **no** padding, radius, or typography of its own (see [ui-kit.md](./ui-kit.md#styling-conventions)) - every call site supplies those. It rendered as a bare brand-coloured rectangle clamped to its own text.
- Its wrapper used a `.button-wrapper` class that was never defined anywhere in the repo, so nothing centred or padded it and the link sat flush against the left viewport edge.
- The illustration was `width: 60%` with no `max-width`, against a 750x500 viewBox - roughly 2.4x its design size on a wide monitor.
- It rendered neither `<Navbar />` nor `<Footer />`, unlike every other page in the app, and set no `<title>`.

`error404.svg` and `Error404.css` were both deleted along with it.

## API/network error feedback

There is no error boundary (`componentDidCatch`/React error boundary) anywhere in the app — an uncaught render error in any component will produce a blank white screen with no fallback UI.
Network/API errors are instead surfaced per-call via toasts — see [Toasts.ts conventions](./api-integration.md#toast-conventions) and [checkInternetConnection.js](../../apps/web/src/utils/CheckInternetConnection.ts), which suppresses all toasts (success and error alike) whenever `navigator.onLine === false`, on the assumption that an offline banner would be more useful than a flood of failed-request toasts (no such offline banner currently exists, though — the user just sees nothing).

## `Test.tsx` (dev leftover, currently routed)

[apps/web/src/features/error-handling/pages/Test.tsx](../../apps/web/src/features/error-handling/pages/Test.tsx) is **not** wired into `routesConfig.tsx`, so it isn't reachable via any path, but it does still exist in the tree: on mount it immediately redirects the browser to `https://www.google.com`.
Almost certainly a debugging scratch file — safe to delete unless someone confirms otherwise, but flag it rather than silently removing it if you weren't specifically asked to clean up dead files.

## Cypress E2E

`cypress/e2e/milanTest.spec.js` is the only spec file and is a minimal smoke test.
`cypress/support/commands.js` and `e2e.js` are the default Cypress scaffolding, largely unmodified.
There is no CI-side unit test runner configured (no `test` script in `apps/web/package.json`); Cypress (`npm run cypress:open` / `cypress:run`) is the only automated test tooling in this repo today.

## Types

This entire folder is TypeScript. Nothing here had any state or props worth a `types/index.ts` — see [error-handling/SPEC.md](../../apps/web/src/features/error-handling/SPEC.md#types).
