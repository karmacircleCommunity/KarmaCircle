# Shared UI Kit & Styling Conventions

## `Button`

[apps/web/src/components/buttons/Button.tsx](../../apps/web/src/components/buttons/Button.tsx), styled with Tailwind utility classes (a `variantClasses` lookup keyed by `variant`).
This is the one truly shared, widely-adopted primitive in the app — used across auth, profile, organizations, events, dashboard, and error pages.

Props: `type` (default `"button"`), `variant` (default `"solid"`; also `"outline"` is used at call sites — check `Button.tsx`'s `variantClasses` for the full set of variant classes before assuming others exist), `className`, `to`, `disabled`, `isLoading`, `cypressfield` (sets `data-cy`, for Cypress test targeting), `onClickfunction` (the click handler prop — **not** `onClick`; passing a plain `onClick` would be spread onto the element via `...props` and technically still work as a native handler, but `onClickfunction` is the prop this codebase consistently uses at every call site, so use it for consistency).

Behavior: if `to` is set **and** `navigator.onLine === true`, renders a `react-router-dom` `<Link>` instead of a `<button>` — an offline visitor passing `to` would silently get a plain, non-navigating `<button>` element instead (this is presumably intentional, to avoid dead navigation while offline, but it means `onClickfunction` also won't fire in that case since the button has no handler wired either way unless one was passed via `...props`).
While `isLoading` is true, `children` are replaced with a `react-spinners` `ClipLoader`.

## `AuthButton`

[apps/web/src/features/authentication/components/AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) — see [authentication.md](./authentication.md). Built on top of `Button`, currently unused by the live auth pages.

## Card components

- `OrganizationCard` — see [organizations.md](./organizations.md).
- `EventCard`, `EventSlider`, `FeaturedEventCard`, `FeaturedEventImage`, `EventsMarqueeCards` — see [events.md](./events.md).

All card components are exported from `apps/web/src/components/index.ts` (or imported directly by deep path — both patterns appear at different call sites; prefer the barrel for anything already exported there).

## Styling conventions

**Tailwind CSS v4** (via `@tailwindcss/vite`) is the convention for all component styling — utility classes applied directly in `className`, no `.scss` or CSS Modules files left anywhere under `apps/web/src/`. `Button` and `Modal` (formerly the last two CSS Modules holdouts) have been converted to Tailwind utility classes too.

Bootstrap (the CDN `<link>`/`<script>` that used to be in `index.html`) has been removed entirely; a `.container` class replicating Bootstrap's centered/max-width behavior lives in `apps/web/src/styles/index.css` for the handful of files (`Donate.tsx`, `Landing.tsx`, `Milaninfobanner.tsx`) that relied on it and haven't been touched since. Wrapped in `@layer base` (August 2026) — it was written as a plain unlayered rule, which silently beat a Tailwind padding utility `Landing.tsx` paired it with; see the gotcha below and [landing-home.md](./landing-home.md) for the concrete bug this caused.

Design tokens are declared in an `@theme` block in `apps/web/src/styles/index.css`, which generates matching Tailwind utilities (`text-brand`, `font-outfit`, etc.):

- `--color-brand` (`#a8623e`) / `--color-brand-secondary` (`#382c24`) / `--color-brand-hover` (`#8f5236`) — the brand colors: a muted clay/terracotta accent over a warm near-black. Deliberately **not** named `primary`/`secondary` — Tailwind would generate `.text-primary`/`.text-secondary` utilities under those names, colliding with identically-named classes from other sources. Was a saturated orange (`#ff5b31`) / red-brown (`#6b2615`) before an August 2026 rebrand away from that palette; `--color-brand-hover` was added in the same pass to replace three different hardcoded hover-hex literals (`Button.tsx`'s two variants, `AuthLayout.tsx`'s `--auth-accent-hover`) that had drifted from the base token.
- `--color-ink` (`#212529`), `--color-heading` (`#28183b`) — body/dark text colors that recur across forms and headings.
- `--color-surface-muted` (`#f5f7f7`), `--color-surface-hover` (`#f5f7fd`) — input/panel backgrounds and their hover state.
- `--color-surface-dark` (`#0e0906`) — a warm near-black for full-bleed dark surfaces, distinct from `--color-brand-secondary` (the lighter clay-brown used for text/buttons). Originally a one-off `bg-[#0e0906]` on `AuthLayout.tsx`'s value-prop panel; tokenized (August 2026) once `Footer.tsx`'s redesign needed the identical dark background — see [layout-navigation.md](./layout-navigation.md#footer).
- `--color-border-subtle` (`#f0efef`), `--color-border-muted` (`#e0e0e0`), `--color-input-border` (`#ced4da`) — the three recurring border grays.
- `--font-mont` / `--font-poppins` / `--font-outfit` — the three brand fonts.

**Prefer a token (or, failing that, Tailwind's default palette — `gray-50`, `gray-300`, `gray-500`, etc.) over a new arbitrary-value hex class** (`bg-[#f5f7f7]`, `text-[#6b7280]`). An arbitrary-value color is only appropriate for a genuinely one-off decorative value that won't repeat — the moment the same hex shows up in a second place, add it to `@theme` instead (or reuse an existing token/default-palette color if it's an exact or near-exact match) so the whole app can be re-themed by editing one block. This app previously had the same brand orange spelled three different ways (`#ff5b31` / `#ff5a31` / `#ff5a30`) and `#6b2615` written as a raw hex almost as often as `text-brand-secondary` — both were consolidated into the tokens above; don't reintroduce that drift. Opacity variants of a token color should use Tailwind's `/` opacity modifier (`text-brand-secondary/75`, `border-black/25`) rather than baking alpha into a new hex literal.

A few things can't be reached by Tailwind's class-scanner (it only sees literal strings in your source) and are hand-written global CSS in `apps/web/src/styles/index.css` instead:
- React-select's and MUI's own generated class names (`.css-13cymwt-control`, `.MuiMenuItem-root`, etc.)
- The signup-page Individual/Organization toggle (`.custom-checkbox`), an `input:checked`-driven pseudo-element switch using `content: attr(...)`
- Navbar's account dropdown (`.nav_dropdown_visible`), toggled by `Navbar.tsx` via direct `classList` manipulation rather than React state

**Important gotcha if you add global CSS here**: anything written as a plain (non-`@layer`) rule always beats Tailwind's `@layer utilities` rules in the cascade, regardless of specificity or source order — that's what silently broke every `p-*`/`m-*` utility in this app during the migration (the project's own `* { margin: 0; padding: 0 }` reset was unlayered) and would do the same to Bootstrap-style raw-element CSS. Keep hand-written global rules scoped to specific classes (like the ones above), not bare element/universal selectors, or wrap them in `@layer base` if they need to be overridable by utilities.

There's no CSS-in-JS despite `styled-components` and `@emotion/styled`/`@mui/styled-engine-sc` being installed dependencies (pulled in transitively by MUI) — no component in `apps/web/src/` actually authors styled-components.

[apps/web/src/styles/App.css](../../apps/web/src/styles/App.css) holds a small `::selection` rule, imported once from `App.tsx`.
[apps/web/src/styles/index.css](../../apps/web/src/styles/index.css) — Tailwind's entry point, the `@theme` tokens, and the hand-written global CSS above — is imported once, from `index.tsx`.

## Animation & scroll infra

Added in the same August 2026 rebrand as the color tokens above, site-wide (not landing-page-only):

- **`lenis`** (`lenis/react`'s `ReactLenis`, `root: true`) — mounted once, in `apps/web/src/components/SmoothScroll.tsx`, wrapped around the whole app in `App.tsx`. Drives the real `window` scroll with eased/interpolated deltas — no wrapper markup, nothing that reads `window.scrollY`/listens for `"scroll"` needs to change. Any component can reach the shared instance with `useLenis()` without needing to be a descendant of `SmoothScroll` (`BacktoTop.tsx` does this to call `lenis.scrollTo(0)` instead of `window.scrollTo`). Skipped entirely under `prefers-reduced-motion`, and (fixed August 2026, on direct feedback that scrolling felt heavy) under a coarse/touch pointer too — children render with plain native scroll in both cases. The touch skip isn't about swapping out a JS reimplementation of touch momentum: Lenis's `syncTouch` option defaults to `false` and is never set here, so touchmove already passed straight through untouched even with the wrapper mounted. What it actually removes is the overhead riding along regardless — a rAF loop, a `ScrollTrigger.update()` call on every tick, a pointerdown listener — competing with `HeroScene.tsx`'s WebGL render and several `scrub: true` ScrollTrigger animations for the same frames on a phone's CPU. Options are `{ autoRaf: false, lerp: 0.12 }` — no `duration`: it used to be `{ lerp: 0.1, duration: 1.2 }`, but Lenis's own `Animate.advance()` checks `if (this.duration && this.easing)` *before* `else if (this.lerp)` (`node_modules/lenis/dist/lenis.mjs`), and the constructor auto-assigns a default `easing` the moment `duration` is a number with no custom `easing` given — so both `duration` and `lerp` being set meant the app was silently running a full 1.2s duration-eased scroll on every wheel input, and `lerp: 0.1` was dead configuration that never took effect. `lerp: 0.12` (real damping now, a touch snappier than Lenis's own 0.1 default) is what's actually live today.
- **`gsap`** + **`@gsap/react`**'s `useGSAP` — entrance/scroll animations. `SmoothScroll.tsx` bridges GSAP's ticker to Lenis's `raf()` (Lenis's own `autoRaf` is disabled) and forwards every Lenis scroll tick to `ScrollTrigger.update()`, so a `scrollTrigger: { scrub: true }` tween tracks the smoothed position, not the raw native one. `Landing.tsx` is the first real usage: a staggered fade-in for the hero copy on mount, plus a scroll-scrubbed parallax on the hero block. Both skipped under `prefers-reduced-motion` in favor of the final resting state.
- **`three`** + **`@react-three/fiber`** — used by exactly one component so far, `apps/web/src/features/landing-home/components/HeroScene.tsx` (a static line grid — graph paper, not particles — behind the landing hero, replacing the old static `Vector.png`; see `landing-home/SPEC.md` for why the first version of this, a random drifting-particle field, was replaced). Route-split with `React.lazy()`/`Suspense` in `Landing.tsx` rather than imported eagerly — `routesConfig.tsx` doesn't lazy-load most pages (only `Auth.tsx` does), so an eager import here would have put three.js's ~230KB gzipped weight on every route, not just `/`. `frameloop="demand"` (renders one frame, no loop) under `prefers-reduced-motion`.
- `/* eslint-disable react/no-unknown-property */` at the top of `HeroScene.tsx` — `react-three-fiber` elements (`points`, `bufferGeometry`, `bufferAttribute`, `pointsMaterial`, ...) aren't real DOM elements, so this ESLint rule (which only knows the real DOM prop set) would otherwise flag every one of their props.
