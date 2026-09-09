# 04 — Spacing and layout

## The grid

`--spacing` is Tailwind's default `0.25rem`.
Every bare numeric spacing utility is `n * 4px`.
Fractional steps are legal and used: `p-3.75` = 15px, `size-7.5` = 30px, `size-6.25` = 25px, `top-1.75` = 7px, `right-17.75` = 71px, `size-4.5` = 18px, `size-3.5` = 14px, `gap-3.5` = 14px, `pt-3.5` = 14px, `mt-2.5` = 10px, `py-2.5` = 10px, `gap-1.25` = 5px, `mb-1.25` = 5px.

Quick conversion for values this repo actually uses:

| Utility n | px | | Utility n | px |
| --- | --- | --- | --- | --- |
| 0.5 | 2 | | 8 | 32 |
| 1 | 4 | | 9 | **36** |
| 1.5 | 6 | | 10 | 40 |
| 2 | 8 | | 11 | 44 |
| 2.5 | 10 | | 12 | 48 |
| 3 | 12 | | 14 | 56 |
| 3.5 | 14 | | 16 | 64 |
| 4 | 16 | | 20 | 80 |
| 5 | 20 | | 24 | 96 |
| 6 | 24 | | 28 | 112 |
| 7 | 28 | | 32 | 128 |

## The page shell

The standard content wrapper, in order of preference:

```
mx-auto max-w-6xl px-9 sm:px-10 lg:px-12
```

- `mx-auto` plus a `max-w-*` cap is what covers 4K/5K without extra breakpoints. Never let text run edge to edge.
- `px-9` = **36px** is the mobile horizontal padding standard for `apps/web`. It is what `Landing.tsx`'s hero and `Footer.tsx` both use. Match it in new sections rather than picking a fresh value; those two visibly disagreed before being aligned to each other. It was briefly `px-10` (40px) and was brought down one notch on direct feedback.
- `sm:px-10` = 40px, `lg:px-12` = 48px.

Observed shells, all real:

| Shell | Where |
| --- | --- |
| `mx-auto max-w-6xl px-9 lg:px-12` | `DrivesRail` |
| `mx-auto max-w-6xl px-9 py-12 sm:px-10 lg:px-12 lg:py-16` | directory page bodies |
| `mx-auto max-w-6xl px-9 py-16 sm:py-24 lg:px-12 lg:py-32` | landing sections |
| `mx-auto max-w-6xl px-9 pt-8 sm:px-10 lg:px-12 lg:pt-12` | directory page headers |
| `mx-auto max-w-7xl px-9 pt-10 pb-6 sm:px-10 lg:px-12 lg:pt-14` | wide page headers |
| `mx-auto max-w-7xl px-9 pb-20 sm:px-10 lg:px-12` | wide grids |
| `mx-auto max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14` | narrow article pages |
| `mx-auto max-w-3xl px-9 py-24 sm:px-10 lg:px-12` | prose pages |
| `mx-auto max-w-2xl px-9 pt-14 pb-24 sm:px-10 lg:px-12 lg:pt-20` | single-column forms |

## Max-width scale

| Utility | Value | Uses |
| --- | --- | --- |
| `max-w-xs` | 320px | 1 |
| `max-w-sm` | 384px | 5 (the `SplitPanelLayout` right-panel default) |
| `max-w-md` | 448px | 4 (the split-panel aside, footer newsletter copy) |
| `max-w-lg` | 512px | 1 |
| `max-w-xl` | 576px | 8 (section headings and leads) |
| `max-w-2xl` | 672px | 4 |
| `max-w-3xl` | 768px | 2 |
| `max-w-4xl` | 896px | 1 |
| `max-w-6xl` | **1152px** | 11 — the default content cap |
| `max-w-7xl` | 1280px | 4 — wide grids only |
| `max-w-prose` | 65ch | 2 |
| `max-w-76` | 304px | 1 |
| `max-w-250` | 1000px | 1 |

Vertical section rhythm: `py-16 sm:py-24 lg:py-28` (64 / 96 / 112px) and `py-16 sm:py-24 lg:py-32` (64 / 96 / 128px).
Tighten vertical padding at mobile rather than reusing the desktop value; a narrow screen turns a comfortable desktop stack into an undifferentiated column.

## The `.container` class

`apps/web/src/styles/index.css` hand-writes a Bootstrap-replica `.container`, used only by `Donate.tsx` and `Landing.tsx`, both of which predate the Tailwind migration.
Bootstrap itself has been removed.

```
width:100%; margin-inline:auto; padding-inline:0.75rem;
576px -> max-width 540px
768px -> 720px
992px -> 960px
1200px -> 1140px
1400px -> 1320px
```

It is wrapped in `@layer base`. That wrapping is load-bearing; see the next section.

**Do not use `.container` in new code.** Use the `mx-auto max-w-6xl px-9 sm:px-10 lg:px-12` shell.

## The cascade rule

`@import "tailwindcss"` implicitly declares `@layer theme, base, components, utilities;`.
A later-declared layer always beats an earlier one, regardless of selector specificity or source order.
**A rule written outside any `@layer` sits above all of them, above `utilities`.**

This has bitten this repo twice:

1. The project's own unlayered `* { margin: 0; padding: 0 }` reset silently killed every `p-*`/`m-*` utility in the app during the migration.
2. The unlayered `.container` beat a `px-*` utility placed next to it in the same `className`. `Landing.tsx`'s `max-500px:px-4` / `max-500px:px-10` was fighting and losing; the hero's real mobile padding stayed pinned at 12px no matter what the JSX asked for. Fixed August 2026 by wrapping `.container` in `@layer base`.

**Rules:**

- Any hand-written global CSS that shares a class name with anything Tailwind-generated must be wrapped in `@layer base` (or `components`).
- Never write a bare element or universal selector in global CSS.
- If you assert a padding, verify the computed style rather than trusting the `className`.

A second instance of the same principle: the react-toastify override uses `:root:root`, not `:root`.
`ReactToastify.css` declares its own unlayered `:root { --toastify-* }` block; repeating the pseudo-class doubles specificity from (0,1,0,0) to (0,2,0,0), which is what makes the override reliably win regardless of which stylesheet lands later in Vite's bundle.

## What cannot be Tailwind

Tailwind's scanner only sees literal strings in source.
These four things are therefore hand-written global CSS in `index.css`, correctly:

1. **react-select** generated class names: `.css-13cymwt-control`.
2. **MUI** generated/internal class names: `.MuiMenuItem-root`, `.css-o4b71y-MuiAccordionSummary-content`, `.CreateEvents_date_range .MuiFormControl-root`, `.MuiInputBase-input`.
3. **The signup Individual/Organization toggle** (`.custom-checkbox`), an `input:checked`-driven pseudo-element switch using `content: attr(...)`. Fixed geometry: 250 x 40px, 15px, `border-radius: 20px` on the wrapper and `8px` on the switch, thumb inset 3px, `transition: all 0.3s ease`.
4. **The Navbar account dropdown** visibility class (`.nav_dropdown_visible`), toggled by `Navbar.tsx` through direct `classList` manipulation rather than React state. Sets `display:flex; top:60px; z-index:100`.

Also global, and not stylable any other way:

- `input::-webkit-outer-spin-button` / `inner-spin-button` removal and `input[type=number] { -moz-appearance: textfield }`.
- The `.auth-page input:-webkit-autofill` neutralizer: `-webkit-box-shadow: 0 0 0 1000px #ffffff inset`, `-webkit-text-fill-color: var(--color-ink)`, and a `9999s` transition delay, which is the standard trick to outrun Chrome's internal `!important` background-color.
- `.loader`, a 30px conic-gradient spinner with a radial mask, `animation: l13 1s infinite linear`.

## Two entry points

- [src/styles/index.css](../../../apps/web/src/styles/index.css) — Tailwind entry, `@theme`, all global CSS above. Imported once, from `app/index.tsx`.
- [src/styles/App.css](../../../apps/web/src/styles/App.css) — a single `::selection` rule. Imported once, from `App.tsx`.
