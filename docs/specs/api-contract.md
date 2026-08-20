# API Contract — Backend Routes vs. What the Frontend Actually Calls

Every route this API exposes, cross-referenced against the frontend's endpoint constants (`KarmaCircle/src/services/ApiEndpoints.ts`) and call sites (`KarmaCircle/src/services/MilanApi.ts` and per-feature code). Read this before changing any route's path, method, or request/response shape — and before assuming a frontend call "just works" against this backend.

**Snapshot taken August 2026, from static reading of both repos — not verified by running either app end-to-end.** Treat every "works"/"broken" verdict below as a strong static-analysis claim, not a confirmed-live-tested fact; reproduce with a real request before shipping a fix that assumes one of these is correct.

**Update:** `GET /user`, `GET /clubs`, `GET /display/users`, `GET /display/clubs`, `GET /events`, and `GET /product/allproducts` (their unfiltered "list everything" branches only) now return `{ data, pagination }` instead of a bare array — see [known-issues.md#pagination](./known-issues.md#pagination) and [architecture.md#pagination](./architecture.md#pagination). This *was* verified live, via a Supertest assertion against a real (in-memory) Mongo, not just read from source — see `tests/events.test.ts`'s `"paginates across multiple pages with skip/limit math"` case.

**Update:** All four contract breaks below are **resolved** — `PATCH /user/update`, `GET /user/profile`, `GET /auth/login/success`, and `PATCH /user/complete` all now work as the frontend already calls them. See [known-issues.md#cross-repo-contract-breaks](./known-issues.md#cross-repo-contract-breaks) and [users.md](./users.md)/[auth.md](./auth.md) for the fix detail; the breakdown below is kept for historical context on what was wrong and why.

## Full route inventory

| Method + path | Module | Auth | Frontend constant | Frontend actually calls it? |
|---|---|---|---|---|
| `GET /` | app.ts | no | — | no (liveness check only) |
| `GET /health` | app.ts | no | — | no |
| `GET /docs` | app.ts (swagger) | no | — | no |
| `POST /auth/signup` | auth | no | `authEndpoints.signup` | ✅ `RegisterUser()` |
| `POST /auth/signin` | auth | no | `authEndpoints.signin` | ✅ `LoginUser()` |
| `POST /auth/update` | auth | no (email+oldPassword in body) | — | ❌ no frontend constant/call exists for this route at all |
| `GET /auth/google` | auth | no | `authEndpoints.googleLogin` | ✅ `GoogleAuth()` |
| `GET /auth/google/callback` | auth | Passport | — | n/a (hit by Google's redirect, not called directly by frontend code) |
| `GET /auth/login/failed` | auth | no | — | n/a (redirect target, not called directly) |
| `GET /auth/login/success` | auth | `requireAuth` (see [auth.md](./auth.md#google-oauth-flow)) | `authEndpoints.googleLoginSuccess` | ✅ `successCallback()` — was unreachable, **fixed, see contract break #3** |
| `GET /auth/logout` | auth | no | `authEndpoints.logout` | ✅ `Logout()` |
| `GET /user` | users | no | `userEndpoints.details(userName)` | ✅ (per frontend spec, various profile-lookup call sites) |
| `GET /user/profile` | users | `requireAuth` | `userEndpoints.profile` | ✅ `Dashboard.tsx`'s SWR hook — was 404, **fixed, see contract break #2** |
| `PATCH /user/update` | users | `requireAuth` | `userEndpoints.updateProfile` | ✅ `updateUserProfile()` — was a method mismatch, **fixed, see contract break #1** |
| — (no route) | — | — | `userEndpoints.update` (`/user/update/profile`) | ❌ dead constant on the frontend side, no matching backend route either — consistent dead code both sides, not a break |
| `PATCH /user/complete` | users | `requireAuth` | `userEndpoints.completeProfile` | ✅ `useProfileCompletion.ts`/`ProfileCompletion.tsx` — route did not exist, **fixed, see contract break #4** |
| `POST /user/report` | reports | no | `userEndpoints.report` | ✅ `ReportProblem()` |
| `GET /clubs` | clubs | no | `clubEndpoints.all`, `clubEndpoints.details(userName)` | ✅ `GetAllClubs()` (only from the unrouted `Donate.tsx` — see the pagination note above), and per frontend spec, `Profile.tsx`'s SWR key (single-item branch, unaffected by pagination) |
| `GET /clubs/dashboard` | clubs | `requireAuth` | `clubEndpoints.dashboard` | ✅ `fetchDashboard()` |
| — (no route) | — | — | `clubEndpoints.createEvent` (`/club/createevent`) | ❌ dead constant, no backend route either — consistent dead code both sides |
| `GET /display/users` | directory | no | — | ❌ no frontend constant exists for this route |
| `GET /display/clubs` | directory | no | — | ❌ no frontend constant exists for this route |
| `GET /events` | events | no | `eventEndpoints.all` | per frontend spec, not currently called by any live SWR/fetch (the fetcher exists — `getEvents()` — but the live `Events.tsx` page renders hardcoded data instead; see the frontend's own `known-issues.md`) |
| `POST /events/create` | events | `requireAuth` | `eventEndpoints.create` | ✅ `CreateEvent()` — method/path match; **body-shape correctness depends on which of the frontend's two competing "create event" components made the call, see [events.md](./events.md)** |
| `POST /payment/razorpay` | payments | no | — (no `paymentEndpoints` constant exists in `ApiEndpoints.ts`) | frontend's `PaymentGateway.ts` calls this URL directly, not through the `ApiEndpoints.ts` registry — see the frontend's own `donate-shop-trending.md`/`SPEC.md` for the exact call site and its own separate response-shape bug (`data.currency`/`data.id` vs. this route's actual `{id, currency, amount}` wrapped in axios's `response.data`) |
| `POST /product/addproduct` | products | no | — | no `productEndpoints` constant exists on the frontend at all — the frontend's Shop/product pages are "coming soon" placeholders per its own spec, so this whole module currently has no frontend consumer |
| `GET /product/allproducts` | products | no | — | same as above — no consumer yet |
| `POST /product/cart/add` | products | `requireAuth` (was unauthenticated — see [known-issues.md#products](./known-issues.md#products)) | — | same as above — no consumer yet |
| `GET /product/:productSlug` | products | no | — | same as above — no consumer yet |

## Contract breaks (resolved — kept for historical context)

### 1. `POST /user/update` vs. the frontend's `PATCH` call — **fixed**

The frontend's `updateUserProfile()` ([MilanApi.ts](../../../KarmaCircle/src/services/MilanApi.ts)) issues `Axios.patch(userEndpoints.updateProfile, credentials, { withCredentials: true })`. This backend used to register the handler as `router.post("/update", ...)` ([user.routes.ts](../../src/modules/users/user.routes.ts)) — Express only matches the declared method, so a `PATCH` to `/user/update` fell through to `notFoundHandler` (`404`) instead of the intended controller, breaking the live "edit my profile" flow both `ProfileCompletion.tsx` and `ProfileUpdate.tsx` use. **Fixed** by changing the route to `router.patch("/update", ...)` — matches what the frontend already sends, no frontend change needed. The old `POST` registration was removed rather than kept alongside it (nothing else called it).

### 1b. `POST /user/update`'s body shape didn't match the `User.address` schema — **fixed**

`updateProfileSchema` used to validate `{ tagLine?, description?, city?, state?, address?, country?, pincode? }` as flat top-level strings — none of which lined up with `IUser.address`'s nested object, and `tagLine` didn't exist on the schema at all. Fixed in the same change as #1: `updateProfileSchema` now validates `{ name?, description?, coverImage?, address?: { line1?, line2?, city?, state?, country?, pincode? } }`, matching exactly what `ProfileUpdate.tsx` sends. `coverImage` (the frontend's name for the field) is translated onto `IUser.bannerPicture` in `user.service.ts`'s `toUserUpdate` rather than the schema growing a field named after the frontend's UI copy. See [users.md](./users.md#patch-userupdate--the-authenticated-users-own-profile-update).

### 2. `GET /user/profile` — **fixed**

The frontend's `Dashboard.tsx` (per its own `api-integration.md`) calls `useSWR(userEndpoints.profile, fetcher)`, i.e. `GET /user/profile` — no route matched this before, so the call 404d every time. **Fixed** by adding a real `GET /user/profile` route (`requireAuth`-gated, looks the caller up by `req.auth.email`, the same pattern `GET /clubs/dashboard` already used), responding `{ user: <sanitized> }` — the wrapper shape `Dashboard.tsx` already reads (`profileData?.user`), not the bare object `GET /clubs/dashboard` returns. `GET /clubs/dashboard` (`fetchDashboard()`) is unaffected and still works exactly as before — this was an addition, not a redirect of one call site to the other.

### 3. `GET /auth/login/success` — **fixed**

See [auth.md](./auth.md#google-oauth-flow) for the full trace. The route's controller used to require `req.user`, populated by Passport during the *earlier* `/auth/google/callback` request — but `session: false` means nothing carries that forward to this later, separate request, so it 401d every time in real traffic. **Fixed** by moving session issuance (signing the JWT, setting `Token`/`userName`/`isLoggedIn`/`userType`) into `googleCallback` itself — the one request that legitimately has `req.user` — and making `loginSuccess` a normal `requireAuth`-gated route that reads the `Token` cookie `googleCallback` already set on its redirect response. Verified live via Supertest (`tests/auth.test.ts`), confirming the route is reachable given a valid session cookie and still 401s without one.

### 4. `PATCH /user/complete` — **fixed**

The frontend's `completeProfileApiCall()` ([MilanApi.ts](../../../KarmaCircle/src/services/MilanApi.ts)) calls `Axios.patch(userEndpoints.completeProfile, credentials, { withCredentials: true })`, i.e. `PATCH /user/complete` — no route existed for this at all, and `config.hasCompletedProfile` (see [users.md](./users.md#the-user-model-is-shared-by-five-modules)) could never become `true` through any code path in this API. **Fixed** by adding `PATCH /user/complete` (`requireAuth`-gated, same body shape as `PATCH /user/update`), whose service layer accepts the profile fields and always sets `config.hasCompletedProfile: true` server-side on success — independent of whatever the client's body claims about that field.

## Endpoints with no frontend caller yet

`GET /display/users`, `GET /display/clubs` (directory module), and the entire `products` module (`/product/*`) have no corresponding call anywhere in the frontend's `ApiEndpoints.ts`/`MilanApi.ts`. This isn't necessarily a bug — the frontend's Shop/Trending pages are explicitly "coming soon" placeholders per its own spec — but it means these routes are currently untested by any real client traffic pattern; if you change their contract, there's no frontend code that would visibly break to catch a regression, only this doc and (for `products`) whatever new frontend work eventually lands.

## Keeping this file honest

If you fix one of the contract breaks above (on either side of the repo boundary), update **both** repos' specs in the same change: this file plus the relevant module file here, and the frontend's own `docs/specs/api-integration.md` plus its `known-issues.md` entry if one exists for the same issue. A contract break fixed on only one side, with the other side's spec still describing the old broken behavior, is worse than not documenting it at all — the next agent will trust the stale doc.
