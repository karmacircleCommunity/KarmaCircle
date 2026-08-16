# Shared UI Kit & Styling Conventions

## `Button`

[src/components/buttons/globalbutton/Button.tsx](../../src/components/buttons/globalbutton/Button.tsx), styled via [Button.module.css](../../src/components/buttons/globalbutton/Button.module.css) (CSS Modules).
This is the one truly shared, widely-adopted primitive in the app — used across auth, profile, clubs, events, dashboard, and error pages.

Props: `type` (default `"button"`), `variant` (default `"solid"`; also `"outline"` is used at call sites — check `Button.module.css` for the full set of variant classes before assuming others exist), `className`, `size`, `fontweight`, `to`, `disabled`, `isLoading`, `cypressfield` (sets `data-cy`, for Cypress test targeting), `onClickfunction` (the click handler prop — **not** `onClick`; passing a plain `onClick` would be spread onto the element via `...props` and technically still work as a native handler, but `onClickfunction` is the prop this codebase consistently uses at every call site, so use it for consistency).

Behavior: if `to` is set **and** `navigator.onLine === true`, renders a `react-router-dom` `<Link>` instead of a `<button>` — an offline visitor passing `to` would silently get a plain, non-navigating `<button>` element instead (this is presumably intentional, to avoid dead navigation while offline, but it means `onClickfunction` also won't fire in that case since the button has no handler wired either way unless one was passed via `...props`).
While `isLoading` is true, `children` are replaced with a `react-spinners` `ClipLoader`.

## `AuthButton`

[src/features/authentication/components/AuthButton.tsx](../../src/features/authentication/components/AuthButton.tsx) — see [authentication.md](./authentication.md). Built on top of `Button`, currently unused by the live auth pages.

## Card components

- `ClubCard` — see [clubs.md](./clubs.md).
- `EventCard`, `EventSlider`, `FeaturedEventCard`, `FeaturedEventImage`, `EventsMarqueeCards` — see [events.md](./events.md).

All card components are exported from `src/components/index.ts` (or imported directly by deep path — both patterns appear at different call sites; prefer the barrel for anything already exported there).

## Styling conventions

**Tailwind CSS v4** (via `@tailwindcss/vite`) is the convention for all component styling — utility classes applied directly in `className`, no `.scss` files left anywhere under `src/`.
`Button.module.css` and `Modal.module.css` are the one remaining exception (CSS Modules), kept as-is since they weren't part of the SCSS→Tailwind migration; match them if extending `Button`/`Modal` specifically, otherwise use Tailwind for anything new.

Bootstrap (the CDN `<link>`/`<script>` that used to be in `index.html`) has been removed entirely; a `.container` class replicating Bootstrap's centered/max-width behavior lives in `src/styles/index.css` for the handful of files (`Donate.tsx`, `Landing.tsx`, `Milaninfobanner.tsx`) that relied on it and haven't been touched since.

Design tokens are declared in an `@theme` block in `src/styles/index.css`, which generates matching Tailwind utilities (`text-brand`, `font-outfit`, etc.):

- `--color-brand` (`#ff5b31`) / `--color-brand-secondary` (`#6b2615`) — the two brand colors. Deliberately **not** named `primary`/`secondary` — Tailwind would generate `.text-primary`/`.text-secondary` utilities under those names, colliding with identically-named classes from other sources.
- `--color-ink` (`#212529`), `--color-heading` (`#28183b`) — body/dark text colors that recur across forms and headings.
- `--color-surface-muted` (`#f5f7f7`), `--color-surface-hover` (`#f5f7fd`) — input/panel backgrounds and their hover state.
- `--color-border-subtle` (`#f0efef`), `--color-border-muted` (`#e0e0e0`), `--color-input-border` (`#ced4da`) — the three recurring border grays.
- `--font-mont` / `--font-poppins` / `--font-outfit` — the three brand fonts.

**Prefer a token (or, failing that, Tailwind's default palette — `gray-50`, `gray-300`, `gray-500`, etc.) over a new arbitrary-value hex class** (`bg-[#f5f7f7]`, `text-[#6b7280]`). An arbitrary-value color is only appropriate for a genuinely one-off decorative value that won't repeat — the moment the same hex shows up in a second place, add it to `@theme` instead (or reuse an existing token/default-palette color if it's an exact or near-exact match) so the whole app can be re-themed by editing one block. This app previously had the same brand orange spelled three different ways (`#ff5b31` / `#ff5a31` / `#ff5a30`) and `#6b2615` written as a raw hex almost as often as `text-brand-secondary` — both were consolidated into the tokens above; don't reintroduce that drift. Opacity variants of a token color should use Tailwind's `/` opacity modifier (`text-brand-secondary/75`, `border-black/25`) rather than baking alpha into a new hex literal.

A few things can't be reached by Tailwind's class-scanner (it only sees literal strings in your source) and are hand-written global CSS in `src/styles/index.css` instead:
- React-select's and MUI's own generated class names (`.css-13cymwt-control`, `.MuiMenuItem-root`, etc.)
- The signup-page Individual/Organization toggle (`.custom-checkbox`), an `input:checked`-driven pseudo-element switch using `content: attr(...)`
- Navbar's account dropdown (`.nav_dropdown_visible`), toggled by `Navbar.tsx` via direct `classList` manipulation rather than React state

**Important gotcha if you add global CSS here**: anything written as a plain (non-`@layer`) rule always beats Tailwind's `@layer utilities` rules in the cascade, regardless of specificity or source order — that's what silently broke every `p-*`/`m-*` utility in this app during the migration (the project's own `* { margin: 0; padding: 0 }` reset was unlayered) and would do the same to Bootstrap-style raw-element CSS. Keep hand-written global rules scoped to specific classes (like the ones above), not bare element/universal selectors, or wrap them in `@layer base` if they need to be overridable by utilities.

There's no CSS-in-JS despite `styled-components` and `@emotion/styled`/`@mui/styled-engine-sc` being installed dependencies (pulled in transitively by MUI) — no component in `src/` actually authors styled-components.

[src/styles/App.css](../../src/styles/App.css) holds a small `::selection` rule, imported once from `App.tsx`.
[src/styles/index.css](../../src/styles/index.css) — Tailwind's entry point, the `@theme` tokens, and the hand-written global CSS above — is imported once, from `index.tsx`.
