# Onboarding & Profile

Covers the post-signup "complete your profile" flow, editing an existing profile, and the two (largely redundant) public profile pages.

## Profile completion flow (new users)

After signup, an organization/org account's profile is missing required fields (description, address).
[checkMissingFields.ts](../../apps/web/src/features/onboarding-profile/utils/checkMissingFields.ts) checks whether `city`, `state`, `address`, `country`, or `pincode` are `undefined` on the user object, or — for `userType === "organization"` — whether `tagLine`/`description` are `undefined`.

**Trigger sites:**
- [Profile.tsx](../../apps/web/src/features/onboarding-profile/pages/Profile.tsx): on mount, sets `showProfileModal = true` if `!Cookies.get("skipProfileCompletion") && checkMissingFields(user) && trueUser` (i.e. you're viewing your own profile) — **but nothing in this file's JSX ever reads `showProfileModal` to render anything.** `Profile.tsx` doesn't import `ProfileCompletion` at all. Corrects an earlier version of this doc (and of `onboarding-profile/SPEC.md`), which described this as showing the completion modal — see SPEC.md for the full finding.
- [Dashboard.tsx](../../apps/web/src/features/dashboard/pages/Dashboard.tsx): shows the completion modal whenever `profileData?.user?.config?.hasCompletedProfile === false`, a different (and more explicit) signal than `checkMissingFields`. This is currently the **only** place `ProfileCompletion` is actually rendered — and it does so with a prop-name mismatch (`edit`/`setOpenModal` vs. the component's real `setShowEditModal`/`refreshProfileData`) — see [dashboard/SPEC.md](../../apps/web/src/features/dashboard/SPEC.md#types).

These two entry points use **different conditions** to decide whether to show the same modal — a user could satisfy one and not the other.
See [known-issues.md](./known-issues.md).

## `useProfileCompletion` hook

[apps/web/src/features/onboarding-profile/hooks/useProfileCompletion.ts](../../apps/web/src/features/onboarding-profile/hooks/useProfileCompletion.ts) owns the completion form's local state: `credentials = { description, coverImage, address: { line1, line2, city, state, country, pincode } }`.

- `handleChange(field)` — updates `description` at the top level, or nests into `address` for every other field name.
- `validateForm(updatedCredentials)` — checks `description` is present and 100–500 characters, all six address subfields are present, and `pincode` is numeric.
  Sets `errors` as a side effect, then — regardless of whether `newErrors` is empty — calls `completeProfileApiCall({ credentials: { ...updatedCredentials, config: { hasCompletedProfile: true } } })` (`PATCH /user/complete`) anyway.
  The function only *returns* `Object.keys(newErrors).length === 0` after that API call, so validation failing does not currently prevent the submit request from firing; it only affects what gets returned to the caller and what error text renders. See [known-issues.md](./known-issues.md).
- `handleSetDefaultValues(profileData)` / `handleResetFields()` — pre-fill or clear the form.
- `clearError(field)` — removes one key from `errors`.

## `ProfileCompletion` component

[apps/web/src/features/onboarding-profile/components/ProfileCompletion.tsx](../../apps/web/src/features/onboarding-profile/components/ProfileCompletion.tsx) renders the modal: a cover-image dropzone (local preview only, via `URL.createObjectURL` — the file itself is never uploaded or attached to the API call), an "Organization Description" textarea with a live `x/500` counter, and address line1/line2/city/state/country/pincode inputs.

There are **two Save buttons** wired to two different handlers: the header button calls `completeProfileApiCall(...)` directly and closes the modal + refetches on success; the form's own submit button calls `validateForm(credentials)` from the hook (whose behavior is described above).
Both are gated on the same `disabled` condition (all required fields non-empty).
This means depending on which button the user clicks, slightly different code paths run — worth consolidating if you touch this component.

Props: `setShowEditModal`, `refreshProfileData` (an SWR `mutate` function passed down from the parent).

## `ProfileUpdate` component (editing an existing profile)

[apps/web/src/features/onboarding-profile/components/ProfileUpdate.tsx](../../apps/web/src/features/onboarding-profile/components/ProfileUpdate.tsx) is a near-duplicate of `ProfileCompletion`, used for editing an *already-completed* profile.
Differences: it also edits `name`, it accepts a `profileData` prop to pre-fill from (instead of a separate `handleSetDefaultValues` call), it has a cover-image *and* a profile-picture dropzone (both preview-only, same caveat — neither file is actually uploaded), and its single Save button calls its own local `validateForm()`, which — like `useProfileCompletion`'s version — calls `updateUserProfile({ credentials })` (`PATCH /user/update`) regardless of validation outcome, for the same reason.

Rendered from `Dashboard.tsx` when `openModal === true` (opened by the dashboard's "Edit Profile" button).
**Not rendered from `Profile.tsx`'s own "Edit profile" button at all** — that button (`toggleProfileModal`) sets `editProfile = true` and flips `showProfileModal`, but `Profile.tsx` never reads either of those to render `ProfileCompletion`, `ProfileUpdate`, or anything else. Clicking "Edit profile" on `/user/:userName` or `/organization/:userName` currently has no visible effect — see [onboarding-profile/SPEC.md](../../apps/web/src/features/onboarding-profile/SPEC.md#types) for the full finding. (An earlier version of this doc said this button opened `ProfileCompletion`; it doesn't.)

## Field metadata: `ProfileElements` and `getProfileFields`

[apps/web/src/features/onboarding-profile/constants/ProfileElements.ts](../../apps/web/src/features/onboarding-profile/constants/ProfileElements.ts) is a declarative list of profile fields (`name`, `firstName`, `lastName`, `tagLine`, `description`, `city`, `state`, `address`, `country`, `pincode`) with label/placeholder/minimum-length/error-message metadata — intended for driving a generic field renderer.
Not currently imported by any component; `ProfileCompletion`/`ProfileUpdate` hardcode their own JSX per field instead.

[apps/web/src/features/onboarding-profile/utils/getProfileFields.ts](../../apps/web/src/features/onboarding-profile/utils/getProfileFields.ts) computes which fields are missing (`getMissingElements`) or which are all editable (`getEditableFields`) based on `userType` and whether `tagLine` is set.
Also not currently imported anywhere.
Both files look like scaffolding for a future generic/dynamic profile-form component.

## Public profile pages (two, overlapping)

There are **two separate "view a profile" pages** in this feature, though only one is actually routed — see each below:

### `Profile.tsx` — routed at `/user/:userName` and `/organization/:userName`
[apps/web/src/features/onboarding-profile/pages/Profile.tsx](../../apps/web/src/features/onboarding-profile/pages/Profile.tsx).
Fetches via SWR: `organizationEndpoints.details(params.userName)` (`GET /organizations?userName=...`) — used for *both* individual and organization profiles, despite the endpoint's "organization" naming.
Renders differently based on `details?.userType === "organization"` (name + tagline) vs. individual (firstName + lastName).
`trueUser = user?.userName === params.userName` decides whether the viewer sees "Edit profile"/"Logout" or "Subscribe"/"Sponsor" (the latter two are static, non-functional buttons — no `onClick`).
Renders an embedded Google Maps `<iframe>` for organizations only, defaulting to a hardcoded Kolkata location if `user?.iframe` is unset (note: reads `user?.iframe`, i.e. the *viewer's* Redux state, not `details?.iframe` — likely should read from the fetched `details`).
Contains a duplicated block of markup: the `profile_header_ctadiv` (Subscribe/Sponsor/Edit/Logout buttons) is rendered twice in the JSX, once inside `.profile_header_details` and once again directly below it — a copy-paste leftover, not an intentional two-row layout. See [known-issues.md](./known-issues.md).

### `UserProfile.tsx` — not routed
[apps/web/src/features/onboarding-profile/pages/UserProfile.tsx](../../apps/web/src/features/onboarding-profile/pages/UserProfile.tsx) is a second, more visually developed profile page (profile picture, social icons, an "Events Attending" `Swiper` carousel with 6–8 hardcoded placeholder slides, responsive slide count).
Fetches via SWR: `userEndpoints.details(params.slug)` (`GET /user?userName=...`).
**This page is not referenced by `routesConfig.tsx` at all** — there is no route for it, so it is currently unreachable through normal navigation.
It reads `Cookies.get("userName")`, a cookie that is never set anywhere else in the codebase (compare to `Profile.tsx`'s `trueUser` check, which uses Redux state instead) — so its "is this my own profile" branch can never evaluate true in the current app.
Treat this as a work-in-progress replacement for (or alternate design of) `Profile.tsx` rather than a currently-active page.

When asked to add profile features, confirm with whoever's asking whether they mean the *live* `Profile.tsx` or intend to finish wiring up `UserProfile.tsx`.

## Types

This entire folder is TypeScript. See [onboarding-profile/SPEC.md](../../apps/web/src/features/onboarding-profile/SPEC.md#types) for the full breakdown, including two more previously-undocumented bugs converting to strict typing surfaced: `ProfileUpdate.tsx`'s reset function drops the `name` field, and `UserProfile.tsx`'s Logout button passes a plain `onClick` the shared `Button` component silently ignores.
