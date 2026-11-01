# Onboarding and profile E2E coverage

`profile-page.spec.ts` covers direct desktop/mobile Edit profile navigation, retired `/user/:userName` URLs, successful editor save/reopen, and navbar logout.
Mobile account navigation opens through the signed-in avatar's `Open account menu` control.
The sparse `Profile.tsx` page was deleted on 26 October 2026.
Both navigation variants open `/user/setup`; saving or cancelling returns Home.
Access control, expired sessions, rejected saves, cancellation without saving, and load retry remain in `../authentication/session.spec.ts`.
Tests create isolated individual accounts through the real signup UI and read the generated handle from the isolated API.
The unrouted `UserProfile` prototype and legacy completion modal are not activated by this change.

These browser specs are exercised through the isolated Playwright setup described in [docs/specs/testing.md](../../../../docs/specs/testing.md).
The organization onboarding test resumes at the first unanswered setup question, since signup already saves the organization name.
