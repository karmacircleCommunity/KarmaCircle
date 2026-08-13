# Onboarding & Profile

Covers the post-signup "complete your profile" flow, editing an existing profile, and the two (largely redundant) public profile pages.

## Profile completion flow (new users)

After signup, a club/org account's profile is missing required fields (description, address).
[checkMissingFields.js](../../src/features/onboarding-profile/utils/checkMissingFields.js) checks whether `city`, `state`, `address`, `country`, or `pincode` are `undefined` on the user object, or — for `userType === "club"` — whether `tagLine`/`description` are `undefined`.

**Trigger sites:**
- [Profile.jsx](../../src/features/onboarding-profile/pages/Profile.jsx): on mount, if `!Cookies.get("skipProfileCompletion") && checkMissingFields(user) && trueUser` (i.e. you're viewing your own profile), shows the completion modal.
- [Dashboard.jsx](../../src/features/dashboard/pages/Dashboard.jsx): shows the completion modal whenever `profileData?.user?.config?.hasCompletedProfile === false`, a different (and more explicit) signal than `checkMissingFields`.

These two entry points use **different conditions** to decide whether to show the same modal — a user could satisfy one and not the other.
See [known-issues.md](./known-issues.md).

## `useProfileCompletion` hook

[src/features/onboarding-profile/hooks/useProfileCompletion.js](../../src/features/onboarding-profile/hooks/useProfileCompletion.js) owns the completion form's local state: `credentials = { description, coverImage, address: { line1, line2, city, state, country, pincode } }`.

- `handleChange(field)` — updates `description` at the top level, or nests into `address` for every other field name.
- `validateForm(updatedCredentials)` — checks `description` is present and 100–500 characters, all six address subfields are present, and `pincode` is numeric.
  Sets `errors` as a side effect, then — regardless of whether `newErrors` is empty — calls `completeProfileApiCall({ credentials: { ...updatedCredentials, config: { hasCompletedProfile: true } } })` (`PATCH /user/complete`) anyway.
  The function only *returns* `Object.keys(newErrors).length === 0` after that API call, so validation failing does not currently prevent the submit request from firing; it only affects what gets returned to the caller and what error text renders. See [known-issues.md](./known-issues.md).
- `handleSetDefaultValues(profileData)` / `handleResetFields()` — pre-fill or clear the form.
- `clearError(field)` — removes one key from `errors`.

## `ProfileCompletion` component

[src/features/onboarding-profile/components/ProfileCompletion.jsx](../../src/features/onboarding-profile/components/ProfileCompletion.jsx) renders the modal: a cover-image dropzone (local preview only, via `URL.createObjectURL` — the file itself is never uploaded or attached to the API call), an "Organization Description" textarea with a live `x/500` counter, and address line1/line2/city/state/country/pincode inputs.

There are **two Save buttons** wired to two different handlers: the header button calls `completeProfileApiCall(...)` directly and closes the modal + refetches on success; the form's own submit button calls `validateForm(credentials)` from the hook (whose behavior is described above).
Both are gated on the same `disabled` condition (all required fields non-empty).
This means depending on which button the user clicks, slightly different code paths run — worth consolidating if you touch this component.

Props: `setShowEditModal`, `refreshProfileData` (an SWR `mutate` function passed down from the parent).

## `ProfileUpdate` component (editing an existing profile)

[src/features/onboarding-profile/components/ProfileUpdate.jsx](../../src/features/onboarding-profile/components/ProfileUpdate.jsx) is a near-duplicate of `ProfileCompletion`, used for editing an *already-completed* profile.
Differences: it also edits `name`, it accepts a `profileData` prop to pre-fill from (instead of a separate `handleSetDefaultValues` call), it has a cover-image *and* a profile-picture dropzone (both preview-only, same caveat — neither file is actually uploaded), and its single Save button calls its own local `validateForm()`, which — like `useProfileCompletion`'s version — calls `updateUserProfile({ credentials })` (`PATCH /user/update`) regardless of validation outcome, for the same reason.

Rendered from `Dashboard.jsx` when `openModal === true` (opened by the dashboard's "Edit Profile" button).
Not currently rendered from `Profile.jsx`'s own "Edit profile" button — that button (`toggleProfileModal`) instead sets `editProfile = true` and opens `showProfileModal`, which renders `ProfileCompletion`, not `ProfileUpdate`.
So editing from `/user/:userName` or `/club/:userName` opens the *completion* form, not the *update* form, even for a fully-completed profile.

## Field metadata: `ProfileElements` and `getProfileFields`

[src/features/onboarding-profile/constants/ProfileElements.js](../../src/features/onboarding-profile/constants/ProfileElements.js) is a declarative list of profile fields (`name`, `firstName`, `lastName`, `tagLine`, `description`, `city`, `state`, `address`, `country`, `pincode`) with label/placeholder/minimum-length/error-message metadata — intended for driving a generic field renderer.
Not currently imported by any component; `ProfileCompletion`/`ProfileUpdate` hardcode their own JSX per field instead.

[src/features/onboarding-profile/utils/getProfileFields.js](../../src/features/onboarding-profile/utils/getProfileFields.js) computes which fields are missing (`getMissingElements`) or which are all editable (`getEditableFields`) based on `userType` and whether `tagLine` is set.
Also not currently imported anywhere.
Both files look like scaffolding for a future generic/dynamic profile-form component.

## Public profile pages (two, overlapping)

There are **two separate "view a profile" pages** that both exist and are both routed, covering overlapping cases:

### `Profile.jsx` — routed at `/user/:userName` and `/club/:userName`
[src/features/onboarding-profile/pages/Profile.jsx](../../src/features/onboarding-profile/pages/Profile.jsx).
Fetches via SWR: `clubEndpoints.details(params.userName)` (`GET /clubs?userName=...`) — used for *both* individual and club profiles, despite the endpoint's "club" naming.
Renders differently based on `details?.userType === "club"` (name + tagline) vs. individual (firstName + lastName).
`trueUser = user?.userName === params.userName` decides whether the viewer sees "Edit profile"/"Logout" or "Subscribe"/"Sponsor" (the latter two are static, non-functional buttons — no `onClick`).
Renders an embedded Google Maps `<iframe>` for clubs only, defaulting to a hardcoded Kolkata location if `user?.iframe` is unset (note: reads `user?.iframe`, i.e. the *viewer's* Redux state, not `details?.iframe` — likely should read from the fetched `details`).
Contains a duplicated block of markup: the `profile_header_ctadiv` (Subscribe/Sponsor/Edit/Logout buttons) is rendered twice in the JSX, once inside `.profile_header_details` and once again directly below it — a copy-paste leftover, not an intentional two-row layout. See [known-issues.md](./known-issues.md).

### `UserProfile.jsx` — not routed
[src/features/onboarding-profile/pages/UserProfile.jsx](../../src/features/onboarding-profile/pages/UserProfile.jsx) is a second, more visually developed profile page (profile picture, social icons, an "Events Attending" `Swiper` carousel with 6–8 hardcoded placeholder slides, responsive slide count).
Fetches via SWR: `userEndpoints.details(params.slug)` (`GET /user?userName=...`).
**This page is not referenced by `routesConfig.jsx` at all** — there is no route for it, so it is currently unreachable through normal navigation.
It reads `Cookies.get("userName")`, a cookie that is never set anywhere else in the codebase (compare to `Profile.jsx`'s `trueUser` check, which uses Redux state instead) — so its "is this my own profile" branch can never evaluate true in the current app.
Treat this as a work-in-progress replacement for (or alternate design of) `Profile.jsx` rather than a currently-active page.

When asked to add profile features, confirm with whoever's asking whether they mean the *live* `Profile.jsx` or intend to finish wiring up `UserProfile.jsx`.
