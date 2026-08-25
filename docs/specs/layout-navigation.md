# Layout & Navigation

Chrome shared across pages: navbar, footer, header banner, modal shell, loading spinner, back-to-top button, and the per-page `<Helmet>`/SEO pattern.
None of these are rendered by a shared layout route — every page imports `<Navbar />` and (usually) `<Footer />` individually at the top of its own JSX, since routing has no nested/layout routes (see [architecture.md](./architecture.md)).

## `Navbar`

[apps/web/src/components/Navbar.tsx](../../apps/web/src/components/Navbar.tsx).
Nav links are a local hardcoded array: Organizations `/organizations`, Trending `/trending`, Events `/events`, Shops `/shop`. No "Home" entry (removed August 2026 — see below); the `/` route itself is unaffected, this only changed what the nav renders.
Responsive behavior is driven by a `window.resize` listener + local `windowWidth` state (breakpoint `900px`), not CSS — above 900px shows the horizontal link row plus either a "Sign Up" CTA or (if Redux's `isLoggedIn` is true) a "Profile ▾" dropdown trigger; below 900px shows a hamburger icon (or the user's avatar image if logged in) that opens a full mobile link panel.
The account dropdown (`.nav_dropdown`) is toggled by directly mutating the DOM (`document.querySelector(".nav_dropdown").classList.toggle(...)`) rather than React state — this only exists once per page since `Navbar` itself is rendered once, so it's safe today but is worth noting if `Navbar` is ever rendered more than once on a page.
The dropdown links to `/user/:userName` or `/dashboard` depending on `user?.userType`, and (for organization users only) a currently-dead `/event/create` link (no such route exists).
Logout: calls `Logout()`, then `resetUserData()` + `localStorage.clear()` (see [state-management.md](./state-management.md) for how this compares to the other two logout call sites).

**Brand mark (August 2026):** the old `MilanNavBrand.svg` image (a colored wordmark that clashed with the site's rebranded muted-clay palette — see [ui-kit.md](./ui-kit.md)) is gone from this file, replaced by a plain text mark (`--color-brand` dot + "NgoWorld") built from the same tokens as everywhere else. `Footer.tsx` still imports and renders the old SVG — that one wasn't touched, so the two don't currently match; say so if asked to make them consistent.

**Lighter nav treatment (August 2026, same pass):** on direct feedback that the nav read as too bold/prominent for a marketing landing page, three things changed together: (1) the "Home" link was dropped from `Links` — the logo already links there, and a persistent nav item for "the page the logo points to" is redundant; (2) the per-link active-route underline (a `border-b-2` div shown under whichever link matched `location.pathname`) was removed entirely, in both the desktop row and the mobile drawer — reasoned as an app-internal-tab pattern (highlighting "which page am I on") that doesn't fit a marketing site, where hover feedback alone is enough; removing it also meant `useLocation()` is no longer used anywhere in this file (deleted along with it — don't reintroduce a `location.pathname` check without first checking whether the underline it was for should really come back too); (3) both the logo and the nav links themselves dropped a weight/size step (logo: `text-2xl font-semibold` → `text-xl font-medium`; links: `font-medium text-brand-secondary` → `font-normal text-ink/65`, gaining a `hover:text-brand-secondary` color transition in place of the old permanent active-state color). The two hardcoded `text-[#8c321b]` link colors that predated this pass were also replaced (first with `text-brand-secondary`, then folded into the `text-ink/65` change above) — same "off-theme raw hex" reason as the brand-mark change.

**Desktop "Sign Up" CTA visibility:** `Navbar` takes an optional `hideSignUpForHeroCta` boolean prop (default `false`) and fades its own "Sign Up" out (`opacity`, kept in layout via `pointer-events-none` rather than unmounted, so nothing shifts) when it's `true`. Only `Landing.tsx` passes it — its own, much bigger hero CTA makes the navbar's identical button redundant while both are on screen. `Navbar.tsx` itself has no scroll/visibility logic of its own for this: the boolean is fully computed by `Landing.tsx`'s own `ScrollTrigger` (`onToggle`, on the hero CTA row's own ref — see [landing-home.md](./landing-home.md)) and handed down as a prop, not derived from a `document.querySelector`/`IntersectionObserver` inside this file. An earlier version of this feature did use a raw `IntersectionObserver` watching a `data-hero-cta` DOM marker from inside `Navbar.tsx`; it was replaced after a real bug surfaced in testing — see "Known issues" below — in favor of reusing the same GSAP `ScrollTrigger` pipeline `Landing.tsx` already had proven working for its scroll-parallax. No dependency was added for this (no `react-scroll-observer` or similar) either way. Every route other than `/` renders `<Navbar />` with no props, so the CTA there just always shows, same as before this feature existed.

**Known issues:** the `IntersectionObserver`-based version of the CTA-visibility feature above had a real bug, found via direct DOM/CSS-transition inspection in a live browser rather than by reading the code: the observer's callback would occasionally fire in a rapid loop, perpetually restarting the button's `opacity` CSS transition so it got visually stuck a fraction of a percent into the animation (computed `opacity` pinned around `0.99`, never reaching `0` or `1`). Root cause not fully isolated before the whole approach was replaced with the `ScrollTrigger`-based one above, which does not reproduce it — if a similar "stuck mid-transition" symptom shows up elsewhere, `element.getAnimations()` (Web Animations API) is what surfaced this one; a stuck `CSSTransition` with a `currentTime` that never grows past a few ms across repeated checks is the signature.

## `Footer`

[apps/web/src/components/footer/Footer.tsx](../../apps/web/src/components/footer/Footer.tsx).
Purely data-driven from [apps/web/src/components/footer/footerLinksConfig.ts](../../apps/web/src/components/footer/footerLinksConfig.ts): `quickStarts`, `resources` (external links open in a new tab if the path starts with `http`), `policies` (`/terms`, `/privacy`, `/cookies` — none of these routes exist in `routesConfig.tsx`), and `social` (LinkedIn/X/GitHub icons, mapped through a local `icons` lookup keyed by the string names `FaLinkedinIn`/`FaXTwitter`/`FaGithub`). To add a footer link, edit `footerLinksConfig.ts` rather than this component.

## `Header`

[apps/web/src/components/header/Header.tsx](../../apps/web/src/components/header/Header.tsx) + [HeaderData.ts](../../apps/web/src/components/header/HeaderData.ts).
A page-banner component taking a `type` prop (`"organizations"` or `"events"`) and looking up copy from `HeaderData.ts`; falls back to generic "Default Header"/"Default Description" text if `type` doesn't match an entry.
Swaps between a long and short description at the `800px` breakpoint (read once at render time via `window.innerWidth`, not tracked in state — same non-reactive pattern as `MilanInfoBanner`).
**Not currently rendered by `Organizations.tsx` or `Events.jsx`** — both of those pages build their own inline header markup instead of using this component, despite `HeaderData.ts` having entries specifically for `"organizations"` and `"events"`. Likely intended to be used there.

## `Modal`

[apps/web/src/components/Modal.tsx](../../apps/web/src/components/Modal.tsx).
A generic overlay shell (Tailwind utility classes) taking `children`, `onClose`, and `className`, with a built-in close button.
Not currently used anywhere — `ProfileCompletion`, `ProfileUpdate`, and `CreateEvent`/`CreateEvents` all build their own bespoke `*_overlay`/`*_modal` markup instead of wrapping this component. If asked to standardize modal styling/behavior across the app, this is the shell to converge on.

## `Loading`

[apps/web/src/components/Loading.tsx](../../apps/web/src/components/Loading.tsx).
A spinning-ring loading indicator, styled with Tailwind (`animate-spin` + a transparent-right-border trick to mimic Bootstrap's old spinner look, plus `sr-only` for the "Loading..." text). Bootstrap itself has been fully removed from the app (was previously loaded via a `<link>`/`<script>` CDN pair in `index.html`) — this component no longer depends on it.
Used as the "no data yet" fallback in `Organizations.tsx` and `Events.jsx` (though, per [organizations.md](./organizations.md)/[events.md](./events.md), those arrays are currently always populated with hardcoded data, so the fallback branch is effectively unreachable today), and in `Donate.tsx` (unrouted — see [donate-shop-trending.md](./donate-shop-trending.md)).

## `BacktoTop`

[apps/web/src/components/buttons/BacktoTop.tsx](../../apps/web/src/components/buttons/BacktoTop.tsx).
Rendered once, globally, in `App.tsx` (outside `<Routes>`), so it appears on every page.
Shows a scroll-to-top arrow once `document.documentElement.scrollTop` exceeds 250px, debounced (300ms) via a small hand-rolled `debounce` helper defined inline in the component.

## `ClickAwayListener`

[apps/web/src/components/ClickAwayListener.tsx](../../apps/web/src/components/ClickAwayListener.tsx).
A generic wrapper that calls `onClickAway()` on any `mousedown` outside a `.click-away-listener` div. Not currently used anywhere in the app (the `Navbar` account dropdown, which would be a natural fit, instead relies on the user clicking the trigger again or navigating away).

## `ComponentHelmet` (per-page SEO)

[apps/web/src/components/ComponentHelmet.tsx](../../apps/web/src/components/ComponentHelmet.tsx).
A `type`-keyed `<Helmet>` wrapper supporting `"Organizations"` and `"Events"` (exact string match, case-sensitive); returns `null` for anything else.
Used by `Organizations.tsx` (`type="Organizations"`, correct) and `Events.jsx` (`type="Events"`, correct — fixed August 2026, was previously `type="Organizations"`; see [events.md](./events.md)).
Most other pages (`Home`, `Auth`, `Donate`) instead inline their own `<Helmet>` block directly rather than extending this component — if you add a new page needing SEO tags, either extend `ComponentHelmet` with a new `type` branch (consistent with `Organizations`/`Events`) or follow the inline-`<Helmet>` pattern (consistent with `Home`/`Auth`); both exist today, no single convention has won yet.
