# 13 — Views

Route table from [app/routes/routesConfig.tsx](../../../apps/web/src/app/routes/routesConfig.tsx).
All routes render inside `App.tsx`, which mounts `SmoothScroll`, `ScrollProgress` (outside the router, so it survives navigation) and the router.

| Path | Component | Shell | Chrome |
| --- | --- | --- | --- |
| `/` | `Home` | Standard page | Navbar (with `hideSignUpForHeroCta`), Footer |
| `/brand` | `BrandRedirect` | none | Immediately `window.location.replace("https://brand.karmacircle.org")` |
| `/auth/signup` | `Auth` (lazy, behind `DonotRenderWhenLoggedIn`) | `AuthLayout` -> `SplitPanelLayout` | **No navbar, no footer** |
| `/auth/signin` | `Auth` (same component) | `AuthLayout` | No navbar, no footer |
| `/auth/forgot-password` | `ForgotPassword` (lazy, protected) | `AuthLayout` | No navbar, no footer |
| `/auth/reset-password/:token` | `ResetPassword` (lazy, protected) | `AuthLayout` | No navbar, no footer |
| `/user/setup` | `ProfileSetup` (behind `RequireSignIn`) | Standard page | Navbar, Footer |
| `/organizations` | `Organizations` | Standard page + `DirectoryToolbar` | Navbar, Footer |
| `/organization/setup` | `OrganizationSetup` | `SetupLayout` -> `SplitPanelLayout` | No navbar, no footer |
| `/organization/events` | `YourEvents` | Standard page, behind `OrganizationSetupGate` | Navbar, Footer |
| `/organization/:userName` | `OrganizationProfile` | Standard page | Navbar, Footer |
| `/dashboard` | `Dashboard` | Standard page | Navbar, Footer |
| `/events` | `Events` | Standard page + `DirectoryToolbar` | Navbar, Footer |
| `/events/mine` | `MyEvents` (behind `RequireSignIn`) | Standard page | Navbar, Footer |
| `/events/:eventId` | `DetailedEvent` | Standard page | Navbar, Footer |
| `*` | `Error404` | Standard page | Navbar, Footer |

## Notes an agent needs

- **One auth component backs both `/auth/signup` and `/auth/signin`.** Which of "sign in" / "sign up" the visitor sees is decided at runtime by a live duplicate-email check, not by the path they arrived on. Both paths are kept so existing links and bookmarks still work.
- **`/brand` is a redirect, not a page.** The in-app design-system page (`features/brand-kit`) was deleted in September 2026 and split out into `karmacircleCommunity/karmacircle-brand`, deployed at `brand.karmacircle.org`, so its design and content can grow independently. Its tokens are a **manual, unenforced copy** of this app's `@theme` block.
- **`/organization/setup` is declared before `/organization/:userName`** purely for readability. React Router already ranks a static segment above a dynamic one.
- **The old `/user/:userName` page was removed.** Individuals edit their profile at `/user/setup`; the public `/organization/:userName` route remains a distinct organization profile.
- **Navbar links follow account type.** Organization accounts get Dashboard and Your Events; individuals get Edit profile at `/user/setup` and My Events at `/events/mine`.
- `/organization/events` is where the navbar's "Your events" points. It used to point at `/event/create`, which no route has ever matched.
- The four auth routes are wrapped in `DonotRenderWhenLoggedIn`.
- `:eventId` is an event's API `uid`, despite the route parameter's generic name.
- `:token` on the reset route is the raw single-use token from the emailed link.

## Shell decision rule

| The user is | Shell |
| --- | --- |
| Browsing (landing, directories, profiles, detail, 404) | Standard page: Navbar + content + Footer |
| Mid-flow and must not wander off (auth, org setup) | `SplitPanelLayout`, no navbar, no footer |

There is no third shell. If a new flow needs one, it needs `SplitPanelLayout` with a different `aside`, not a new layout component.

## Ambiguity warning

`apps/web` has several places where two components do overlapping things: two profile-edit modals, a live `CreateEvents.tsx` form plus its retired profile-editor copy `CreateEvent.tsx`, and two auth-validation systems.
`UserProfile.tsx` is an unrouted legacy profile prototype; the only routed public profile is the organization profile.
All are catalogued in [docs/specs/known-issues.md](../known-issues.md).

**If a request is ambiguous about which one it means ("add a field to the create-event form", "fix the profile page"), ask before writing code.** Do not guess, and do not edit both.
