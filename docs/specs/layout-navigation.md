# Layout & Navigation

Chrome shared across pages: navbar, footer, header banner, modal shell, loading spinner, back-to-top button, and the per-page `<Helmet>`/SEO pattern.
None of these are rendered by a shared layout route — every page imports `<Navbar />` and (usually) `<Footer />` individually at the top of its own JSX, since routing has no nested/layout routes (see [architecture.md](./architecture.md)).

## `Navbar`

[apps/web/src/components/Navbar.tsx](../../apps/web/src/components/Navbar.tsx).
Nav links are a local hardcoded array: Home `/`, Clubs `/clubs`, Trending `/trending`, Events `/events`, Shops `/shop`.
Responsive behavior is driven by a `window.resize` listener + local `windowWidth` state (breakpoint `900px`), not CSS — above 900px shows the horizontal link row plus either a "Sign Up" CTA or (if `Cookies.get("Token") && isLoggedIn`) a "Profile ▾" dropdown trigger; below 900px shows a hamburger icon (or the user's avatar image if logged in) that opens a full mobile link panel.
The account dropdown (`.nav_dropdown`) is toggled by directly mutating the DOM (`document.querySelector(".nav_dropdown").classList.toggle(...)`) rather than React state — this only exists once per page since `Navbar` itself is rendered once, so it's safe today but is worth noting if `Navbar` is ever rendered more than once on a page.
The dropdown links to `/user/:userName` or `/dashboard` depending on `user?.userType`, and (for club users only) a currently-dead `/event/create` link (no such route exists).
Logout: calls `Logout()`, then `resetUserData()` + `localStorage.clear()` (see [state-management.md](./state-management.md) for how this compares to the other two logout call sites).
Has a stray `console.log("🚀 ~ Navbar ~ user:", user)` on every render — remove if touching this file.

## `Footer`

[apps/web/src/components/footer/Footer.tsx](../../apps/web/src/components/footer/Footer.tsx).
Purely data-driven from [apps/web/src/components/footer/footerLinksConfig.ts](../../apps/web/src/components/footer/footerLinksConfig.ts): `quickStarts`, `resources` (external links open in a new tab if the path starts with `http`), `policies` (`/terms`, `/privacy`, `/cookies` — none of these routes exist in `routesConfig.tsx`), and `social` (LinkedIn/X/GitHub icons, mapped through a local `icons` lookup keyed by the string names `FaLinkedinIn`/`FaXTwitter`/`FaGithub`). To add a footer link, edit `footerLinksConfig.ts` rather than this component.

## `Header`

[apps/web/src/components/header/Header.tsx](../../apps/web/src/components/header/Header.tsx) + [HeaderData.ts](../../apps/web/src/components/header/HeaderData.ts).
A page-banner component taking a `type` prop (`"clubs"` or `"events"`) and looking up copy from `HeaderData.ts`; falls back to generic "Default Header"/"Default Description" text if `type` doesn't match an entry.
Swaps between a long and short description at the `800px` breakpoint (read once at render time via `window.innerWidth`, not tracked in state — same non-reactive pattern as `MilanInfoBanner`).
**Not currently rendered by `Clubs.tsx` or `Events.jsx`** — both of those pages build their own inline header markup instead of using this component, despite `HeaderData.ts` having entries specifically for `"clubs"` and `"events"`. Likely intended to be used there.

## `Modal`

[apps/web/src/components/Modal.tsx](../../apps/web/src/components/Modal.tsx).
A generic overlay shell (Tailwind utility classes) taking `children`, `onClose`, and `className`, with a built-in close button.
Not currently used anywhere — `ProfileCompletion`, `ProfileUpdate`, and `CreateEvent`/`CreateEvents` all build their own bespoke `*_overlay`/`*_modal` markup instead of wrapping this component. If asked to standardize modal styling/behavior across the app, this is the shell to converge on.

## `Loading`

[apps/web/src/components/Loading.tsx](../../apps/web/src/components/Loading.tsx).
A spinning-ring loading indicator, styled with Tailwind (`animate-spin` + a transparent-right-border trick to mimic Bootstrap's old spinner look, plus `sr-only` for the "Loading..." text). Bootstrap itself has been fully removed from the app (was previously loaded via a `<link>`/`<script>` CDN pair in `index.html`) — this component no longer depends on it.
Used as the "no data yet" fallback in `Clubs.tsx` and `Events.jsx` (though, per [clubs.md](./clubs.md)/[events.md](./events.md), those arrays are currently always populated with hardcoded data, so the fallback branch is effectively unreachable today), and in `Donate.tsx` (unrouted — see [donate-shop-trending.md](./donate-shop-trending.md)).

## `BacktoTop`

[apps/web/src/components/buttons/BacktoTop.tsx](../../apps/web/src/components/buttons/BacktoTop.tsx).
Rendered once, globally, in `App.tsx` (outside `<Routes>`), so it appears on every page.
Shows a scroll-to-top arrow once `document.documentElement.scrollTop` exceeds 250px, debounced (300ms) via a small hand-rolled `debounce` helper defined inline in the component.

## `ClickAwayListener`

[apps/web/src/components/ClickAwayListener.tsx](../../apps/web/src/components/ClickAwayListener.tsx).
A generic wrapper that calls `onClickAway()` on any `mousedown` outside a `.click-away-listener` div. Not currently used anywhere in the app (the `Navbar` account dropdown, which would be a natural fit, instead relies on the user clicking the trigger again or navigating away).

## `ComponentHelmet` (per-page SEO)

[apps/web/src/components/ComponentHelmet.tsx](../../apps/web/src/components/ComponentHelmet.tsx).
A `type`-keyed `<Helmet>` wrapper supporting `"Clubs"` and `"Events"` (exact string match, case-sensitive); returns `null` for anything else.
Used by `Clubs.tsx` (`type="Clubs"`, correct) and `Events.jsx` (`type="Clubs"` — likely should be `"Events"`; see [events.md](./events.md)).
Most other pages (`Home`, `SignIn`, `SignUp`, `Donate`) instead inline their own `<Helmet>` block directly rather than extending this component — if you add a new page needing SEO tags, either extend `ComponentHelmet` with a new `type` branch (consistent with `Clubs`/`Events`) or follow the inline-`<Helmet>` pattern (consistent with `Home`/auth pages); both exist today, no single convention has won yet.
