# 05 — Responsive

## Mandatory

Every new or changed UI component in `apps/web` must work cleanly from **~320px** through large desktop and 4K/5K.
This applies to every agent and model working in this repo.

**Build mobile-first, then verify wide.**
Shrinking a desktop layout down hides the cases that only appear at 320-375px: columns that no longer fit side by side, padding that reads as cramped, text that wraps badly.

For very large screens, cap content width with a centered container (`mx-auto` plus a `max-w-*`).
That alone covers 4K/5K in most cases without extra breakpoints.

## Breakpoints in use

| Variant | Query | Occurrences in `.tsx` | Source |
| --- | --- | --- | --- |
| `sm:` | `>= 640px` | 180 | Tailwind default |
| `lg:` | `>= 1024px` | 82 | Tailwind default |
| `xl:` | `>= 1280px` | 2 | Tailwind default |
| `md:` | `>= 768px` | 0 | Tailwind default, unused |
| `max-500px:` | `< 500px` | 86 | `@custom-variant` |
| `max-430px:` | `< 430px` | 32 | `@custom-variant` |
| `min-430px:` | `>= 430px` | 1 | `@custom-variant` |
| `max-[540px]:` | `< 540px` | 20 | arbitrary |
| `max-[991px]:` | `< 991px` | 14 | arbitrary |
| `max-[525px]:` | `< 525px` | 11 | arbitrary |
| `min-[900px]:` | `>= 900px` | 5 | arbitrary |
| `max-[767px]:` | `< 767px` | 2 | arbitrary |

**Prefer `sm:` and `lg:` in new code.**
The arbitrary tiers (`540`, `991`, `525`, `767`) are legacy and each exists in exactly one component family.
`900px` is meaningful: it is where `SplitPanelLayout` drops its left panel, and it is deliberately not a token for the same reason 430/500 are not (see [01-tokens.md](./01-tokens.md#custom-variants-not-breakpoints)).

Two components additionally branch in **JavaScript** on `window.innerWidth`, re-measured on `resize`:

- [Navbar.tsx:50,111](../../../apps/web/src/components/Navbar.tsx#L111) — desktop nav renders only above 900px.
- [Footer.tsx:30,78](../../../apps/web/src/components/footer/Footer.tsx#L78) — parallax gated to `matchMedia("(min-width: 1024px)")`.
- [Header.tsx:39](../../../apps/web/src/components/header/Header.tsx#L39) reads `window.innerWidth < 800` **once at render, with no resize listener**. It does not react to a resize. Do not copy this.

## Alignment

**Default to left-aligned text and controls on mobile, not centered.**
This matches GitHub, Stripe, Vercel, Airbnb and Apple.
Centered text is harder to scan because the eye has to re-find the start of each ragged line.
Centering is reserved for short hero and marketing taglines, never for footers, forms or lists.

Left-aligned content sits flush against the container edge with no auto-margin illusion of breathing room, so give it **real** horizontal padding.
Do not reuse a padding value tuned for a centered layout.
The standard is `px-9` (36px).

Concrete examples of the rule applied: `Header.tsx` flips `text-center` to `max-500px:text-left`; `Landing.tsx`'s hero flips to `max-500px:text-start`.

## Length and hierarchy on mobile

Stacking every section vertically on a narrow screen turns a component that reads fine on desktop into something long and undifferentiated.

- Tighten vertical padding and gaps at the mobile breakpoint rather than reusing desktop spacing.
- Use a divider, spacing, or typographic weight to give a long mobile stack visible structure.

`Footer.tsx:199` is the reference: `border-t border-white/5 pt-8 ... lg:border-none lg:pt-0`.
The hairline exists only below `lg`, where the brand block and the link columns sit in one stack; above `lg` they are already side by side and the divider would be redundant.

## Horizontal overflow

A filter row that would wrap into four rows above the fold should scroll horizontally instead.
`DirectoryToolbar` does this with a full-bleed negative margin matched to the page padding:

```
-mx-9 flex gap-6 overflow-x-auto px-9 pb-1
sm:mx-0 sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:px-0
[&::-webkit-scrollbar]:hidden
```

The `-mx-9` must always equal the page's mobile `px-9`.
If the page padding changes, this changes with it.

`body` carries `overflow-x: hidden` twice in `index.css`; that is a safety net, not a licence to overflow.

## Scroll-linked and transform effects

The same `yPercent` or translate value covers a much larger share of a much shorter viewport.
A parallax tuned on desktop will visibly eat into padding or margins on a phone as the page scrolls.

**Either gate the effect to larger breakpoints, or verify its extremes (0% and 100% scroll progress) against nearby content on a small viewport.**

`Footer.tsx` is the worked example.
Its parallax is gated to `min-width: 1024px` and, on falling out of that gate, explicitly calls `gsap.set([...], { clearProps: "transform" })` rather than trusting `useGSAP`'s automatic revert.
A scrub tween's inline transform was verified in-browser to survive that revert on a desktop-to-mobile resize with no reload, which is exactly the bug the gate exists to prevent, reintroduced through the resize path.

The `useGSAP` dependency array must be keyed on `windowWidth` state for the gate to be reactive at all; a page that mounted wide, or a DevTools resize with no reload, would otherwise keep the effect active at a width where it should be off.

## Component-level responsive behavior, at a glance

| Component | Below | Above |
| --- | --- | --- |
| `Navbar` | < 900px: links hidden; hamburger (logged out) or avatar (logged in) at `max-430px:block`; full-screen sheet | >= 900px: inline links, dropdown |
| `SplitPanelLayout` | < 900px: left panel not rendered at all; wordmark moves inline above the form | >= 900px: sticky 44% left panel, `top-0`, `h-screen` |
| `Footer` | stacked, `px-9 py-10`, divider between brand and links, no parallax | `lg:flex-row`, `lg:px-12 lg:py-16`, parallax on |
| `DirectoryToolbar` | search field then button stacked; filters scroll horizontally; count on its own row | `sm:flex-row`, filters wrap, count shares the filter row |
| Cards | `p-4`, `text-body-lg` title | `sm:p-5`, `sm:text-lg` title |
| `Modal` | `max-[525px]:w-[89vw] min-w-55 text-center` | `w-[30vw] min-w-125` |
| `BacktoTop` | `max-500px:` 32px at 24px inset | 40px at 30px inset |
