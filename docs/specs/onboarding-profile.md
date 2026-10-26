# Onboarding & Profile

Covers the post-signup "complete your profile" flow, editing an existing profile, and the unrouted UserProfile prototype.

## Profile entry and completion

The sparse `Profile.tsx` screen and `/user/:userName` route were deleted on 26 October 2026.
Individuals open `/user/setup` directly from Edit profile in desktop and mobile navigation.
Old handle URLs reach the normal not-found page; no replacement public individual profile is introduced.
The existing welcome screen and three-question editor remain.
Save, Close, and Maybe later return Home; cancellation does not save.
The automatic completion nudge, `checkMissingFields.ts`, and completion-bypass cookie writes were removed with the page.
Organization setup and dashboard editing retain their existing flows.

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
Differences: it also edits `name`, it accepts a `profileData` prop to pre-fill from (instead of a separate `handleSetDefaultValues` call), it has a cover-image *and* a profile-picture dropzone (both preview-only, same caveat — neither file is actually uploaded), and its single Save button calls its own local `validateForm()` which, **as of October 2026, blocks `updateUserProfile({ credentials })` (`PATCH /user/update`) when validation errors are present** — `useProfileCompletion`'s version (feeding the still-unreachable `ProfileCompletion`) still fires its API call regardless of validation outcome.

Rendered from the organization dashboard only.
Individuals use the navbar link directly.

## Individual profile setup: `/user/setup`

The detailed [individual setup flowchart](./user-flows.md#individual-profile-setup-and-editing) now covers the actual entry, questions, save, exit, retry, and return paths.
The [26 October flow audit](./known-issues.md#individual-profile-setup---flow-audit-26-october-2026) records save/exit behavior and remaining verification gaps.

[apps/web/src/features/onboarding-profile/pages/ProfileSetup.tsx](../../apps/web/src/features/onboarding-profile/pages/ProfileSetup.tsx), added October 2026, is the individual-account equivalent of organizations' `/organization/setup` (see [organizations.md](./organizations.md#the-setup-flow--organizationsetup)): a Typeform-style, one-question-at-a-time flow, reached directly from the navbar's Edit profile link. It replaced `ProfileUpdate` as the individual edit surface because that modal's fields and polish level were built for organizations, not individuals, and reusing it read as off-brand and buggy for a personal profile.

It reuses the organization flow's **visual shell**, which moved out of `features/organizations/` into shared locations for this: `SetupLayout`, `SetupAside`, `SetupFieldLabel`, `SetupLocateButton` now live under `apps/web/src/components/setup/`, and `useLocateCity` under `apps/web/src/hooks/`. Organizations import from the same shared paths now — nothing about their behavior changed, only where the files live.

The question-rendering component and the location-fields component were **forked** rather than shared (`ProfileSetupQuestion.tsx`, `ProfileSetupLocationFields.tsx`, both in `components/setup/` under this feature) — organizations' versions are typed against `OrganizationSetupForm` and hardcode organization-only question kinds (`choice`/`chips`/`list`/`toggle`, a leadership editor, a sponsorship toggle) this two-field flow has no use for.

Scope is deliberately narrow: three questions — a bio (`description`), city/state (with the same location-suggest/"use my location" UX organizations get, off the bundled India city list), and the rest of the address (`line1`/`line2`/`country`/`pincode`) — covering the only fields `PATCH /user/update` actually persists for a profile (`name`/`coverImage` are out of scope for this flow). **Nothing is required.** An individual account has no publish/draft gate on the backend the way an organization does, so there's no multi-step save boundary, no required-field asterisks, and Continue is never blocked — `useProfileSetup.ts` always sends the complete current form (not just one step's dirty fields) on save, which is safe only because the form is fully seeded from `GET /user/profile` before anything is edited (see `utils/profileSetupForm.ts`'s `toProfileSetupPayload` for why a partial send would risk silently wiping address fields the backend's `$set` would otherwise overwrite whole).

See [onboarding-profile/SPEC.md](../../apps/web/src/features/onboarding-profile/SPEC.md) for the full file-by-file breakdown.

**Same-day addition: address-line autocomplete.** The "Address line 1" question's field is backed by Google Places (New) when `VITE_GOOGLE_MAPS_API_KEY` is set (`apps/web/.env.example`) — picking a suggestion fills `line1`/`line2`/`city`/`state`/`country`/`pincode` at once, the same "pick one thing, several fields update" shape the city/state location question already has. No key: the field is the plain text input it always was, no broken UI. **Not yet verified against a live key** as of this pass — see [onboarding-profile/SPEC.md](../../apps/web/src/features/onboarding-profile/SPEC.md#address-line-autocomplete-utilsgoogleplacests-hooksuseaddressautocompletets) for the full breakdown and [known-issues.md](./known-issues.md) for the live-verification gap.

## Field metadata: `ProfileElements` and `getProfileFields`

[apps/web/src/features/onboarding-profile/constants/ProfileElements.ts](../../apps/web/src/features/onboarding-profile/constants/ProfileElements.ts) is a declarative list of profile fields (`name`, `firstName`, `lastName`, `tagLine`, `description`, `city`, `state`, `address`, `country`, `pincode`) with label/placeholder/minimum-length/error-message metadata — intended for driving a generic field renderer.
Not currently imported by any component; `ProfileCompletion`/`ProfileUpdate` hardcode their own JSX per field instead.

[apps/web/src/features/onboarding-profile/utils/getProfileFields.ts](../../apps/web/src/features/onboarding-profile/utils/getProfileFields.ts) computes which fields are missing (`getMissingElements`) or which are all editable (`getEditableFields`) based on `userType` and whether `tagLine` is set.
Also not currently imported anywhere.
Both files look like scaffolding for a future generic/dynamic profile-form component.

## Public profile pages (two, overlapping)

There are **two separate "view a profile" pages** in this feature, though only one is actually routed — see each below:

### Removed sparse profile page

`Profile.tsx` and `/user/:userName` no longer exist.
The existing editor is the only routed individual profile experience.

### `UserProfile.tsx` — not routed
[apps/web/src/features/onboarding-profile/pages/UserProfile.tsx](../../apps/web/src/features/onboarding-profile/pages/UserProfile.tsx) is a second, more visually developed profile page (profile picture, social icons, an "Events Attending" `Swiper` carousel with 6–8 hardcoded placeholder slides, responsive slide count).
Fetches via SWR: `userEndpoints.details(params.slug)` (`GET /user?userName=...`).
**This page is not referenced by `routesConfig.tsx` at all** — there is no route for it, so it is currently unreachable through normal navigation.
It reads `Cookies.get("userName")`, a cookie that is never set anywhere else in the codebase (compare to `Profile.tsx`'s `trueUser` check, which uses Redux state instead) — so its "is this my own profile" branch can never evaluate true in the current app.
Treat this as a work-in-progress replacement for (or alternate design of) `Profile.tsx` rather than a currently-active page.

When asked to add profile features, confirm with whoever's asking whether they mean the *live* `Profile.tsx` or intend to finish wiring up `UserProfile.tsx`.

## Types

This entire folder is TypeScript. See [onboarding-profile/SPEC.md](../../apps/web/src/features/onboarding-profile/SPEC.md#types) for the full breakdown, including two more previously-undocumented bugs converting to strict typing surfaced: `ProfileUpdate.tsx`'s reset function drops the `name` field, and `UserProfile.tsx`'s Logout button passes a plain `onClick` the shared `Button` component silently ignores.

## Profile setup session and load failures

`/user/setup` is wrapped in `RequireSignIn`; signed-out visitors go to `/auth/signin`.
Startup session verification and later 401 handling clear stale Redux login, keeping navbar and guard consistent.
Other profile-load errors show a load-failure message and Try again button that revalidates SWR, rather than asking a signed-in user to sign in.

Close and Maybe later discard unsaved changes and replace setup with Home.
They never save, revalidate the own-profile cache, or show a success toast.
Only Save changes persists the form; failures keep local answers available for retry.
A 401 during save clears login and redirects through the route guard.

### Navigation after removal

Save, Close, and Maybe later replace the editor route with `/`.
No return to a user handle URL or completion-bypass cookie remains.
