# NgoWorld (Milan) Frontend — Feature Specs

This directory is a map of the codebase for AI coding agents and new contributors.
Each file documents one feature area: what it does, which files implement it, how data flows through it, and any known gaps or inconsistencies.
These specs describe the code as it exists today, including its rough edges — they are not aspirational.
When you change a feature, update its spec file in the same PR so this map stays trustworthy.

## What this project is

NgoWorld (product name "Milan", package name `milan-frontend`) is the React frontend for a platform that connects NGOs, charities, clubs, and individual users.
It talks to a separate backend repo, [NgoWorld-Backend](https://github.com/ngoworldcommunity/NGOWorld-Backend), over a REST API.
There is no server-side code in this repo — it is a Vite + React SPA.

## Tech stack

- **React 19** with `react-router-dom` v7 for routing (`BrowserRouter`, all routes rendered in [App.tsx](../../src/app/App.tsx)).
- **Vite** as the build tool, with `vite-plugin-pwa` for PWA/service-worker support and `vite-plugin-svgr` for importing SVGs as components.
- **Redux Toolkit + redux-persist** for the logged-in user's profile/session data (persisted to `localStorage`).
- **Zustand** for one small piece of ephemeral UI state — a global `isLoading` flag (see [state-management.md](./state-management.md)).
- **SWR** (`useSWR`) for server-state fetching/caching in most read paths; a few older call sites use raw `axios` in `useEffect` instead.
- **`@tanstack/react-query`**'s `QueryClientProvider` wraps the whole app but is not actually used by any query hooks yet — see [known-issues.md](./known-issues.md).
- **MUI** (`@mui/material`, `@mui/x-date-pickers`) for the event-creation date/time pickers and a few form controls.
- **styled via CSS Modules / SCSS / plain CSS**, inconsistently, per component — see [ui-kit.md](./ui-kit.md).
- **Cypress** for end-to-end tests (`cypress/e2e/milanTest.spec.js`), currently a minimal smoke test.

## Folder structure

The codebase is organized feature-first, not by page/component/hook type.
Each feature under `src/features/<name>/` owns its own `pages/`, `components/`, `hooks/`, `services/`, `utils/`, and `constants/` subfolders as needed — only what that feature actually uses.
`src/app/` is the app shell (entry point, root component, route table, Redux/Zustand store).
`src/components/`, `src/services/`, `src/statics/`, `src/styles/`, `src/utils/`, and `src/assets/` hold code genuinely shared across more than one feature — see [architecture.md](./architecture.md) for the full rationale and known-issues.md for a couple of remaining single-consumer utilities that were kept shared rather than pulled into a feature.

## Path aliases

Both `vite.config.mjs` and `tsconfig.json` define the same aliases; keep them in sync when adding a new one.
(`tsconfig.json` replaced `jsconfig.json` when TypeScript was introduced — see "TypeScript" below.)

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@app/*` | `src/app/*` |
| `@features/*` | `src/features/*` |
| `@components/*` | `src/components/*` |
| `@services/*` | `src/services/*` |
| `@statics/*` | `src/statics/*` |
| `@hooks/*` | `src/hooks/*` |
| `@utils/*` | `src/utils/*` |
| `@styles/*` | `src/styles/*` |
| `@assets/*` | `src/assets/*` |

Much of the older code still uses relative imports instead of these aliases.
Both styles coexist; prefer the alias style in new code.

## TypeScript

The repo is being converted to TypeScript feature by feature (not all at once) — see [architecture.md](./architecture.md#typescript) for the setup.
Converted so far: the app shell (`src/app/`) plus `authentication`, `clubs`, `dashboard`, `donate-shop-trending`, `error-handling`, `events`, `landing-home`, `onboarding-profile`. Everything else is still plain JS (`.js`/`.jsx`) and stays that way until its own turn.
`tsconfig.json` has `allowJs: true` so JS and TS coexist and TS can still infer types across the boundary; `checkJs` is off, so untouched JS files are never type-checked.
Don't assume a feature is typed just because a shared dependency it imports (`MilanApi.js`, Redux slices, `Constants.js`, etc.) has types — those get real types only when their own turn comes, or when a converted feature needed a narrow `.d.ts` bridge for one (see `src/statics/Constants.d.ts`, `src/utils/Toasts.d.ts`, `src/components/buttons/globalbutton/Button.d.ts` for examples of that pattern).

## Feature map

| Spec | Covers |
|---|---|
| [architecture.md](./architecture.md) | App shell, routing table, providers, build config |
| [state-management.md](./state-management.md) | Redux store/slice, Zustand store, redux-persist, cookies |
| [api-integration.md](./api-integration.md) | Every way the frontend talks to the backend: `MilanApi.js`, `integrations/*`, `ApiConnector`, SWR fetchers |
| [authentication.md](./authentication.md) | Sign in, sign up, Google OAuth, logout, route guarding, password/email validation |
| [onboarding-profile.md](./onboarding-profile.md) | Post-signup profile completion, profile editing, the public Profile/UserProfile pages |
| [dashboard.md](./dashboard.md) | The logged-in club/org dashboard |
| [clubs.md](./clubs.md) | The Clubs directory page and `ClubCard` |
| [events.md](./events.md) | Events listing, event creation modal(s), event cards/slider |
| [landing-home.md](./landing-home.md) | Home page, marketing Landing hero, `MilanInfoBanner` |
| [layout-navigation.md](./layout-navigation.md) | Navbar, Footer, Header, Modal, Loading, BackToTop, page `<Helmet>` usage |
| [ui-kit.md](./ui-kit.md) | Shared `Button`, `AuthButton`, card components, and the styling conventions behind them |
| [donate-shop-trending.md](./donate-shop-trending.md) | Donate (Razorpay), Shop and Trending "coming soon" placeholders |
| [error-handling.md](./error-handling.md) | 404 page, toast conventions, `Test.tsx` |
| [known-issues.md](./known-issues.md) | Cross-cutting bugs, dead code, and inconsistencies found while writing these specs — read this before touching adjacent code |

## Deeper, colocated specs

Every folder under `src/features/<name>/` also has its own `SPEC.md` (e.g. [`src/features/authentication/SPEC.md`](../../src/features/authentication/SPEC.md)), living next to the code it describes.
The files in *this* directory are the short, cross-feature summaries — good for orienting or for understanding how two features interact.
The colocated `SPEC.md` in a feature folder is the deep reference — file-by-file, function-by-function, with exact state shapes, prop mismatches, and reproducible bugs — meant to be read immediately before editing code in that folder.
Start with the summary here, then open the feature's own `SPEC.md` once you know which one you're touching.

## How to use this with an AI agent

Point the agent at the spec for the feature it is changing (both the summary here **and** that feature's colocated `SPEC.md`), plus [architecture.md](./architecture.md) and [state-management.md](./state-management.md) for shared context.
The specs name the real backend endpoints each feature calls (see [api-integration.md](./api-integration.md)) — the backend repo is the source of truth for request/response shapes, not this repo.
Where a spec calls out a bug or a stub component, treat that as authoritative unless you've just fixed it — then update **both** the summary here and the feature's own `SPEC.md` in the same change.
