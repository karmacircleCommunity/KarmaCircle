# Authentication — E2E coverage

Playwright specs for `apps/web/src/features/authentication/`. See [docs/specs/authentication.md](../../../../docs/specs/authentication.md) for how the flow actually works before changing anything here — Auth.tsx is one page with three local-state steps (`"email"` → `"signin"`/`"signup"`), not three routes.

## Files

| File | Covers |
|---|---|
| [signup.spec.ts](./signup.spec.ts) | The `"email"` step's own validation/routing, then the `"signup"` branch: name sanitization, the live password-strength meter, the Sign Up button's disabled state, a full successful individual signup, and that an organization signup lands on `/organization/setup` instead of `/` |
| [signin.spec.ts](./signin.spec.ts) | The `"signin"` branch: routing an existing email there, wrong-password rejection, a successful sign-in, the Back button, and the `DonotRenderWhenLoggedIn` route guard |
| [session.spec.ts](./session.spec.ts) | Signed-out setup access, expired persisted login/navbar recovery, valid httpOnly cookies, expiry during save/close, server-error retry, and answer retention after failed close |
| [password-reset.spec.ts](./password-reset.spec.ts) | `ForgotPassword.tsx` + `ResetPassword.tsx`: the identical-response-either-way confirmation, a full request→reset→sign-in-with-the-new-password round trip, mismatched-confirm-password rejection, and an invalid/expired token |

## Test data

Every test either fills the signup form itself or seeds an account directly against the e2e API (`request.post(`${E2E_API_URL}/auth/signup`, ...)`) rather than going through the UI first — faster, and it keeps a test that's specifically about *signing in* from also depending on the signup flow being correct. Every seeded account uses a `Date.now()`-based unique email; there's no reset between spec files (see [docs/specs/testing.md](../../../../docs/specs/testing.md#why-no-reset-between-spec-files)), so a fixed address would collide across parallel runs.

**The password-reset round trip needs one thing no other spec in this suite does: reading back an email the app "sent".** `apps/api/src/config/mailer.ts` never calls the real Resend API when `NODE_ENV==="test"` — it pushes to an in-memory outbox instead, readable via `GET /__test__/last-reset-url?email=...` (gated the same `NODE_ENV==="test"`-only way as `/__test__/reset`; see `apps/api/docs/specs/testing.md`). `password-reset.spec.ts`'s `fetchResetUrl()` helper is the only place in this folder that calls it.

## What's not covered, on purpose

- **Google OAuth** (`handleGoogle()`, the "Continue with Google" button) — it full-page-redirects to a real Google consent screen, which this suite doesn't attempt to drive or mock. Untested.
- **`useValidation.ts`/`useFormLogic.ts`** — a richer, unused validator described in `docs/specs/authentication.md`. `Auth.tsx` doesn't call either, so there's nothing reachable through the UI to test.
- **Logout** - covered by `e2e/onboarding-profile/profile-page.spec.ts`; the session tests here remove cookies to simulate expiry rather than pressing Logout.
- **The 409-on-signup race** (`useAuth.ts` mapping a backend `USER_ALREADY_EXISTS` onto `errors.email` and stepping back to `"email"`) — real, but genuinely racy to trigger deliberately in a single test; not attempted.

## Keeping this honest

If `Auth.tsx`/`ForgotPassword.tsx`/`ResetPassword.tsx` changes in a way that changes what's asserted here, update the relevant spec in the same change — same rule as the rest of this repo's specs. If you add a new spec file to this folder, add it to the table above.

## Session regression data

`session.spec.ts` seeds unique accounts against the isolated test API, then signs in through the real UI.
Cookie removal simulates session expiry while preserving Redux localStorage.
The load-outage test injects a 503 for `GET /user/profile`; retry resumes real API requests.
The failed-close test injects a 503 for `PATCH /user/update` and verifies that unsaved answers remain available.
No test uses the local development database or ports.

After sparse profile removal, Close returns Home rather than `/user/:userName`.
Updated navigation expectations have not yet been rerun in a browser.
