# Landing & Home

The marketing/logged-out-friendly home experience, routed at `/`.

## `Home.tsx`

[apps/web/src/features/landing-home/pages/Home.tsx](../../apps/web/src/features/landing-home/pages/Home.tsx).
Sets page `<title>`/meta via `<Helmet>`, scrolls to top on mount, and — if `Cookies.get("OAuthLoginInitiated")` is set — completes the Google OAuth flow by calling `successCallback()` and dispatching the result into Redux (see [authentication.md](./authentication.md)).
Renders `<Landing />`, then the three marketing sections added in August 2026 — `<HowItWorks />`, `<DrivesRail />`, `<OpenSource />` — then `<Footer />`.
Renders only the sections above — there used to be a fourth marketing section (`MilanInfoBanner`), but it was dead code (never mounted anywhere) and was deleted; see [known-issues.md](./known-issues.md).

## `Landing.tsx`

[apps/web/src/features/landing-home/components/Landing.tsx](../../apps/web/src/features/landing-home/components/Landing.tsx).
The hero section: `<Navbar />`, a headline that changes copy/wrapping at the `430px` breakpoint (tracked via a `window.resize` listener and local `windowWidth` state, not CSS media queries), and a CTA button that reads `isLoggedIn` from Redux (`selectIsLoggedIn`) to decide between "Sign up Today!" (`/auth/signup`) and "Explore our organizations" (`/organizations`).
Below the CTA, a static "Trusted by 300+ users" block with four hardcoded GitHub-avatar images (now bundled local assets under `apps/web/src/assets/avatars/`, not hotlinked to `avatars.githubusercontent.com`) — not derived from any real user/follower data.

Redesigned August 2026 (lighter typography, the site's new muted-clay brand color — see [ui-kit.md](./ui-kit.md) — and the app's new Lenis/GSAP animation infra, also documented there): the old static `Vector.png` background is gone, replaced by `HeroScene.tsx`, a lazy-loaded static line grid (a same-day iteration replaced an initial random-particle-field version — see the feature's own `SPEC.md`).
That grid was a three.js/`@react-three/fiber` canvas until late August 2026, when it was rewritten as two `linear-gradient` background images on a plain `<div>`.
The canvas had two problems: it didn't paint until the visitor scrolled down and back up (a WebGL canvas that also carries the `mask-image` becomes its own composited layer, and the first composite could land without the canvas' first frame), and its alpha was untunable — a `lineBasicMaterial` line is one *device* pixel wide (`linewidth` is a no-op in browsers), so it went from invisible at `0.08` straight to too prominent at `0.16`.
The CSS version is a crisp full-pixel line at `rgba(56,44,36,0.04)` on a 72px cell, deliberately barely visible: its whole job is to keep the hero from feeling empty.
Removing the canvas dropped `three`/`@react-three/fiber`/`@types/three` (~230KB gzipped) from `apps/web` entirely, and replaced the camera parallax with a small rAF-eased translate on the grid layer, skipped under `prefers-reduced-motion` or a coarse pointer.
The heading/paragraph/CTA fade in on mount and the whole hero block parallaxes on scroll, both via `@gsap/react`'s `useGSAP` + `ScrollTrigger`, skipped under `prefers-reduced-motion`.
The `--landing-accent`/`--auth-accent`-style local color override this page used to carry is gone too — it now just uses the site-wide `--color-brand` tokens directly, since they're no longer the orange it was scoped away from.

**Mobile alignment (fixed August 2026):** below the `max-500px` breakpoint the heading/paragraph/CTA switch from centered to left-aligned (`text-center` → `text-start`), but the two flex wrappers around them (the hero container and its inner `z-1` div) kept `items-center`. Since `items-center` centers each flex child as its *own* box, and the `<h1>`s had no explicit width while the paragraph and CTA row did (`max-500px:w-full`), the heading's box shrank to its own content width and got centered, while the paragraph/CTA sat flush against the true left edge — two different left edges on the same screen. Fixed with `max-500px:items-start` on both wrappers plus `max-500px:w-full` on the `<h1>`s, so every child spans the same width and `text-start` lines them all up against one edge.

**Mobile padding (fixed August 2026, same pass):** the outer hero div carries the legacy Bootstrap-replica `.container` class ([ui-kit.md](./ui-kit.md) / [index.css](../../apps/web/src/styles/index.css) has the full story) *and* a Tailwind `max-500px:px-*` utility for extra mobile breathing room — the utility was silently losing. `.container` was written outside any `@layer` block, and an unlayered CSS rule always outranks a layered one (Tailwind's own utilities live in `@layer utilities`) regardless of selector specificity or source order — so `.container`'s own `padding: 0.75rem` (12px) was winning no matter what padding utility sat next to it in the `className`. The hero's real mobile padding was pinned at 12px while `Footer.tsx` (which doesn't use `.container`) sat at 40px (`px-10`) — the exact left/right mismatch between hero and footer this was written up to fix. Fixed at the source: `.container` now lives inside `@layer base` in `index.css`, so a Tailwind utility on the element wins again as expected. `Landing.tsx`'s hero also moved from `max-500px:px-4` to match `Footer.tsx`'s mobile padding scale — both landed on `px-10` (40px) briefly, then `px-9` (36px) on direct feedback that 40px read as too much. `Donate.tsx` doesn't pair `.container` with any padding utility, so this change doesn't affect its rendering.

## The three marketing sections (added August 2026)

Everything between the hero and the footer. All three are static content — none of them fetch — with their copy/data living in [`constants/landingContent.ts`](../../apps/web/src/features/landing-home/constants/landingContent.ts) rather than inline in the JSX, the same split `Footer.tsx`/`footerLinksConfig.ts` already uses.
All three share one entrance animation via the [`useSectionReveal`](../../apps/web/src/features/landing-home/hooks/useSectionReveal.ts) hook: anything tagged `data-reveal` fades and rises in on first entry (`ScrollTrigger.batch`, `once: true`), and is set straight to its final state under `prefers-reduced-motion`.
The hook collects its targets with `scope.current.querySelectorAll`, **not** `gsap.utils.toArray` — `useGSAP`'s scope only rewrites selector strings passed to gsap methods, so `toArray("[data-reveal]")` would query the whole document and make each section animate the other two sections' elements as well.

### `HowItWorks.tsx`

A four-step walkthrough of what actually happens when a drive is posted (post → discovered → funded → reported back), driven by the `drivePlaybook` array.
One column on mobile; from `lg` up it splits into a `sticky` intro column and a scrolling step list.
The vertical rail down the left of the steps is a genuine progress indicator — a `scrub`bed `scaleY` on a 1px element tied to the list's own scroll range, so it tracks Lenis's eased scroll position like the hero parallax does. Unlike `Footer.tsx`'s parallax it runs at *every* breakpoint, which is safe here precisely because it scales a dedicated rail rather than translating a content block, so it can't drift into anyone's padding on a short viewport.

### `DrivesRail.tsx`

A **self-scrolling marquee** of drive cards (cover photo, category, title, organizer, summary, location, days left, funding progress, supporters) from the `sampleDrives` array.

**Card anatomy — a social-feed post, not a poster.**
Each card leads with a 16:9 cover photo carrying the category as a small uppercase label over a bottom scrim, then a one-line title (`truncate`), the organizer, and a two-line summary (`line-clamp-2` on a `min-h-11` box so every card is the same height whatever the copy does), then the meta row, the funding bar, and the raised/goal + supporters line.
That shape replaced a taller card that led with a decorative CSS graph-paper band, a category pill on its own row, and an unclamped three-line summary — it read as unusually tall and visually undifferentiated next to its neighbours (direct feedback).
The covers are real files in `apps/web/src/assets/pictures/drives/` (900x506 CC0 photos, imported so Vite fingerprints them), standing in for the image an organization would upload with its own drive; `SampleDrive.cover`/`coverAlt` are the fields a real endpoint would fill.
The titles and summaries in `landingContent.ts` are written to fit one and two lines respectively — the clamps are a guard, not the plan, so keep new copy short rather than relying on the ellipsis.

**The cards are illustrative sample content, not live data** — there is no public "list drives/events" endpoint in `KarmaCircleApi.ts`/`ApiEndpoints.ts` (the same gap that leaves `Organizations.tsx`/`Events.tsx` on hardcoded arrays — see [known-issues.md](./known-issues.md)), and the section's own on-page copy says as much rather than implying a live feed. The card shape is deliberately the shape of a real drive record, so wiring this to a real endpoint later should be a `useSWR` swap, not a rewrite.
It drifts on its own at 32px/s so nobody has to work a horizontal scrollbar to see what's on the platform (direct feedback — an earlier arrow-button version put that burden on the visitor, and the buttons read as imported furniture next to the rest of the site; they're gone).

**The drift advances the container's native `scrollLeft` from GSAP's ticker — it does not translate a track with `transform`.** That's the whole design: swipe on a phone and trackpad-scroll on a laptop keep working with real momentum because nothing is faked, the container stays focusable and arrow-key scrollable, and the drift resumes from wherever the visitor left it (its own position re-syncs from `scrollLeft` every frame it isn't driving). It pauses on hover and focus, and pauses for `RESUME_DELAY_MS` after a wheel/touch nudge. It's deliberately **not** a GSAP-pinned horizontal scroll-jack.

Two details that are easy to get wrong and were both hit in the first pass:

- **The card list is rendered twice and the wrap distance is measured from the DOM** (`[data-loop-start]`'s `offsetLeft` minus the first card's), *not* `scrollWidth / 2`. Those aren't the same number — the scroller's horizontal padding is inside `scrollWidth` but outside the repeating pattern, and the pattern has one fewer gap than cards. Measured in-browser at 1440px: `scrollWidth / 2` is `1738` where the true loop is `1700`, i.e. a 38px jump every lap. Re-measured on `resize`.
- **The per-frame delta is clamped to 50ms**, because `SmoothScroll.tsx` calls `gsap.ticker.lagSmoothing(0)` for the Lenis bridge, which disables GSAP's own delta clamping globally. Without the clamp, the first frame after the tab returns from the background carries the whole hidden duration and the rail teleports.

The wrap is only applied while the drift is *running*: writing `scrollLeft` mid-gesture cancels momentum scrolling on iOS, so a paused rail is left alone. Under `prefers-reduced-motion` there's no drift at all — just a plain scroller.

The row is full-bleed on purpose (it should read as a band passing through the page, not a box overflowing one), with a `mask-image` fade at both edges so cards dissolve into the section background instead of being cut off by it — that fade is what makes the overflow read as deliberate. Each funding bar is a real `role="progressbar"`, and the bars fill via `scaleX` (composited) rather than `width` (layout), since the row is already moving every frame.

**Section colour:** `bg-surface-warm`, not the cool gray `bg-surface-muted` this first shipped with — a `#f5f7f7` band next to the `#fffcf7` page cream reads as a different website (direct feedback). `--color-surface` / `--color-surface-warm` were added to `index.css`'s `@theme` in the same pass; `body` and the step badges in `HowItWorks.tsx` now use the token instead of a literal `#fffcf7`.

### `OpenSource.tsx`

The closing section: "Built in the open, by the people using it."

**This slot has been rewritten three times — read this before growing it back.**
Draft one led with a pull-request joke (pulled: most of this audience isn't technical).
Draft two was three equal tiles reading `0% / MIT / Anyone` (pulled: "plain text in a black box").
Draft three was a full transparency bento: a "you give ₹1,000, the drive gets ₹1,000" headline, animated comparison bars against an illustrative (deliberately unnamed) competitor tip, a worked receipt tile, three supporting tiles, and two CTAs.
Draft three was accurate and it was *too much* — a dense, figure-heavy argument in the last thing a visitor sees before the footer, on a page that has already made its case three sections earlier. Cut in August 2026 on direct feedback.

What survived the cut, and where it went:

- **The 0%-cut promise is still on the page**, as step 03's `meta` in `drivePlaybook` ("0% platform fee") inside `HowItWorks.tsx`. It did not need a section of its own — and the research behind draft three still holds, so if it ever gets one again, remember that a 0% fee is table stakes in this market (Ketto, Milaap and ImpactGuru all advertise one and monetise through a checkout tip prompt or their share of payment processing; GoFundMe's model is 0% plus a pre-checked donor tip), which is exactly why asserting it reads as filler.
- **The comparison figures, the receipt, and the `moneySplit`/`receiptLines`/`pledgeTiles` content are gone** from `landingContent.ts`, along with `MoneySplitRow`/`ReceiptLine`/`PledgeTile` from the feature's `types/`. Nothing else referenced them.

What's there now is the one claim with no other home on the page: this is a community project, it's open, and you can join it. Contents: an "Open source" badge (with the same brand dot the navbar logo uses, `animate-ping`ing at 6px), a two-line headline, one short paragraph, three `contributeWays` entries — build / shape / pass it on, two of the three deliberately not about code — and two CTAs pointing at GitHub's own `/contribute` page and the repo root.

Rendered as a **dark inset card on the cream page background**, not a full-bleed dark band — `Footer.tsx` is already `bg-surface-dark`, so full-bleed here would merge the two into one undifferentiated slab; the cream gutter keeps them legible as separate sections.

**Movement:** the card eases in on a scrubbed `scale`/`yPercent` as it approaches and a warm brand glow behind it fades up over the cream. The primary CTA is magnetic (`useMagnetic` — see [ui-kit.md](./ui-kit.md#motion)), and each contribute row's icon tips and scales on hover. Draft three's `lg`-gated inner parallax (copy and grid drifting at different rates) went with draft three: that effect needs a tall block to travel through, and this section is no longer one.

## Types

This entire folder is TypeScript. See [landing-home/SPEC.md](../../apps/web/src/features/landing-home/SPEC.md#types) for the full breakdown.
