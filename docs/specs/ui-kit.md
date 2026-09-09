# Shared UI Kit & Styling Conventions

**This file is now a map, not the reference.**
The full design system - every token, hex, font size, letter-spacing, radius, shadow, breakpoint, component pixel spec and canonical recipe - lives in [design-system/](./design-system/README.md), written to be read by an AI agent.

This file is kept because a dozen other specs link to its section anchors.
Each section below says what it used to hold and where that content now lives.
**Do not add new content here.** Add it to the corresponding file in `design-system/` so there is one source per fact.

Start at [design-system/README.md](./design-system/README.md), which carries the resolution order (shared component -> pattern -> token -> Tailwind default -> arbitrary value) and the hard "never do this" list.

## The design system, rendered

**[brand.karmacircle.org](https://brand.karmacircle.org)** renders the tokens: colors (click to copy hex), the font/type scale, radius tokens, and live component samples.
It is a separate repository, [karmacircleCommunity/karmacircle-brand](https://github.com/karmacircleCommunity/karmacircle-brand), not a route in this one.

It briefly was an in-app page (`apps/web/src/features/brand-kit`, September 2026) before being split out at the user's request, deployed to its own domain so its design and content can grow independently.
That in-app page is deleted; `/brand` here now redirects to the standalone site ([routesConfig.tsx](../../apps/web/src/app/routes/routesConfig.tsx)).

**Its tokens are a manual copy**, not an automated sync, of this app's `@theme` block.
If a brand color, font, or radius changes here, update it there too; nothing enforces the two staying identical.
Tracked as [D13](./design-system/14-drift-register.md#d13--the-karmacircle-brand-repo-is-a-manual-copy--open-structural).

## `Button`

Props, both variant class strings, the "ships no shape of its own" trap, the offline `to` fork, and the `motion-safe:active:scale-97` press: [design-system/08-components-shared.md#button](./design-system/08-components-shared.md#button).

## `AuthButton`

[apps/web/src/features/authentication/components/AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) - see [authentication.md](./authentication.md).
Built on top of `Button`, currently unused by the live auth pages.

## Toast

The four helpers, their offline and empty-message behavior, `BASE_OPTIONS`, and the full `:root:root` `--toastify-*` override block: [design-system/12-feedback.md](./design-system/12-feedback.md#toasts).
Call-site conventions: [api-integration.md](./api-integration.md#toast-conventions).

## `DirectoryToolbar`

Props, full geometry, and why the chrome is this light: [design-system/08-components-shared.md#directorytoolbar](./design-system/08-components-shared.md#directorytoolbar).

## `Combobox`

Props, the ARIA surface, and the five behaviors that must survive a rebuild: [design-system/08-components-shared.md#combobox](./design-system/08-components-shared.md#combobox).

## `SplitPanelLayout`

Props, `align` semantics, `asideDecor`, the 900px drop, and the panel geometry: [design-system/08-components-shared.md#splitpanellayout](./design-system/08-components-shared.md#splitpanellayout).

## Card components

The one shared card skeleton and what each of the three surfaces adds to it, plus the standardised hover: [design-system/09-components-feature.md#one-card-three-surfaces](./design-system/09-components-feature.md#one-card-three-surfaces).

- `OrganizationCard` - see also [organizations.md](./organizations.md).
- `EventCard`, `EventsMarqueeCards` - see also [events.md](./events.md). (`EventSlider`/`FeaturedEventCard`/`FeaturedEventImage` were deleted in the August 2026 events-directory rewrite.)

All card components are exported from [apps/web/src/components/index.ts](../../apps/web/src/components/index.ts); prefer the barrel.

## Styling conventions

- Tokens, their literal values and generated utilities: [design-system/01-tokens.md](./design-system/01-tokens.md).
- Every hex in the repo and where it is used: [design-system/02-color.md](./design-system/02-color.md).
- Fonts, the size ramp, weights, leading, tracking, and the `leading-<decimal>` trap: [design-system/03-typography.md](./design-system/03-typography.md).
- The spacing grid, page shells, `.container`, the cascade rule, and what cannot be Tailwind: [design-system/04-spacing-layout.md](./design-system/04-spacing-layout.md).
- Breakpoints and the mobile rules: [design-system/05-responsive.md](./design-system/05-responsive.md).
- Radius, shadows, borders, z-index: [design-system/06-radius-elevation.md](./design-system/06-radius-elevation.md).
- Copy-paste recipes and the anti-pattern table: [design-system/10-patterns.md](./design-system/10-patterns.md).

## Motion

Policy, the loop bar, keyframe geometry, easings and durations, the three hooks (`useSectionReveal`, `useMagnetic`, `useReducedMotion`) and `ScrollProgress`: [design-system/07-motion.md](./design-system/07-motion.md).

## Animation & scroll infra

Lenis configuration and why `duration` must stay off it, the GSAP bridge and its global `lagSmoothing(0)`, and why `three`/`@react-three/fiber` were removed and must not come back: [design-system/07-motion.md#scroll-infrastructure](./design-system/07-motion.md#scroll-infrastructure).
