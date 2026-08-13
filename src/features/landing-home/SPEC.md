# Landing & Home — Feature Spec

Colocated, implementation-level companion to [docs/specs/landing-home.md](../../../docs/specs/landing-home.md).
The smallest and least buggy feature folder in the app — worth reading anyway because `Home.jsx` is where the Google OAuth flow (started in the `authentication` feature) actually completes.

## What this feature is responsible for

The `/` route: the marketing hero (`Landing`), and finishing the Google OAuth handshake for any visitor who lands back on `/` with an `OAuthLoginInitiated` cookie set.
`MilanInfoBanner` is a finished second marketing section that lives here but is not currently mounted by `Home.jsx` — see below.

## Why it's shaped this way

Nothing in this folder does data fetching for its own content — it's a static marketing page — but `Home.jsx` doubles as the **landing pad for an external redirect flow** (Google OAuth), which is why it, alone among this feature's files, has a `useEffect` doing meaningful async work on mount. That responsibility living here (rather than in the `authentication` feature, which starts the OAuth flow) is a direct consequence of the backend always redirecting back to `/` after Google auth — see [authentication/SPEC.md](../authentication/SPEC.md) for the other half of this flow.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Home.jsx` | The `/` page — OAuth-completion effect + renders `Landing` + `Footer` | ✅ routed |
| `components/Landing.jsx` | The actual hero section | ✅ rendered by `Home.jsx` |
| `components/Landing.scss` | Styles | ✅ |
| `components/Milaninfobanner.jsx` | A second, finished marketing section | ❌ not mounted by `Home.jsx` or anywhere else |
| `components/MilanInfoBanner.css` | Styles for the above | ✅ imported by `Milaninfobanner.jsx` itself, but that component is unused |

## `pages/Home.jsx`

**`handleToken()`** — awaits `successCallback()` (`MilanApi.js`, `GET /auth/login/success`, `withCredentials: true`). On `status === 200`: success toast, `dispatch(updateUserData(authData.data.user))` **then, as a second, separate dispatch**, `dispatch(toggleUserLogin())`. This is worth noting precisely because it's the one place in the app that sets `isLoggedIn` via `toggleUserLogin()` (a *flip*, not a *set*) rather than via `updateUserData({ ..., isLoggedIn: true })` (a merge) — see [state-management.md](../../../docs/specs/state-management.md). Because `toggleUserLogin` flips whatever `isLoggedIn` currently is, **this only produces the correct end state (`true`) if `isLoggedIn` was `false` going in** — which holds for the intended case (an anonymous visitor completing Google OAuth), but if `handleToken()` were ever called a second time for an already-logged-in session (e.g. the `OAuthLoginInitiated` cookie isn't cleared and somehow persists across a reload while already authenticated), this would flip `isLoggedIn` back to `false` instead of leaving it `true`. Not reachable through the current flow as far as this repo's code shows (nothing else in the frontend clears or re-checks `OAuthLoginInitiated`, and cookie-setting/clearing for it happens server-side, outside this repo), but worth knowing if you're debugging an "OAuth login appears to silently log the user back out" report.

**On failure:** `showErrorToast(authData?.message)` — note this reads `.message` directly off `authData`, not `authData?.data?.message` like the success path and most other call sites in the app; `successCallback()`'s own catch block returns the raw caught error object (`err`, not `err.response`) on failure, so `authData` here could be an Axios error object (which does have a top-level `.message`, e.g. `"Network Error"`) rather than a structured API response — consistent with its own implementation, just an easy detail to get wrong if you copy this pattern elsewhere expecting the usual `response?.data?.message` shape.

**`useEffect` (mount only):** `window.scrollTo(0, 0)` (unconditional, every visit to `/`), then `if (Cookies.get("OAuthLoginInitiated")) handleToken();`. **The cookie is never read again or cleared by this component** — clearing it (if it needs clearing at all) must happen server-side or elsewhere; nothing in this repo does it. If the cookie is ever left set indefinitely after a successful OAuth completion, every subsequent visit to `/` would re-trigger `handleToken()` — worth checking backend behavior before assuming a single successful completion is enough.

**Renders:** `<Helmet>` (title "NgoWorld", static meta description, `canonical="/"`, correct for this page unlike `SignIn.jsx`'s canonical), `<Landing />`, `<Footer />`. **Does not render `<MilanInfoBanner />` or `<Navbar />` directly** — `Navbar` is rendered by `Landing.jsx` itself, one level down.

## `components/Landing.jsx` — the hero

**`windowWidth` state**, synced via a `resize` listener (cleaned up on unmount) — this is the one file in this feature that *does* track viewport width reactively in state, rather than reading `window.innerWidth` once per render (contrast with `Milaninfobanner.jsx` below).
Breakpoint: **430px**. Above it: two-line headline ("We connect NGOs," / "Charities and *you*.") and a longer paragraph. At or below it: a single-line headline and a shorter paragraph. Both variants are fully separate JSX blocks (not a single template with conditional line breaks), so if you're asked to tweak the copy, check both branches.

**CTA button:** reads `isLoggedIn` via `useSelector(selectIsLoggedIn)` (the Redux selector — "pattern 1" of the three login checks cataloged in [state-management.md](../../../docs/specs/state-management.md)) to decide between `to="/clubs"` ("Explore our clubs") for a logged-in visitor and `to="/auth/signup"` ("Sign up Today!") for an anonymous one. Uses the shared `Button` component's `to` prop correctly.

**"Trusted by 300+ users" block:** four hardcoded GitHub avatar image URLs (real GitHub user avatars, not generated/placeholder images — presumably early contributors' own avatars) and a static `"Trusted by 300+ users."` caption — **not derived from any real user/follower count**; there's no API call anywhere in this component. If asked to make this dynamic, there's no existing endpoint in `MilanApi.js`/`ApiEndpoints.js` that would supply a "total users" count — this would need a new backend endpoint, not just a frontend wiring fix (contrast with `Clubs.jsx`'s hardcoded list, which has a real fetcher — `getClubs()` — already waiting to be wired in).

## `components/Milaninfobanner.jsx` — built, not mounted

Default export (no barrel file for it — imported directly by full path wherever it's used, which today is nowhere in the live app).

Three near-identical sections ("Collaborate.", "Connect.", "Build."), each pairing a static illustration (`MilanCollaborate.svg`/`MilanConnect.svg`/`MilanBuild.svg`) with marketing copy, using `aos` (Animate On Scroll) for fade-up entrance animation on desktop.

**Responsive copy pattern differs from `Landing.jsx`'s:** every breakpoint check here (`window.innerWidth > 800` for the `aos` attributes, `window.innerWidth < 800` for copy variants) reads `window.innerWidth` **directly at render time**, not from state — there is no `resize` listener anywhere in this component. This means the copy/animation-attribute choice is fixed to whatever the viewport width was on the render that mounted this component (or the most recent re-render triggered by something else, like a parent state change) and **will not update on window resize** unless some unrelated state change forces a re-render — the opposite of `Landing.jsx`'s pattern one file over. If you're asked to fix "the info banner doesn't adapt when I resize the window," this is why, and the fix is to adopt `Landing.jsx`'s `useState` + `resize`-listener pattern here too, for consistency.

**Minor content bugs, not previously documented:** the "Donate, for a cause!" section's sponsor link has `target="blank"` (missing the leading underscore) rather than `target="_blank"` — `"blank"` is treated as a literal named window/tab rather than the special always-new-tab keyword, so repeated clicks may reuse the same named tab instead of each opening a fresh one, depending on browser behavior; a few copy typos exist too ("tommorow" instead of "tomorrow," appearing twice; "Sponserships" instead of "Sponsorships"; "Veified" instead of "Verified" in the Connect section; "indiviual" instead of "individual") — cosmetic, but worth a pass if this component is ever wired back in and someone's doing a content review.

**If asked to "add the info banner back to the homepage"** — per [known-issues.md](../../../docs/specs/known-issues.md), this is the component to re-mount (`<Milaninfobanner />` between `<Landing />` and `<Footer />` in `Home.jsx` is the natural placement, matching its content's positioning relative to the hero), not rebuild from scratch. Fix the `target="blank"` typo and consider the resize-reactivity gap while you're in there, since both are trivial alongside a re-mount.

## Data flow summary

```
Home.jsx mount
   │  window.scrollTo(0,0)
   │  Cookies.get("OAuthLoginInitiated") present?
   │       │ yes
   │       ▼
   │  successCallback()   [MilanApi.js, GET /auth/login/success]
   │       │ status 200
   │       ▼
   │  dispatch(updateUserData(user)) → dispatch(toggleUserLogin())   [two separate dispatches]
   ▼
renders <Landing /> (reads Redux isLoggedIn for its own CTA) + <Footer />
```

## Known issues specific to this feature

- `MilanInfoBanner` is fully built but not mounted anywhere — already in `known-issues.md`.
- `MilanInfoBanner`'s breakpoint checks don't react to window resize (no `resize` listener, unlike `Landing.jsx`) — new finding.
- `toggleUserLogin()` (a flip, not a set) could produce the wrong `isLoggedIn` value if `handleToken()` ever ran while already logged in — new finding, currently believed unreachable given how the OAuth cookie flow works today.
- `target="blank"` (missing underscore) on the GitHub Sponsors link inside `MilanInfoBanner` — new finding.
- The "Trusted by 300+ users" avatar block and count are fully static, with no backend endpoint currently available to make them real — already flagged generally in `known-issues.md`; this spec adds that there's no ready-made fetcher waiting for this one, unlike the clubs/events hardcoded-data cases.

## If you're asked to...

- **"Add the info banner back to the homepage"** → mount `<Milaninfobanner />` in `Home.jsx`; consider fixing the `target="blank"` typo and the resize-reactivity gap in the same change since you'll already be in the file.
- **"Make the 'trusted by' section real"** → there's no existing backend endpoint for a user/follower count in this repo's `ApiEndpoints.js` — this needs a new endpoint, not just frontend wiring.
- **"Fix the OAuth redirect not completing"** → check `Home.jsx`'s `useEffect` first (this is the only place `OAuthLoginInitiated` is read), then cross-reference [authentication/SPEC.md](../authentication/SPEC.md#google-oauth) for how the flow starts.
