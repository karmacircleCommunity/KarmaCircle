# Onboarding & Profile — E2E coverage

Playwright specs for `apps/web/src/features/onboarding-profile/`. Read [docs/specs/onboarding-profile.md](../../../../docs/specs/onboarding-profile.md) first — this feature has more unreachable/dead code than working code, and the coverage here reflects that rather than pretending otherwise.

## Files

| File | Covers |
|---|---|
| [profile-page.spec.ts](./profile-page.spec.ts) | `Profile.tsx` at `/user/:userName` — the trueUser-vs-visitor button set (Edit profile/Logout vs. Subscribe/Sponsor), that Edit profile opens the individual setup wizard, that Logout actually works, and that the desktop/mobile button rows are legitimate responsive variants, not the duplicate the docs used to claim |

## Why this folder is thin, and what "properly tested" means here

The individual setup wizard is reachable from Edit profile.
Its authentication and failure recovery coverage lives in [authentication/session.spec.ts](../authentication/session.spec.ts).
Some older components remain unreachable:

- **`ProfileCompletion`** (the "complete your profile" modal) — `Profile.tsx` sets the state meant to show it but never reads that state in its JSX; `Dashboard.tsx` stopped mounting it in favor of `OrganizationSetupGate` (organizations only). It is currently mounted nowhere in the app. Untestable through E2E until something actually renders it again.
- **`ProfileUpdate`** (the edit-existing-profile modal) — rendered from `Dashboard.tsx`, reachable via its "Edit Profile" button. Not yet covered here; would need its own spec once `dashboard`'s own E2E coverage exists (out of scope of this pass — see the repo's `docs/specs/testing.md` for what's covered where).
- **`UserProfile.tsx`** — a second, more developed profile page with no route in `routesConfig.tsx` at all. Unreachable, untested, by design (see the file's own header comment for why it's not deleted either).

`Profile.tsx` coverage exercises owner/visitor controls, editing navigation, logout, and responsive button visibility.
The owner-control tests set the existing `skipProfileCompletion` cookie so the separate missing-fields nudge does not redirect before those controls can be checked.
A full successful three-question profile-edit/save journey remains outside this coverage.

## A stale doc claim this suite corrected

Writing `profile-page.spec.ts` surfaced that `docs/specs/onboarding-profile.md`, `known-issues.md`, and `onboarding-profile/SPEC.md` all described `Profile.tsx`'s button row as duplicated markup — a copy-paste bug, referencing pre-Tailwind-rewrite class names (`.profile_header_ctadiv`). Checked against the actual current JSX: the two blocks are `max-430px:hidden` (desktop) and `min-430px:hidden` (mobile) — a legitimate responsive pair, mutually exclusive, not a duplicate. All three docs were corrected in the same change that added this test file. `profile-page.spec.ts`'s "mutually exclusive" test is the regression guard.

## Test data

Every test signs up its own individual account through the real UI (same reasoning as `landing-home/hero.spec.ts`'s logged-in test — `trueUser` depends on Redux state, which only the app's own login/signup action sets). The "viewing someone else's profile" test uses a second, separate `browser.newContext()` for the other account, so its session cookie never leaks into the viewer's context.

## Keeping this honest

If `ProfileCompletion` or `UserProfile.tsx` ever become reachable again, add real coverage here (and remove the corresponding bullet above) rather than leaving this file describing dead ends that got fixed.
