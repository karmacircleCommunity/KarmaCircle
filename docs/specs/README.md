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

- **React 19** with `react-router-dom` v7 for routing (`BrowserRouter`, all routes rendered in [App.jsx](../../src/App.jsx)).
- **Vite** as the build tool, with `vite-plugin-pwa` for PWA/service-worker support and `vite-plugin-svgr` for importing SVGs as components.
- **Redux Toolkit + redux-persist** for the logged-in user's profile/session data (persisted to `localStorage`).
- **Zustand** for one small piece of ephemeral UI state — a global `isLoading` flag (see [state-management.md](./state-management.md)).
- **SWR** (`useSWR`) for server-state fetching/caching in most read paths; a few older call sites use raw `axios` in `useEffect` instead.
- **`@tanstack/react-query`**'s `QueryClientProvider` wraps the whole app but is not actually used by any query hooks yet — see [known-issues.md](./known-issues.md).
- **MUI** (`@mui/material`, `@mui/x-date-pickers`) for the event-creation date/time pickers and a few form controls.
- **styled via CSS Modules / SCSS / plain CSS**, inconsistently, per component — see [ui-kit.md](./ui-kit.md).
- **Cypress** for end-to-end tests (`cypress/e2e/milanTest.spec.js`), currently a minimal smoke test.

## Path aliases

Both `vite.config.mjs` and `jsconfig.json` define the same aliases; keep them in sync when adding a new one.

| Alias | Resolves to |
|---|---|
| `@/*` | `src/*` |
| `@components/*` | `src/components/*` |
| `@hooks/*` | `src/hooks/*` |
| `@pages/*` | `src/pages/*` |
| `@redux/*` | `src/redux/*` |
| `@service/*` | `src/service/*` |
| `@utils/*` | `src/utils/*` |
| `@styles/*` | `src/styles/*` |

Much of the older code still uses relative imports (`../../components/shared`) instead of these aliases.
Both styles coexist; prefer the alias style in new code.

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
| [error-handling.md](./error-handling.md) | 404 page, toast conventions, `Test.jsx` |
| [known-issues.md](./known-issues.md) | Cross-cutting bugs, dead code, and inconsistencies found while writing these specs — read this before touching adjacent code |

## How to use this with an AI agent

Point the agent at the spec for the feature it is changing, plus [architecture.md](./architecture.md) and [state-management.md](./state-management.md) for shared context.
The specs name the real backend endpoints each feature calls (see [api-integration.md](./api-integration.md)) — the backend repo is the source of truth for request/response shapes, not this repo.
Where a spec calls out a bug or a stub component, treat that as authoritative unless you've just fixed it — then update the spec.
