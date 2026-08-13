# Shared UI Kit & Styling Conventions

## `Button`

[src/components/buttons/globalbutton/Button.jsx](../../src/components/buttons/globalbutton/Button.jsx), styled via [Button.module.css](../../src/components/buttons/globalbutton/Button.module.css) (CSS Modules).
This is the one truly shared, widely-adopted primitive in the app — used across auth, profile, clubs, events, dashboard, and error pages.

Props: `type` (default `"button"`), `variant` (default `"solid"`; also `"outline"` is used at call sites — check `Button.module.css` for the full set of variant classes before assuming others exist), `className`, `size`, `fontweight`, `to`, `disabled`, `isLoading`, `cypressfield` (sets `data-cy`, for Cypress test targeting), `onClickfunction` (the click handler prop — **not** `onClick`; passing a plain `onClick` would be spread onto the element via `...props` and technically still work as a native handler, but `onClickfunction` is the prop this codebase consistently uses at every call site, so use it for consistency).

Behavior: if `to` is set **and** `navigator.onLine === true`, renders a `react-router-dom` `<Link>` instead of a `<button>` — an offline visitor passing `to` would silently get a plain, non-navigating `<button>` element instead (this is presumably intentional, to avoid dead navigation while offline, but it means `onClickfunction` also won't fire in that case since the button has no handler wired either way unless one was passed via `...props`).
While `isLoading` is true, `children` are replaced with a `react-spinners` `ClipLoader`.

## `AuthButton`

[src/features/authentication/components/AuthButton.jsx](../../src/features/authentication/components/AuthButton.jsx) — see [authentication.md](./authentication.md). Built on top of `Button`, currently unused by the live auth pages.

## Card components

- `ClubCard` — see [clubs.md](./clubs.md).
- `EventCard`, `EventSlider`, `FeaturedEventCard`, `FeaturedEventImage`, `EventsMarqueeCards` — see [events.md](./events.md).

All card components are exported from `src/components/index.js` (or imported directly by deep path — both patterns appear at different call sites; prefer the barrel for anything already exported there).

## Styling conventions (inconsistent — know this before adding a component)

Four different styling approaches coexist, chosen per-component with no clear rule:

| Approach | Example |
|---|---|
| Plain `.scss` imported alongside the component, classes applied by string | `Navbar.scss`, `Footer.scss`, most page-level styles |
| Plain `.css` imported the same way | `Header.css`, `UserProfile.css`, `Loading.scss` (mixed) |
| CSS Modules (`.module.css`, imported as a `styles`/`style` object) | `Button.module.css`, `Modal.module.css` |
| Global class-name conventions (BEM-ish, e.g. `profile_header_ctadiv`) shared across `.scss` files with no scoping | Most component `.scss` files |

There's no CSS-in-JS despite `styled-components` and `@emotion/styled`/`@mui/styled-engine-sc` being installed dependencies (pulled in transitively by MUI) — no component in `src/` actually authors styled-components.
When adding a new component, match the styling approach of its immediate siblings (e.g. new profile-related components → plain `.scss` + BEM-ish class names, matching `ProfileCompletion.scss`/`ProfileUpdate.scss`) rather than introducing a fifth pattern.

[src/styles/Globals.scss](../../src/styles/Globals.scss) and [src/styles/App.css](../../src/styles/App.css) hold app-wide resets/variables and are imported once, from `App.jsx`.
[src/styles/index.css](../../src/styles/index.css) is imported once, from `index.jsx`.
