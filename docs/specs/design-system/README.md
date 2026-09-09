# KarmaCircle Design System — root index

This directory is the machine-readable design system for `apps/web`.
It is written for an AI agent first and a human second: every value is stated as a literal, every literal names the file and line it came from, and every rule is phrased as a decision an agent can execute without asking.

Scope: `apps/web` only.
`apps/api` has no UI surface; see [apps/api/docs/specs/README.md](../../../apps/api/docs/specs/README.md).

## How an agent must use this directory

**Resolution order.** When you need a value (a color, a size, a radius, a shadow, a component), resolve it in this order and stop at the first hit:

1. An existing **shared component** that already does the job — [08-components-shared.md](./08-components-shared.md).
2. An existing **canonical pattern/recipe** — [10-patterns.md](./10-patterns.md).
3. An existing **design token** (`@theme` in `apps/web/src/styles/index.css`) — [01-tokens.md](./01-tokens.md).
4. A **Tailwind default-scale** utility that is an exact match (`gray-500`, `rounded-2xl`, `text-sm`) — [02-color.md](./02-color.md), [03-typography.md](./03-typography.md).
5. Only then an arbitrary value (`bg-[#...]`, `text-[13px]`).

Reaching step 5 is a signal, not a licence.
If the same arbitrary value would then exist in two places, stop and add a token at step 3 instead.

**Never do these.** Each has already caused a real bug in this repo; the incident is recorded in [14-drift-register.md](./14-drift-register.md).

- Never write a raw brand hex (`#a8623e`, `rgba(168,98,62,...)`). Use `var(--color-brand)` or `color-mix(in srgb, var(--color-brand) N%, transparent)`.
- Never write a raw status color (`text-red-600`, `bg-amber-500`). Use `text-error` / `text-warning` / `text-success` / `text-info`.
- Never write `leading-<decimal>` for a unitless ratio. See [03-typography.md](./03-typography.md#leading-is-a-trap).
- Never write a hand-authored global CSS rule outside `@layer`. See [04-spacing-layout.md](./04-spacing-layout.md#the-cascade-rule).
- Never render `<Button>` with no `className`. It ships no shape. See [08-components-shared.md](./08-components-shared.md#button).
- Never add a looping animation on or near a reading surface. See [07-motion.md](./07-motion.md#the-loop-bar).
- Never center body text, footers, forms, or lists on mobile. See [05-responsive.md](./05-responsive.md#alignment).

## The single source of truth

Every token in this directory is generated from **one block**: the `@theme { ... }` block in [apps/web/src/styles/index.css](../../../apps/web/src/styles/index.css).
Editing that block rethemes the whole app.
Nothing else is authoritative; this directory is a description of it plus the usage conventions built around it, and it is expected to be updated in the same commit as any change to that block.

There is a second, unenforced copy of the tokens in the standalone `karmacircleCommunity/karmacircle-brand` repo (rendered at `brand.karmacircle.org`).
It is a **manual** copy.
Changing a token here does not change it there.
`/brand` in this app is a redirect to that site, not a page ([app/routes/routesConfig.tsx:45](../../../apps/web/src/app/routes/routesConfig.tsx#L45)).

## File map

| File | Answers |
| --- | --- |
| [01-tokens.md](./01-tokens.md) | Every `@theme` token, its literal value, its generated utilities, its computed px. |
| [02-color.md](./02-color.md) | Every hex in the repository, where it is used, whether it is legal, contrast data, alpha conventions. |
| [03-typography.md](./03-typography.md) | Fonts, which faces are loaded, the full size ramp in px, weights, line-height, letter-spacing, per-role type recipes. |
| [04-spacing-layout.md](./04-spacing-layout.md) | The 4px spacing grid, page shells, containers, max-widths, the `.container` cascade trap. |
| [05-responsive.md](./05-responsive.md) | Every breakpoint in use with its px value and occurrence count, mobile-first rules, the `px-9` padding standard. |
| [06-radius-elevation.md](./06-radius-elevation.md) | Radius scale, the full shadow inventory, borders, z-index ladder. |
| [07-motion.md](./07-motion.md) | Keyframes, durations, easings, the motion hooks, reduced-motion policy, the loop bar. |
| [08-components-shared.md](./08-components-shared.md) | Pixel spec + props for every component in `src/components/`. |
| [09-components-feature.md](./09-components-feature.md) | Pixel spec for the reusable feature-level components (cards, auth kit, setup kit). |
| [10-patterns.md](./10-patterns.md) | Copy-paste canonical recipes: eyebrow, section header, primary CTA, form field, card, empty state. |
| [11-assets-logo.md](./11-assets-logo.md) | Every asset file, the logo/wordmark construction, favicons, PWA icons, image conventions. |
| [12-feedback.md](./12-feedback.md) | Toasts, loading, validation errors, offline behavior. |
| [13-views.md](./13-views.md) | Every route, which shell it uses, which chrome it renders. |
| [14-drift-register.md](./14-drift-register.md) | Known deviations from this system that still exist in the code, with file and line. |

## Stack facts an agent needs before editing any style

- **Tailwind CSS v4** via `@tailwindcss/vite`. There is **no `tailwind.config.js`**; configuration is the `@theme` block in `src/styles/index.css`.
- `--spacing` is Tailwind's default `0.25rem`. Every numeric spacing utility is `n * 4px`. `p-3.75` is 15px, `size-7.5` is 30px.
- Tailwind's class scanner only sees **literal strings in source**. A class built by string concatenation at runtime will not be generated. That is why react-select, MUI and the signup toggle are hand-written global CSS ([04-spacing-layout.md](./04-spacing-layout.md#what-cannot-be-tailwind)).
- No `.scss` and no CSS Modules remain. Two `.css` files remain inside features (`Donate.css`, `UserProfile.css`) plus the two in `src/styles/`.
- `styled-components` and `@emotion/styled` are installed transitively by MUI. **No component authors CSS-in-JS.** Do not start.

## Change protocol

A change to any value in this directory is not finished until:

1. The `@theme` block (or the component) is edited.
2. The corresponding file here is edited **in the same commit**.
3. If the change touches a `known-issues.md` entry or an item in [14-drift-register.md](./14-drift-register.md), that entry is removed or updated in the same commit.
4. If the change touches a brand token (color, font, radius), the `karmacircle-brand` repo is flagged as out of sync, because nothing enforces it.
