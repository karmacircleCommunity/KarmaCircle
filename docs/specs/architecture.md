# Architecture

## Entry point and providers

[src/app/index.jsx](../../src/app/index.jsx) is the actual entry point (see `index.html`).
It mounts `<App />` inside, from outermost to innermost: Redux `<Provider>`, `<HelmetProvider>` (for per-page `<title>`/meta tags via `react-helmet-async`), and redux-persist's `<PersistGate>`.
`<Analytics />` and `<SpeedInsights />` from Vercel are rendered as siblings of `<App />`, so they run regardless of route.
It also sets a `--vh` CSS custom property from `window.innerHeight` on load, a common mobile-viewport-height workaround; it is not recalculated on resize.

[src/app/App.jsx](../../src/app/App.jsx) wraps the router in `<QueryClientProvider>` (from `@tanstack/react-query`) and MUI's `<LocalizationProvider>` (needed for the date/time pickers used in event creation).
It renders a global `<ToastContainer />` (react-toastify) and a global `<BacktoTop />` button outside the `<Routes>`, so both appear on every page.
Route content is wrapped in `<Suspense fallback={"Loading . . ."}>` to support the two lazy-loaded auth pages (see below).

Note: `QueryClientProvider` is set up but no component in the codebase currently calls `useQuery`/`useMutation` — all server-state fetching goes through SWR or plain `axios` instead.
See [known-issues.md](./known-issues.md).

## Routing

The route table lives in [src/app/routes/routesConfig.jsx](../../src/app/routes/routesConfig.jsx) and is consumed by `App.jsx`, which maps it into a flat list of `<Route>` elements (no nested routes, no layout routes).

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

`SignIn` and `SignUp` are the only lazily-loaded routes (`lazy(() => import(...))`), and are each wrapped by [DonotRenderWhenLoggedIn](../../src/features/authentication/components/DonotRenderWhenLoggedIn.jsx) — a HOC that redirects an already-authenticated user to `/`.
See [authentication.md](./authentication.md).

Pages are exported from a barrel file, [src/app/routes/route.js](../../src/app/routes/route.js), and re-exported under friendlier names (`Login` for `SignIn`, etc.).
`routesConfig.jsx` imports most pages from this barrel but imports `Home` and `Trending` directly — there's no functional difference, just inconsistent style.

There is no `/donate` route registered anywhere, even though `src/features/donate-shop-trending/pages/Donate.jsx` exists.
There is no `/events/:id` (or similar) detail route either, even though `src/features/events/pages/DetailedEvent.jsx` exists as a stub.
Both are effectively unreachable dead code today — see [known-issues.md](./known-issues.md).

## Build configuration

- `vite.config.mjs` configures the path aliases (see [README.md](./README.md)), dev server (`port: 3000`, `host: true`, `usePolling: true` for the watcher — relevant in Docker/WSL setups), and `vite-plugin-pwa` with a `CacheFirst` runtime-caching strategy for Google Fonts and image files.
- Environment variables are read via `import.meta.env.*` and must be prefixed `VITE_`.
  The two names actually read in code are `VITE_API_URL` (base URL for every backend call) and `VITE_RAZORPAY_KEY_ID` (see [donate-shop-trending.md](./donate-shop-trending.md)).
  `.env.example` at the repo root documents `VITE_MILANAPI` instead of `VITE_API_URL` — that's a stale variable name; see [known-issues.md](./known-issues.md).
- `eslint.config.js` and `.prettierrc` define lint/format rules; `husky` + `lint-staged` run `eslint --fix` and `prettier --write` on staged `.js`/`.jsx` files pre-commit.
- `commitlint.config.js` enforces Conventional Commits via a husky `commit-msg` hook.

## Directory layout

The codebase is organized feature-first (see [README.md](./README.md#folder-structure)).
Each feature owns only the subfolders it actually needs; nothing here is a fixed template every feature must fill out.

```
src/
  app/                         — app shell / bootstrap
    App.jsx, index.jsx         — root component + entry point
    routes/                    — routesConfig.jsx (route table), route.js (page barrel)
    store/                     — Redux Toolkit store + userSlice, Zustand store (useAuth — loading flag only)
  features/
    authentication/            — SignIn/SignUp pages, AuthButton, DonotRenderWhenLoggedIn, useAuth/useValidation/useFormLogic
    onboarding-profile/        — Profile/UserProfile pages, ProfileCompletion/ProfileUpdate modals, ProfileElements
    dashboard/                 — Dashboard page, ProfileSection, TrackSection
    clubs/                     — Clubs page, ClubCard, Clubs.js fetcher
    events/                    — Events/DetailedEvent pages, event cards, CreateEvent(s), useEvent
    landing-home/               — Home page, Landing hero, MilanInfoBanner
    donate-shop-trending/      — Donate, Shop, Trending pages, PaymentGateway.js (Razorpay)
    error-handling/            — Error404, Test pages
  components/                  — shared across 2+ features: Navbar, Footer, Header, Button, Modal, Loading, BacktoTop, ComingSoon, ComponentHelmet, ClickAwayListener
  services/                    — MilanApi.js (most backend calls), ApiConnector.js + ApiEndpoints.js (shared API infra)
  statics/                     — static reference data (Constants.js, CountryList.js, OnlinePlatform.js)
  utils/                       — cross-cutting helpers used by 2+ features (toasts, fetcher, connectivity check)
  styles/                      — global CSS/SCSS
  assets/                      — images, SVGs
```

Inside a feature folder, only the needed subfolders exist — e.g. `clubs/` has no `hooks/`, `donate-shop-trending/` has no `components/`.
A file only lives at the top level (`components/`, `services/`, `utils/`) when more than one feature actually imports it; single-consumer helpers moved into that consumer's feature folder even if they were previously top-level.

Two backend-call layers coexist: `src/services/MilanApi.js` (raw `axios`, most calls) and the feature-level `services/Clubs.js` / `services/Events.js` fetchers under `src/features/clubs/` and `src/features/events/` (go through `src/services/ApiConnector.js`, only used by `getClubs`/`getEvents`).
See [api-integration.md](./api-integration.md) for which one each feature actually uses.
