# Error Handling & Misc Pages — Feature Spec

Colocated, implementation-level companion to [docs/specs/error-handling.md](../../../docs/specs/error-handling.md).
The smallest feature folder besides `organizations` — two page components, no hooks, no services, and (since the August 2026 404 rebuild) no CSS file — but the app-wide error/offline conventions it touches are used by every other feature, so this spec doubles as the reference for those shared conventions.

## What this feature is responsible for

The 404 catch-all page, plus one leftover dev-scratch file (`Test.tsx`) that happens to still live in the tree.
It does **not** own any app-wide error boundary or global error UI — there isn't one anywhere in this codebase (see below) — this folder is just where the 404 route's component happens to live.

## Why it's shaped this way

There's no centralized error-handling *system* to document here beyond "toasts, per API call, plus a 404 page for unmatched routes" — the app has no React error boundary, so this feature can't be pointed to as "the place that catches render errors," because nothing catches them. That absence is itself the most important thing to know about this feature area.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Error404.tsx` | The `*` catch-all route's component | ✅ routed |
| `pages/Test.tsx` | Dev leftover — redirects to Google on mount | ❌ not routed, unreachable, but still present in the tree |

## `pages/Error404.tsx`

Matched by the `*` catch-all route in `routesConfig.tsx` — the last entry in the route table, catching any path that doesn't match one of the explicit routes.

**Rebuilt August 2026**, replacing an illustration-led page (see "What the rebuild fixed" below).

**Entire implementation:** `<Helmet>` (title "KarmaCircle | Page not found" + meta description, following the direct-`<Helmet>` pattern `Home.tsx`/`Auth.tsx` use - `ComponentHelmet` has no branch for this page and returns `null` for any `type` other than `Organizations`/`Events`), `<Navbar />`, a `<main>` holding an eyebrow chip, an `<h1>`, one paragraph, a primary `Button to="/"`, and a line of quiet `<Link>`s to `/organizations` and `/events`, then `<Footer />`.

**It is intentionally the same layout as `EventNotFound`** in [events/pages/DetailedEvent.tsx](../../events/pages/DetailedEvent.tsx) - same chip, same heading scale, same button treatment - so the app's global 404 and its in-page not-found state don't look like two different products. If you restyle one, restyle the other.

**No CSS file.** Everything is Tailwind utilities in `className`, per the repo convention. `Error404.css` was deleted; do not reintroduce a per-page stylesheet here - a hand-written unlayered CSS file outranks every Tailwind utility on the same element, which is precisely how the old page's `width: 60%` became unoverridable from the JSX.

**The `min-h-[68vh]` on `<main>`** exists because the page is short: without it the footer rides up under the copy on a tall viewport.

### What the rebuild fixed

Worth reading before touching any other page in this app, because three of the four were general problems rather than 404-specific ones:

- **The `Button` had no `className`.** The shared `Button` ships **no** padding, radius, or typography of its own - `variantClasses.solid` is only `bg-brand text-white` plus hover/press states, and every other call site supplies the shape (see `Navbar.tsx`'s two usages). Passing none rendered a bare brand-coloured rectangle hugging the text. The now-deleted `ComingSoon` component had the identical bug.
- **`.button-wrapper` was never defined anywhere in the repo.** The only occurrence of that class was the JSX that used it, so nothing centred or padded the button and it sat flush against x=0.
- **The illustration was `width: 60%` with no `max-width`** against a 750x500 viewBox, so on a wide monitor it drew ~2.4x its design size. (The accompanying `height: 60%` was inert - no ancestor sets a height, so it resolved to `auto`; the artwork was oversized, not stretched.)
- **No `Navbar`, no `Footer`, no `<title>`.** A visitor on any unmatched URL had no chrome to navigate away with, and the tab kept whatever title the previous page had set.

## `pages/Test.tsx` — dev leftover, unreachable but present

**Not wired into `routesConfig.tsx` at all** — no route points here, so it cannot be reached through any navigation in the live app.

**Entire implementation:**
```jsx
const Test = () => {
  useEffect(() => {
    window.location.href = "https://www.google.com";
  }, []);
  return <div>Test</div>;
};
```
On mount, immediately full-page-redirects the browser to Google — this would only ever fire if something (a future route addition, a stray `import Test from ...` + direct render, a test harness) actually mounts this component, which nothing in the current codebase does.

**Almost certainly a debugging scratch file** — probably used at some point to verify routing/redirect behavior worked, then left in the tree rather than deleted.
**Safe to delete unless someone confirms otherwise** — per the existing guidance in `docs/specs/error-handling.md` — but flag it rather than silently removing it if you weren't specifically asked to clean up dead files; don't fold a deletion of this file into an unrelated change without calling it out.

## App-wide error conventions this feature sits next to (not owned by it, but relevant to anyone debugging an error report)

**No React error boundary anywhere in the app.** Confirmed via a full-repo read — no `componentDidCatch`, no `static getDerivedStateFromError`, no `react-error-boundary` package usage. An uncaught render error in *any* component, in *any* feature, produces a blank white screen with no fallback UI, no error message, nothing — the entire React tree unmounts. This is relevant well beyond this folder: several other feature specs in this repo (`dashboard/SPEC.md`, `onboarding-profile/SPEC.md`) document specific reproducible crash paths (an undefined function call, a `TypeError` on a network-failure response) that would hit exactly this gap — a blank screen, not a caught error — if triggered in production. If you're ever asked to make the app "fail more gracefully," adding a top-level error boundary (most naturally in `src/app/App.tsx`, wrapping the `<Routes>` block) is the single highest-leverage fix available, and this feature folder (`error-handling`) would be a reasonable home for the fallback UI component itself, even though the boundary's `try/catch`-equivalent wiring would live in `src/app/`.

**API/network error feedback is per-call, via toasts, not a global mechanism.** Every `MilanApi.ts` function catches its own errors and returns a response-shaped value rather than throwing (see [api-integration.md](../../../docs/specs/api-integration.md)); callers are individually responsible for checking `response?.status` and calling `showErrorToast(...)`. There is no interceptor-level (e.g. Axios response interceptor) centralized error handling anywhere in `src/services/` — each of the roughly dozen `MilanApi.ts` functions repeats its own `try/catch`.

**Offline behavior — precise mechanism, corrects a common misreading of the existing centralized spec:** [`src/utils/CheckInternetConnection.ts`](../../../src/utils/CheckInternetConnection.ts)'s `checkInternetConnection()` checks `navigator.onLine`, and if `false`, **fires its own `toast.error("Please check your internet connection")` directly** (via raw `react-toastify`, not the app's own `showSuccessToast`/`showErrorToast` wrappers) before returning `false`. [`src/utils/Toasts.ts`](../../../src/utils/Toasts.ts)'s `showSuccessToast`/`showErrorToast` both call `checkInternetConnection()` as their first line and return early (without showing their own success/error toast) if it's `false` — so **the net effect of calling `showErrorToast("Something failed")` while offline is that the user sees a generic "Please check your internet connection" toast, not "Something failed," and not nothing.** This differs from `docs/specs/error-handling.md`'s framing ("suppresses all toasts... the user just sees nothing") — there genuinely is a visible toast, it's just generic and comes from `checkInternetConnection()` itself rather than from whichever `showSuccessToast`/`showErrorToast` call triggered the check. There is still no persistent offline *banner* anywhere in the app (the assumption `docs/specs/error-handling.md` describes) — only this one-shot toast, which fires again on every subsequent failed connectivity check (e.g. every additional API call attempted while still offline), not just once per offline session.

**Any code that calls `checkInternetConnection()` directly** (not through `showSuccessToast`/`showErrorToast`) — e.g. `useAuth.ts`'s `authenticateUser`, see [authentication/SPEC.md](../authentication/SPEC.md) — gets this same connectivity toast for free as its only offline feedback; there's no additional field-level or contextual messaging layered on top in those call sites.

## Cypress E2E (lives outside this feature folder, but is this app's only automated test tooling)

`cypress/e2e/milanTest.spec.js` is the only spec file, and is a minimal smoke test.
`cypress/support/commands.js` and `cypress/support/e2e.js` are the default Cypress scaffolding, largely unmodified.
`cypress/fixtures/example.json` is the default Cypress example fixture, unused by the one real spec.
There is no CI-side unit test runner configured (no `test` script in `package.json`) — Cypress (`npm run cypress:open` / `cypress:run`) is the only automated test tooling in this repo today. If you're asked to add test coverage for anything in this feature (or any feature), there's no existing unit-test pattern in this repo to follow — you'd either extend the one Cypress spec or introduce a unit-test runner as a separate decision, not something to do incidentally while fixing a bug elsewhere.

## Types

This folder is TypeScript now — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern. Nothing here has any meaningful state or props to type (both files are prop-less, state-less components), so there's no `types/index.ts` — one wasn't manufactured just to have one.

## Known issues specific to this feature

- ~~No `<Helmet>`/SEO tags on `Error404.tsx`~~ — fixed in the August 2026 rebuild.
- ~~`Error404.tsx` renders no `Navbar`/`Footer`~~ — fixed in the August 2026 rebuild.
- `Test.tsx` is dev-scratch code, safe to delete once confirmed — already in `known-issues.md`.
- No app-wide error boundary — already in `known-issues.md`, elaborated here with concrete cross-references to reproducible crash paths documented in other features' specs.
- The offline-toast mechanism is more visible than the centralized spec's wording suggested (a real toast fires, just a generic one) — correction to `docs/specs/error-handling.md`, not a new bug.

## If you're asked to...

- **"Make the app not go blank on errors"** → add a top-level error boundary in `src/app/App.tsx` around `<Routes>`; this folder is a reasonable home for the fallback-UI component, and it should reuse `Error404.tsx`'s chip/heading/button layout so the two failure states match.
- **"Clean up dead files"** → `pages/Test.tsx` is the clearest candidate in this folder; confirm before deleting per the guidance above.
- **"Restyle the 404 page"** → it already carries `Navbar`/`Footer`/`Helmet` and the app's type and colour tokens; whatever you change here, mirror it in `EventNotFound` (`events/pages/DetailedEvent.tsx`), which shares the layout on purpose.
- **"Fix the offline experience"** → the current one-shot generic toast (from `checkInternetConnection()`) is the entire offline UX; a persistent banner (the thing the original design assumption in `docs/specs/error-handling.md` gestures at but never built) would be new work, not a wiring fix.
