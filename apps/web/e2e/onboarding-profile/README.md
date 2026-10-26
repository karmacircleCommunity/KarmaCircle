# Onboarding and profile E2E coverage

`profile-page.spec.ts` covers direct desktop/mobile Edit profile navigation, retired `/user/:userName` URLs, successful editor save/reopen, and navbar logout.
The sparse `Profile.tsx` page was deleted on 26 October 2026.
Both navigation variants open `/user/setup`; saving or cancelling returns Home.
Access control, expired sessions, rejected saves, cancellation without saving, and load retry remain in `../authentication/session.spec.ts`.
Tests create isolated individual accounts through the real signup UI and read the generated handle from the isolated API.
The unrouted `UserProfile` prototype and legacy completion modal are not activated by this change.

These updated browser specs were not executed during removal, following the standing instruction against UI testing unless requested.
Build, type, and lint verification do not establish runtime E2E success.
