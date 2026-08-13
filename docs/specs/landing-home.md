# Landing & Home

The marketing/logged-out-friendly home experience, routed at `/`.

## `Home.jsx`

[src/pages/Home.jsx](../../src/pages/Home.jsx).
Sets page `<title>`/meta via `<Helmet>`, scrolls to top on mount, and — if `Cookies.get("OAuthLoginInitiated")` is set — completes the Google OAuth flow by calling `successCallback()` and dispatching the result into Redux (see [authentication.md](./authentication.md)).
Renders `<Landing />` then `<Footer />`.
Does **not** render `<MilanInfoBanner />` — that component exists and is exported from the `components/private` barrel but is not currently mounted by any page (see below).

## `Landing.jsx`

[src/components/private/landing/Landing.jsx](../../src/components/private/landing/Landing.jsx).
The hero section: `<Navbar />`, a headline that changes copy/wrapping at the `430px` breakpoint (tracked via a `window.resize` listener and local `windowWidth` state, not CSS media queries), and a CTA button that reads `isLoggedIn` from Redux (`selectIsLoggedIn`) to decide between "Sign up Today!" (`/auth/signup`) and "Explore our clubs" (`/clubs`).
Below the CTA, a static "Trusted by 300+ users" block with four hardcoded GitHub avatar images — not derived from any real user/follower data.

## `MilanInfoBanner` (built but not mounted)

[src/components/private/infoBanner/Milaninfobanner.jsx](../../src/components/private/infoBanner/Milaninfobanner.jsx), exported as `MilanInfoBanner` from `components/private/index.js`.
A three-section marketing scroller ("Collaborate.", "Connect.", "Build.") using `aos` (Animate On Scroll) for fade-up entrance animations, with responsive copy swapped at the `800px` breakpoint via inline `window.innerWidth` checks (same pattern as `Landing.jsx`, but here re-evaluated on every render rather than tracked in state — it won't update on resize without a re-render being triggered by something else).
Not imported by `Home.jsx` or any other page — if you're asked to "add the info banner back to the homepage," this is the component to re-mount, not rebuild.
