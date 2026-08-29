# Dashboard — Feature Spec

Colocated, implementation-level companion to
[docs/specs/dashboard.md](../../../docs/specs/dashboard.md). Read
[onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md) first — this feature
renders one of that feature's components (`ProfileUpdate`) and this spec assumes
you already know its internals.

**Changed August 2026:** this page no longer renders `ProfileCompletion`, the
"We're almost done" completion modal it used to mount whenever
`config.hasCompletedProfile === false`. An incomplete *organization* is now
handled by `OrganizationSetupGate` + the setup wizard
([organizations.md](../../../docs/specs/organizations.md#the-setup-flow--organizationsetup)),
which is a page rather than an undismissable modal. Sections below that describe
the prop mismatch, the double-mount and the dead `handleSetDefaultValues`
pre-fill relate to that removed modal; they are kept because the component and
its bugs still exist in the tree, and would come straight back with it if anyone
re-mounts it.

## What this feature is responsible for

The single logged-in-account "your own dashboard" page, routed at `/dashboard`.
It is the other entry point (besides `Profile.tsx`) into the
profile-completion/edit modals, and it's meant to eventually show real
engagement analytics (`TrackSection`) — today that part is a static visual
placeholder.

## Why it's shaped this way

There is no route guard on `/dashboard` (see
[authentication/SPEC.md](../authentication/SPEC.md) — `DonotRenderWhenLoggedIn`
only protects the _auth_ pages, nothing protects this one), so this component
has to degrade gracefully for a visitor who isn't actually logged in: it just
renders whatever `userEndpoints.profile` returns for the current session cookie,
which for an anonymous visitor is presumably an unauthorized/empty response, and
every field reads through optional chaining (`profileData?.user?.name`) so
nothing throws — it just renders blank. The page was evidently built assuming a
session-scoped cookie does the access control server-side, with the frontend not
needing its own guard.

## File manifest

| File                            | Role                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pages/Dashboard.tsx`           | The page itself — fetch, both edit-modal triggers, static analytics header                            |
| `pages/Dashboard.scss`          | Styles                                                                                                |
| `components/TrackSection.tsx`   | Static "Analytics — Coming Soon" widget                                                               |
| `components/TrackSection.scss`  | Styles                                                                                                |
| `components/ProfileSection.tsx` | One-line unused stub (`<div>ProfileSection</div>`) — not imported by `Dashboard.tsx` or anywhere else |

## `pages/Dashboard.tsx`

**Data fetch:** `useSWR(userEndpoints.profile, fetcher, { onSuccess, onError })`
— `GET /user/profile`, cookie-scoped (no explicit user ID in the URL; the
backend infers the account from the session).

- `onSuccess: (data) => dispatch(updateUserData(data?.user))` — every successful
  fetch or revalidation re-syncs Redux with the server's copy of the logged-in
  user. This is the mechanism that keeps Redux from going stale after this
  page's own mutations (`ProfileUpdate`'s `refreshProfileData()` calls
  `mutate()`, which re-triggers this `onSuccess`).
- `onError: (error) => showErrorToast(error?.response?.data?.message)`.

**`const { handleSetDefaultValues } = useProfileCompletion();`** — this
instantiates a **second, independent instance** of the `useProfileCompletion`
hook, separate from the one `ProfileCompletion` (below) instantiates internally
when it renders. React hooks do not share state across separate call
sites/component instances — each call to `useProfileCompletion()` gets its own
private `credentials`/`errors` state. **This means the
`handleSetDefaultValues(profileData?.user)` call in the "Edit Profile" button
handler (below) has no observable effect on the actual `ProfileCompletion` modal
that may render on this page** — it pre-fills a `credentials` object that
nothing reads or displays. This is a newly-identified bug, not previously
documented in `docs/specs/dashboard.md` or `known-issues.md`; it looks like a
leftover from an earlier version of this file where `ProfileCompletion` may have
been rendered differently (e.g. passed `credentials` as a prop from the parent)
before the current per-component-internal-hook design. See "Prop mismatch" below
for the more serious version of this same drift.

**"Edit Profile" button** (a plain `<button>`, not the shared `Button`
component):

```js
onClick={() => {
  setOpenModal(true);
  handleSetDefaultValues(profileData?.user);   // no-op, see above
}}
```

Only `setOpenModal(true)` has any real effect — it causes `ProfileUpdate` (not
`ProfileCompletion`) to render, since `ProfileUpdate` is gated on
`openModal === true` while `ProfileCompletion` is gated on a completely separate
condition (below).

**Rendered fields that are real, live data:** `profileData?.user?.name`,
`profileData?.user?.description`. **Rendered fields that are hardcoded
placeholders, not derived from `profileData` at all:** the cover photo
(`https://images.pexels.com/...`), the profile picture
(`https://t3.ftcdn.net/...`), and the follower/event counts (`1.25k` Followers,
`231` Hosted Events) — none of these read any prop or state; they are static JSX
every time, for every account.

**Two modals, two independent trigger conditions — read carefully, this is where
the two profile-edit modals from `onboarding-profile` actually get mounted:**

```jsx
{
  profileData?.user?.config?.hasCompletedProfile === false && (
    <ProfileCompletion
      edit={openModal}
      setOpenModal={setOpenModal}
      refreshProfileData={refreshProfileData}
    />
  );
}

{
  openModal === true && (
    <ProfileUpdate
      setOpenModal={setOpenModal}
      refreshProfileData={refreshProfileData}
      profileData={profileData?.user}
    />
  );
}
```

- **`ProfileCompletion`** renders whenever the fetched profile is explicitly
  incomplete (`config.hasCompletedProfile === false`), **independent of
  `openModal`** — a brand-new account lands on `/dashboard` and sees this
  immediately, with no click required.
- **`ProfileUpdate`** renders whenever `openModal === true`, i.e. only after the
  "Edit Profile" button is clicked.
- **These two conditions are not mutually exclusive.** If an account has an
  incomplete profile (`hasCompletedProfile === false`) _and_ the user clicks
  "Edit Profile," **both modals mount at the same time** — two full-screen
  overlay modals stacked on top of each other, since neither overlay is a
  portal-with-single-slot and both build their own `position: fixed`-style
  `*_overlay` div independently (see
  [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md)). This is a
  newly-identified bug, not previously documented — reproduce it by loading
  `/dashboard` as an account with `hasCompletedProfile: false` and clicking
  "Edit Profile."

**Critical prop-name mismatch (newly identified, not in
`docs/specs/dashboard.md` or `known-issues.md`):** `Dashboard.tsx` passes
`setOpenModal` and `edit` to `ProfileCompletion`, but
[`ProfileCompletion.tsx`](../onboarding-profile/components/ProfileCompletion.tsx)
destructures its props as `({ setShowEditModal, refreshProfileData })` — there
is no `setOpenModal` or `edit` prop in its signature. Concretely:
`setShowEditModal` is `undefined` inside `ProfileCompletion` when it's rendered
from this page (`refreshProfileData` _is_ correctly named and does work).
**`ProfileCompletion`'s header "Save" button calls `setShowEditModal(false)` on
a successful save — calling `undefined(false)` throws
`TypeError: setShowEditModal is not a function`, uncaught, with no error
boundary anywhere in the app (see
[error-handling/SPEC.md](../error-handling/SPEC.md)).** The form's own bottom
"Submit" button doesn't call `setShowEditModal` at all (see
`onboarding-profile/SPEC.md`'s breakdown of
`useProfileCompletion.validateForm`), so that path doesn't crash, but it also
never closes the modal on this page either way (same non-closing behavior
documented in `onboarding-profile/SPEC.md`) — combined, **there is currently no
way to close `ProfileCompletion` from `/dashboard` without a full page reload or
navigating away**, and clicking its header Save button will crash the render
tree. This is very likely the single highest-value bug to fix in this feature if
you're asked to "fix the dashboard profile completion modal" — the fix is either
renaming the prop `Dashboard.tsx` passes (`setShowEditModal={setOpenModal}`) to
match `ProfileCompletion`'s actual signature, or changing
`ProfileCompletion.tsx` to accept `setOpenModal` — confirm which naming
convention to converge on, since `Profile.tsx` (the other place
`ProfileCompletion` is rendered) passes `setShowEditModal` correctly today and
shouldn't be broken by the fix.

## `components/TrackSection.tsx`

Purely presentational, no props, no data fetching. A `7D`/`14D`/`28D` tab row —
only `7D` has the `active_calendar` class; `14D`/`28D` are plain `<p>` with no
`onClick`, so clicking them does nothing. Two static stat boxes: "Impressions:
6,025" and "Click Rate: 43%" — not derived from any prop, state, or fetch. A
"See detailed analytics" `<Link to="/">` — points at the home page, not a real
analytics view. This intentionally matches the "Real time Analytics — Coming
Soon" label wrapped around it in `Dashboard.tsx`; it is a deliberate visual
placeholder, not a partially-wired feature.

## `services/fetchDashboard()` — exists, unused (lives in `src/services/KarmaCircleApi.ts`, not this folder)

`fetchDashboard()` (`GET /organizations/dashboard`, via
`organizationEndpoints.dashboard`) is exported from the shared `KarmaCircleApi.ts` but
**no component in this feature (or anywhere else) calls it**. `Dashboard.tsx`
fetches `userEndpoints.profile` instead, which returns the account's own
user/organization record — not aggregate dashboard analytics. If you're ever
asked to wire up the real analytics `TrackSection` is a placeholder for,
`fetchDashboard()` is the endpoint that was evidently built for exactly that
purpose; nothing about its response shape can be verified from this repo (no
backend code here) — check the backend repo for what
`GET /organizations/dashboard` actually returns before assuming a shape.

## `components/ProfileSection.tsx` — dead stub

```jsx
const ProfileSection = () => <div>ProfileSection</div>;
```

Not imported by `Dashboard.tsx` or any other file in the repo. Given the naming
overlap with `Dashboard.tsx`'s own `.profileSection_container` div (the block
holding the cover photo/profile picture/counts/name/description), this was
likely meant to be extracted into its own component and never finished — if
asked to componentize that block, this is the file to fill in rather than
creating a new one.

## Data flow summary

```
Dashboard.tsx mount
   ▼
useSWR(userEndpoints.profile, fetcher)
   │  onSuccess → dispatch(updateUserData(data?.user))   [keeps Redux in sync with server]
   │  onError   → showErrorToast(...)
   ▼
profileData?.user  (real: name, description, config.hasCompletedProfile)
profileData?.user  (ignored: cover photo, profile picture, follower/event counts — all static JSX instead)
   │
   ├─ config.hasCompletedProfile === false ──► <ProfileCompletion setOpenModal edit refreshProfileData />
   │                                              ⚠ prop mismatch — setShowEditModal is undefined inside it
   │
   └─ "Edit Profile" click → setOpenModal(true) ──► <ProfileUpdate setOpenModal refreshProfileData profileData={profileData?.user} />
                                                        (this one is wired correctly and works)
```

## Types

This folder is TypeScript (`.ts`/`.tsx`) as of the
dashboard/donate-shop-trending conversion pass — see `tsconfig.json` at the repo
root and [authentication/SPEC.md](../authentication/SPEC.md#types) for the
general pattern this repo follows. `types/index.ts` holds
`DashboardProfileUser`/`DashboardProfileResponse` — the shape of
`useSWR(userEndpoints.profile, fetcher)`'s data, kept independent of
`src/types/user.ts`'s `User` (the Redux slice shape) since they're different
data sources that happen to overlap, not the same type. The
`edit`/`setOpenModal`/`setShowEditModal` prop-name mismatch documented above is
a real, pre-existing bug — converting to TypeScript actually surfaces it as a
compile error (`ProfileCompletion.tsx`'s inferred prop type doesn't have
`edit`/`setOpenModal`), which is suppressed with a documented `@ts-expect-error`
rather than fixed, since fixing it is a behavior change out of scope for a
types-only pass. Remove that suppression in the same change if you ever do fix
the mismatch. `ProfileCompletion.tsx`, `ProfileUpdate.tsx`, and
`useProfileCompletion.ts` (all in `onboarding-profile`) are themselves typed
too, as of that feature's own conversion pass.

## Known issues specific to this feature

- **`ProfileCompletion` receives the wrong prop name from this page**
  (`setOpenModal`/`edit` vs. the component's actual `setShowEditModal`) —
  clicking its header Save button here throws. New finding, highest-priority fix
  in this folder.
- **`ProfileCompletion` and `ProfileUpdate` can both be mounted simultaneously**
  when an incomplete-profile account clicks "Edit Profile." New finding.
- **`handleSetDefaultValues(profileData?.user)` in the Edit Profile handler is a
  no-op** — it mutates a hook instance nothing reads. New finding.
- Stray `console.log(profileData?.user)` in the Edit Profile click handler —
  already in `known-issues.md`.
- Cover photo, profile picture, and follower/event counts are all hardcoded —
  already in `known-issues.md`.
- `fetchDashboard()` exists and is unused — already in `known-issues.md`.
- `ProfileSection.tsx` is a dead one-line stub — already in `known-issues.md`.
- No route guard on `/dashboard` — by design (see "Why it's shaped this way"
  above), not a bug to fix reflexively, but worth confirming with product intent
  before adding one, since an anonymous visitor loading this page today just
  sees a mostly-blank shell rather than an error.

## If you're asked to...

- **"Fix the dashboard's edit-profile modal crashing / not closing"** → fix the
  `setShowEditModal`/`setOpenModal` prop mismatch described above first; that's
  the reproducible crash.
- **"Stop both modals from showing at once"** → add a mutual-exclusion
  condition, e.g. only render `ProfileUpdate` when `hasCompletedProfile` is not
  `false`, or close `ProfileCompletion` before opening `ProfileUpdate`.
- **"Make the Edit Profile button actually pre-fill from existing data"** →
  `ProfileUpdate` already does this correctly via its `profileData` prop; if the
  ask is about `ProfileCompletion` specifically, remember its internal
  `useProfileCompletion()` instance is separate from Dashboard's — you'd need to
  either lift the hook up and pass `credentials`/`handleChange` down as props,
  or drop Dashboard's redundant `handleSetDefaultValues` call as dead code.
- **"Wire up real analytics"** → `fetchDashboard()` (`KarmaCircleApi.ts`) is the
  intended data source; `TrackSection.tsx` is the component to make dynamic
  (currently fully static).
- **"Show real follower/event counts and cover/profile images"** → these need
  real fields on the `userEndpoints.profile` response (check the backend repo
  for what's actually available) wired into the corresponding static JSX in
  `Dashboard.tsx`.
