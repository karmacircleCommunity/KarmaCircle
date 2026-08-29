# Shared UI Kit & Styling Conventions

## `Button`

[apps/web/src/components/buttons/Button.tsx](../../apps/web/src/components/buttons/Button.tsx), styled with Tailwind utility classes (a `variantClasses` lookup keyed by `variant`).
This is the one truly shared, widely-adopted primitive in the app — used across auth, profile, organizations, events, dashboard, and error pages.

Props: `type` (default `"button"`), `variant` (default `"solid"`; also `"outline"` is used at call sites — check `Button.tsx`'s `variantClasses` for the full set of variant classes before assuming others exist), `className`, `to`, `disabled`, `isLoading`, `cypressfield` (sets `data-cy`, for Cypress test targeting), `onClickfunction` (the click handler prop — **not** `onClick`; passing a plain `onClick` would be spread onto the element via `...props` and technically still work as a native handler, but `onClickfunction` is the prop this codebase consistently uses at every call site, so use it for consistency).

**`Button` ships no shape of its own - every call site must pass one.** `variantClasses.solid` is only `bg-brand text-white` plus its hover/disabled/press states; there is no padding, no border-radius, and no font in it (and no global `.btn` rule anywhere - the `btn` class the component emits matches nothing). A `<Button>` rendered with no `className` is a bare brand-coloured rectangle clamped to its own text. Copy a shape from an existing call site (`Navbar.tsx`'s `rounded-5px px-5 py-2 font-outfit text-base`, or `Error404.tsx`'s pill `rounded-full px-6 py-3 font-poppins text-body`) rather than shipping the naked component - two pages did exactly that and both looked broken until August 2026.
Note that `variantClasses.outline` **does** include `rounded-xl`; overriding it from `className` with a different radius is a same-layer collision decided by Tailwind's own class ordering, not by your `className`, so prefer `solid` when you need a pill.

Behavior: if `to` is set **and** `navigator.onLine === true`, renders a `react-router-dom` `<Link>` instead of a `<button>` — an offline visitor passing `to` would silently get a plain, non-navigating `<button>` element instead (this is presumably intentional, to avoid dead navigation while offline, but it means `onClickfunction` also won't fire in that case since the button has no handler wired either way unless one was passed via `...props`).
While `isLoading` is true, `children` are replaced with a `react-spinners` `ClipLoader`.

Both variants carry `motion-safe:active:scale-97` (added August 2026) — the app-wide press acknowledgement, so a click reads as registered before the network does anything. `motion-safe:` drops it under `prefers-reduced-motion`. It is a *class-based* transform, so it is silently inert on any button also driven by `useMagnetic`, which writes an inline one (see [Motion](#motion)); express press/hover feedback in colour on those.

## `AuthButton`

[apps/web/src/features/authentication/components/AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) — see [authentication.md](./authentication.md). Built on top of `Button`, currently unused by the live auth pages.

## `DirectoryToolbar`

[apps/web/src/components/DirectoryToolbar.tsx](../../apps/web/src/components/DirectoryToolbar.tsx), exported from the `@components` barrel.
The search + filter + result-count chrome above both directory pages, `/events` and `/organizations`.
Generic over the filter option type (`<T extends string>`), so each page passes its own taxonomy and keeps its own filtering state and `useMemo` — the component owns presentation only, plus an `action` slot for that page's single primary button ("Create an event", "Your dashboard").

It was extracted in August 2026 from two hand-maintained copies that had started to look like two different products, and restyled down in the same pass.
The old block stacked three heavy rows above the cards: a shadowed white pill search field, a row of nine outlined-and-filled cause chips, and a separate uppercase count line.
Now the field is a single underline that turns brand on `focus-within`, the causes are plain text buttons with a 2px brand underline marking the active one, and the count shares the filter row on `sm` and up — leaving the primary button as the only filled surface on the page above the grid.
The filter row still scrolls horizontally below `sm` (with the `-mx-9` bleed matching the pages' `px-9` mobile padding) rather than wrapping into four rows above the fold.

## `SplitPanelLayout`

[apps/web/src/components/layouts/SplitPanelLayout.tsx](../../apps/web/src/components/layouts/SplitPanelLayout.tsx).
The shell for the app's focused flows: a dark brand panel on the left, whatever the user is actually doing on the right, and no navbar or footer to wander off into mid-flow.

Two flows use it — signing in/up ([authentication.md](./authentication.md)) and organization setup ([organizations.md](./organizations.md#the-setup-flow--organizationsetup)).
They differ only in what fills the left panel, so that is the `aside` prop; the art, the scrim, the cream form surface (`#faf8f5` — pure white next to small body text read as glare) and where the wordmark sits at each breakpoint live here once.
It was extracted from `AuthLayout.tsx` in August 2026 when setup became a wizard, rather than copied — two near-identical shells is how two flows become two designs.

`align="start"` for a panel tall enough to scroll (a centered tall form jumps as its height changes between steps), `align="center"` for a short one.
The left panel is `sticky` from 900px up so a long form scrolls past it, and below 900px it is dropped entirely rather than stacked — its job is reassurance, and on a phone that belongs under the form, not above it, pushing the first field off screen.

## Card components

- `OrganizationCard` — see [organizations.md](./organizations.md).
- `EventCard`, `EventsMarqueeCards` — see [events.md](./events.md). (`EventSlider`/`FeaturedEventCard`/`FeaturedEventImage` were deleted in the August 2026 events-directory rewrite.)

All card components are exported from `apps/web/src/components/index.ts` (or imported directly by deep path — both patterns appear at different call sites; prefer the barrel for anything already exported there).

**One card, three surfaces.** `DrivesRail`'s drive card (landing), `OrganizationCard` and `EventCard` are deliberately the same design — a 16:9 cover photo with a small uppercase label over a bottom scrim, a one-line `truncate` title, and a `line-clamp-2` body on a `min-h-11` box so every card in a row is the same height whatever the copy does. Each adds only what its own record needs (organizations: a stat row; events: a date badge and a going/spots rule). They were rebuilt this way in August 2026, replacing three unrelated designs — read [organizations.md](./organizations.md#organizationcard) before reusing any of them as a template for a fourth.

**Card hover, standardised August 2026.** `OrganizationCard`, `EventCard` and `EventsMarqueeCards` all shared a hardcoded `rgba(226,105,89,0.32)` hover glow — the pre-rebrand saturated orange, a colour that no longer exists anywhere in the palette. All three now use `hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]` plus `motion-safe:hover:-translate-y-1`, so the glow follows a retheme and the card lifts rather than only glowing. The duplicated `hover:transition-all hover:duration-300 hover:ease-in-out` trio they each carried alongside an identical unprefixed one was dropped in the same pass — it never did anything. `OrganizationCard` and `EventCard` also carry `data-reveal`, which is inert unless an ancestor scopes `useSectionReveal` (their two index pages do — see [Motion](#motion)).

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

## Motion

The reusable layer added August 2026 so "make it feel alive" doesn't mean a fourth hand-rolled `useGSAP` block per component. All of it lives in `apps/web/src/hooks/` and is exported from the `@hooks` barrel.

- **`useSectionReveal(scope, deps?)`** — the app's one scroll entrance: everything tagged `data-reveal` inside `scope` fades and rises in, in source order, in batches, once. Started life in `features/landing-home/hooks/` and moved to `src/hooks/` when it stopped being a landing-page concern; `HowItWorks`, `DrivesRail` and `OpenSource` use it, and `Organizations.tsx`/`Events.tsx` scope it to their card grids. Two details that must survive any edit: it queries `scope.current.querySelectorAll`, **not** `gsap.utils.toArray` (which searches the whole document and would make each scope animate every other scope's elements — they all share one attribute), and `once: true` (re-playing an entrance on every scroll-back reads as jitter and fights ScrollTrigger's refresh on resize).
- **`useMagnetic({ strength, max })`** — returns a ref; the element leans toward the cursor while hovered and springs back on leave. Gated to `(hover: hover) and (pointer: fine)` and off under reduced motion — on a phone, `pointermove` fires from a tap and would leave the element permanently offset. Writes through `gsap.quickTo` (no React state at pointer-event frequency). **It owns the element's `transform`**: an inline transform beats a class, so a magnetic element must not also carry `hover:-translate-*`/`active:scale-*`, which would silently do nothing. Used by `OpenSource.tsx`'s primary CTA.
- **`useReducedMotion()`** — reactive `prefers-reduced-motion` as state, for components that have to *render* differently rather than branch inside a `useGSAP` body.
- **`ScrollProgress`** (`apps/web/src/components/ScrollProgress.tsx`) — a 2px brand rule across the top of the window that fills as the page scrolls, mounted once in `App.tsx` outside the router so it survives navigation. Driven by a `ScrollTrigger` on `document.documentElement` rather than a `window.scrollY` listener, because the app's real scroll position is Lenis's eased one — a raw listener visibly runs ahead of the page it describes. `scrub: 0.2` gives it a slight trailing ease. Decorative, so it simply never animates under reduced motion rather than being parked at a static fill that would describe a scroll position nobody is at.
- **Motion tokens in `index.css`'s `@theme`** — `--animate-pop-in` (used by the mobile nav sheet) and `--animate-rise-in` (no consumer today - its only one, `ComingSoon`, was deleted in August 2026). Tailwind v4 reads the `@keyframes` for an `--animate-*` token out of the same `@theme` block, so both halves have to live together; a keyframes rule outside `@theme` is not picked up. Apply them through `motion-safe:` (`motion-safe:animate-pop-in`). Everything here is an **entrance, never a loop** — the only looping animation in the app is Tailwind's own `animate-ping` on the 6px "Open source" dot in `OpenSource.tsx`.
- **Hover/press conventions applied across the app** in the same pass: nav links get a directional underline wipe (`origin-right` at rest, `origin-left` on hover, so it sweeps through rather than rubber-banding back), the navbar logo's brand dot scales with the wordmark, cards lift, and every `Button` presses (see above). All transform-based ones are `motion-safe:`-prefixed.

## Animation & scroll infra

Added in the same August 2026 rebrand as the color tokens above, site-wide (not landing-page-only):

- **`lenis`** (`lenis/react`'s `ReactLenis`, `root: true`) — mounted once, in `apps/web/src/components/SmoothScroll.tsx`, wrapped around the whole app in `App.tsx`. Drives the real `window` scroll with eased/interpolated deltas — no wrapper markup, nothing that reads `window.scrollY`/listens for `"scroll"` needs to change. Any component can reach the shared instance with `useLenis()` without needing to be a descendant of `SmoothScroll` (`BacktoTop.tsx` does this to call `lenis.scrollTo(0)` instead of `window.scrollTo`). Skipped entirely under `prefers-reduced-motion`, and (fixed August 2026, on direct feedback that scrolling felt heavy) under a coarse/touch pointer too — children render with plain native scroll in both cases. The touch skip isn't about swapping out a JS reimplementation of touch momentum: Lenis's `syncTouch` option defaults to `false` and is never set here, so touchmove already passed straight through untouched even with the wrapper mounted. What it actually removes is the overhead riding along regardless — a rAF loop, a `ScrollTrigger.update()` call on every tick, a pointerdown listener — competing with several `scrub: true` ScrollTrigger animations for the same frames on a phone's CPU. Options are `{ autoRaf: false, lerp: 0.12 }` — no `duration`: it used to be `{ lerp: 0.1, duration: 1.2 }`, but Lenis's own `Animate.advance()` checks `if (this.duration && this.easing)` *before* `else if (this.lerp)` (`node_modules/lenis/dist/lenis.mjs`), and the constructor auto-assigns a default `easing` the moment `duration` is a number with no custom `easing` given — so both `duration` and `lerp` being set meant the app was silently running a full 1.2s duration-eased scroll on every wheel input, and `lerp: 0.1` was dead configuration that never took effect. `lerp: 0.12` (real damping now, a touch snappier than Lenis's own 0.1 default) is what's actually live today.
- **`gsap`** + **`@gsap/react`**'s `useGSAP` — entrance/scroll animations. `SmoothScroll.tsx` bridges GSAP's ticker to Lenis's `raf()` (Lenis's own `autoRaf` is disabled) and forwards every Lenis scroll tick to `ScrollTrigger.update()`, so a `scrollTrigger: { scrub: true }` tween tracks the smoothed position, not the raw native one. `Landing.tsx` is the first real usage: a staggered fade-in for the hero copy on mount, plus a scroll-scrubbed parallax on the hero block. Both skipped under `prefers-reduced-motion` in favor of the final resting state.
- **`three`** + **`@react-three/fiber`** — **removed from `apps/web` in August 2026.** Their only consumer was `apps/web/src/features/landing-home/components/HeroScene.tsx` (the line grid behind the landing hero), which is now pure CSS `linear-gradient` background images. The canvas was dropped because it didn't paint until the visitor scrolled (a WebGL canvas carrying the hero's `mask-image` is its own composited layer, and the first composite could land without its first frame) and because a `lineBasicMaterial` hairline is one *device* pixel, making its opacity impossible to tune between "invisible" and "too loud". Don't reintroduce a 3D dependency for a decorative background — see `landing-home/SPEC.md`.
