# Landing & Home — Feature Spec

Colocated, implementation-level companion to [docs/specs/landing-home.md](../../../docs/specs/landing-home.md).
The smallest and least buggy feature folder in the app — worth reading anyway because `Home.tsx` is where the Google OAuth flow (started in the `authentication` feature) actually completes.

## What this feature is responsible for

The `/` route: the marketing hero (`Landing`), the three marketing sections below it (`HowItWorks`, `DrivesRail`, `OpenSource`, added August 2026), and finishing the Google OAuth handshake for any visitor who lands back on `/` with an `OAuthLoginInitiated` cookie set.
`MilanInfoBanner` is a finished second marketing section that lives here but is not currently mounted by `Home.tsx` — see below.

## Why it's shaped this way

Nothing in this folder does data fetching for its own content — it's a static marketing page — but `Home.tsx` doubles as the **landing pad for an external redirect flow** (Google OAuth), which is why it, alone among this feature's files, has a `useEffect` doing meaningful async work on mount. That responsibility living here (rather than in the `authentication` feature, which starts the OAuth flow) is a direct consequence of the backend always redirecting back to `/` after Google auth — see [authentication/SPEC.md](../authentication/SPEC.md) for the other half of this flow.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Home.tsx` | The `/` page — OAuth-completion effect + renders `Landing` + `Footer` | ✅ routed |
| `components/Landing.tsx` | The actual hero section | ✅ rendered by `Home.tsx` |
| `components/HeroScene.tsx` | three.js/`@react-three/fiber` line-grid background for the hero, lazy-loaded | ✅ rendered by `Landing.tsx` |
| `components/HowItWorks.tsx` | Four-step "how a drive happens" section, sticky-intro layout from `lg` | ✅ rendered by `Home.tsx` |
| `components/DrivesRail.tsx` | Horizontally-scrolled rail of **sample** drive cards | ✅ rendered by `Home.tsx` |
| `components/OpenSource.tsx` | Closing "built in the open, come contribute" dark inset band | ✅ rendered by `Home.tsx` |
| `constants/landingContent.ts` | All copy/data for the three sections above | ✅ imported by all three |
| `components/Milaninfobanner.tsx` | A second, finished marketing section | ❌ not mounted by `Home.tsx` or anywhere else |
| `components/MilanInfoBanner.css` | Styles for the above | ✅ imported by `Milaninfobanner.tsx` itself, but that component is unused |

## `pages/Home.tsx`

**`handleToken()`** — awaits `successCallback()` (`MilanApi.ts`, `GET /auth/login/success`, `withCredentials: true`). On `status === 200`: success toast, `dispatch(updateUserData(authData.data.user))` **then, as a second, separate dispatch**, `dispatch(toggleUserLogin())`. This is worth noting precisely because it's the one place in the app that sets `isLoggedIn` via `toggleUserLogin()` (a *flip*, not a *set*) rather than via `updateUserData({ ..., isLoggedIn: true })` (a merge) — see [state-management.md](../../../docs/specs/state-management.md). Because `toggleUserLogin` flips whatever `isLoggedIn` currently is, **this only produces the correct end state (`true`) if `isLoggedIn` was `false` going in** — which holds for the intended case (an anonymous visitor completing Google OAuth), but if `handleToken()` were ever called a second time for an already-logged-in session (e.g. the `OAuthLoginInitiated` cookie isn't cleared and somehow persists across a reload while already authenticated), this would flip `isLoggedIn` back to `false` instead of leaving it `true`. Not reachable through the current flow as far as this repo's code shows (nothing else in the frontend clears or re-checks `OAuthLoginInitiated`, and cookie-setting/clearing for it happens server-side, outside this repo), but worth knowing if you're debugging an "OAuth login appears to silently log the user back out" report.

**On failure:** `showErrorToast(authData?.message)` — note this reads `.message` directly off `authData`, not `authData?.data?.message` like the success path and most other call sites in the app; `successCallback()`'s own catch block returns the raw caught error object (`err`, not `err.response`) on failure, so `authData` here could be an Axios error object (which does have a top-level `.message`, e.g. `"Network Error"`) rather than a structured API response — consistent with its own implementation, just an easy detail to get wrong if you copy this pattern elsewhere expecting the usual `response?.data?.message` shape.

**`useEffect` (mount only):** `window.scrollTo(0, 0)` (unconditional, every visit to `/`), then `if (Cookies.get("OAuthLoginInitiated")) handleToken();`. **The cookie is never read again or cleared by this component** — clearing it (if it needs clearing at all) must happen server-side or elsewhere; nothing in this repo does it. If the cookie is ever left set indefinitely after a successful OAuth completion, every subsequent visit to `/` would re-trigger `handleToken()` — worth checking backend behavior before assuming a single successful completion is enough.

**Renders:** `<Helmet>` (title "KarmaCircle", static meta description, `canonical="/"`), `<Landing />`, `<Footer />`. **Does not render `<MilanInfoBanner />` or `<Navbar />` directly** — `Navbar` is rendered by `Landing.tsx` itself, one level down.

## `components/Landing.tsx` — the hero

**`windowWidth` state**, synced via a `resize` listener (cleaned up on unmount) — this is the one file in this feature that *does* track viewport width reactively in state, rather than reading `window.innerWidth` once per render (contrast with `Milaninfobanner.tsx` below).
Breakpoint: **430px**. Above it: two-line headline ("We connect NGOs," / "Charities and *you*.") and a longer paragraph. At or below it: a single-line headline and a shorter paragraph. Both variants are fully separate JSX blocks (not a single template with conditional line breaks), so if you're asked to tweak the copy, check both branches. Kept as-is in the August 2026 redesign below — only the styling/animation layer changed, not this data flow.

**CTA button:** reads `isLoggedIn` via `useSelector(selectIsLoggedIn)` (the Redux selector — "pattern 1" of the three login checks cataloged in [state-management.md](../../../docs/specs/state-management.md)) to decide between `to="/organizations"` ("Explore our organizations") for a logged-in visitor and `to="/auth/signup"` ("Sign up Today!") for an anonymous one. Uses the shared `Button` component's `to` prop correctly. Now relies on the shared `Button`'s own `solid` variant for background/hover color (`bg-brand`/`hover:bg-brand-hover`) instead of overriding it with a local `--landing-accent` CSS var, since the site-wide `--color-brand` token is what that var used to be scoped away from.

**"Trusted by 300+ users" block:** four avatar images — bundled local assets (`apps/web/src/assets/avatars/gh-*.jpg`, real GitHub user avatars saved to disk) rather than hotlinked `avatars.githubusercontent.com` URLs — and a static `"Trusted by 300+ users."` caption — **not derived from any real user/follower count**; there's no API call anywhere in this component. If asked to make this dynamic, there's no existing endpoint in `MilanApi.ts`/`ApiEndpoints.ts` that would supply a "total users" count — this would need a new backend endpoint, not just a frontend wiring fix (contrast with `Organizations.tsx`'s hardcoded list, which has a real fetcher — `getOrganizations()` — already waiting to be wired in).

**Animation (August 2026):** a `useGSAP` call (`@gsap/react`, scoped to the hero `<div>`, re-run when `windowWidth` crosses the 430px breakpoint since that swaps which JSX block — and which `data-hero-reveal` elements — are mounted) does two things, both skipped under `prefers-reduced-motion` (checked directly via `matchMedia` — this component doesn't go through a shared hook for it): a staggered fade/rise-in for every element tagged `data-hero-reveal` (the headline, paragraph, and CTA row) on mount, and a `scrollTrigger: { scrub: true }` tween that fades/lifts the whole hero block as the visitor scrolls past it. The scrub tracks Lenis's eased scroll position, not the raw native one — see [ui-kit.md](../../../docs/specs/ui-kit.md#animation--scroll-infra) for how `SmoothScroll.tsx` (mounted in `App.tsx`, not this file) wires GSAP's ticker to Lenis.

**Background:** `HeroScene.tsx` (three.js/`@react-three/fiber`, colocated in this folder) replaces the old static `Vector.png` — a static, axis-aligned line grid (graph paper, low opacity), masked with a radial-gradient CSS mask so it fades out toward the hero's edges instead of ending in a hard rectangle. The one piece of actual motion is a `PointerParallax` component that eases the camera toward the pointer position every frame — enough to read as depth on mouse move, not enough to make the grid itself look like it's moving. Imported via `React.lazy()`/`Suspense` (fallback `null`), not eagerly — three.js is the single heaviest dependency this redesign added (~230KB gzipped) and `routesConfig.tsx` doesn't route-split most pages, so an eager import would have put that weight on every route, not just `/`.

**Grid opacity — don't drop it back to 0.08.** As shipped, `lineBasicMaterial`'s `opacity` was `0.08` and the grid was reported as "not at all visible" (August 2026); it was never removed, it just never read. A WebGL grid loses contrast twice over in ways a CSS one doesn't: `lineBasicMaterial` draws exactly one **device** pixel (`linewidth` is a no-op in every browser on ANGLE/Metal), so on a 2x display each line is a half-CSS-pixel hairline, and `dpr={[1, 1.5]}` then has that hairline resampled up to the real display, softening it again. At `0.08` over the `#fffcf7` page that came to roughly a 6% luminance difference on a sub-pixel line. It's `0.16` now, which lands it about where `DrivesRail.tsx`'s CSS card grid (a crisp full-pixel line at `0.07` alpha) actually reads — the two are not comparable numbers. The hero's own CSS mask was widened in the same pass (`ellipse 70%/70%`, solid to `55%` → `ellipse 80%/75%`, solid to `60%`) so the grid isn't already half-faded by the middle of the hero. If it ever needs to be *more* visible than this, prefer raising `dpr` to `[1, 2]` (crisper lines) over pushing alpha higher — but weigh that against the phone-CPU argument in [ui-kit.md](../../../../docs/specs/ui-kit.md), since this canvas is full-bleed behind the hero.

**Not a particle field:** the first version of this component (same August 2026 redesign) rendered a field of randomly-scattered drifting points instead. Replaced same-day, on direct feedback that a random particle field reads as a generic stock effect ("particle effects are for noobs") where a static grid reads as structure/precision — closer to what the pre-redesign `Vector.png` (a literal grid image) was already doing right before it got recolored away. If asked to add more visual interest to this background, reach for something grid-consistent (denser lines, a second fainter grid layer, etc.) rather than reintroducing scattered/random points.

**Vertical centering:** the outer element is now `<div className="flex min-h-dvh flex-col">` with `<Navbar />` and the hero `<div>` as its two children, the hero one carrying `flex-1`. Previously the hero div alone was `min-h-[95dvh]` — since the sticky `Navbar` above it still occupies real space in normal flow, that flat percentage was short by however tall the navbar rendered, so the hero's own vertical center sat visibly below the page's actual center. `flex-1` fills exactly whatever's left after the navbar on any screen size, which is also why the `max-500px:min-h-[100dvh]` mobile-only patch is gone — it was compensating for the same bug.

**Navbar's "Sign Up" visibility:** the CTA/avatar row div carries a `ctaRowRef` (in addition to `data-hero-reveal`), which a `ScrollTrigger.create({ trigger: ctaRowRef.current, start: "top bottom", end: "bottom top", onToggle })` inside the same `useGSAP` call watches — `onToggle`'s `self.isActive` (true for as long as the row is anywhere on screen) drives a `heroCtaVisible` state var, passed down as `<Navbar hideSignUpForHeroCta={heroCtaVisible} />`. `Navbar.tsx` (see [layout-navigation.md](../../../docs/specs/layout-navigation.md#navbar)) has no scroll logic of its own for this — it just reads the prop. An earlier version used a `data-hero-cta` DOM attribute plus a raw `IntersectionObserver` living inside `Navbar.tsx` itself; that was replaced after it turned out to have a real bug (see `layout-navigation.md`'s "Known issues" for `Navbar`) in favor of reusing the same `ScrollTrigger` pipeline already proven working for the parallax above. Don't reintroduce the `document.querySelector`-based version.

## The three marketing sections (August 2026)

Full write-up in [docs/specs/landing-home.md](../../../docs/specs/landing-home.md#the-three-marketing-sections-added-august-2026); the implementation-level details worth knowing before editing them:

- **All copy and data lives in `constants/landingContent.ts`**, not inline in the JSX (`drivePlaybook`, `sampleDrives`, `pledgeStats`, `REPOSITORY_URL`) — copy edits shouldn't require reading JSX. Icons are stored *in* those records as `react-icons` component references (typed as `LandingIcon` in `types/types.ts`), destructured to a capitalised local (`const Icon = step.icon`) at render — JSX can't call a lowercase identifier as a component.
- **The entrance animation is `useSectionReveal`, and it no longer lives here.** It moved to `apps/web/src/hooks/useSectionReveal.ts` (exported from the `@hooks` barrel) once the rest of the app started using it — `Organizations.tsx` and `Events.tsx` now scope it to their card grids. Import it from `@hooks`; don't reintroduce a feature-local copy. It queries `scope.current.querySelectorAll("[data-reveal]")` rather than `gsap.utils.toArray("[data-reveal]")` on purpose: `useGSAP`'s scope only rewrites selector *strings passed to gsap methods*, so `toArray` would match every other scope's elements too. `once: true` — these are entrances, not scrubbed effects. See [ui-kit.md](../../../../docs/specs/ui-kit.md#motion) for the app's motion layer as a whole.
- **`DrivesRail.tsx`'s cards are sample data.** There's no public "list drives" endpoint (same gap as `Organizations.tsx`/`Events.tsx`), and the section says so on the page. When one exists, swap `sampleDrives` for a `useSWR` read — the `SampleDrive` interface is deliberately shaped like a real drive record.
- **`DrivesRail.tsx` is a marquee that drives native `scrollLeft`**, not a `transform`ed track and not a pinned scroll-jack — so swipe/trackpad/keyboard scrolling all keep working. Two things it must keep doing: measuring its wrap distance from `[data-loop-start]`'s `offsetLeft` (**not** `scrollWidth / 2` — padding and the missing last gap make those differ by 38px at desktop widths, i.e. a visible jump every lap), and clamping the ticker delta to 50ms (`SmoothScroll.tsx` disables GSAP's global delta clamping via `lagSmoothing(0)`, so a backgrounded tab would otherwise teleport the rail on return). It also only wraps while running, since writing `scrollLeft` mid-gesture kills iOS momentum.
- **`OpenSource.tsx` is deliberately small, and it used to be much bigger.** This slot held a full transparency bento: a "you give ₹1,000, the drive gets ₹1,000" headline, scroll-triggered comparison bars against an illustrative (deliberately unnamed) competitor tip, a worked receipt, and three supporting tiles. Cut in August 2026 on direct feedback that it was too much detail for the last thing before the footer. The 0%-cut promise was not dropped with it — it still reads on the page as step 03's `meta` in `drivePlaybook` ("0% platform fee") inside `HowItWorks.tsx`. What's left is the one claim with no other home on the page: KarmaCircle is a community project, it's open, and you can join it. If bars, receipts, money proportions or a competitor comparison reappear here, the old section is growing back — and the market research behind that version still holds, so read [landing-home.md](../../../../docs/specs/landing-home.md#opensourcetsx) before rebuilding any of it.
- **`OpenSource.tsx` is a dark *inset card*, not a full-bleed band** — `Footer.tsx` directly below it is already `bg-surface-dark`, and full-bleed would merge the two. Its GitHub CTAs are plain `<a>`s; `Button`'s `to` prop goes through react-router's `<Link>` and is for in-app paths only. It carries a scrubbed scale/lift + glow on approach; the `lg`-gated inner parallax the old version had went with the old content, since that effect needs a tall block to travel through and this one isn't one.
- **Keep `OpenSource.tsx`'s copy non-technical.** Its headline was once a pull-request joke; that was pulled because most visitors here aren't developers. Two of the three `contributeWays` entries are deliberately not about code for the same reason.
- **`OpenSource.tsx`'s primary CTA is magnetic** (`useMagnetic`, from `@hooks`), which is why it carries no `hover:-translate-*`: the hook writes an inline transform and a utility-class one would silently lose to it.
- **Colour:** landing bands use `bg-surface-warm`, never `bg-surface-muted` (`#f5f7f7`) — a cool gray next to the `#fffcf7` page cream reads as a different site. `--color-surface`/`--color-surface-warm` live in `index.css`'s `@theme`.
- **Responsive:** mobile-first, `px-9` horizontal padding (matching `Landing.tsx`/`Footer.tsx`), `mx-auto max-w-6xl` containers so 4K/5K screens cap line length, and tightened vertical rhythm on mobile (`py-16 sm:py-24 lg:py-28`+).

## `components/Milaninfobanner.tsx` — built, not mounted

Default export (no barrel file for it — imported directly by full path wherever it's used, which today is nowhere in the live app).

Three near-identical sections ("Collaborate.", "Connect.", "Build."), each pairing a static illustration (`MilanCollaborate.svg`/`MilanConnect.svg`/`MilanBuild.svg`) with marketing copy, using `aos` (Animate On Scroll) for fade-up entrance animation on desktop.

**Responsive copy pattern differs from `Landing.tsx`'s:** every breakpoint check here (`window.innerWidth > 800` for the `aos` attributes, `window.innerWidth < 800` for copy variants) reads `window.innerWidth` **directly at render time**, not from state — there is no `resize` listener anywhere in this component. This means the copy/animation-attribute choice is fixed to whatever the viewport width was on the render that mounted this component (or the most recent re-render triggered by something else, like a parent state change) and **will not update on window resize** unless some unrelated state change forces a re-render — the opposite of `Landing.tsx`'s pattern one file over. If you're asked to fix "the info banner doesn't adapt when I resize the window," this is why, and the fix is to adopt `Landing.tsx`'s `useState` + `resize`-listener pattern here too, for consistency.

**Minor content bugs, not previously documented:** the "Donate, for a cause!" section's sponsor link has `target="blank"` (missing the leading underscore) rather than `target="_blank"` — `"blank"` is treated as a literal named window/tab rather than the special always-new-tab keyword, so repeated clicks may reuse the same named tab instead of each opening a fresh one, depending on browser behavior; a few copy typos exist too ("tommorow" instead of "tomorrow," appearing twice; "Sponserships" instead of "Sponsorships"; "Veified" instead of "Verified" in the Connect section; "indiviual" instead of "individual") — cosmetic, but worth a pass if this component is ever wired back in and someone's doing a content review.

**If asked to "add the info banner back to the homepage"** — per [known-issues.md](../../../docs/specs/known-issues.md), this is the component to re-mount (`<Milaninfobanner />` between `<Landing />` and `<Footer />` in `Home.tsx` is the natural placement, matching its content's positioning relative to the hero), not rebuild from scratch. Fix the `target="blank"` typo and consider the resize-reactivity gap while you're in there, since both are trivial alongside a re-mount.

## Data flow summary

```
Home.tsx mount
   │  window.scrollTo(0,0)
   │  Cookies.get("OAuthLoginInitiated") present?
   │       │ yes
   │       ▼
   │  successCallback()   [MilanApi.ts, GET /auth/login/success]
   │       │ status 200
   │       ▼
   │  dispatch(updateUserData(user)) → dispatch(toggleUserLogin())   [two separate dispatches]
   ▼
renders <Landing /> (reads Redux isLoggedIn for its own CTA) + <Footer />
```

## Types

This folder is TypeScript now — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern.
`types/index.ts` holds `OAuthSuccessResponse` — the one non-trivial shape in this feature, since `successCallback()`'s own catch block returns the raw caught error rather than `error.response` (see above), so the type has to accommodate both a `data.message` (success) and a bare `message` (failure) shape rather than picking one.
Added `@types/aos` as a dev dependency, since the `aos` package ships no types of its own and `Milaninfobanner.tsx` imports it directly.

## Known issues specific to this feature

- `MilanInfoBanner` is fully built but not mounted anywhere — already in `known-issues.md`. The three new sections cover the same ground more thoroughly, so re-mounting it would now duplicate content rather than fill a gap.
- `DrivesRail`'s cards are sample content with no endpoint behind them — same root cause as the hardcoded `Organizations.tsx`/`Events.tsx` arrays already in `known-issues.md`.
- `MilanInfoBanner`'s breakpoint checks don't react to window resize (no `resize` listener, unlike `Landing.tsx`) — new finding.
- `toggleUserLogin()` (a flip, not a set) could produce the wrong `isLoggedIn` value if `handleToken()` ever ran while already logged in — new finding, currently believed unreachable given how the OAuth cookie flow works today.
- `target="blank"` (missing underscore) on the GitHub Sponsors link inside `MilanInfoBanner` — new finding.
- The "Trusted by 300+ users" avatar block and count are fully static, with no backend endpoint currently available to make them real — already flagged generally in `known-issues.md`; this spec adds that there's no ready-made fetcher waiting for this one, unlike the organizations/events hardcoded-data cases.

## If you're asked to...

- **"Add the info banner back to the homepage"** → mount `<Milaninfobanner />` in `Home.tsx`; consider fixing the `target="blank"` typo and the resize-reactivity gap in the same change since you'll already be in the file. Check first that it isn't just duplicating `HowItWorks`/`OpenSource`, which now occupy that slot.
- **"Make the drives section real"** → replace `sampleDrives` in `DrivesRail.tsx` with a `useSWR` read once a public drives/events endpoint exists (`MilanApi.ts` has none today), and drop the "illustrative while the feed is being wired up" line from its intro paragraph.
- **"Add another marketing section"** → new component in `components/`, its content in `constants/landingContent.ts`, `useSectionReveal(sectionRef)` (from `@hooks`) for the entrance, mounted in `Home.tsx` between `<Landing />` and `<Footer />`.
- **"Make the 'trusted by' section real"** → there's no existing backend endpoint for a user/follower count in this repo's `ApiEndpoints.ts` — this needs a new endpoint, not just frontend wiring.
- **"Fix the OAuth redirect not completing"** → check `Home.tsx`'s `useEffect` first (this is the only place `OAuthLoginInitiated` is read), then cross-reference [authentication/SPEC.md](../authentication/SPEC.md#google-oauth) for how the flow starts.
