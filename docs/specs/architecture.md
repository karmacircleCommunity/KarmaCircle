# Architecture

## Entry point and providers

[apps/web/src/app/index.tsx](../../apps/web/src/app/index.tsx) is the actual entry point (see `index.html`).
It mounts `<App />` inside, from outermost to innermost: Redux `<Provider>`, `<HelmetProvider>` (for per-page `<title>`/meta tags via `react-helmet-async`), and redux-persist's `<PersistGate>`.
`<Analytics />` and `<SpeedInsights />` from Vercel are rendered as siblings of `<App />`, so they run regardless of route.
It also sets a `--vh` CSS custom property from `window.innerHeight` on load, a common mobile-viewport-height workaround; it is not recalculated on resize.

[apps/web/src/app/App.tsx](../../apps/web/src/app/App.tsx) wraps the router in `<QueryClientProvider>` (from `@tanstack/react-query`) and MUI's `<LocalizationProvider>` (needed for the date/time pickers used in event creation).
It renders a global `<ToastContainer />` (react-toastify) and a global `<ScrollProgress />` bar outside the `<Routes>`, so both appear on every page. The `BacktoTop` component exists but is not mounted here; see [layout-navigation.md](./layout-navigation.md).
Route content is wrapped in `<Suspense fallback={"Loading . . ."}>` to support the three lazy-loaded authentication pages (see below).

Note: `QueryClientProvider` is set up but no component in the codebase currently calls `useQuery`/`useMutation` — all server-state fetching goes through SWR or plain `axios` instead.
See [known-issues.md](./known-issues.md).

## Routing

The route table lives in [apps/web/src/app/routes/routesConfig.tsx](../../apps/web/src/app/routes/routesConfig.tsx) and is consumed by `App.tsx`, which maps it into a flat list of `<Route>` elements (no nested routes, no layout routes).

| Path | Element | Notes |
|---|---|---|
| `/` | `Home` | Landing page + marketing content |
| `/brand` | `BrandRedirect` | Redirects to the standalone brand guide site |
| `/auth/signup`, `/auth/signin` | `Auth` (lazy, wrapped in `DonotRenderWhenLoggedIn`) | Same email-first flow on both paths |
| `/auth/forgot-password` | `ForgotPassword` (lazy, wrapped in `DonotRenderWhenLoggedIn`) | Request a reset email |
| `/auth/reset-password/:token` | `ResetPassword` (lazy, wrapped in `DonotRenderWhenLoggedIn`) | Set a new password using a single-use token |
| `/user/setup` | `ProfileSetup` (wrapped in `RequireSignIn`) | Signed-in individual editor; old handle page removed |
| `/organizations` | `Organizations` | Live organization directory |
| `/organization/setup` | `OrganizationSetup` | Organization owner setup and editing flow |
| `/organization/:userName` | `OrganizationProfile` | Public organization profile. The parameter is named `userName` in the route, while links and API records use the organization handle |
| `/dashboard` | `Dashboard` | Organization dashboard; setup gate handles incomplete or signed-out states |
| `/organization/events` | `YourEvents` | Organization's hosted events; setup gate handles access state |
| `/events/mine` | `MyEvents` (wrapped in `RequireSignIn`) | Signed-in individual's registrations |
| `/events` | `Events` | Live event directory |
| `/events/:eventId` | `DetailedEvent` | Event detail; `eventId` is the event `uid` |
| `*` | `Error404` | Catch-all for unknown paths |

The three authentication pages are lazily loaded and wrapped by [DonotRenderWhenLoggedIn](../../apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx), which redirects a visitor who is already signed in to `/`.
`ProfileSetup` and `MyEvents` are wrapped by [RequireSignIn](../../apps/web/src/features/authentication/components/RequireSignIn.tsx).
See [authentication.md](./authentication.md).

Most routed pages are exported from [apps/web/src/app/routes/route.ts](../../apps/web/src/app/routes/route.ts); `Home` is imported directly, and auth pages are imported directly for lazy loading.
`/donate` has no route even though its page remains in the feature tree.
The old `/trending` route is not registered, and the former Trending page is not in the route barrel.
See [known-issues.md](./known-issues.md) for unreachable feature code.

## Build configuration

- `vite.config.mjs` configures the path aliases (see [README.md](./README.md)), dev server (`port: 3000`, `host: true`, `usePolling: true` for the watcher — relevant in Docker/WSL setups), and `vite-plugin-pwa` with a `CacheFirst` runtime-caching strategy for Google Fonts and image files.
- Environment variables are read via `import.meta.env.*` and must be prefixed `VITE_`.
  The frontend reads `VITE_API_URL`, optional `VITE_GEOAPIFY_API_KEY`, and `VITE_RAZORPAY_KEY_ID`.
  See [LocalDevSetup.md](../LocalDevSetup.md) for which ones are required or optional.
- `eslint.config.js` and `.prettierrc` define lint/format rules; `husky` + `lint-staged` run `eslint --fix` and `prettier --write` on staged `.js`/`.jsx`/`.ts`/`.tsx` files pre-commit.
- `commitlint.config.js` enforces Conventional Commits via a husky `commit-msg` hook.

## TypeScript

`tsconfig.json` at the repo root added TypeScript to the project (replacing `jsconfig.json`, which it superseded — its `paths` are the same alias table, kept in sync with `vite.config.mjs`).
It sets `allowJs: true` / `checkJs: false` and `moduleResolution: "bundler"` (matching Vite's own resolution); `allowJs`/`checkJs` are vestigial now that the conversion is complete (no `.js`/`.jsx` files remain under `apps/web/src/`), kept only because there's no reason to churn the config.
Vite/esbuild already strip types from `.ts`/`.tsx` at bundle time with no config changes needed; `npm run type-check` (`tsc --noEmit`) is the actual type-checking step and isn't part of `npm run build`.
`eslint.config.js` adds `typescript-eslint`'s recommended rules scoped to `**/*.{ts,tsx}` only, alongside the existing JS/React rules.
The conversion happened feature-by-feature (not as one repo-wide pass) ending with the shared layer (`apps/web/src/components/`, `apps/web/src/services/`, `apps/web/src/statics/`, `apps/web/src/utils/`) — see [README.md](./README.md#typescript).
The sibling-`.d.ts`-bridge convention this doc used to describe for shared JS dependencies (e.g. a `apps/web/src/statics/Constants.d.ts` next to the still-JS `Constants.js`) no longer applies — every former bridge target got real types directly and the bridge files were deleted.
Each feature's type surface lives in a colocated `types/` folder (`apps/web/src/features/<name>/types/`, or `apps/web/src/types/` for cross-feature types), split by declaration kind rather than combined into one file: `interfaces.ts` for `interface` declarations, `enums.ts` for `enum` declarations, `types.ts` for type aliases. See [CLAUDE.md](../../CLAUDE.md#coding-conventions-for-this-repo).

## Directory layout

The codebase is organized feature-first (see [README.md](./README.md#folder-structure)).
Each feature owns only the subfolders it actually needs; nothing here is a fixed template every feature must fill out.

```
apps/web/src/
  app/                         — app shell / bootstrap
    App.tsx, index.tsx         — root component + entry point
    routes/                    — routesConfig.tsx (route table), route.ts (page barrel)
    store/                     — Redux Toolkit store + userSlice, Zustand store (useAuth — loading flag only)
  features/
    authentication/            — unified Auth page, password reset pages, AuthButton, route guards, and auth hooks
    onboarding-profile/        — individual profile setup; legacy unrouted profile prototype and retired modals also remain
    dashboard/                 — Dashboard page, ProfileSection, TrackSection
    organizations/             — directory, public profile, setup, dashboard-adjacent UI, and API types/hooks
    events/                    — directory/detail pages, event cards, create forms, hooks, fetchers, and mappers
    landing-home/              — Home page, landing sections, sample drives, and page-specific types
    donate-shop-trending/      — unrouted Donate page and payment integration files; no Shop or Trending route
    error-handling/            — Error404 page
  components/                  — shared UI: Navbar, Footer, Header, Button, Combobox, Modal, Loading, ScrollProgress, ComponentHelmet, ClickAwayListener
  hooks/                       — cross-cutting hooks used by 2+ features (useSectionReveal, useMagnetic, useReducedMotion — the shared motion layer, see ui-kit.md#motion)
  services/                    — KarmaCircleApi.ts (most backend calls), ApiConnector.ts + ApiEndpoints.ts (shared API infra)
  statics/                     — static reference data (Constants.ts, CountryList.ts, OnlinePlatform.ts, IndiaStates.ts, IndiaCities.ts)
  utils/                       — cross-cutting helpers used by 2+ features (toasts, fetcher, connectivity check, locationSuggest)
  styles/                      — Tailwind entry point + hand-written global CSS (index.css), plus App.css
  assets/                      — images, SVGs
```

Inside a feature folder, only the needed subfolders exist — e.g. `organizations/` has no `hooks/`, `donate-shop-trending/` has no `components/`.
A file only lives at the top level (`components/`, `services/`, `utils/`) when more than one feature actually imports it; single-consumer helpers moved into that consumer's feature folder even if they were previously top-level.

Two deliberate exceptions, both added with the organization setup flow's location question ([organizations.md](./organizations.md#where-are-you-based-suggests-and-can-answer-itself)) and both with exactly one consumer today: `components/inputs/Combobox.tsx` and `utils/locationSuggest.ts`.
They are shared because of what they are rather than how many places import them - a suggest-as-you-type form field is a UI-kit primitive and is documented as one ([ui-kit.md](./ui-kit.md#combobox)), and "where is this" is a question events will ask in the same words organizations do.
The reference data they read (`statics/IndiaStates.ts`, `statics/IndiaCities.ts`) belongs in `statics/` on the existing rule, which is where `CountryList.ts` already sits with one consumer.

Two backend-call layers coexist: `apps/web/src/services/KarmaCircleApi.ts` (raw `axios`, most calls) and the feature-level `services/Organizations.ts` / `services/Events.ts` helpers under `apps/web/src/features/organizations/` and `apps/web/src/features/events/` (go through `apps/web/src/services/ApiConnector.ts`; neither helper is called by a routed page today).
See [api-integration.md](./api-integration.md) for which one each feature actually uses.
