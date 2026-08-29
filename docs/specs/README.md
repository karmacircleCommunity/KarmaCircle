# KarmaCircle Frontend — Feature Specs

This directory is a map of the codebase for AI coding agents and new contributors.
Each file documents one feature area: what it does, which files implement it, how data flows through it, and any known gaps or inconsistencies.
These specs describe the code as it exists today, including its rough edges — they are not aspirational.
When you change a feature, update its spec file in the same PR so this map stays trustworthy.

## What this project is

KarmaCircle (package name `milan-frontend`, a holdover from the app's former "NgoWorld"/"Milan" branding) is the React frontend for a platform that connects NGOs, charities, organizations, and individual users.
It talks to the backend at [apps/api](../../apps/api), this repo's other workspace, over a REST API — see [apps/api/docs/specs/README.md](../../apps/api/docs/specs/README.md) for the backend's own map.
This directory (`docs/specs/`) covers `apps/web` only; there is no server-side code here — it is a Vite + React SPA.

## Tech stack

- **React 19** with `react-router-dom` v7 for routing (`BrowserRouter`, all routes rendered in [App.tsx](../../apps/web/src/app/App.tsx)).
- **Vite** as the build tool, with `vite-plugin-pwa` for PWA/service-worker support and `vite-plugin-svgr` for importing SVGs as components.
- **Redux Toolkit + redux-persist** for the logged-in user's profile/session data (persisted to `localStorage`).
- **Zustand** for one small piece of ephemeral UI state — a global `isLoading` flag (see [state-management.md](./state-management.md)).
- **SWR** (`useSWR`) for server-state fetching/caching in most read paths; a few older call sites use raw `axios` in `useEffect` instead.
- **`@tanstack/react-query`**'s `QueryClientProvider` wraps the whole app but is not actually used by any query hooks yet — see [known-issues.md](./known-issues.md).
- **MUI** (`@mui/material`, `@mui/x-date-pickers`) for the event-creation date/time pickers and a few form controls.
- **Tailwind CSS v4** for all component styling (via `@tailwindcss/vite`), plus a small amount of hand-written global CSS in `apps/web/src/styles/index.css` for things Tailwind's class scanner can't reach — react-select/MUI-generated class names, a `<input type="radio">`-driven pseudo-element toggle switch, and Bootstrap's `.container` replicated for a few not-yet-Tailwind files. See [ui-kit.md](./ui-kit.md).
- **Cypress** for end-to-end tests (`cypress/e2e/milanTest.spec.js`), currently a minimal smoke test.

## Folder structure

The codebase is organized feature-first, not by page/component/hook type.
Each feature under `apps/web/src/features/<name>/` owns its own `pages/`, `components/`, `hooks/`, `services/`, `utils/`, and `constants/` subfolders as needed — only what that feature actually uses.
`apps/web/src/app/` is the app shell (entry point, root component, route table, Redux/Zustand store).
`apps/web/src/components/`, `apps/web/src/services/`, `apps/web/src/statics/`, `apps/web/src/styles/`, `apps/web/src/utils/`, and `apps/web/src/assets/` hold code genuinely shared across more than one feature — see [architecture.md](./architecture.md) for the full rationale and known-issues.md for a couple of remaining single-consumer utilities that were kept shared rather than pulled into a feature.

## Path aliases

Both `vite.config.mjs` and `tsconfig.json` define the same aliases; keep them in sync when adding a new one.
(`tsconfig.json` replaced `jsconfig.json` when TypeScript was introduced — see "TypeScript" below.)

| Alias | Resolves to |
|---|---|
| `@/*` | `apps/web/src/*` |
| `@app/*` | `apps/web/src/app/*` |
| `@features/*` | `apps/web/src/features/*` |
| `@components/*` | `apps/web/src/components/*` |
| `@services/*` | `apps/web/src/services/*` |
| `@statics/*` | `apps/web/src/statics/*` |
| `@hooks/*` | `apps/web/src/hooks/*` |
| `@utils/*` | `apps/web/src/utils/*` |
| `@styles/*` | `apps/web/src/styles/*` |
| `@assets/*` | `apps/web/src/assets/*` |

Much of the older code still uses relative imports instead of these aliases.
Both styles coexist; prefer the alias style in new code.

## TypeScript

The repo was converted to TypeScript feature by feature (not all at once) — see [architecture.md](./architecture.md#typescript) for the setup.
Every file under `apps/web/src/` is now `.ts`/`.tsx`: the app shell (`apps/web/src/app/`), every feature (`authentication`, `organizations`, `dashboard`, `donate-shop-trending`, `error-handling`, `events`, `landing-home`, `onboarding-profile`), and the shared layer (`apps/web/src/components/`, `apps/web/src/services/`, `apps/web/src/statics/`, `apps/web/src/utils/`).
`tsconfig.json` still has `allowJs: true` (harmless now that no `.js`/`.jsx` files remain under `apps/web/src/`) and `checkJs: false`.
The sibling-`.d.ts`-bridge pattern this doc used to describe (`Constants.d.ts`, `Toasts.d.ts`, `Button.d.ts`) is gone — those files got real types directly once their own conversion pass landed, and the bridges were deleted.

## Feature map

| Spec | Covers |
|---|---|
| [architecture.md](./architecture.md) | App shell, routing table, providers, build config |
| [state-management.md](./state-management.md) | Redux store/slice, Zustand store, redux-persist, cookies |
| [api-integration.md](./api-integration.md) | Every way the frontend talks to the backend: `MilanApi.ts`, `integrations/*`, `ApiConnector`, SWR fetchers |
| [authentication.md](./authentication.md) | Sign in, sign up, Google OAuth, logout, route guarding, password/email validation |
| [onboarding-profile.md](./onboarding-profile.md) | Post-signup profile completion, profile editing, the public Profile/UserProfile pages |
| [dashboard.md](./dashboard.md) | The logged-in organization/org dashboard |
| [organizations.md](./organizations.md) | The Organizations directory, `OrganizationCard`, and the public organization profile at `/organization/:userName` |
| [events.md](./events.md) | Events listing, event creation modal(s), event cards/slider |
| [landing-home.md](./landing-home.md) | Home page, marketing Landing hero, `MilanInfoBanner` |
| [layout-navigation.md](./layout-navigation.md) | Navbar, Footer, Header, Modal, Loading, ScrollProgress, BackToTop, page `<Helmet>` usage |
| [ui-kit.md](./ui-kit.md) | Shared `Button`, `AuthButton`, card components, and the styling conventions behind them |
| [donate-shop-trending.md](./donate-shop-trending.md) | Donate (Razorpay); the Shop and Trending placeholder pages were deleted |
| [error-handling.md](./error-handling.md) | 404 page, toast conventions, `Test.tsx` |
| [known-issues.md](./known-issues.md) | Cross-cutting bugs, dead code, and inconsistencies found while writing these specs — read this before touching adjacent code |

## Deeper, colocated specs

Every folder under `apps/web/src/features/<name>/` also has its own `SPEC.md` (e.g. [`apps/web/src/features/authentication/SPEC.md`](../../apps/web/src/features/authentication/SPEC.md)), living next to the code it describes.
The files in *this* directory are the short, cross-feature summaries — good for orienting or for understanding how two features interact.
The colocated `SPEC.md` in a feature folder is the deep reference — file-by-file, function-by-function, with exact state shapes, prop mismatches, and reproducible bugs — meant to be read immediately before editing code in that folder.
Start with the summary here, then open the feature's own `SPEC.md` once you know which one you're touching.

## How to use this with an AI agent

Point the agent at the spec for the feature it is changing (both the summary here **and** that feature's colocated `SPEC.md`), plus [architecture.md](./architecture.md) and [state-management.md](./state-management.md) for shared context.
The specs name the real backend endpoints each feature calls (see [api-integration.md](./api-integration.md)) — the backend repo is the source of truth for request/response shapes, not this repo.
Where a spec calls out a bug or a stub component, treat that as authoritative unless you've just fixed it — then update **both** the summary here and the feature's own `SPEC.md` in the same change.
