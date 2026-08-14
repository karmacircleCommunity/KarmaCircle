# Error Handling & Misc Pages

## 404

[src/features/error-handling/pages/Error404.tsx](../../src/features/error-handling/pages/Error404.tsx), matched by the `*` catch-all route in `routesConfig.tsx`.
Renders a static SVG illustration and a `Button` (`to="/"`) back to home.
No `<Helmet>`/SEO tags, unlike most other top-level pages — worth adding if you touch this file.

## API/network error feedback

There is no error boundary (`componentDidCatch`/React error boundary) anywhere in the app — an uncaught render error in any component will produce a blank white screen with no fallback UI.
Network/API errors are instead surfaced per-call via toasts — see [Toasts.ts conventions](./api-integration.md#toast-conventions) and [checkInternetConnection.js](../../src/utils/CheckInternetConnection.ts), which suppresses all toasts (success and error alike) whenever `navigator.onLine === false`, on the assumption that an offline banner would be more useful than a flood of failed-request toasts (no such offline banner currently exists, though — the user just sees nothing).

## `Test.tsx` (dev leftover, currently routed)

[src/features/error-handling/pages/Test.tsx](../../src/features/error-handling/pages/Test.tsx) is **not** wired into `routesConfig.tsx`, so it isn't reachable via any path, but it does still exist in the tree: on mount it immediately redirects the browser to `https://www.google.com`.
Almost certainly a debugging scratch file — safe to delete unless someone confirms otherwise, but flag it rather than silently removing it if you weren't specifically asked to clean up dead files.

## Cypress E2E

`cypress/e2e/milanTest.spec.js` is the only spec file and is a minimal smoke test.
`cypress/support/commands.js` and `e2e.js` are the default Cypress scaffolding, largely unmodified.
There is no CI-side unit test runner configured (no `test` script in `package.json`); Cypress (`npm run cypress:open` / `cypress:run`) is the only automated test tooling in this repo today.

## Types

This entire folder is TypeScript. Nothing here had any state or props worth a `types/index.ts` — see [error-handling/SPEC.md](../../src/features/error-handling/SPEC.md#types).
