# 08 — Shared components

Everything in [apps/web/src/components/](../../../apps/web/src/components/).
The barrel is [components/index.ts](../../../apps/web/src/components/index.ts) and exports: `BacktoTop`, `Button`, `Combobox`, `DirectoryToolbar`, `Footer`, `Header`, `Loading`, `Modal`, `Navbar`, `ScrollProgress`, `SmoothScroll`.
Not in the barrel, import by path: `ClickAwayListener`, `ComponentHelmet`, `SplitPanelLayout`.

**Prefer the barrel** (`@components`) for anything exported there.

---

## `Button`

[components/buttons/Button.tsx](../../../apps/web/src/components/buttons/Button.tsx).
The one truly shared primitive: auth, profile, organizations, events, dashboard, error pages.

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `children` | — | Replaced by a spinner while `isLoading` |
| `type` | `"button"` | |
| `variant` | `"solid"` | `"solid"` or `"outline"`. An unknown variant resolves to `""`, i.e. no styles at all |
| `className` | `""` | **Required in practice.** See below |
| `to` | `""` | If set **and** `navigator.onLine === true`, renders a `<Link>` instead of a `<button>` |
| `disabled` | — | |
| `isLoading` | `false` | Renders `<ClipLoader color="#000000" size={25} />` in place of children |
| `cypressfield` | `""` | Sets `data-cy`. Only reaches the `<button>` branch, not the `<Link>` branch |
| `onClickfunction` | — | **The click handler prop. Not `onClick`.** `onClick` is `Omit`ted from the extended `ButtonHTMLAttributes` |

Emitted class string: `` `btn cursor-pointer ${variantClasses[variant] ?? ""} ${className}` ``.
The `btn` class matches nothing; there is no global `.btn` rule anywhere.

### Variant classes, verbatim

`solid`:
```
bg-brand text-white transition-all duration-200 ease-in-out hover:bg-brand-hover
motion-safe:active:scale-97
disabled:cursor-not-allowed disabled:bg-brand disabled:text-white
disabled:pointer-events-none disabled:opacity-50
```

`outline`:
```
rounded-xl border border-heading bg-white transition-all duration-200 ease-in-out
hover:border-brand-hover motion-safe:active:scale-97
focus:border-brand-hover active:border-brand-hover
disabled:cursor-not-allowed disabled:border-black disabled:bg-heading
disabled:text-black disabled:opacity-50
```

### `Button` ships no shape of its own

`solid` is only color plus states: **no padding, no radius, no font**.
A `<Button>` with no `className` is a bare brand rectangle clamped to its own text.
Two pages did exactly that and both looked broken until August 2026.

Copy a shape from an existing call site:

| Shape | Source |
| --- | --- |
| `rounded-5px px-5 py-2 font-outfit text-base` | `Navbar.tsx` |
| `rounded-full px-6 py-3 font-poppins text-body` | `Error404.tsx` |
| `rounded-10px px-6 py-3 font-outfit text-sm font-medium sm:text-body-lg` | `Footer.tsx` Subscribe |

`outline` **does** include `rounded-xl`.
Overriding that radius from `className` is a same-layer collision decided by Tailwind's class ordering, not by your `className`. Prefer `solid` when you need a pill.

### Behavior notes

- Offline with `to` set: renders a plain `<button>` with no handler wired unless one arrived through `...props`. Navigation is dead and `onClickfunction` also will not fire, because the `<Link>` branch never passes it. This is presumably deliberate (no dead navigation while offline) but is a real behavioral fork.
- `motion-safe:active:scale-97` is the app-wide press acknowledgement, so a click reads as registered before the network does anything. It is a **class-based** transform and is therefore silently inert on any button also driven by `useMagnetic`, which writes an inline one. Express press and hover feedback in color on those.
- `isLoading` used to also be forwarded onto the `<button>` element, which is not a DOM attribute and logged a React warning on every render of every button in the app. Removed September 2026 along with the file-level `eslint-disable react/no-unknown-property` that existed only to silence it.

---

## `Modal`

[components/Modal.tsx](../../../apps/web/src/components/Modal.tsx).

Props: `children`, `onClose`, `className`.

Scrim: `fixed inset-0 z-20 flex size-full items-center justify-center bg-black/80`.

Panel:
```
relative h-fit w-[30vw] min-w-125 rounded-2xl bg-white p-4 text-black
max-[525px]:w-[89vw] max-[525px]:min-w-55 max-[525px]:text-center
```

- `min-w-125` = **500px**, `min-w-55` = **220px**, `p-4` = 16px, radius 16px.
- Close button: `absolute top-1.75 right-3` (7px / 12px), `text-sm`, `aria-label="Close"`, class `btn-close`. **`btn-close` is a Bootstrap class and Bootstrap has been removed, so the button renders with no glyph and no content.** See [14-drift-register.md](./14-drift-register.md#d5).
- `max-[525px]:text-center` contradicts the mobile left-alignment rule in [05-responsive.md](./05-responsive.md#alignment). Flagged, not yet changed.
- No focus trap, no Escape handler, no `role="dialog"`, no `aria-modal`.

---

## `Navbar`

[components/Navbar.tsx](../../../apps/web/src/components/Navbar.tsx).

Prop: `hideSignUpForHeroCta?: boolean` (default `false`). `Landing.tsx` passes it from its own ScrollTrigger to hide the nav CTA while a bigger, redundant hero CTA is on screen. Every other page renders `<Navbar />` bare.

Bar (October 2026 — corrects a stale description that no longer matched the code): `<nav>` itself is `z-99 border-b border-brand-secondary/10 bg-surface`, conditionally `sticky top-0` (see `isSticky` above). The inner content row is a separate `relative mx-auto flex max-w-6xl items-center justify-between px-9 py-[0.8rem] sm:px-10 lg:px-12` div — `mx-auto` + `max-w-6xl` center it and cap its width, matching every other page's own content container, while the border/sticky live on the full-viewport-width `<nav>` so they span edge to edge (see [layout-navigation.md](../layout-navigation.md)). `px-9` = 36px, `sm:px-10` = 40px, `lg:px-12` = 48px, `py-[0.8rem]` = 12.8px.

Nav entries are `Organizations` and `Events` only. There is deliberately **no "Home"**: the logo already links there, which is the standard marketing-site convention.

### Logo / wordmark

```
group z-10 flex items-center gap-2 no-underline
```
- Dot: `inline-block size-2 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:transform-none`. **8px**, `aria-hidden`.
- Wordmark: `font-outfit text-xl leading-none font-medium tracking-tight text-brand-secondary transition-colors duration-300 group-hover:text-brand`. **20px / 500 / -0.025em**.

### Desktop (`min-[900px]`, i.e. ≥ 900px — pure CSS, not a `windowWidth` state; see [layout-navigation.md](../layout-navigation.md))

- Link row: `z-1 flex items-center gap-7` (28px).
- Link: `relative font-outfit text-body-lg leading-none font-normal text-ink/65 ... hover:text-brand-secondary`, with the directional underline (`after:-bottom-1.5 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-brand after:duration-300 hover:after:origin-left hover:after:scale-x-100`).
- No active-route underline. That is an app-internal-tab pattern, not a marketing-nav one.
- Logged out: `Button to="/auth/signup"` with `rounded-5px px-5 py-2 font-outfit text-base`, the triple brand glow on hover, `motion-safe:hover:-translate-y-0.5`.
- Logged in: a `Profile` text row with `RxCaretDown` at `size-6.25` (25px) that toggles `.nav_dropdown_visible` **via `classList`, not React state**.

### Account dropdown

```
nav_dropdown absolute top-full right-0 z-10 mt-2 hidden w-50 flex-col justify-center
rounded-md bg-white shadow-[...color-mix(...12.5%...)] transition-all duration-1000 ease-in-out
```
Positioned off a `relative` wrapper around the "Profile" trigger itself (October 2026 — supersedes a fixed `top-10 right-17.75` anchored to the whole nav row's own `relative`). That fixed offset was calibrated for one specific nav padding and drifted out from under the trigger at other widths — confirmed live, the panel's right edge landing tens of pixels inside the trigger's own right edge rather than flush with it. `top-full right-0 mt-2` tracks the trigger exactly at every width instead, nav padding included, with no magic number to keep in sync. `w-50` = 200px, radius 6px. The `.nav_dropdown_visible` class (below) no longer carries its own `top` override for the same reason — `top-full` already does that job correctly.
Rows: `flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary hover:bg-black/[3.5%]`.
Separators: `h-px w-full bg-black/5`, `role="separator"` (October 2026 — was the drifted `bg-[#e2e5e883]`; see [02-color.md](./02-color.md)).
Draft-organization row is `text-brand`, `font-medium`, `hover:bg-brand/8`, with a trailing `size-1.5` brand dot, `data-cy="nav-finish-setup"`.

Label rule: the mobile sheet always says **"Dashboard"** because it always points at `/dashboard`.
The desktop dropdown's **"Your Profile"** is a distinctly named link to `/user/:handle`.
The two used to share the ambiguous label "Profile" for individual accounts.

### Mobile (`max-[900px]`, i.e. < 900px)

- Trigger: logged out `GiHamburgerMenu` at `size-7.5` (30px) `text-heading`; logged in the avatar at `size-7.5 rounded-full` with `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`, `role="button"`, `tabIndex=0`, Enter/Space handled. Both are `max-[900px]:block` (October 2026 — was `max-[899px]:block`, which Tailwind v4 compiles to the *exclusive* `width < 899px` and left a real 1px gap at exactly 899px where neither this trigger nor the desktop link row rendered; `max-[900px]` pairs with the link row's `min-[900px]` with zero gap and zero overlap — see `Navbar.tsx`'s own comment).
- Scrim: `fixed inset-0 z-20 bg-black/[0.867]`.
- Sheet: `absolute top-[20%] w-[80vw] flex-wrap gap-7.5 rounded-xl bg-white p-4 pt-8 shadow-[1px_3px_80px_rgba(255,255,255,0.346)] motion-safe:animate-pop-in`.
- Close: `RxCross2` at `top-2.5 right-2.5`.

---

## `Footer`

[components/footer/Footer.tsx](../../../apps/web/src/components/footer/Footer.tsx).
Links come from [footerLinksConfig.ts](../../../apps/web/src/components/footer/footerLinksConfig.ts) in four groups: `social`, `quickStarts`, `resources`, `policies`.

Root: `overflow-hidden bg-surface-dark`.

### Band 1 — newsletter

```
mx-auto flex max-w-6xl flex-col items-start justify-between gap-6
border-b border-white/10 px-9 py-10
sm:gap-8 sm:py-12 lg:flex-row lg:items-center lg:px-12 lg:py-16
```
- Heading: `font-outfit text-2xl leading-tight font-semibold text-white sm:text-3xl`.
- Lead: `mt-3 font-poppins text-sm text-white/55 sm:text-body-lg`.
- Input: `w-full min-w-0 rounded-10px border border-white/15 bg-white/5 px-5 py-3 font-outfit text-sm text-white outline-none placeholder:text-white/35 focus:border-brand sm:w-72 sm:text-body-lg`.
- Button: `shrink-0 gap-2 rounded-10px border-none px-6 py-3 font-outfit text-sm font-medium whitespace-nowrap sm:text-body-lg`, with `FiArrowRight`.
- **No newsletter endpoint exists** in `KarmaCircleApi.ts` or `apps/api`. `handleSubscribe` fires a success toast reading "Thanks for the interest, newsletter signups are coming soon!" and clears the field. Nothing is silently swallowed and nothing claims an email was captured.

### Band 2 — brand and links

```
mx-auto flex max-w-6xl flex-col gap-8 px-9 py-10
sm:gap-10 sm:py-12 lg:flex-row lg:justify-between lg:px-12 lg:py-16
```
- Wordmark: 6px dot (`size-2` here is 8px; the footer uses `size-2` too) plus `font-outfit text-lg leading-none font-medium tracking-tight text-white sm:text-xl`.
- Tagline: `font-poppins text-xs text-white/50 sm:text-body`.
- Social icons: `size-[1.1rem] text-white/60 hover:text-brand`, `target="_blank" rel="noopener noreferrer"`, `aria-label` from config.
- Column heading: `font-outfit text-caption font-medium tracking-[0.12em] text-white/40 uppercase`.
- Column link: `font-poppins text-xs text-white/55 no-underline transition-colors hover:text-white sm:text-body`.
- Column group: `flex flex-wrap gap-x-16 gap-y-8 border-t border-white/5 pt-8 sm:gap-y-10 lg:border-none lg:pt-0`.

### Band 3 — legal

```
border-t border-white/10 px-9 py-8 sm:py-10 lg:p-12
```
`mx-auto max-w-6xl text-center font-poppins text-caption text-white/35`, year from `new Date().getFullYear()`.

### Parallax

Two `gsap.to` scrub tweens: newsletter band `yPercent: -16`, links band `yPercent: -8`.
The copyright bar is the untouched anchor layer.
`start: "top bottom"`, `end: "bottom bottom"` (not `"bottom top"` as in `Landing.tsx`: the footer is always last on the page, so the viewport can never scroll past `bottom top` and the scrub would stick short of full range).
Each tween gets a **fresh** `scrollTrigger` vars object, because GSAP mutates it to stamp a back-reference; reusing one object would let the second call clobber the first's ScrollTrigger.
Gated off below 1024px and under reduced motion, with an explicit `clearProps: "transform"`. See [05-responsive.md](./05-responsive.md#scroll-linked-and-transform-effects).

---

## `SplitPanelLayout`

[components/layouts/SplitPanelLayout.tsx](../../../apps/web/src/components/layouts/SplitPanelLayout.tsx).
The shell for focused flows: a dark brand panel on the left, the task on the right, **no navbar and no footer** to wander off into mid-flow.

Two consumers: `AuthLayout.tsx` (sign in/up) and `SetupLayout.tsx` (organization setup).
Extracted from `AuthLayout` in August 2026 rather than copied; two near-identical shells is how two flows become two designs.

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `aside` | — | Left-panel content, above art and scrim |
| `children` | — | Right-panel content |
| `align` | `"center"` | Vertical placement of the **right** panel only |
| `asideDecor` | — | Decorative layer inside the left panel, on the art and under the scrim and aside, positioned relative to the **panel** |
| `contentClassName` | `"max-w-sm"` | Width cap on the right panel's content |
| `className`, `style` | — | `AuthLayout` passes `className="auth-page"` and `--auth-accent` / `--auth-accent-hover` here |

### `align`

`"start"` for a panel tall enough to scroll (a centered tall form jumps as its height changes between steps); `"center"` for a short one.
Setup switches by stage: `center` on the intro, `start` once the one-question-at-a-time flow begins.

**The left panel always centres its aside and deliberately does not follow `align`.**
A flow whose right side toggles between `center` and `start` would otherwise drag the aside up and down at every stage change, which reads as the page coming apart.
A centred quote next to a top-aligned form is the accepted trade.

### Geometry

Root: `flex min-h-screen w-full`.

Left panel:
```
relative hidden w-[44%] shrink-0 flex-col justify-center overflow-hidden
bg-surface-dark px-14 py-12
min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen
```
`w-[44%]`, `px-14` = 56px, `py-12` = 48px.
Below 900px it is **not rendered at all**, not stacked: its job is reassurance, and on a phone that belongs under the form, not above it pushing the first field off screen.

Art: `signup-panel-waves.jpg`, `absolute inset-0 size-full scale-125 object-cover blur-2xl`, `pointer-events-none`, `alt=""`.

Scrim: `bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.35)_28%,rgba(0,0,0,0.4)_75%,transparent_100%)]`, so panel text stays legible wherever the image's highlights land.

Aside content: `relative z-10 max-w-md`.

Right panel:
```
flex w-full flex-col bg-[#faf8f5] px-9 py-8 sm:px-10 sm:py-12
+ items-center justify-center (align=center) | items-center (align=start)
```
`#faf8f5` is a soft cream, **not pure white**: pure white next to small body text read as low-contrast glare rather than clean.

### `Wordmark` (internal)

```
flex items-center gap-2 font-outfit text-sm font-medium no-underline
```
with a `size-1.5` (**6px**) `bg-brand` dot.
Rendered twice: `absolute top-10 left-14 text-white/90` inside the left panel, and `mb-5 self-start text-ink min-[900px]:hidden sm:mb-8` above the form on narrow screens.

### If a third flow adopts this shell

A hollow aesthetic panel wants **depth behind the words** (an `asideDecor` motif), not more words.

---

## `DirectoryToolbar`

[components/DirectoryToolbar.tsx](../../../apps/web/src/components/DirectoryToolbar.tsx).
The search + filter + count + primary-action chrome above `/events` and `/organizations`.
Generic over the filter option type (`<T extends string, U extends string = string>`); each page passes its own taxonomy/taxonomies and owns its own filtering state and `useMemo`.
The component owns presentation only.

### Props

`query`, `onQueryChange`, `searchPlaceholder`, `searchLabel`, `options` (the primary taxonomy including the `"All"` pseudo-option), `active`, `onSelect`, `filterLabel` (rendered visually now, not just as an `aria-label` — see below), `summary` (a `ReactNode`, e.g. `12 events in Relief`), `action` (the page's single primary button), `suggestions?` (September 2026 - see below), `secondaryFilter?` (September 2026 - see below).

### `secondaryFilter`, a second independent `FilterDropdown`

`{ options: readonly U[], active: U, onSelect, filterLabel }` - same shape as the primary `options`/`active`/`onSelect`/`filterLabel`, but its own generic `U`, since the two taxonomies are unrelated string unions. Omitted by `/organizations` (one filterable dimension: cause). `/events` passes one for its `TypeFilter` (`All`/`Invite only`/`Open to all`/`Online`/`Offline`, over `event.model.ts`'s `inviteOnly`/`mode` fields) alongside the primary Upcoming/Past filter - see [events.md](../../events.md). Rendered as a second `FilterDropdown` immediately after the first, before `action`; each stays independently single-select, so the two facets can't combine into one choice, only sit side by side.

### `suggestions`, the opt-in live-suggestions dropdown

`{ id, options: ComboboxOption[], onPick, noun? }`. Omitted (still true of `/events`): the field renders exactly the plain `role="searchbox"` `<input>` it always has. Provided (`/organizations`, since it added this): the field renders through the shared [`Combobox`](#combobox) instead — `role="combobox"`, the field's own accessible name now carried by a `sr-only <label htmlFor>` rather than `aria-label` (`Combobox` has no `aria-label` prop; it expects a sibling label, per its own doc comment). `Combobox` owns the panel's open state, keyboard and ARIA entirely; `DirectoryToolbar` only supplies its icon, its clear button and the pill it all sits inside. `/organizations` feeds it the current (already server-filtered) `results`, capped to six, so picking a row is a second fetch avoided, not added — see [organizations.md](../../organizations.md#directorytoolbars-search-suggestions).

### Geometry (pill toolbar, September 2026)

Root: `mt-8 lg:mt-10`.

Row 1, `flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4`:
- Field: `group flex flex-1 items-center gap-3 rounded-full border border-transparent bg-surface-muted px-5 py-3 transition-[background-color,border-color,box-shadow] duration-200 focus-within:border-brand/45 focus-within:bg-white focus-within:shadow-[0_10px_24px_-16px_color-mix(in_srgb,var(--color-brand)_45%,transparent)]`. Flat at rest — `--color-surface-muted` is the design system's own documented "input/panel background" token (see [01-tokens.md](./01-tokens.md#color-tokens)), so this needs no shadow to read as a control surface, and a field that was seen as looking odd is a field that gains one shadow only when it actually has a reason to (focus), not permanently. **Exception to the radius decision table's "Form input → `rounded-lg`"**: this is an explore/filter field, not a data-entry form, and pairs with the pill-shaped [`FilterDropdown`](#filterdropdown) trigger beside it — see [06-radius-elevation.md](./06-radius-elevation.md#radius) for the note.
- `FiSearch` at `size-4.5` (18px), `text-ink/35`, `group-focus-within:text-brand`.
- The field itself: either the plain `<input type="text" role="searchbox">` or `<Combobox>` — see `suggestions` above. The raw `<input>` (no `suggestions`) is a direct child of this flex row, so `min-w-0 flex-1 truncate border-none bg-transparent font-poppins text-body-lg text-ink outline-none placeholder:text-ink/35` works as written. The `<Combobox>` case is `w-full` instead of `min-w-0 flex-1`: `Combobox` wraps the `<input>` in its own `relative min-w-0 flex-1` div (see [`Combobox`](#combobox) below), so *that* wrapper is the actual flex item — `flex-1`/`min-w-0` on the `<input>` itself are inert, and the `<input>` needs `w-full` to fill that wrapper rather than falling back to its browser-default ~20ch intrinsic width, which `truncate` was then clipping well short of the pill's real width (fixed September 2026, fourth pass). The raw `<input>` is deliberately not `type="search"` — that draws browser-native chrome on top of this component's own icon/clear button (Chrome/Safari's magnifier styling, and specifically a native clear "×" in Firefox that `::-webkit-search-cancel-button` never reaches), which read as a stray, half-hidden second control popping in and out. `truncate` (September 2026, third pass) is load-bearing, not cosmetic: the pill's `px-5` leaves less room than the old borderless field had, and a placeholder like `"Search by event, organizer or city"` was hard-clipping mid-word on real mobile widths with no ellipsis — a genuine visual bug the two prior passes introduced and missed, not a style preference.
- Clear button: always mounted (not conditionally rendered) so it fades rather than pops into existence — `opacity-0 pointer-events-none` plus `aria-hidden`/`tabIndex={-1}` while `query` is empty, `size-6 rounded-full text-ink/40 hover:text-brand transition-[opacity,color] duration-200` with `FiX` at `size-4`, `aria-label="Clear search"`.
- [`FilterDropdown`](#filterdropdown) — the taxonomy picker, in this row rather than its own line (moved here September 2026, fourth pass; a plain always-visible chip row before that, replaced by the dropdown entirely September 2026, fifth pass — see both below).
- `action` slot.

Result count, `mt-4`, `font-poppins text-caption tracking-wide text-ink/45 uppercase`, `aria-live="polite"`. Its own line now — it used to sit beside the chip row (`sm:gap-6` between them); with the taxonomy moved into `FilterDropdown`'s own panel, the count is this second row's only remaining content.

### Why it changed (September 2026, five passes)

**First pass.** The original version (search field on a bare underline, filters as plain underlined text) was deliberately light, but it only stayed clean for a *short* taxonomy — `/organizations`' ten causes wrapped `sm:flex-wrap` into a ragged multi-row block with the result count stranded alone, which read as more clutter than a heavier design would have, not less. Fix: pill chips (active filled brand, rest outlined) in a row that always scrolls instead of ever wrapping, and a bordered pill search field.

**Second pass, direct feedback that the first pass "still looks bad."** Four concrete complaints, four concrete fixes, all still inside the existing token system:
- *"Add a filter icon somewhere"* → the `FiFilter` + `filterLabel` caption above the chip row.
- *"The tags [chips] are compact, reduce the font size"* → `text-sm` instead of `text-body`, tighter `px-3.5 py-1.5`.
- *"The search bar has a weird box shadow, not up to our standards... no autofill"* → dropped the shadow-at-rest entirely (a flat `surface-muted` fill instead — see Geometry above) and added the opt-in `suggestions` dropdown via `Combobox`.
- *"Gamify the page... nothing happens on card/button hover... the grid pops instead of animating"* → see [`OrganizationCard`](../../../apps/web/src/features/organizations/components/OrganizationCard.tsx)'s richer hover, the dashboard button's `useMagnetic`, and `Organizations.tsx`'s skeleton-loading + crossfade — all covered in [organizations.md](../../organizations.md#directorytoolbars-search-suggestions).

**Third pass, real visual bugs the second pass introduced, caught from a live screenshot rather than reported as taste.** The `px-5` search pill left less horizontal room than the old field had, so a long placeholder now hard-clipped with no ellipsis — fixed with `truncate` on the field. The chip scroll row's trailing edge was a hard, unsignalled cut sitting almost flush against the count — fixed with the trailing-edge fade above, which also required moving the mobile bleed (`-mx-9`) from the scroll element onto its wrapper, since the fade has to be positioned against the box the bleed actually extends, not the box that happens to contain it. A follow-up bug from the same `truncate` fix: it papered over hard-clipping in the plain-`<input>` case, but the `<Combobox>` case (`/organizations`) still clipped early, because `Combobox` wraps the `<input>` in its own flex-item wrapper div, leaving the `min-w-0 flex-1` this component put on the `<input>` itself inert — fixed by giving that branch `w-full` instead, see Row 1 above.

**Fourth pass, direct feedback that the filter-icon caption's own row cost too much vertical space.** It moved from its own full-width line above the chips into Row 1, right beside the search field — the chip group's `aria-label={filterLabel}` already carried the same text for a11y, so the caption line was purely visual and free to fold in elsewhere; it's now `aria-hidden` there. The chips section's top margin dropped from `mt-6` to `mt-4` to match, since it no longer has a labelled row directly above it to separate from. **Superseded by the fifth pass below** — the caption this pass relocated no longer exists; it became the `FilterDropdown` trigger itself.

**Fifth pass, direct feedback that listing every cause as an always-visible chip ("Animal welfare, Disaster relief, Education, …") was the wrong shape for the space, not just visually noisy.** Checked against ~30 filter-UI samples pulled from Mobbin across web apps and marketplaces (Faire, Dribbble, Sweatpals, Apple, Tripadvisor, Homerun, Whop, Polywork, Databricks, Klarna, SSENSE, Urban Outfitters and others) rather than redesigned from taste alone. Two patterns recur:
1. **Multi-facet panel** (Faire's "All Filters", Dribbble's "Filters" modal, Homerun): one trigger opens a panel holding *several* independent facets (price, location, rating, …) at once, each needing its own "Apply"/"Clear all". Fits when a listing has more than one filterable dimension.
2. **Single-facet dropdown** (Whop's "Business Type", Polywork's "Topics", Semrush's per-column `Select ▾`, Dropbox's `Folder ▾`/`People ▾`): a pill button that always displays the *current* value, opening a small listbox of the taxonomy on click — no "Apply" step, because choosing a row is the whole action.

`/organizations` and `/events` each had exactly one filterable dimension at the time (cause; Upcoming/Past), so pattern 2 is the fit — pattern 1 would add an unneeded panel-plus-apply step for a single choice. Replaced the always-visible chip row (and the trailing-edge fade and horizontal scroller it needed once a taxonomy like `/organizations`' ten causes stopped fitting on one line — both now moot, there's nothing left to scroll) with [`FilterDropdown`](#filterdropdown), reusing `Combobox`'s own listbox geometry (radius, border, shadow, `motion-safe:animate-pop-in`) so it reads as the same product rather than a third distinct control. The `FiFilter` + `filterLabel` caption the fourth pass relocated into Row 1 is now the dropdown's own trigger button instead of adjacent decoration — one control, not two.

**Superseded in part, September 2026:** `/events` grew a second dimension (`TypeFilter`, over `inviteOnly`/`mode`). Rather than switching that page to pattern 1's multi-facet panel, `DirectoryToolbar` gained a second, independent `secondaryFilter` slot (see `DirectoryToolbar`'s own Props above) - two pattern-2 dropdowns side by side, each still single-select. This holds only while a page has a small, fixed number of dimensions that don't need to combine through one "Apply"; a third dimension, or a need to filter by more than one facet at once (e.g. "online AND invite-only"), would be the point to revisit pattern 1 instead of adding a third dropdown.

---

## `FilterDropdown`

[components/inputs/FilterDropdown.tsx](../../../apps/web/src/components/inputs/FilterDropdown.tsx).
The single-select taxonomy picker inside `DirectoryToolbar`'s search row — see that component's "fifth pass" above for why it replaced a row of always-visible chips, and the Mobbin research behind the choice.

### Props

`label` (accessible name, e.g. `"Filter by cause"` — never rendered as its own visible line, only as `aria-label`), `options: readonly T[]`, `active: T`, `onSelect`, `dataCy?`.

### Behavior

The trigger **always displays `active` directly**, the same way a native `<select>` does — `"All"`, `"Healthcare"`, `"Upcoming"`, whatever the caller's current value is. This is deliberately not conditional on detecting some "nothing chosen" state: `/organizations`' taxonomy happens to lead with an `"All"` pseudo-option but `/events`' `TIME_FILTERS` (`["Upcoming", "Past"]`) does not, and a rule that only worked for one of the two callers would be a trap for the next one. `aria-label` on the trigger is `` `${label}: ${active}` ``, so a screen reader gets the same "Filter by cause: Healthcare" framing sighted users get from the icon + text.

Clicking the trigger toggles a `role="listbox"` panel of `role="option"` rows, one per `option`, the active one marked `aria-selected` and checked (`FiCheck`). Picking a row calls `onSelect` and closes the panel — no separate "Apply", because for a single facet the row selection *is* the action (see the fifth-pass write-up above on why this differs from a multi-facet panel like Faire's). Closes on an outside pointerdown or `Escape`, same reasoning as [`Combobox`](#combobox): blur alone would also fire when focus merely left the window, which reads as the panel breaking rather than closing on purpose.

### Geometry

Trigger: `flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-outfit text-sm` — `FiFilter` (`size-3`) then `active`'s text then `FiChevronDown` (`size-3.5`, rotates 180° open). Open: `border-brand/45 bg-white text-brand-secondary`. Closed: `border-brand-secondary/15 bg-transparent text-ink/55 hover:border-brand/35 hover:text-brand-secondary` — the same rest/hover pair the old chips used, so the one surviving control still reads as part of the same family.

Panel: `absolute top-full right-0 mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-brand-secondary/15 bg-white p-1 shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in` — lifted verbatim from `Combobox`'s own listbox (see [Panel geometry](#panel-geometry) below) rather than invented fresh, so the two dropdowns in the same toolbar look like one design decision. `right-0`, not `left-0` or `inset-x-0`: the trigger sits mid-row between the search field and `action`, not flush against either edge, so anchoring the panel to the trigger's own right edge is the one option that can't spill into a neighboring control on a narrow `sm:flex-row` width.

Option rows: `flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left font-outfit text-body`. Selected: `bg-brand/8 font-medium text-brand` plus a trailing `FiCheck`. Rest: `text-ink/80 hover:bg-surface-muted`.

---

## `Combobox`

[components/inputs/Combobox.tsx](../../../apps/web/src/components/inputs/Combobox.tsx).
A text field that suggests without insisting: whatever is typed is the value, and a suggestion is only ever a shortcut to typing it.

That distinction is why this is not react-select (already a dependency, and correct for closed-set cases).
react-select's free-text mode is `creatable`, which announces "create option" for what is really just a place that already exists.

**The caller owns the matching.** It passes `options` already filtered and ordered.
The component owns only what a combobox has to own: open state, the active row, the keyboard, and the ARIA.

### Props

`id`, `value`, `onChange` (fires on every keystroke), `onPick` (fires only on an actual selection, which is what lets a caller fill a second field from the chosen row), `options: ComboboxOption[]`, `placeholder`, `maxLength`, `className` (applied to the `<input>` itself), `dataCy`, `inputRef`, `noun` (default `"suggestions"`, announced with the count).

`ComboboxOption`: `{ value, label, hint?, data? }`.

### ARIA

`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`, a `role="listbox"` of `role="option"` buttons, and an `sr-only` `role="status" aria-live="polite"` that announces **the count only** while the list is up.
A screen reader that has just been told the field's label does not also need the first row read at it before the user has moved to one.

### Five behaviors that must survive a rebuild

1. **Enter is swallowed while the list is open.** These fields live inside forms whose Enter submits; without `preventDefault()` one press both chooses a suggestion and advances the wizard.
2. **There is no `onFocus` opener.** Fields are often focused by the page rather than the person (setup focuses the first answer as each question arrives), and a list unfurling over a saved answer nobody has touched reads as a fault. Typing opens it, and so does ArrowDown.
3. **It closes on an outside `pointerdown`, not on blur.** Blur fires when focus moves to the browser's own chrome too. Option buttons `preventDefault()` their `mousedown` so the click that chooses one is not the press that closes the list.
4. **The panel is `absolute`.** Nothing below moves as matches narrow; a page settling under the cursor mid-type is how a field ends up holding the wrong thing.
5. **The panel is tall enough for a full result set.** `max-h-88` (**352px**) clears the seven rows `SUGGESTION_LIMIT` allows, so nothing scrolls and no row is sliced through its own text. The first version cut the last one in half.

`autoComplete="off"` is set because the browser's own address autofill draws its menu in the same place, and two stacked dropdowns is not a choice anybody can make.
Escape `stopPropagation`s: dismissing the list should not also close whatever the field is inside.

### Panel geometry

```
absolute inset-x-0 top-full z-30 mt-2 max-h-88 list-none overflow-y-auto overscroll-contain
rounded-xl border border-brand-secondary/15 bg-white p-1
shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in
```

Row: `flex w-full items-center justify-between gap-3 rounded-lg border-none px-3 py-2.5 text-left font-outfit text-body transition-colors`.
Active: `bg-brand/8 text-brand`. Rest: `bg-transparent text-ink/80`.
The matched run inside the label is wrapped in `font-semibold`; `splitMatch` matches the **raw** strings, not normalized ones, because normalization shifts character offsets and a highlight drawn at a shifted offset is worse than no highlight.
The `hint` (the state, next to a city) is **body-sized and muted**, `text-body` with `text-ink/40` (or `text-brand/70` when active), not caption-sized: it is what tells two identically-named towns apart, so it has to be readable, and color is what makes it recede.

Used today by the organization setup flow's city and state question.

---

## `Loading`

[components/Loading.tsx](../../../apps/web/src/components/Loading.tsx).

```
w-screen text-center
> m-5 inline-block size-16 animate-spin rounded-full border-4 border-brand! border-r-transparent align-middle
```
`size-16` = **64px**, `border-4` = 4px, `m-5` = 20px, `role="status"`, plus an `sr-only` "Loading...".
Note `animate-spin` is **not** `motion-safe:`-gated; a loading indicator is status, not decoration.

---

## `BacktoTop`

[components/buttons/BacktoTop.tsx](../../../apps/web/src/components/buttons/BacktoTop.tsx).

Appears once `document.documentElement.scrollTop > 250`, on a **300ms debounced** scroll listener.

```
fixed right-7.5 bottom-7.5 z-999 flex size-10 cursor-pointer items-center justify-center
rounded-10px bg-brand text-black transition-all duration-500 ease-in-out
max-500px:right-6 max-500px:bottom-6 max-500px:size-8
```
40px at 30px inset; 32px at 24px inset below 500px.
Icon `IoIosArrowUp` at `text-[1.8rem]` / `max-500px:text-[1.2rem]`.
Scrolls with `lenis.scrollTo(0)` when Lenis is mounted, falling back to `window.scrollTo({ behavior: "smooth" })` under reduced motion where `SmoothScroll` skips Lenis entirely.

Accessibility gap: it is a `<div>` with `onClick`, no `role`, no `aria-label`, not keyboard reachable.

---

## `ScrollProgress`

See [07-motion.md](./07-motion.md#scrollprogresstsx).

---

## `Header`

[components/header/Header.tsx](../../../apps/web/src/components/header/Header.tsx).
Copy lookup keyed by a `type` prop against [HeaderData.ts](../../../apps/web/src/components/header/HeaderData.ts); falls back to "Default Header" / "Default Description".

```
wrapper: mt-12 flex flex-col items-center justify-center gap-4 max-500px:mt-8 max-500px:gap-8
h1: z-3 mt-8 text-center font-mont text-[3.5rem] leading-none font-black text-brand-secondary uppercase
    max-500px:text-left max-500px:text-[45px] max-500px:leading-10.75
p:  z-3 mx-auto mt-4 w-[70%] text-center font-poppins text-lg font-normal tracking-[1.2px] text-brand-secondary
    max-500px:mt-0 max-500px:w-[95%] max-500px:text-left max-500px:tracking-[1px] max-500px:break-all max-500px:text-black
```

**Legacy. Do not extend.** It is the only `font-mont` consumer, it uses `clsx` for static strings, it reads `window.innerWidth < 800` once at render with no resize listener, and `max-500px:break-all` will break words mid-character.

---

## `ClickAwayListener`, `ComponentHelmet`, `SmoothScroll`

Behavioral, no visual surface.
`ComponentHelmet` sets per-page document title/meta.
`SmoothScroll` is covered in [07-motion.md](./07-motion.md#smoothscrolltsx).
