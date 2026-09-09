# 07 — Motion

## Policy

**The default is an entrance, never a loop.**
A permanently animating element on a page someone is trying to read is the difference between a site that feels alive and one that feels like a slot machine.

**Every transform-based effect is `motion-safe:`-prefixed** so `prefers-reduced-motion` drops it.
Write `motion-safe:animate-pop-in`, `motion-safe:hover:-translate-y-1`, `motion-safe:active:scale-97`.
Color transitions are not gated; they are not motion.

## The loop bar

There are exactly three looping animations in the app. A fourth must clear the same bar: **decorative, slow, low-contrast, off a reading surface, gone under reduced motion, never on a text node.**

1. Tailwind's own `animate-ping` on the 6px "Open source" dot in `OpenSource.tsx`.
2. `--animate-aura`, 18s, a slow bloom on the brand glow behind the setup panel's quotation mark.
3. `--animate-orbit`, 44s, one brand dot circling a faint ring anchored off the setup panel's bottom-left corner. It is the KarmaCircle read at panel scale: a point travelling a circle.

Both 2 and 3 are wired as `SplitPanelLayout`'s `asideDecor` from `SetupLayout.tsx`, sit behind the quote, and are anchored to the panel's corners well clear of the copy.

## Keyframes

All declared inside `@theme` in `index.css`, because Tailwind v4 resolves an `--animate-*` token's `@keyframes` out of that same block.

| Name | From | To |
| --- | --- | --- |
| `pop-in` | `opacity 0`, `scale(0.94) translateY(-8px)` | `opacity 1`, `scale(1) translateY(0)` |
| `rise-in` | `opacity 0`, `translateY(14px)` | `opacity 1`, `translateY(0)` |
| `aura` | 0%/100%: `opacity 0.4`, `scale(1)` | 50%: `opacity 0.72`, `scale(1.14) translate3d(4%, -3%, 0)` |
| `orbit` | — | `rotate(360deg)` |
| `question-in` | `opacity 0`, `translateY(38px)` | `opacity 1`, `translateY(0)` |
| `question-out` | `opacity 1`, `translateY(0)` | `opacity 0`, `translateY(-26px)` |
| `question-in-back` | `opacity 0`, `translateY(-38px)` | `opacity 1`, `translateY(0)` |
| `question-out-back` | `opacity 1`, `translateY(0)` | `opacity 0`, `translateY(26px)` |

### Why four question tokens, not two

Direction has to read correctly.
Moving forward, the answered question leaves **upward** and the next arrives from **below**; going back, both reverse.
A single pair would make "Back" look like another step forward, which is exactly the cue that tells someone whether they are progressing or retreating.

Exits are faster than entrances, **0.17s vs 0.42s**, so the flow never feels like it is waiting on itself; the leaving card is already gone while attention moves to what arrives.
Anything consuming these must keep its own JS timeout in step with the CSS duration.

## Easings and durations in use

| Easing | Where |
| --- | --- |
| `cubic-bezier(0.16, 1, 0.3, 1)` | Every entrance. The house ease-out. |
| `cubic-bezier(0.4, 0, 1, 1)` | Every exit. Ease-in. |
| `ease-out` | Hover transforms, card lift, arrow nudge |
| `ease-in-out` | `Button` variants, `BacktoTop`, nav scrim |
| `linear` | `orbit` |
| `"none"` (GSAP) | Every scrub-driven tween, so it tracks scroll exactly |
| `"power3.out"` (GSAP) | `DrivesRail` funding bars |

| Duration | Where |
| --- | --- |
| 200ms | Color transitions on links, filters, inputs, `Button` variants |
| 300ms | Card hover, dot scale, underline wipe, arrow nudge, nav scrim |
| 500ms | Card image `scale-105`, `BacktoTop` |
| 400ms | `CreateEvent` tile shadow |
| 1000ms | `.nav_dropdown` panel (`transition-all duration-1000`) |

## App-wide interaction conventions

| Gesture | Implementation |
| --- | --- |
| Button press | `motion-safe:active:scale-97`, on both `Button` variants |
| Card hover | `motion-safe:hover:-translate-y-1` + brand glow |
| Card image hover | `motion-safe:group-hover:scale-105`, 500ms |
| Nav link hover | Directional underline wipe: `after:origin-right after:scale-x-0` at rest, `hover:after:origin-left hover:after:scale-x-100`. It sweeps through rather than rubber-banding back. 1px, `bg-brand`, `after:-bottom-1.5` |
| Logo hover | The 8px brand dot scales to `1.25` on hover of the whole link, not of itself. An 8px hit target is not a hover affordance; the wordmark next to it is. Wordmark shifts to `text-brand` |
| Arrow hover | `motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5` |
| CTA hover | `hover:-translate-y-0.5` plus a deeper shadow |
| Caret hover | `group-hover:translate-y-0.5` |

Every one of these has a `motion-reduce:` counterpart where it is class-based rather than `motion-safe:`-gated (`motion-reduce:transition-none`, `motion-reduce:group-hover:transform-none`).

## The hooks

All in `apps/web/src/hooks/`, exported from the `@hooks` barrel.

### `useSectionReveal(scope, deps?)`

The app's one scroll entrance.
Everything tagged `data-reveal` inside `scope` fades and rises in, in source order, in batches, **once**.

Two details that must survive any edit:

1. It queries `scope.current.querySelectorAll`, **not** `gsap.utils.toArray`, which searches the whole document. Every scope shares the one `data-reveal` attribute, so `toArray` would make each scope animate every other scope's elements.
2. `once: true`. Replaying an entrance on every scroll-back reads as jitter and fights ScrollTrigger's refresh on resize.

**A scope containing async-loaded content needs a dependency array keyed on that data**, not the default `[]` (mount-only).
This has now caused the same bug twice: `OrganizationProfile.tsx` called it with no `deps` and its `data-reveal` elements stayed at their pre-animation opacity indefinitely.
`Organizations.tsx` and `Events.tsx` guard against it by keying on `[results.length, domain/cause]`; `OrganizationProfile.tsx` now keys on `[organization.userName]`.
Treat "content behind this scope arrives from an API" as a hard requirement for a dependency array.

Consumers: `HowItWorks`, `DrivesRail`, `OpenSource`, `Organizations`, `Events`, `OrganizationProfile`.
`OrganizationCard` and `EventCard` carry `data-reveal` and are inert unless an ancestor scopes the hook.

### `useMagnetic({ strength, max })`

Returns a ref; the element leans toward the cursor while hovered and springs back on leave.
Gated to `(hover: hover) and (pointer: fine)` and off under reduced motion, because on a phone `pointermove` fires from a tap and would leave the element permanently offset.
Writes through `gsap.quickTo`, so there is no React state at pointer-event frequency.

**It owns the element's `transform`.**
An inline transform beats a class, so a magnetic element must not also carry `hover:-translate-*` or `active:scale-*`; those would silently do nothing.
Express press and hover feedback in **color** on magnetic elements.
Used by `OpenSource.tsx`'s primary CTA.

### `useReducedMotion()`

Reactive `prefers-reduced-motion` as state, for components that must *render* differently rather than branch inside a `useGSAP` body.

## Scroll infrastructure

### `SmoothScroll.tsx`

Mounts `lenis/react`'s `ReactLenis` with `root: true`, once, wrapped around the whole app in `App.tsx`.
It drives the real `window` scroll with eased deltas, so nothing that reads `window.scrollY` or listens for `"scroll"` needs to change.
Any component reaches the shared instance with `useLenis()` without being a descendant.

Options are exactly `{ autoRaf: false, lerp: 0.12 }`.
**Do not add `duration`.**
Lenis's `Animate.advance()` checks `if (this.duration && this.easing)` *before* `else if (this.lerp)`, and the constructor auto-assigns a default `easing` the moment `duration` is a number with no custom easing.
The previous `{ lerp: 0.1, duration: 1.2 }` therefore ran a full 1.2s duration-eased scroll on every wheel input, and `lerp: 0.1` was dead configuration.

Skipped entirely under `prefers-reduced-motion` **and** under a coarse/touch pointer.
The touch skip is not about touch momentum (Lenis's `syncTouch` defaults to `false` and is never set here, so touchmove already passed through untouched).
What it removes is the overhead riding along regardless: a rAF loop, a `ScrollTrigger.update()` per tick, and a pointerdown listener, competing with several `scrub: true` ScrollTriggers for the same frames on a phone's CPU.

`SmoothScroll.tsx` also registers `ScrollTrigger` **globally, once**.
No other file needs `gsap.registerPlugin(ScrollTrigger)`.
It bridges GSAP's ticker to Lenis's `raf()` and forwards every Lenis tick to `ScrollTrigger.update()`, so `scrub: true` tweens track the smoothed position.
It calls `gsap.ticker.lagSmoothing(0)`, which switches off GSAP's own delta clamping **globally**; any ticker consumer must clamp its own delta (`DrivesRail` clamps to 50ms, or the first frame after a background tab carries the whole hidden duration as one delta).

### `ScrollProgress.tsx`

A 2px brand rule across the top of the window that fills as the page scrolls.
Mounted once in `App.tsx`, **outside the router**, so it survives navigation.

```
pointer-events-none fixed inset-x-0 top-0 z-999 h-0.5 origin-left scale-x-0
bg-gradient-to-r from-brand to-brand-hover
```

Driven by a `ScrollTrigger` on `document.documentElement`, not a `window.scrollY` listener, because the app's real scroll position is Lenis's eased one and a raw listener visibly runs ahead of the page it describes.
`scrub: 0.2` rather than `true` gives a small trailing ease.
`aria-hidden`. Under reduced motion it simply never animates, staying at zero width, rather than being parked at a static fill describing a scroll position nobody is at.

## Removed, do not reintroduce

`three` and `@react-three/fiber` were removed from `apps/web` in August 2026.
Their only consumer was `HeroScene.tsx`, now pure CSS `linear-gradient` background images.
The canvas was dropped because it did not paint until the visitor scrolled (a WebGL canvas carrying the hero's `mask-image` is its own composited layer, and the first composite could land without its first frame) and because a `lineBasicMaterial` hairline is one *device* pixel, making its opacity impossible to tune between invisible and too loud.
**Do not reintroduce a 3D dependency for a decorative background.**
