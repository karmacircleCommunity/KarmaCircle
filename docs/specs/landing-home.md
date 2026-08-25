# Landing & Home

The marketing/logged-out-friendly home experience, routed at `/`.

## `Home.tsx`

[apps/web/src/features/landing-home/pages/Home.tsx](../../apps/web/src/features/landing-home/pages/Home.tsx).
Sets page `<title>`/meta via `<Helmet>`, scrolls to top on mount, and — if `Cookies.get("OAuthLoginInitiated")` is set — completes the Google OAuth flow by calling `successCallback()` and dispatching the result into Redux (see [authentication.md](./authentication.md)).
Renders `<Landing />` then `<Footer />`.
Does **not** render `<MilanInfoBanner />` — that component exists in `features/landing-home/components/` but is not currently mounted by any page (see below).

## `Landing.tsx`

[apps/web/src/features/landing-home/components/Landing.tsx](../../apps/web/src/features/landing-home/components/Landing.tsx).
The hero section: `<Navbar />`, a headline that changes copy/wrapping at the `430px` breakpoint (tracked via a `window.resize` listener and local `windowWidth` state, not CSS media queries), and a CTA button that reads `isLoggedIn` from Redux (`selectIsLoggedIn`) to decide between "Sign up Today!" (`/auth/signup`) and "Explore our organizations" (`/organizations`).
Below the CTA, a static "Trusted by 300+ users" block with four hardcoded GitHub-avatar images (now bundled local assets under `apps/web/src/assets/avatars/`, not hotlinked to `avatars.githubusercontent.com`) — not derived from any real user/follower data.

Redesigned August 2026 (lighter typography, the site's new muted-clay brand color — see [ui-kit.md](./ui-kit.md) — and the app's new Lenis/GSAP/three.js animation infra, also documented there): the old static `Vector.png` background is gone, replaced by `HeroScene.tsx`, a lazy-loaded three.js/`@react-three/fiber` static line grid (a same-day iteration replaced an initial random-particle-field version — see the feature's own `SPEC.md`). The heading/paragraph/CTA fade in on mount and the whole hero block parallaxes on scroll, both via `@gsap/react`'s `useGSAP` + `ScrollTrigger`, skipped under `prefers-reduced-motion`. The `--landing-accent`/`--auth-accent`-style local color override this page used to carry is gone too — it now just uses the site-wide `--color-brand` tokens directly, since they're no longer the orange it was scoped away from.

## `MilanInfoBanner` (built but not mounted)

[apps/web/src/features/landing-home/components/Milaninfobanner.tsx](../../apps/web/src/features/landing-home/components/Milaninfobanner.tsx) (default export, imported directly — there is no longer a barrel file for it).
A three-section marketing scroller ("Collaborate.", "Connect.", "Build.") using `aos` (Animate On Scroll) for fade-up entrance animations, with responsive copy swapped at the `800px` breakpoint via inline `window.innerWidth` checks (same pattern as `Landing.tsx`, but here re-evaluated on every render rather than tracked in state — it won't update on resize without a re-render being triggered by something else).
Not imported by `Home.tsx` or any other page — if you're asked to "add the info banner back to the homepage," this is the component to re-mount, not rebuild.

## Types

This entire folder is TypeScript. See [landing-home/SPEC.md](../../apps/web/src/features/landing-home/SPEC.md#types) for the full breakdown, including the `@types/aos` dev dependency this pass added.
