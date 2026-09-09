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

Bar: `sticky z-99 mx-8 flex items-center justify-between px-28 py-[0.8rem] max-430px:px-6`.
`mx-8` = 32px, `px-28` = **112px**, `py-[0.8rem]` = 12.8px, `max-430px:px-6` = 24px.

Nav entries are `Organizations` and `Events` only. There is deliberately **no "Home"**: the logo already links there, which is the standard marketing-site convention.

### Logo / wordmark

```
group z-10 flex items-center gap-2 no-underline
```
- Dot: `inline-block size-2 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:transform-none`. **8px**, `aria-hidden`.
- Wordmark: `font-outfit text-xl leading-none font-medium tracking-tight text-brand-secondary transition-colors duration-300 group-hover:text-brand`. **20px / 500 / -0.025em**.

### Desktop (`windowWidth > 900`)

- Link row: `z-1 flex items-center gap-7` (28px).
- Link: `relative font-outfit text-body-lg leading-none font-normal text-ink/65 ... hover:text-brand-secondary`, with the directional underline (`after:-bottom-1.5 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-brand after:duration-300 hover:after:origin-left hover:after:scale-x-100`).
- No active-route underline. That is an app-internal-tab pattern, not a marketing-nav one.
- Logged out: `Button to="/auth/signup"` with `rounded-5px px-5 py-2 font-outfit text-base`, the triple brand glow on hover, `motion-safe:hover:-translate-y-0.5`.
- Logged in: a `Profile` text row with `RxCaretDown` at `size-6.25` (25px) that toggles `.nav_dropdown_visible` **via `classList`, not React state**.

### Account dropdown

```
nav_dropdown absolute top-10 right-17.75 z-10 hidden w-50 flex-col justify-center
rounded-md bg-white shadow-[...color-mix(...12.5%...)] transition-all duration-1000 ease-in-out
```
`top-10` = 40px, `right-17.75` = 71px, `w-50` = 200px, radius 6px.
Rows: `flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary hover:bg-black/[3.5%]`.
Separators: `h-px w-full bg-[#e2e5e883]`, `role="separator"`.
Draft-organization row is `text-brand`, `font-medium`, `hover:bg-brand/8`, with a trailing `size-1.5` brand dot, `data-cy="nav-finish-setup"`.

Label rule: the mobile sheet always says **"Dashboard"** because it always points at `/dashboard`.
The desktop dropdown's **"Your Profile"** is a distinctly named link to `/user/:handle`.
The two used to share the ambiguous label "Profile" for individual accounts.

### Mobile (`max-430px`)

- Trigger: logged out `GiHamburgerMenu` at `size-7.5` (30px) `text-heading`; logged in the avatar at `size-7.5 rounded-full` with `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`, `role="button"`, `tabIndex=0`, Enter/Space handled.
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
Generic over the filter option type (`<T extends string>`); each page passes its own taxonomy and owns its own filtering state and `useMemo`.
The component owns presentation only.

### Props

`query`, `onQueryChange`, `searchPlaceholder`, `searchLabel`, `options` (the taxonomy including the `"All"` pseudo-option), `active`, `onSelect`, `filterLabel`, `summary` (a `ReactNode`, e.g. `12 events in Relief`), `action` (the page's single primary button).

### Geometry

Root: `mt-8 lg:mt-10`.

Row 1, `flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6`:
- Field: `group flex flex-1 items-center gap-3 border-b border-brand-secondary/15 pb-3 transition-colors duration-200 focus-within:border-brand/55`.
- `FiSearch` at `size-4.5` (18px), `text-ink/35`, `group-focus-within:text-brand`.
- `<input type="search">`: `min-w-0 flex-1 border-none bg-transparent font-poppins text-body-lg text-ink outline-none placeholder:text-ink/35 [&::-webkit-search-cancel-button]:hidden`. Safari's own clear affordance is hidden because the component renders its own.
- Clear button, only while `query` is non-empty: `size-6 rounded-full text-ink/40 hover:text-brand` with `FiX` at `size-4`, `aria-label="Clear search"`.
- `action` slot.

Row 2, `mt-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8`:
- Filter group: `role="group"`, `aria-label={filterLabel}`, `-mx-9 flex gap-6 overflow-x-auto px-9 pb-1 sm:mx-0 sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:px-0 [&::-webkit-scrollbar]:hidden`.
- Filter button: `shrink-0 border-none bg-transparent p-0 pb-1 font-outfit text-body whitespace-nowrap transition-colors duration-200`, with `aria-pressed`. Active: `border-b-2 border-solid border-brand font-medium text-brand`. Rest: `border-b-2 border-solid border-transparent text-ink/55 hover:text-brand-secondary`.
- Count: `aria-live="polite"`, `shrink-0 font-poppins text-caption tracking-wide text-ink/45 uppercase`.

### Why it looks this light

The earlier version stacked three heavy rows above the cards: a shadowed white pill search field, nine outlined-and-filled cause chips, and a separate uppercase count line.
Now the field is a single underline that turns brand on `focus-within`, the causes are plain text with a 2px brand underline marking the active one, and the count shares the filter row, leaving the primary button as **the only filled surface on the page above the grid**.

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
