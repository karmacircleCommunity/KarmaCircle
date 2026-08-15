# Architecture

## Entry point and providers

[src/app/index.tsx](../../src/app/index.tsx) is the actual entry point (see `index.html`).
It mounts `<App />` inside, from outermost to innermost: Redux `<Provider>`, `<HelmetProvider>` (for per-page `<title>`/meta tags via `react-helmet-async`), and redux-persist's `<PersistGate>`.
`<Analytics />` and `<SpeedInsights />` from Vercel are rendered as siblings of `<App />`, so they run regardless of route.
It also sets a `--vh` CSS custom property from `window.innerHeight` on load, a common mobile-viewport-height workaround; it is not recalculated on resize.

[src/app/App.tsx](../../src/app/App.tsx) wraps the router in `<QueryClientProvider>` (from `@tanstack/react-query`) and MUI's `<LocalizationProvider>` (needed for the date/time pickers used in event creation).
It renders a global `<ToastContainer />` (react-toastify) and a global `<BacktoTop />` button outside the `<Routes>`, so both appear on every page.
Route content is wrapped in `<Suspense fallback={"Loading . . ."}>` to support the two lazy-loaded auth pages (see below).

Note: `QueryClientProvider` is set up but no component in the codebase currently calls `useQuery`/`useMutation` — all server-state fetching goes through SWR or plain `axios` instead.
See [known-issues.md](./known-issues.md).

## Routing

The route table lives in [src/app/routes/routesConfig.tsx](../../src/app/routes/routesConfig.tsx) and is consumed by `App.tsx`, which maps it into a flat list of `<Route>` elements (no nested routes, no layout routes).

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

`SignIn` and `SignUp` are the only lazily-loaded routes (`lazy(() => import(...))`), and are each wrapped by [DonotRenderWhenLoggedIn](../../src/features/authentication/components/DonotRenderWhenLoggedIn.tsx) — a HOC that redirects an already-authenticated user to `/`.
See [authentication.md](./authentication.md).

Pages are exported from a barrel file, [src/app/routes/route.ts](../../src/app/routes/route.ts), and re-exported under friendlier names (`Login` for `SignIn`, etc.).
`routesConfig.tsx` imports most pages from this barrel but imports `Home` and `Trending` directly — there's no functional difference, just inconsistent style.

There is no `/donate` route registered anywhere, even though `src/features/donate-shop-trending/pages/Donate.tsx` exists.
There is no `/events/:id` (or similar) detail route either, even though `src/features/events/pages/DetailedEvent.tsx` exists as a stub.
Both are effectively unreachable dead code today — see [known-issues.md](./known-issues.md).

## Build configuration

- `vite.config.mjs` configures the path aliases (see [README.md](./README.md)), dev server (`port: 3000`, `host: true`, `usePolling: true` for the watcher — relevant in Docker/WSL setups), and `vite-plugin-pwa` with a `CacheFirst` runtime-caching strategy for Google Fonts and image files.
- Environment variables are read via `import.meta.env.*` and must be prefixed `VITE_`.
  The two names actually read in code are `VITE_API_URL` (base URL for every backend call) and `VITE_RAZORPAY_KEY_ID` (see [donate-shop-trending.md](./donate-shop-trending.md)).
  `.env.example` at the repo root documents `VITE_MILANAPI` instead of `VITE_API_URL` — that's a stale variable name; see [known-issues.md](./known-issues.md).
- `eslint.config.js` and `.prettierrc` define lint/format rules; `husky` + `lint-staged` run `eslint --fix` and `prettier --write` on staged `.js`/`.jsx`/`.ts`/`.tsx` files pre-commit.
- `commitlint.config.js` enforces Conventional Commits via a husky `commit-msg` hook.

## TypeScript

`tsconfig.json` at the repo root added TypeScript to the project (replacing `jsconfig.json`, which it superseded — its `paths` are the same alias table, kept in sync with `vite.config.mjs`).
It sets `allowJs: true` / `checkJs: false` and `moduleResolution: "bundler"` (matching Vite's own resolution); `allowJs`/`checkJs` are vestigial now that the conversion is complete (no `.js`/`.jsx` files remain under `src/`), kept only because there's no reason to churn the config.
Vite/esbuild already strip types from `.ts`/`.tsx` at bundle time with no config changes needed; `npm run type-check` (`tsc --noEmit`) is the actual type-checking step and isn't part of `npm run build`.
`eslint.config.js` adds `typescript-eslint`'s recommended rules scoped to `**/*.{ts,tsx}` only, alongside the existing JS/React rules.
The conversion happened feature-by-feature (not as one repo-wide pass) ending with the shared layer (`src/components/`, `src/services/`, `src/statics/`, `src/utils/`) — see [README.md](./README.md#typescript).
The sibling-`.d.ts`-bridge convention this doc used to describe for shared JS dependencies (e.g. a `src/statics/Constants.d.ts` next to the still-JS `Constants.js`) no longer applies — every former bridge target got real types directly and the bridge files were deleted.
Each feature's type surface lives in a colocated `types/` folder (`src/features/<name>/types/`, or `src/types/` for cross-feature types), split by declaration kind rather than combined into one file: `interfaces.ts` for `interface` declarations, `enums.ts` for `enum` declarations, `types.ts` for type aliases. See [CLAUDE.md](../../CLAUDE.md#coding-conventions-for-this-repo).

## Directory layout

The codebase is organized feature-first (see [README.md](./README.md#folder-structure)).
Each feature owns only the subfolders it actually needs; nothing here is a fixed template every feature must fill out.

```
src/
  app/                         — app shell / bootstrap
    App.tsx, index.tsx         — root component + entry point
    routes/                    — routesConfig.tsx (route table), route.ts (page barrel)
    store/                     — Redux Toolkit store + userSlice, Zustand store (useAuth — loading flag only)
  features/
    authentication/            — SignIn/SignUp pages, AuthButton, DonotRenderWhenLoggedIn, useAuth/useValidation/useFormLogic
    onboarding-profile/        — Profile/UserProfile pages, ProfileCompletion/ProfileUpdate modals, ProfileElements
    dashboard/                 — Dashboard page, ProfileSection, TrackSection
    clubs/                     — Clubs page, ClubCard, Clubs.ts fetcher
    events/                    — Events/DetailedEvent pages, event cards, CreateEvent(s), useEvent
    landing-home/               — Home page, Landing hero, MilanInfoBanner
    donate-shop-trending/      — Donate, Shop, Trending pages, PaymentGateway.ts (Razorpay)
    error-handling/            — Error404, Test pages
  components/                  — shared across 2+ features: Navbar, Footer, Header, Button, Modal, Loading, BacktoTop, ComingSoon, ComponentHelmet, ClickAwayListener
  services/                    — MilanApi.ts (most backend calls), ApiConnector.ts + ApiEndpoints.ts (shared API infra)
  statics/                     — static reference data (Constants.ts, CountryList.ts, OnlinePlatform.ts)
  utils/                       — cross-cutting helpers used by 2+ features (toasts, fetcher, connectivity check)
  styles/                      — global CSS/SCSS
  assets/                      — images, SVGs
```

Inside a feature folder, only the needed subfolders exist — e.g. `clubs/` has no `hooks/`, `donate-shop-trending/` has no `components/`.
A file only lives at the top level (`components/`, `services/`, `utils/`) when more than one feature actually imports it; single-consumer helpers moved into that consumer's feature folder even if they were previously top-level.

Two backend-call layers coexist: `src/services/MilanApi.ts` (raw `axios`, most calls) and the feature-level `services/Clubs.js` / `services/Events.js` fetchers under `src/features/clubs/` and `src/features/events/` (go through `src/services/ApiConnector.ts`, only used by `getClubs`/`getEvents`).
See [api-integration.md](./api-integration.md) for which one each feature actually uses.
