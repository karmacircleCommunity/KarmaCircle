# 06 — Radius, elevation, borders, z-index

## Radius

| Utility | px | Uses | Where |
| --- | --- | --- | --- |
| `rounded-full` | pill | 69 | Eyebrows, badges, dots, avatars, icon buttons, status pills |
| `rounded-lg` | 8 | 28 | Form inputs, primary CTA, combobox rows, icon chips |
| `rounded-2xl` | 16 | 19 | **Cards.** All three card surfaces |
| `rounded-md` | 6 | 17 | Navbar dropdown panel |
| `rounded-xl` | 12 | 13 | `Button` outline variant, `Combobox` panel, mobile nav sheet |
| `rounded-5px` | 5 | 11 | Navbar CTA, dropdown rows, small chips |
| `rounded-10px` | 10 | 8 | Footer input and Subscribe, `BacktoTop`, event-type tiles, toasts |
| `rounded-15px` | 15 | 5 | |
| `rounded-3xl` | 24 | 4 | |

Decision table:

| Surface | Radius |
| --- | --- |
| Card | `rounded-2xl` |
| Modal | `rounded-2xl` |
| Dropdown / suggestion panel | `rounded-xl` |
| Form input | `rounded-lg` |
| Primary CTA (form context) | `rounded-lg` |
| Compact chip / nav CTA | `rounded-5px` |
| Footer field and button | `rounded-10px` |
| Pill, badge, eyebrow, dot, avatar | `rounded-full` |

`variantClasses.outline` in `Button.tsx` **already contains `rounded-xl`**.
Overriding it from `className` with a different radius is a same-layer collision decided by Tailwind's own class ordering, not by your `className`.
If you need a pill, use `variant="solid"`.

**Exception, September 2026: `DirectoryToolbar`'s search field is `rounded-full`, not `rounded-lg`.** The "form input" bucket above is data-entry (auth, setup wizard) — `DirectoryToolbar` is an explore/filter bar, paired with the equally pill-shaped `FilterDropdown` trigger beside it (a row of chips originally, replaced by the dropdown — see [08-components-shared.md](./08-components-shared.md#filterdropdown)), matching the Mobbin reference set this redesign was checked against (Delphi, Julienne). Do not "correct" it back to `rounded-lg`; a genuine data-entry field elsewhere should still follow the table.

## Elevation

There is no shadow token scale. Every shadow is an arbitrary value. These are the ones that recur; treat them as the vocabulary.

### Card, at rest

```
shadow-[0_2px_18px_-14px_var(--color-brand-secondary)]
```

A near-invisible warm grounding shadow. `shadow-[0_2px_20px_-16px_var(--color-brand-secondary)]` is the same idea, 3 uses.

### Card, hover (standardized August 2026)

```
hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]
motion-safe:hover:-translate-y-1
```

Applied by `OrganizationCard`, `EventCard`, `EventsMarqueeCards`.
All three previously shared a hardcoded `rgba(226,105,89,0.32)` glow, the pre-rebrand orange, a color that no longer exists in the palette.
This form follows a retheme, and the card lifts rather than only glowing.
The duplicated `hover:transition-all hover:duration-300 hover:ease-in-out` trio each carried alongside an identical unprefixed one was dropped in the same pass; it never did anything.

The transition property on the card is explicit, not `all`:

```
transition-[transform,box-shadow,border-color] duration-300 ease-out
```

### Primary CTA (form context)

```
shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)]
hover:shadow-[0_10px_26px_-6px_rgba(168,98,62,0.55)]
hover:-translate-y-0.5
```

13 occurrences. `rgba(168,98,62,...)` is `--color-brand` frozen as a literal; it will not follow a retheme.
**In new code write `color-mix(in srgb, var(--color-brand) 50%, transparent)` instead.**
See [14-drift-register.md](./14-drift-register.md#d1).

### Brand glow, Navbar CTA

```
hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)]
```

Three stacked glows at 1.17 / 8.191 / 28.084px.
The account dropdown uses the identical geometry at `color-mix(... 12.5%, transparent)`.

### Dropdown / suggestion panel

```
shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)]
```

`rgba(56,44,36,...)` is `--color-brand-secondary`. Same freezing problem, one occurrence.

### Toast

Set once through the CSS variable, not per-toast:

```
--toastify-toast-shadow: 0 18px 38px -16px color-mix(in srgb, var(--color-brand-secondary) 35%, transparent);
```

This is the correct, rethemeable form. Copy this shape.

### Liquid glass (September 2026) — now `EventMobileActionBar` only

```
bg-white/55 border border-white/50 backdrop-blur-2xl backdrop-saturate-150
shadow-[0_20px_45px_-18px_color-mix(in_srgb,var(--color-brand-secondary)_50%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.65)]
```

`EventMobileActionBar` (the event page's floating mobile join capsule) is
the one surface still carrying this. `backdrop-blur` alone flattens and
grays out whatever scrolls underneath it; the paired `backdrop-saturate-150`
is what keeps that see-through content looking like glass rather than
frosted paper — never ship one without the other. It's a small floating
capsule, not an edge-to-edge bar sitting over the page's full visual
variety, so the flat tint/blur/shadow recipe above still reads fine there
with no further material work (no refraction — see below).

Border on all four sides (it floats clear of every edge, so a full border
reads correctly, unlike an edge-to-edge bar — see `Navbar`'s history
below). Follows the elevation shape rule above: warm-tinted, Y-offset only,
`color-mix` against `--color-brand-secondary` rather than a frozen hex.

**`Navbar` carried this material September-October 2026, then reverted to
solid.** It went through two revisions trying to make the flat recipe
above read as actual glass rather than a tinted pane — first an SVG
`feDisplacementMap` refraction filter (`feTurbulence` noise, Gaussian-
blurred, driving the displacement) layered into its `backdrop-filter` to
give it real bend, then a tint dropped from `bg-white/55` down to
`bg-white/10` once the refraction pass alone still read as a painted-on
bar. Neither fixed it: on this app's own near-white pages there usually
wasn't enough contrast behind the bar for blur/refraction to read as
anything, and it carries the one CTA ("Sign Up") that has to stay at full
contrast regardless of what's under it — a transparent material works
against that by design. `Navbar` is now solid (`bg-surface`, a
`border-brand-secondary/10` hairline, no `backdrop-filter`, no shadow —
see "Others in the inventory" below for why it also dropped the ambient
shadow this table's other surfaces still use), matching Stripe's plain
solid header rather than Linear's/Vercel's glass/transparent patterns.
Full blow-by-blow (why the glass material existed, the refraction
technique, the npm libraries considered, and the solid-revert reasoning):
[layout-navigation.md#navbar](../layout-navigation.md#navbar).

### Others in the inventory

`shadow-[0_8px_24px_-10px_var(--color-brand)]` (4), `shadow-[0_12px_28px_-8px_var(--color-brand)]` (3), `shadow-[0_8px_24px_-14px_var(--color-brand)]` (2), `shadow-[0_16px_34px_-22px_var(--color-brand)]`, `shadow-[0_16px_34px_-18px_var(--color-brand)]`, `shadow-[0_10px_26px_-14px_var(--color-brand)]`, `shadow-[0_8px_24px_-12px_var(--color-brand)]`.
All correctly reference the token.

Two legacy ones do not: `shadow-[0px_3px_5px_0px_#e8e8e8]` (CreateEvent), `shadow-[1px_3px_80px_rgba(255,255,255,0.346)]` (mobile nav sheet).

**Elevation shape rule:** every shadow in this system is a large-blur, large-negative-spread, warm-tinted glow, offset only on Y.
There is no neutral gray drop shadow anywhere in the design.
Do not introduce one.

`Navbar` is the one surface with no shadow at all (October 2026 — see its
solid-revert note above): a hairline border does the whole job of
separating it from scrolled content, and the shared ambient shadow read as
the bar fighting the page rather than sitting quietly on it. That's an
exception to "every surface gets the shared glow," not a second shadow
style — don't read it as license to drop the shadow elsewhere too.

## Borders

| Utility | Where |
| --- | --- |
| `border border-brand-secondary/8` | The card border |
| `border-b border-brand-secondary/10` | `Navbar`'s hairline (its only separation from scrolled content — see above) |
| `border-brand-secondary/15` | Field underline at rest, combobox panel |
| `border-b border-brand-secondary/15 ... focus-within:border-brand/55` | The search field |
| `border-b-2 border-brand` | The active directory filter |
| `border-border-subtle` | Card internal rule above the stat row |
| `border-gray-300` | Auth form inputs |
| `border-input-border` (`#ced4da`) | Legacy form inputs |
| `border-white/15`, `/10`, `/5` | Dark-surface dividers, in that order of strength |
| `border-y border-brand-secondary/8` | Banded landing section |

Hairline dividers are `h-px w-full bg-...`, not `border`, inside the Navbar dropdown.

## Z-index ladder

| Value | Occupant |
| --- | --- |
| `z-999` | `ScrollProgress`, `BacktoTop` |
| `z-99` | Navbar bar |
| `z-30` | `Combobox` suggestion panel |
| `z-20` | `Modal` scrim, Navbar mobile sheet scrim |
| `z-10` | Navbar logo, Navbar dropdown panel, `SplitPanelLayout` aside content, `EventMobileActionBar` (the event detail page's fixed mobile join bar — deliberately below the Navbar mobile sheet scrim's `z-20`, so an open hamburger menu covers it rather than floating above it) |
| `z-3` | Navbar CTA, `Header` text, `Landing` hero copy |
| `z-1` | Navbar link row, `EventCard`'s organizer link (above the stretched card overlay) |
| `100` | `.nav_dropdown_visible`, set in global CSS |

`ScrollProgress` and `BacktoTop` share `z-999` and never coexist visually (one is a 2px rule at `top-0`, the other a 40px button at `bottom-7.5 right-7.5`).
