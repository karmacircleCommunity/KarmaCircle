# 01 — Tokens

Every value below is declared in the `@theme { ... }` block of [apps/web/src/styles/index.css](../../../apps/web/src/styles/index.css).
Tailwind v4 generates utilities from the token's prefix: `--color-*` produces `text-*`/`bg-*`/`border-*`/`ring-*`/`fill-*`/`stroke-*`/`from-*`/`to-*`, `--font-*` produces `font-*`, `--text-*` produces `text-*`, `--radius-*` produces `rounded-*`, `--animate-*` produces `animate-*`.

## Color tokens

| Token | Hex | Generated utility stem | Role |
| --- | --- | --- | --- |
| `--color-brand` | `#a8623e` | `brand` | The one accent. Muted clay/terracotta. Every filled primary surface, every active state, every focus ring. |
| `--color-brand-hover` | `#8f5236` | `brand-hover` | The hover/pressed state of `brand`. Exists so no component hand-darkens the accent. |
| `--color-brand-secondary` | `#382c24` | `brand-secondary` | Warm near-black used as **ink for headings and on light surfaces**, and as the base of most shadows. Not a background. |
| `--color-surface` | `#fffcf7` | `surface` | The page ground. Also set as `body { background-color }`. |
| `--color-surface-warm` | `#faf4ec` | `surface-warm` | A deeper warm tint of the ground, for banded landing sections. |
| `--color-surface-muted` | `#f5f7f7` | `surface-muted` | Cool gray input/panel background. Do **not** use for a landing band; it reads as a different site next to `surface`. |
| `--color-surface-hover` | `#f5f7fd` | `surface-hover` | Hover state of `surface-muted` panels. |
| `--color-surface-dark` | `#0e0906` | `surface-dark` | Full-bleed dark surfaces only: the `SplitPanelLayout` left panel and `Footer`. |
| `--color-ink` | `#212529` | `ink` | Body copy. |
| `--color-heading` | `#28183b` | `heading` | A cool near-black used for headings and the outline-button border. |
| `--color-border-subtle` | `#f0efef` | `border-subtle` | Card internal rules (the stat row divider). |
| `--color-border-muted` | `#e0e0e0` | `border-muted` | General panel borders. |
| `--color-input-border` | `#ced4da` | `input-border` | Form input borders. |
| `--color-success` | `#2e6b4a` | `success` | Semantic success. |
| `--color-error` | `#a8402f` | `error` | Semantic error. This is the **only** legal red. |
| `--color-warning` | `#8a5a12` | `warning` | Semantic warning. This is the **only** legal amber. |
| `--color-info` | `#3a6a8a` | `info` | Semantic info. |

**Naming note, do not "fix" it.** The brand tokens are deliberately not named `primary`/`secondary`.
Tailwind would then generate `.text-primary`/`.text-secondary`, which collide with identically-named classes from other sources.

**Tinting rule.** Never bake alpha into a new hex.
Use Tailwind's `/` opacity modifier on the token: `bg-brand/10`, `text-ink/70`, `border-brand-secondary/8`, `text-white/55`.
For a shadow that must retheme, use `color-mix(in srgb, var(--color-brand) 55%, transparent)`.

## Font tokens

| Token | Value | Utility | Uses in `.tsx` |
| --- | --- | --- | --- |
| `--font-outfit` | `"Outfit", sans-serif` | `font-outfit` | 223 |
| `--font-poppins` | `"Poppins", sans-serif` | `font-poppins` | 144 |
| `--font-mont` | `"Montserrat", sans-serif` | `font-mont` | 5 |

Role assignment is in [03-typography.md](./03-typography.md).

## Font-size tokens

Tailwind v4 emits **font-size only** for a bare `--text-*` token (no paired `--text-*--line-height` is declared here).
A `text-body` element therefore has no line-height of its own and inherits or falls back to `normal`.
Pair it with an explicit `leading-*` whenever the text can wrap.

| Token | rem | px | Utility |
| --- | --- | --- | --- |
| `--text-caption` | `0.625rem` | **10px** | `text-caption` |
| `--text-body` | `0.9375rem` | **15px** | `text-body` |
| `--text-body-lg` | `1.0625rem` | **17px** | `text-body-lg` |

These three exist because 10px/15px/17px were repeated across the app as arbitrary brackets.

## Radius tokens

Named by literal px because none of the three land on Tailwind's default scale, and `md`/`lg`/`xl` are already used elsewhere with their real default meanings.

| Token | rem | px | Utility |
| --- | --- | --- | --- |
| `--radius-5px` | `0.3125rem` | **5px** | `rounded-5px` |
| `--radius-10px` | `0.625rem` | **10px** | `rounded-10px` |
| `--radius-15px` | `0.9375rem` | **15px** | `rounded-15px` |

Tailwind defaults still available and used: `rounded-xs` 2px, `rounded-sm` 4px, `rounded-md` 6px, `rounded-lg` 8px, `rounded-xl` 12px, `rounded-2xl` 16px, `rounded-3xl` 24px, `rounded-full` pill.

## Motion tokens

Tailwind v4 reads the `@keyframes` for an `--animate-*` token **out of the same `@theme` block**.
A `@keyframes` rule written outside `@theme` is not picked up.
Both halves must live together.

| Token | Value | Used by |
| --- | --- | --- |
| `--animate-pop-in` | `pop-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both` | Navbar mobile sheet, `Combobox` panel |
| `--animate-rise-in` | `rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both` | `SetupAside` |
| `--animate-aura` | `aura 18s ease-in-out infinite` | Setup left-panel decor (decorative loop) |
| `--animate-orbit` | `orbit 44s linear infinite` | Setup left-panel decor (decorative loop) |
| `--animate-question-in` | `question-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) both` | Setup wizard, forward entrance |
| `--animate-question-out` | `question-out 0.17s cubic-bezier(0.4, 0, 1, 1) both` | Setup wizard, forward exit |
| `--animate-question-in-back` | `question-in-back 0.42s cubic-bezier(0.16, 1, 0.3, 1) both` | Setup wizard, back entrance |
| `--animate-question-out-back` | `question-out-back 0.17s cubic-bezier(0.4, 0, 1, 1) both` | Setup wizard, back exit |

Keyframe geometry, the reduced-motion policy and the rule governing loops are in [07-motion.md](./07-motion.md).

## Custom variants (not breakpoints)

Declared with `@custom-variant`, **not** as `--breakpoint-*` tokens.

| Variant | Media query |
| --- | --- |
| `max-430px:` | `@media (width < 430px)` |
| `min-430px:` | `@media (width >= 430px)` |
| `max-500px:` | `@media (width < 500px)` |

They are `@custom-variant` on purpose.
Registering 430px/500px as real breakpoint tokens would also add those tiers to Tailwind's auto-generated `.container` utility, which `Landing.tsx` renders as a bare `container` class, shifting the hero's width in that range.
`@custom-variant` produces the identical media query without touching the breakpoint or container scale.

## Non-token globals in the same file

These are in `index.css` but outside `@theme`, so they generate no utility.

- `html { scroll-behavior: smooth }`.
- `body` font-family stack beginning `"Mulish"`, `-webkit-font-smoothing: antialiased`, `background-color: var(--color-surface)`, `overflow-x: hidden`. See [14-drift-register.md](./14-drift-register.md#d3) — Mulish is not loaded on most pages.
- Scrollbar: 1px wide, fully transparent thumb and track (`#e2695900`, `#ffffff00`). Effectively an invisible scrollbar.
- `code { font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace }`.
- Under `max-width: 430px`, `.aos-animate` has every transition, transform and animation forced off with `!important`.
