# Shared UI Kit & Styling Conventions

## The design system, rendered

**[brand.karmacircle.org](https://brand.karmacircle.org)** renders every token this doc describes: colors (click to copy hex), the font/type scale, radius tokens, and live component samples.
It's a separate repository, [karmacircleCommunity/karmacircle-brand](https://github.com/karmacircleCommunity/karmacircle-brand), not a route in this one.

It briefly *was* an in-app page (`apps/web/src/features/brand-kit`, September 2026) before being split out at the user's request - a sidebar-nav layout with real light/dark theming, deployed to its own domain instead of a path inside the product site, so its design and content can grow independently.
That in-app page is deleted; `/brand` here now just redirects to the standalone site (`routesConfig.tsx`).

**Its tokens are a manual copy**, not an automated sync, of the values in this file's `@theme` block - see that repo's `src/index.css` and README.
If a brand color, font, or radius changes here, update it there too; nothing enforces the two staying identical.

## `Button`

[apps/web/src/components/buttons/Button.tsx](../../apps/web/src/components/buttons/Button.tsx), styled with Tailwind utility classes (a `variantClasses` lookup keyed by `variant`).
This is the one truly shared, widely-adopted primitive in the app — used across auth, profile, organizations, events, dashboard, and error pages.

Props: `type` (default `"button"`), `variant` (default `"solid"`; also `"outline"` is used at call sites — check `Button.tsx`'s `variantClasses` for the full set of variant classes before assuming others exist), `className`, `to`, `disabled`, `isLoading`, `cypressfield` (sets `data-cy`, for Cypress test targeting), `onClickfunction` (the click handler prop — **not** `onClick`; passing a plain `onClick` would be spread onto the element via `...props` and technically still work as a native handler, but `onClickfunction` is the prop this codebase consistently uses at every call site, so use it for consistency).

**`Button` ships no shape of its own - every call site must pass one.** `variantClasses.solid` is only `bg-brand text-white` plus its hover/disabled/press states; there is no padding, no border-radius, and no font in it (and no global `.btn` rule anywhere - the `btn` class the component emits matches nothing). A `<Button>` rendered with no `className` is a bare brand-coloured rectangle clamped to its own text. Copy a shape from an existing call site (`Navbar.tsx`'s `rounded-5px px-5 py-2 font-outfit text-base`, or `Error404.tsx`'s pill `rounded-full px-6 py-3 font-poppins text-body`) rather than shipping the naked component - two pages did exactly that and both looked broken until August 2026.
Note that `variantClasses.outline` **does** include `rounded-xl`; overriding it from `className` with a different radius is a same-layer collision decided by Tailwind's own class ordering, not by your `className`, so prefer `solid` when you need a pill.

Behavior: if `to` is set **and** `navigator.onLine === true`, renders a `react-router-dom` `<Link>` instead of a `<button>` — an offline visitor passing `to` would silently get a plain, non-navigating `<button>` element instead (this is presumably intentional, to avoid dead navigation while offline, but it means `onClickfunction` also won't fire in that case since the button has no handler wired either way unless one was passed via `...props`).
While `isLoading` is true, `children` are replaced with a `react-spinners` `ClipLoader`.
It also used to be forwarded to the `<button>` element itself, which is not a DOM attribute and so logged a React warning on every render of every button in the app; the forwarding was spurious (the prop is already destructured for the spinner) and was removed in September 2026, along with the file-level `eslint-disable react/no-unknown-property` that existed only to silence it.

Both variants carry `motion-safe:active:scale-97` (added August 2026) — the app-wide press acknowledgement, so a click reads as registered before the network does anything. `motion-safe:` drops it under `prefers-reduced-motion`. It is a *class-based* transform, so it is silently inert on any button also driven by `useMagnetic`, which writes an inline one (see [Motion](#motion)); express press/hover feedback in colour on those.

## `AuthButton`

[apps/web/src/features/authentication/components/AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) — see [authentication.md](./authentication.md). Built on top of `Button`, currently unused by the live auth pages.

## Toast

`showSuccessToast` / `showErrorToast` / `showWarningToast` / `showInfoToast` in [apps/web/src/utils/Toasts.ts](../../apps/web/src/utils/Toasts.ts), on top of react-toastify.
Use these for any API-triggered feedback rather than calling `toast.success`/`toast.error` directly - they no-op when `checkInternetConnection()` reports the browser offline, and (success/error) return early on an empty message rather than rendering a bubble that says nothing. See [api-integration.md](./api-integration.md#toast-conventions).

Themed through react-toastify's own `--toastify-*` CSS custom properties, overridden in `styles/index.css` under a `:root:root` selector rather than per-call inline styles.
`:root:root` (not a plain `:root`) is deliberate: `ReactToastify.css` declares its own unlayered `:root { --toastify-* }` block, and repeating the pseudo-class doubles this override's specificity from (0,1,0,0) to (0,2,0,0), which is what makes it reliably win regardless of which stylesheet's import lands later in Vite's bundle - see the `.container` gotcha below for why source order alone isn't a safe bet here. A toast's background, radius, shadow, font, and success/error/warning/info colors all come from this one block; there is no per-toast styling left in `Toasts.ts`.

## `DirectoryToolbar`

[apps/web/src/components/DirectoryToolbar.tsx](../../apps/web/src/components/DirectoryToolbar.tsx), exported from the `@components` barrel.
The search + filter + result-count chrome above both directory pages, `/events` and `/organizations`.
Generic over the filter option type (`<T extends string>`), so each page passes its own taxonomy and keeps its own filtering state and `useMemo` — the component owns presentation only, plus an `action` slot for that page's single primary button ("Create an event", "Your dashboard").

It was extracted in August 2026 from two hand-maintained copies that had started to look like two different products, and restyled down in the same pass.
The old block stacked three heavy rows above the cards: a shadowed white pill search field, a row of nine outlined-and-filled cause chips, and a separate uppercase count line.
Now the field is a single underline that turns brand on `focus-within`, the causes are plain text buttons with a 2px brand underline marking the active one, and the count shares the filter row on `sm` and up — leaving the primary button as the only filled surface on the page above the grid.
The filter row still scrolls horizontally below `sm` (with the `-mx-9` bleed matching the pages' `px-9` mobile padding) rather than wrapping into four rows above the fold.

## `Combobox`

[apps/web/src/components/inputs/Combobox.tsx](../../apps/web/src/components/inputs/Combobox.tsx), exported from the `@components` barrel.
A text field that suggests without insisting: whatever is typed is the value, and a suggestion is only ever a shortcut to typing it.

That distinction is the whole design, and it is why this is not react-select (already a dependency, and right for the closed-set cases it is used for).
react-select's free-text mode is `creatable`, which announces "create option" for what is really just a place that already exists.
Here the input is an ordinary `<input type="text">` and an entry missing from the list costs the user nothing.

**The caller owns the matching.** It passes `options` already filtered and ordered; the component owns only what a combobox has to own - whether the list is open, which row is active, the keyboard, and the ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, a `listbox` of `option`s, and a `sr-only` live count).
`onChange` fires on every keystroke, `onPick` only on an actual selection, which is what lets a caller fill a second field from the row that was chosen.

Four behaviours to keep if it is ever rebuilt:

- **Enter is swallowed while the list is open.** These fields live inside forms whose Enter submits; without `preventDefault()` one press both chooses a suggestion and submits, which is one press doing two things.
- **There is no `onFocus` opener.** Fields are often focused by the page rather than by the person - the organization setup flow focuses the first answer as each question arrives - and a list unfurling over a saved answer nobody has touched reads as a fault. Typing opens it, and so does ArrowDown.
- **It closes on an outside `pointerdown`, not on blur.** Blur fires when focus moves to the browser's own chrome too, and a list that vanishes because someone tabbed away and back is a list that feels broken. Option buttons `preventDefault()` their `mousedown` so the click that chooses one is not the press that closes the list.
- **The panel is `absolute`.** Nothing below it moves as matches narrow; a page settling under the cursor mid-type is how a field ends up holding the wrong thing.
- **The panel is tall enough for a full result set.** `max-h-88` clears the seven rows `SUGGESTION_LIMIT` allows, so nothing scrolls and no row is sliced through its own text - the first version cut the last one in half. The secondary hint on each row (the state, next to a city) is body-sized and muted rather than caption-sized: it is what tells two identically-named towns apart, so it has to be readable, and colour is what makes it recede.

`autoComplete="off"` is set because the browser's own address autofill draws its menu in the same place, and two stacked dropdowns is not a choice anybody can make.

Used today by the organization setup flow's location question (city and state) - see [organizations.md](./organizations.md#where-are-you-based-suggests-and-can-answer-itself).

## `SplitPanelLayout`

[apps/web/src/components/layouts/SplitPanelLayout.tsx](../../apps/web/src/components/layouts/SplitPanelLayout.tsx).
The shell for the app's focused flows: a dark brand panel on the left, whatever the user is actually doing on the right, and no navbar or footer to wander off into mid-flow.

Two flows use it — signing in/up ([authentication.md](./authentication.md)) and organization setup ([organizations.md](./organizations.md#the-setup-flow--organizationsetup)).
They differ only in what fills the left panel, so that is the `aside` prop; the art, the scrim, the cream form surface (`#faf8f5` — pure white next to small body text read as glare) and where the wordmark sits at each breakpoint live here once.
It was extracted from `AuthLayout.tsx` in August 2026 when setup became a wizard, rather than copied — two near-identical shells is how two flows become two designs.

`align` sets the vertical placement of the **right** panel only: `align="start"` for a panel tall enough to scroll (a centered tall form jumps as its height changes between steps), `align="center"` for a short one. Setup switches by stage — `center` on the intro, `start` once the one-question-at-a-time flow begins. The **left** panel always centres its aside, deliberately *not* following `align`: a flow whose right side toggles between `center` and `start` (setup) would otherwise drag the aside up and down at every stage change, which reads as the page coming apart. A centred quote next to a top-aligned form is the accepted trade.
The left panel is `sticky` from 900px up so a long form scrolls past it, and below 900px it is dropped entirely rather than stacked — its job is reassurance, and on a phone that belongs under the form, not above it, pushing the first field off screen.

`asideDecor` is an optional decorative layer rendered inside the left panel, on the art and under the scrim and the aside, positioned relative to the *panel* — so a flow can anchor art to the panel's corners regardless of where `align` puts the aside. Setup uses it for the quote panel's atmosphere (see below); auth passes nothing.

The left panel's weight is set by the flow, not a fixed template. Auth fills it with three value props. Setup runs one **rotating quote** (`SetupAside.tsx` + `constants/setupAsideQuotes.ts`) — the same on the intro and every question screen, so the flow reads as one design — with atmosphere behind it via `asideDecor`: a slow brand aura behind the quotation mark and an orbit motif (one brand dot circling a faint ring, the KarmaCircle at panel scale) anchored off the bottom-left corner, clear of the text. Both are decorative `motion-safe:` loops (18s / 44s) that rest under reduced motion — see [Motion](#motion). The quotes are real and attributed but **not testimonials**: monogram, not portrait, and no implied endorsement, per the anti-fabrication rule ([authentication.md](./authentication.md)). If a third flow adopts this shell: a hollow aesthetic panel wants depth behind the words (an `asideDecor` motif), not more words.

## Card components

- `OrganizationCard` — see [organizations.md](./organizations.md).
- `EventCard`, `EventsMarqueeCards` — see [events.md](./events.md). (`EventSlider`/`FeaturedEventCard`/`FeaturedEventImage` were deleted in the August 2026 events-directory rewrite.)

All card components are exported from `apps/web/src/components/index.ts` (or imported directly by deep path — both patterns appear at different call sites; prefer the barrel for anything already exported there).

**One card, three surfaces.** `DrivesRail`'s drive card (landing), `OrganizationCard` and `EventCard` are deliberately the same design — a 16:9 cover photo with a small uppercase label over a bottom scrim, a one-line `truncate` title, and a `line-clamp-2` body on a `min-h-11` box so every card in a row is the same height whatever the copy does. Each adds only what its own record needs (organizations: a stat row; events: a date badge and a going/spots rule). They were rebuilt this way in August 2026, replacing three unrelated designs — read [organizations.md](./organizations.md#organizationcard) before reusing any of them as a template for a fourth.

**Card hover, standardised August 2026.** `OrganizationCard`, `EventCard` and `EventsMarqueeCards` all shared a hardcoded `rgba(226,105,89,0.32)` hover glow — the pre-rebrand saturated orange, a colour that no longer exists anywhere in the palette. All three now use `hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]` plus `motion-safe:hover:-translate-y-1`, so the glow follows a retheme and the card lifts rather than only glowing. The duplicated `hover:transition-all hover:duration-300 hover:ease-in-out` trio they each carried alongside an identical unprefixed one was dropped in the same pass — it never did anything. `OrganizationCard` and `EventCard` also carry `data-reveal`, which is inert unless an ancestor scopes `useSectionReveal` (their two index pages do — see [Motion](#motion)).

## Styling conventions

**Tailwind CSS v4** (via `@tailwindcss/vite`) is the convention for all component styling — utility classes applied directly in `className`, no `.scss` or CSS Modules files left anywhere under `apps/web/src/`. `Button` and `Modal` (formerly the last two CSS Modules holdouts) have been converted to Tailwind utility classes too.

Bootstrap (the CDN `<link>`/`<script>` that used to be in `index.html`) has been removed entirely; a `.container` class replicating Bootstrap's centered/max-width behavior lives in `apps/web/src/styles/index.css` for the handful of files (`Donate.tsx`, `Landing.tsx`) that relied on it and haven't been touched since. Wrapped in `@layer base` (August 2026) — it was written as a plain unlayered rule, which silently beat a Tailwind padding utility `Landing.tsx` paired it with; see the gotcha below and [landing-home.md](./landing-home.md) for the concrete bug this caused.

Design tokens are declared in an `@theme` block in `apps/web/src/styles/index.css`, which generates matching Tailwind utilities (`text-brand`, `font-outfit`, etc.):

- `--color-brand` (`#a8623e`) / `--color-brand-secondary` (`#382c24`) / `--color-brand-hover` (`#8f5236`) — the brand colors: a muted clay/terracotta accent over a warm near-black. Deliberately **not** named `primary`/`secondary` — Tailwind would generate `.text-primary`/`.text-secondary` utilities under those names, colliding with identically-named classes from other sources. Was a saturated orange (`#ff5b31`) / red-brown (`#6b2615`) before an August 2026 rebrand away from that palette; `--color-brand-hover` was added in the same pass to replace three different hardcoded hover-hex literals (`Button.tsx`'s two variants, `AuthLayout.tsx`'s `--auth-accent-hover`) that had drifted from the base token.
- `--color-ink` (`#212529`), `--color-heading` (`#28183b`) — body/dark text colors that recur across forms and headings.
- `--color-surface-muted` (`#f5f7f7`), `--color-surface-hover` (`#f5f7fd`) — input/panel backgrounds and their hover state.
- `--color-surface-dark` (`#0e0906`) — a warm near-black for full-bleed dark surfaces, distinct from `--color-brand-secondary` (the lighter clay-brown used for text/buttons). Originally a one-off `bg-[#0e0906]` on `AuthLayout.tsx`'s value-prop panel; tokenized (August 2026) once `Footer.tsx`'s redesign needed the identical dark background — see [layout-navigation.md](./layout-navigation.md#footer).
- `--color-border-subtle` (`#f0efef`), `--color-border-muted` (`#e0e0e0`), `--color-input-border` (`#ced4da`) — the three recurring border grays.
- `--color-success` (`#2e6b4a`) / `--color-error` (`#a8402f`) / `--color-warning` (`#8a5a12`) / `--color-info` (`#3a6a8a`) - semantic/status colors, added September 2026 alongside the toast rebrand (see "Toast" below). Muted to sit next to the brand palette rather than react-toastify's stock saturated green/red/yellow/blue; each checked against WCAG AA (>=4.5:1) for white text, same bar as `--color-brand`. Use the `/` opacity modifier for a tinted background (`bg-success/10 text-success`) rather than a new bg tint token.
- `--font-mont` / `--font-poppins` / `--font-outfit` — the three brand fonts. `--font-outfit` is the default for anything that isn't body copy (40+ files); `--font-poppins` is body copy and forms; `--font-mont` is a minor third face used by only `Header.tsx` and `Profile.tsx` - match one of the first two in new code rather than adding a fourth use of Montserrat. The document's base `body` font-family is "Mulish" (`styles/index.css`, not a `@theme` token), mostly overridden by the two tokens above at the component level.

**Prefer a token (or, failing that, Tailwind's default palette — `gray-50`, `gray-300`, `gray-500`, etc.) over a new arbitrary-value hex class** (`bg-[#f5f7f7]`, `text-[#6b7280]`). An arbitrary-value color is only appropriate for a genuinely one-off decorative value that won't repeat — the moment the same hex shows up in a second place, add it to `@theme` instead (or reuse an existing token/default-palette color if it's an exact or near-exact match) so the whole app can be re-themed by editing one block. This app previously had the same brand orange spelled three different ways (`#ff5b31` / `#ff5a31` / `#ff5a30`) and `#6b2615` written as a raw hex almost as often as `text-brand-secondary` — both were consolidated into the tokens above; don't reintroduce that drift. Opacity variants of a token color should use Tailwind's `/` opacity modifier (`text-brand-secondary/75`, `border-black/25`) rather than baking alpha into a new hex literal.

**`leading-<decimal>` is a trap in Tailwind v4.** `leading-1.05` / `leading-1.4` etc. do **not** mean `line-height: 1.05` — v4 resolves a bare number against the spacing scale, so `leading-1.05` compiles to `line-height: calc(var(--spacing) * 1.05)` ≈ **4px**, which collapses multi-line headings on top of each other. Use a named token (`leading-tight` 1.25, `leading-snug` 1.375, `leading-normal` 1.5, `leading-relaxed` 1.625) or the arbitrary unitless form `leading-[1.05]`. The repo's `eslint-plugin-tailwindcss` `no-unnecessary-arbitrary-value` rule (a v3-era plugin, set to `warn`) actively tells you to rewrite `leading-[1.05]` → `leading-1.05` — ignore it for `leading`/`tracking`; the arbitrary form is the correct one. `leading-4` / `leading-4.5` (a real spacing step, e.g. 18px on `text-sm`) is fine and intended.

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
- **Motion tokens in `index.css`'s `@theme`** — `--animate-pop-in` (used by the mobile nav sheet), `--animate-rise-in` (the setup quote panel, `SetupAside.tsx`), and the setup panel's two ambient loops `--animate-aura` / `--animate-orbit` (wired as `SplitPanelLayout`'s `asideDecor` in `SetupLayout.tsx`). Tailwind v4 reads the `@keyframes` for an `--animate-*` token out of the same `@theme` block, so both halves have to live together; a keyframes rule outside `@theme` is not picked up. Apply them through `motion-safe:` (`motion-safe:animate-pop-in`). The **default is an entrance, never a loop** — a moving element on a surface someone is reading reads as a slot machine. The exceptions are all decorative-only, never on a text node: Tailwind's own `animate-ping` on the 6px "Open source" dot in `OpenSource.tsx`, and `aura`/`orbit`, which sit *behind* the quote on the setup flow's left panel and are anchored to the panel corners well clear of it, run at 18s/44s, and are dropped by `motion-safe:` under reduced motion. If a fourth loop is proposed, it has to clear the same bar: decorative, slow, low-contrast, off a reading surface, gone under reduced motion.
- **Hover/press conventions applied across the app** in the same pass: nav links get a directional underline wipe (`origin-right` at rest, `origin-left` on hover, so it sweeps through rather than rubber-banding back), the navbar logo's brand dot scales with the wordmark, cards lift, and every `Button` presses (see above). All transform-based ones are `motion-safe:`-prefixed.

**The setup flow's question transitions** (`--animate-question-in` / `-out` / `-in-back` / `-out-back`) are four tokens rather than two because direction has to read correctly: forward, the answered question leaves upward and the next arrives from below; back, both reverse. One pair would make "Back" look like another step forward. Exits are deliberately faster than entrances (0.17s vs 0.42s) so the flow never feels like it is waiting on itself. Anything consuming them must keep its own timeout in step with the CSS duration — see [organizations.md](./organizations.md#one-question-at-a-time-saved-once-per-step).

## Animation & scroll infra

Added in the same August 2026 rebrand as the color tokens above, site-wide (not landing-page-only):

- **`lenis`** (`lenis/react`'s `ReactLenis`, `root: true`) — mounted once, in `apps/web/src/components/SmoothScroll.tsx`, wrapped around the whole app in `App.tsx`. Drives the real `window` scroll with eased/interpolated deltas — no wrapper markup, nothing that reads `window.scrollY`/listens for `"scroll"` needs to change. Any component can reach the shared instance with `useLenis()` without needing to be a descendant of `SmoothScroll` (`BacktoTop.tsx` does this to call `lenis.scrollTo(0)` instead of `window.scrollTo`). Skipped entirely under `prefers-reduced-motion`, and (fixed August 2026, on direct feedback that scrolling felt heavy) under a coarse/touch pointer too — children render with plain native scroll in both cases. The touch skip isn't about swapping out a JS reimplementation of touch momentum: Lenis's `syncTouch` option defaults to `false` and is never set here, so touchmove already passed straight through untouched even with the wrapper mounted. What it actually removes is the overhead riding along regardless — a rAF loop, a `ScrollTrigger.update()` call on every tick, a pointerdown listener — competing with several `scrub: true` ScrollTrigger animations for the same frames on a phone's CPU. Options are `{ autoRaf: false, lerp: 0.12 }` — no `duration`: it used to be `{ lerp: 0.1, duration: 1.2 }`, but Lenis's own `Animate.advance()` checks `if (this.duration && this.easing)` *before* `else if (this.lerp)` (`node_modules/lenis/dist/lenis.mjs`), and the constructor auto-assigns a default `easing` the moment `duration` is a number with no custom `easing` given — so both `duration` and `lerp` being set meant the app was silently running a full 1.2s duration-eased scroll on every wheel input, and `lerp: 0.1` was dead configuration that never took effect. `lerp: 0.12` (real damping now, a touch snappier than Lenis's own 0.1 default) is what's actually live today.
- **`gsap`** + **`@gsap/react`**'s `useGSAP` — entrance/scroll animations. `SmoothScroll.tsx` bridges GSAP's ticker to Lenis's `raf()` (Lenis's own `autoRaf` is disabled) and forwards every Lenis scroll tick to `ScrollTrigger.update()`, so a `scrollTrigger: { scrub: true }` tween tracks the smoothed position, not the raw native one. `Landing.tsx` is the first real usage: a staggered fade-in for the hero copy on mount, plus a scroll-scrubbed parallax on the hero block. Both skipped under `prefers-reduced-motion` in favor of the final resting state.
- **`three`** + **`@react-three/fiber`** — **removed from `apps/web` in August 2026.** Their only consumer was `apps/web/src/features/landing-home/components/HeroScene.tsx` (the line grid behind the landing hero), which is now pure CSS `linear-gradient` background images. The canvas was dropped because it didn't paint until the visitor scrolled (a WebGL canvas carrying the hero's `mask-image` is its own composited layer, and the first composite could land without its first frame) and because a `lineBasicMaterial` hairline is one *device* pixel, making its opacity impossible to tune between "invisible" and "too loud". Don't reintroduce a 3D dependency for a decorative background — see `landing-home/SPEC.md`.
