# Known Issues & Inconsistencies

A single catalog of the cross-cutting bugs, dead code, and unresolved duplication discovered while writing these specs (August 2026), gathered from static reading of the code — none of this has been verified by running the app.
Each item also appears inline in its relevant feature spec; this file exists so an agent can get the full picture in one read before making changes near any of these areas.
Treat entries here as **things to be aware of**, not necessarily things to fix unless you were asked to — several are large enough in scope that they deserve their own ticket/PR.

## Build / config

- **`.env.example` documents the wrong variable name.** It shows `VITE_MILANAPI`, but every API call in the code reads `import.meta.env.VITE_API_URL`. A contributor following the example file verbatim will get a broken app with no base URL. Fix: rename the example var to `VITE_API_URL` (or add both, with a comment).
- **`QueryClientProvider` (`@tanstack/react-query`) wraps the whole app but nothing uses it.** All data fetching goes through SWR or raw `axios`. Either start using it deliberately or remove the wrapper/dependency to reduce confusion for future contributors.

## Routing

- **`/donate` has no route**, even though `src/features/donate-shop-trending/pages/Donate.jsx` exists (and that file is separately broken — see below).
- **`/events/:id`-equivalent has no route**, even though `src/features/events/pages/DetailedEvent.jsx` exists as a one-line stub.
- **`src/features/onboarding-profile/pages/UserProfile.jsx` has no route** despite being a fairly complete page — see [onboarding-profile.md](./onboarding-profile.md).
- **Footer links to `/terms`, `/privacy`, `/cookies`** — none of these routes exist; clicking them hits the 404 page.
- **Navbar's account dropdown links to `/event/create`** (club users only) — no such route exists.

## Broken imports / files that would fail to build if touched

- **`src/features/donate-shop-trending/pages/Donate.jsx`** imports `../../components/Cards/SingleClubEvent/SingleClubEvent` and `../../components/Loading`, neither of which exists anymore. Since the page also has no route, this currently doesn't break the app (Vite doesn't bundle unreachable-but-still-source-present files until something imports the chain at build time — verify this is actually true for your Vite/Rollup config before relying on it; if the file is ever wired into a route or otherwise imported, the build will fail immediately).
- **`src/features/events/components/HostedEvents.jsx` is a completely empty file** (0 bytes) — importing it fails immediately (no default export).

## Duplicated / conflicting implementations

- **Two "create event" components** (`features/events/components/CreateEvent.jsx` and `features/events/components/CreateEvents.jsx`) with different fields, different validation, and — critically — the shared one calls the *user profile* update endpoint instead of the event-creation endpoint. See [events.md](./events.md).
- **Two public profile pages** (`features/onboarding-profile/pages/Profile.jsx`, routed; `features/onboarding-profile/pages/UserProfile.jsx`, not routed) covering overlapping functionality, with different "is this my own profile" checks (Redux vs. an unused cookie). See [onboarding-profile.md](./onboarding-profile.md).
- **Two profile-edit modals** (`ProfileCompletion.jsx`, `ProfileUpdate.jsx`) that are ~80% identical JSX/logic, plus a `ProfileCompletion` component that itself has two Save buttons wired to two different code paths. See [onboarding-profile.md](./onboarding-profile.md).
- **Two auth submit-button implementations** — `AuthButton.jsx` (unused) vs. inline markup in `SignIn.jsx`/`SignUp.jsx` (live). See [authentication.md](./authentication.md).
- **Two validation systems for signup** — the lightweight two-field check inside `useAuth.js` (live) vs. the much more complete `useValidation.js` + `useFormLogic.js` pair (unused by any page). See [authentication.md](./authentication.md).
- **Three different "is the user logged in" checks** and **three different logout cleanup sequences**, none centralized. See [state-management.md](./state-management.md).
- **`userEndpoints.update` vs `userEndpoints.updateProfile`** — two endpoint constants pointing at different URLs; only `updateProfile` is actually used. See [api-integration.md](./api-integration.md).

## Hardcoded/placeholder data standing in for real API data

`Clubs.jsx` and `Events.jsx` both render arrays of 20 hardcoded fake records instead of calling the `getClubs()`/`getEvents()` functions that already exist for exactly this purpose (`src/features/clubs/services/Clubs.js`, `src/features/events/services/Events.js`).
`EventCard`, `FeaturedEventCard`, and `FeaturedEventImage` don't even accept/use props — all content is static JSX.
`Dashboard.jsx`'s cover photo, profile photo, and follower/event counts are static.
`ClubCard`'s banner image and follower/event counts are static regardless of the `club` prop.
`Landing.jsx`'s "Trusted by 300+ users" avatars are static.
`TrackSection`'s analytics numbers are static and its tab-switcher isn't wired to anything.
See the relevant feature spec ([clubs.md](./clubs.md), [events.md](./events.md), [dashboard.md](./dashboard.md), [landing-home.md](./landing-home.md)) for exactly which fields would need to become dynamic.

## Validation that doesn't actually block submission

Both `useProfileCompletion.validateForm` and `ProfileUpdate.validateForm` compute `newErrors`, call `setErrors(newErrors)`, and then call their respective PATCH API function **unconditionally**, regardless of whether `newErrors` is non-empty.
The `Object.keys(newErrors).length === 0` check only affects the function's *return value*, not whether the request fires.
In practice, the Save buttons are also `disabled` while required fields are empty, which covers the "required field missing" case at the UI layer — but the length/format checks (description 100–500 chars, numeric pincode) can still be bypassed and will still hit the API. See [onboarding-profile.md](./onboarding-profile.md).

## Component-scaffolding that was built but never wired up

These exist, work as isolated units, and appear to be intended for future/finished use — prefer extending or wiring these up over writing new ones that duplicate their purpose:
- `ProfileElements.js` + `getProfileFields.js` — generic profile-field metadata, unused by the (hardcoded-field) `ProfileCompletion`/`ProfileUpdate` forms.
- `useValidation.js` + `useFormLogic.js` — a fuller signup validator/handler pair, unused by the live `SignIn`/`SignUp` pages.
- `AuthButton.jsx` — unused by the live auth pages.
- `Modal.jsx` — a generic modal shell, unused; every modal in the app builds its own overlay markup instead.
- `MilanInfoBanner` — a finished marketing section, unmounted from `Home.jsx`.
- `Header.jsx` + `HeaderData.js` — has ready-made "clubs"/"events" copy, but `Clubs.jsx`/`Events.jsx` both build their own inline header instead of using it.
- `PatchFetcher.js` — an SWR-style PATCH fetcher, unused (mutations go through direct `MilanApi.js` calls + `mutate()` instead).
- `ClickAwayListener.jsx` — unused generic utility.
- `getEvents()` / `getClubs()` (`src/features/events/services/Events.js`, `src/features/clubs/services/Clubs.js`) — real fetchers for events/clubs, unused because the pages that need them use hardcoded arrays instead.

## Smaller one-off issues

- `Events.jsx` passes `type="Clubs"` to `<ComponentHelmet>` instead of `"Events"` (that component does have an `"Events"` branch).
- `Profile.jsx` renders its Subscribe/Sponsor/Edit/Logout button block twice in a row (copy-paste duplication, not an intentional repeated layout).
- `Profile.jsx`'s map `<iframe>` reads `user?.iframe` (the viewer's own Redux state) instead of `details?.iframe` (the profile being viewed).
- `Navbar.jsx` has a stray `console.log` of the full user object on every render.
- `Dashboard.jsx` has a stray `console.log` in its "Edit Profile" click handler.
- `useEvent.js`'s `submitCallback` checks a module-scope `errors` object populated by the *last* `validateEvent()` call rather than re-validating the event being submitted right now — callers must call `validateEvent()` immediately beforehand to keep these in sync (which `CreateEvents.jsx` does today, but it's an easy thing to break).
- `ApiConnector.js` has a dead/unreachable status check (`if (response.status === 400) console.error("... status 600 ...")`) — the comment references 600 but the condition checks 400, and axios throws rather than resolving on 4xx by default, so this branch doesn't currently fire in practice.
- `emailRegex` in `statics/Constants.js` (`/^[a-zA-Z0-9._:$!%-]+@[a-zA-Z0-9.-]+.[a-zA-Z]$/`) has an unescaped `.` before the final TLD character class and requires only a single trailing letter — it's looser/buggier than a typical email regex (e.g. it would accept `a@bXc` because the unescaped `.` matches any character, and it only requires one character after the last literal dot). It's the one actually used by `useAuth.js`'s live email check, so tightening it would change real signup/signin validation behavior — coordinate before changing.
- `routesConfig.jsx` lazy-loads `SignIn`/`SignUp` (`lazy(() => import(...))`), but `route.js` (the page barrel) also statically re-exports them (`Login`/`SignUp`) and is itself statically imported for the other routes. The bundler reports `[INEFFECTIVE_DYNAMIC_IMPORT]` for both at build time — the static re-export pulls `SignIn`/`SignUp` into the main chunk anyway, so the `lazy()` wrapping doesn't actually code-split them. Pre-existing (not introduced by the feature-based restructure, just newly visible in the build log); fix would be to drop `Login`/`SignUp` from `route.js` since `routesConfig.jsx` doesn't consume them from there.
