# Architecture

## Entry point and providers

[src/index.jsx](../../src/index.jsx) is the actual entry point (see `index.html`).
It mounts `<App />` inside, from outermost to innermost: Redux `<Provider>`, `<HelmetProvider>` (for per-page `<title>`/meta tags via `react-helmet-async`), and redux-persist's `<PersistGate>`.
`<Analytics />` and `<SpeedInsights />` from Vercel are rendered as siblings of `<App />`, so they run regardless of route.
It also sets a `--vh` CSS custom property from `window.innerHeight` on load, a common mobile-viewport-height workaround; it is not recalculated on resize.

[src/App.jsx](../../src/App.jsx) wraps the router in `<QueryClientProvider>` (from `@tanstack/react-query`) and MUI's `<LocalizationProvider>` (needed for the date/time pickers used in event creation).
It renders a global `<ToastContainer />` (react-toastify) and a global `<BacktoTop />` button outside the `<Routes>`, so both appear on every page.
Route content is wrapped in `<Suspense fallback={"Loading . . ."}>` to support the two lazy-loaded auth pages (see below).

Note: `QueryClientProvider` is set up but no component in the codebase currently calls `useQuery`/`useMutation` — all server-state fetching goes through SWR or plain `axios` instead.
See [known-issues.md](./known-issues.md).

## Routing

The route table lives in [src/utils/routesConfig.jsx](../../src/utils/routesConfig.jsx) and is consumed by `App.jsx`, which maps it into a flat list of `<Route>` elements (no nested routes, no layout routes).

| Path | Element | Notes |
|---|---|---|
| `/` | `Home` | Landing page + marketing content |
| `/auth/signup` | `SignUp` (lazy, wrapped in `DonotRenderWhenLoggedIn`) | |
| `/auth/signin` | `SignIn` (lazy, wrapped in `DonotRenderWhenLoggedIn`) | |
| `/user/:userName` | `Profile` | Individual-user public profile |
| `/clubs` | `Clubs` | Club/org directory |
| `/club/:userName` | `Profile` | Club public profile — reuses the same `Profile` component as `/user/:userName` |
| `/dashboard` | `Dashboard` | Logged-in club/org's own dashboard |
| `/events` | `Events` | Event directory |
| `/shop` | `Shop` | "Coming soon" placeholder |
| `/trending` | `Trending` | "Coming soon" placeholder |
| `*` | `Error404` | Catch-all |

`SignIn` and `SignUp` are the only lazily-loaded routes (`lazy(() => import(...))`), and are each wrapped by [DonotRenderWhenLoggedIn](../../src/utils/Auth/DonotRenderWhenLoggedIn.jsx) — a HOC that redirects an already-authenticated user to `/`.
See [authentication.md](./authentication.md).

Pages are exported from a barrel file, [src/pages/route.js](../../src/pages/route.js), and re-exported under friendlier names (`Login` for `SignIn`, etc.).
`routesConfig.jsx` imports most pages from this barrel but imports `Home` and `Trending` directly — there's no functional difference, just inconsistent style.

There is no `/donate` route registered anywhere, even though `src/pages/donate/Donate.jsx` exists.
There is no `/events/:id` (or similar) detail route either, even though `src/pages/events/detailed/DetailedEvent.jsx` exists as a stub.
Both are effectively unreachable dead code today — see [known-issues.md](./known-issues.md).

## Build configuration

- `vite.config.mjs` configures the path aliases (see [README.md](./README.md)), dev server (`port: 3000`, `host: true`, `usePolling: true` for the watcher — relevant in Docker/WSL setups), and `vite-plugin-pwa` with a `CacheFirst` runtime-caching strategy for Google Fonts and image files.
- Environment variables are read via `import.meta.env.*` and must be prefixed `VITE_`.
  The two names actually read in code are `VITE_API_URL` (base URL for every backend call) and `VITE_RAZORPAY_KEY_ID` (see [donate-shop-trending.md](./donate-shop-trending.md)).
  `.env.example` at the repo root documents `VITE_MILANAPI` instead of `VITE_API_URL` — that's a stale variable name; see [known-issues.md](./known-issues.md).
- `eslint.config.js` and `.prettierrc` define lint/format rules; `husky` + `lint-staged` run `eslint --fix` and `prettier --write` on staged `.js`/`.jsx` files pre-commit.
- `commitlint.config.js` enforces Conventional Commits via a husky `commit-msg` hook.

## Directory layout

```
src/
  App.jsx, index.jsx          — app shell / bootstrap
  pages/                      — one folder per route/page (see routesConfig.jsx)
  components/
    shared/                   — reusable across public + private pages (Navbar, Footer, Button, cards, modals...)
    private/                  — used only behind auth-gated pages (dashboard sections, event creation, landing)
  redux/                      — Redux Toolkit store + userSlice
  store/                      — Zustand store (useAuth — loading flag only)
  hooks/                      — useAuth, useEvent, useFormLogic, useProfileCompletion, useValidation
  service/                    — MilanApi.js (most backend calls), PaymentGateway.js (Razorpay)
  integrations/               — ApiConnector.js (axios wrapper), ApiEndpoints.js (URL builders), Clubs.js, Events.js
  utils/                      — cross-cutting helpers (toasts, fetchers, formatting, auth HOC/toggles)
  static/                     — static reference data (Constants.js, CountryList.js, OnlinePlatform.js)
  constants/                  — ProfileElements.js (form-field metadata)
  styles/                     — global CSS/SCSS
  assets/                     — images, SVGs
```

Two backend-call layers coexist: `src/service/MilanApi.js` (raw `axios`, most calls) and `src/integrations/*.js` (goes through `ApiConnector.js`, only used by `getClubs`/`getEvents`).
See [api-integration.md](./api-integration.md) for which one each feature actually uses.
