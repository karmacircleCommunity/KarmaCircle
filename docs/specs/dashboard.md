# Dashboard

Routed at `/dashboard`, reachable by URL to any visitor regardless of auth state (no route guard — see [authentication.md](./authentication.md)); in practice it only shows meaningful data when the session cookie belongs to an organization/org account.

## `Dashboard.tsx`

[apps/web/src/features/dashboard/pages/Dashboard.tsx](../../apps/web/src/features/dashboard/pages/Dashboard.tsx).

- Fetches the logged-in account's own profile via SWR: `useSWR(userEndpoints.profile, fetcher, { onSuccess, onError })`.
  `onSuccess` dispatches `updateUserData(data?.user)` to Redux on every successful fetch/revalidation, keeping Redux in sync with the server.
  `onError` shows an error toast with `error?.response?.data?.message`.
- **The whole page is wrapped in `OrganizationSetupGate`.** An organization still in draft never sees the placeholders below; it gets a panel naming what is still missing and a link that resumes setup at the step it stopped on. The gate is a no-op for a live organization, and fetches nothing for an individual. See [organizations.md](./organizations.md#the-setup-flow--organizationsetup).
- **It no longer renders `ProfileCompletion`.** That modal — the old "We're almost done" org-completion form, mounted whenever `config.hasCompletedProfile === false` — was a second, competing implementation of the same job as the setup wizard, and its close button was wired to a prop this page never passed, so it could not be dismissed. It is gone from here; the component itself is still in the tree, now rendered nowhere. See [onboarding-profile.md](./onboarding-profile.md).
- Renders a cover image and profile picture — both are hardcoded stock photo URLs (Pexels/other CDN), not derived from `profileData` at all.
- Renders static follower/event counts (`1.25k` / `231`) — not derived from `profileData` either; these are placeholder numbers.
- An "Edit Profile" `<button>` opens `ProfileUpdate` (`setOpenModal(true)`), first calling `handleSetDefaultValues(profileData?.user)` from `useProfileCompletion` to pre-populate the form.
- Renders `profileData?.user?.name` and `profileData?.user?.description` (these two *are* real, live data).
- Conditionally renders `ProfileCompletion` when `profileData?.user?.config?.hasCompletedProfile === false`, and `ProfileUpdate` when `openModal === true` — see [onboarding-profile.md](./onboarding-profile.md) for both components' behavior.
- Renders `<TrackSection />` inside a `.dashboard_track` block labeled "Real time Analytics — Coming Soon".

There's a stray `console.log(profileData?.user)` in the "Edit Profile" click handler — remove it if you're in this file for another reason.

## `TrackSection`

[apps/web/src/features/dashboard/components/TrackSection.tsx](../../apps/web/src/features/dashboard/components/TrackSection.tsx).
Purely presentational analytics widget: a 7D/14D/28D tab row (only "7D" is styled active; clicking the others does nothing — no `onClick` handlers), and two static stat boxes ("Impressions: 6,025", "Click Rate: 43%").
A "See detailed analytics" link points to `/` (home), not a real analytics page.
Matches the "Coming Soon" framing in `Dashboard.tsx` — this is intentionally a visual placeholder, not wired to `fetchDashboard()` (see below) despite that function existing.

## `fetchDashboard` (defined, unused)

[KarmaCircleApi.ts](../../apps/web/src/services/KarmaCircleApi.ts) exports `fetchDashboard()` (`GET /organizations/dashboard`, via `organizationEndpoints.dashboard`).
No component currently calls it — `Dashboard.tsx` fetches `userEndpoints.profile` instead.
If you're asked to wire up real dashboard analytics, this is the endpoint that was evidently intended for it.

## `ProfileSection` (empty stub)

[apps/web/src/features/dashboard/components/ProfileSection.tsx](../../apps/web/src/features/dashboard/components/ProfileSection.tsx) is a one-line placeholder (`<div>ProfileSection</div>`) and is not imported by `Dashboard.tsx` or anywhere else.

## Types

This entire folder is TypeScript. See [dashboard/SPEC.md](../../apps/web/src/features/dashboard/SPEC.md#types) for the full breakdown, including how the `edit`/`setOpenModal` prop-name mismatch now surfaces as a (suppressed) compile error.
