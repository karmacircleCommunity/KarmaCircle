# Known Issues & Inconsistencies

A catalog of the cross-cutting bugs, gaps, and unresolved inconsistencies found while writing these specs (August 2026), gathered from static reading of the code — none of this has been verified by running the app. Each item also appears inline in its relevant module spec; this file exists so an agent can get the full picture in one read before making changes near any of these areas. Treat entries here as **things to be aware of**, not necessarily things to fix unless you were asked to.

## Pagination

**Resolved.** Every "list everything" endpoint (`GET /user`, `GET /organizations`, `GET /display/users`, `GET /display/organizations`, `GET /events`, `GET /product/allproducts`) now takes `?page=&limit=` and returns `{ data, pagination: { page, limit, total, totalPages } }` instead of a bare array — see [architecture.md](./architecture.md#pagination). This is a **response-shape change** on those six routes. Per [api-contract.md](./api-contract.md), the only currently-reachable frontend caller of any of them was `GetAllOrganizations()` (`GET /organizations`, no `userName`), and per the frontend's own `donate-shop-trending/SPEC.md` that function is only invoked from `Donate.tsx` — a page with no registered route in the frontend today — so this shipped with **no live frontend breakage**. It will still need `GetAllOrganizations()`'s caller updated to read `response.data.data` (and the frontend's own specs updated) whenever `Donate.tsx`/that call site is fixed or routed.

## Indexing

**Resolved.** Every field actually filtered/looked up on is now indexed — see [architecture.md](./architecture.md#indexes) for the full list. `User.userName` got a plain (not unique) index deliberately: it's still only enforced unique at the application layer (`generateUniqueUsername`, a real check-then-write race), and a plain index is always safe to add regardless of whether duplicates already exist in a live deployment, where a `unique: true` index build would fail outright on any existing collision. Closing the race itself — making `userName` genuinely unique at the DB level — is a separate, deliberately-deferred follow-up; do it as its own coordinated change once existing data has been checked for duplicates, not bundled into a routine index pass.

## User discriminator

**Resolved.** Individuals and organizations used to share one `User` collection distinguished only by an unconstrained `userType?: string` field, with no schema-level split — see [users.md](./users.md#the-user-model-is-shared-by-five-modules). `user.model.ts` now sets `discriminatorKey: "userType"` on the base schema and exports `Individual`/`Organization` Mongoose discriminator models off the same physical `user` collection. Both discriminators add no fields yet — there's no organization-only data today — but new organization-only fields now have a real home instead of landing loosely on the shared base schema. `auth.service.ts`'s two document-construction sites (`signup`, `findOrCreateGoogleUser`) go through `getUserModel(userType)` instead of `new User(...)`/`User.create(...)` directly, so a document's discriminator always matches the `userType` it's created with; anything other than exactly `"organization"` defaults to `Individual`, same as the old unconstrained-string behavior for absent/garbage values. Every existing `userType`-filtered query (`findIndividuals`, `findByType`, `GET /organizations`, `GET /display/*`) is unchanged — the discriminator key is still a normal queryable field on the base model. See `tests/auth.test.ts`'s "userType discriminator" tests for the regression coverage.

## Mongoose discriminator-key bulk updates silently no-op

`User.updateOne()`/`User.updateMany()` (the Mongoose model methods) silently do nothing when the update tries to `$set` the schema's `discriminatorKey` field — `userType` here — against this project's actual MongoDB deployment.
The call resolves with `{ acknowledged: false }` and no thrown error, so nothing gets written and nothing surfaces the failure.
Confirmed directly while writing `scripts/migrate-club-to-organization.ts` (August 2026): `User.updateMany({ userType: "club" }, { $set: { userType: "organization" } })` matched a real document and returned `{ acknowledged: false }`, leaving the document unchanged, while the identical `$set` on any other field (e.g. `description`) worked normally through the same model.
The raw MongoDB driver has no such restriction — `mongoose.connection.db.collection("users").updateMany(...)` with the exact same filter/update updated the document correctly.
This means: if you ever need to bulk-change `userType` on existing documents (a migration, an admin "convert this individual account to an organization" feature, etc.), go through the raw driver via `mongoose.connection.db.collection("users")`, not `User.updateMany()`/`User.updateOne()` — see `scripts/migrate-club-to-organization.ts` for the working pattern.
Ordinary single-document `.save()` calls that change `userType` on an already-loaded Mongoose document were not tested here and may behave differently; this finding is specifically about the bulk `updateOne`/`updateMany` query-API path.

## Cross-repo contract breaks

**Resolved (all four).** Was the single most important category in this file — see [api-contract.md](./api-contract.md) for the historical trace of each break, now updated to reflect the fix.

1. **`POST /user/update` vs. the frontend's `PATCH` call — fixed.** The route now registers as `router.patch("/update", ...)`, matching what the frontend's `updateUserProfile()` always sent; the old `POST` registration is gone (nothing else called it). Its body shape was fixed in the same change — see #1b below.
   - **1b. Body shape — fixed.** `updateProfileSchema` now accepts `{ name?, description?, coverImage?, address?: { line1?, line2?, city?, state?, country?, pincode? } }`, matching exactly what `ProfileUpdate.tsx` sends. `coverImage` is translated onto `IUser.bannerPicture` in `user.service.ts`'s `toUserUpdate` — the schema has no `coverImage` field, `bannerPicture` is what it's describing.
2. **`GET /user/profile` — fixed.** Added (`requireAuth`-gated), backed by the same "look the caller up by `req.auth.email`" pattern `GET /organizations/dashboard` already used, wrapped as `{ user: <sanitized> }` to match `Dashboard.tsx`'s `profileData?.user` read.
3. **`GET /auth/login/success` — fixed.** The real fix was moving session issuance (signing the JWT, setting `Token`/`userName`/`isLoggedIn`/`userType`) into `googleCallback`, the one request in the OAuth handshake that legitimately has `req.user` from Passport. `loginSuccess` is now `requireAuth`-gated instead of depending on `req.user` directly, and reads the `Token` cookie `googleCallback` already set on its redirect response. Verified live via Supertest (`tests/auth.test.ts`), not just reasoned about statically.
4. **`PATCH /user/complete` — fixed.** Added (`requireAuth`-gated, same body shape as `PATCH /user/update`), always sets `config.hasCompletedProfile: true` server-side on success regardless of what the client's body claims about that field.

See [users.md](./users.md) and [auth.md](./auth.md) for the full per-route detail, and `tests/users.test.ts` / `tests/auth.test.ts` for the regression coverage.

## Auth

- **JWT expiry + session revocation: resolved.** `signToken` used to issue a JWT with no expiry at all — only the cookie carrying it expired (30 days), and there was no way to kill a session early. Fixed: the JWT now carries its own `expiresIn` (tied to the same `THIRTY_DAYS_MS` constant the cookie uses, so both lapse together), and every `User` has a `tokenVersion` embedded in the token and checked on every `requireAuth`-gated request — bumped on logout and on password change, so either one invalidates the token immediately rather than waiting out its expiry. This was a deliberate architecture trade-off, not a free change: `requireAuth` now does one DB read (`User.findOne(...).select("tokenVersion")`) per authenticated request, where it previously did zero. See [auth.md](./auth.md#signtoken-and-session-revocation).
- `Token` cookie's `httpOnly` flag differs between the email/password path (`false`) and the Google OAuth path (`true`) — see [auth.md](./auth.md#two-parallel-login-mechanisms-one-resulting-cookie-shape).
- `POST /auth/update` (password change) is unauthenticated — it trusts `{ email, oldPassword }` in the body rather than the caller's own session/token. Anyone who knows an account's email and current password can change it without being logged in as that account, which is a reasonable design if that's the intended UX (a locked-out user changing their password), but worth confirming it's intentional rather than a missed `requireAuth`.
- `POST /auth/update`'s wrong-old-password branch responds `401` with `STATUS_MESSAGE.USER_NOT_FOUND` — status code and message constant don't match; should likely be `INVALID_CREDENTIALS` or a dedicated message.
- Google OAuth's `state` param carries `userType` through the redirect round-trip but is never validated against what `googleInitiate` originally issued — no CSRF protection on this flow, despite `state` conventionally serving that purpose in OAuth.
- Every cookie this API sets hardcodes `secure: true; sameSite: "none"` — requires HTTPS everywhere, including local dev; testing the real cookie flow over plain `http://localhost` will silently fail to persist any cookie.
- `env.SECRET_KEY` is validated as required at startup but not read anywhere else in the codebase — likely vestigial.

## Users

- `config.hasCompletedProfile` defaults to `false`; `PATCH /user/complete` is now the one route that sets it `true` — see contract break #4 above.
- `sanitize()` strips `_id` along with `password`/`__v` — the user object returned from signup/signin/dashboard has no id field at all; only `GET /user`'s `PUBLIC_FIELDS`-projected responses include `_id`. A frontend or future backend feature that needs a stable per-user id from a sanitized response has to use `email`/`userName` instead — there is currently no id in that shape.
- `userName` is not declared `unique: true` on the schema, only made unique in practice by `generateUniqueUsername`'s pre-check — a race between two concurrent signups could theoretically still collide.

## Events

- `createEvent`'s `uid`-uniqueness check is a plain existence query before `.save()`, not relying on the schema's own unique index to surface the friendlier `409 EVENT_UID_ALREADY_EXISTS` — a genuine race (two requests with the same `uid` in flight at once) would instead surface as the generic Mongo-11000 `409` from the global error handler.
- `platform`/`platformLink` are optional even when `mode === "Online"` — an online event can be created with no way for an attendee to actually join it; only `Offline` mode has a conditional-required-fields check (`city`/`state`/`country`/`address`/`mapIframe`).

## Products

- **`POST /product/cart/add`'s auth/ownership gap is fixed.** It used to identify whose cart to mutate purely by an `email` string in the request body — anyone who knew a user's email could push an arbitrary `productId` into that user's cart with no token, no session, nothing tying the caller to the account being modified. It's now `requireAuth`-gated and always mutates `req.auth.email`'s own cart; the body no longer has an `email` field at all. See [products.md](./products.md#post-productcartadd) and `tests/products.test.ts` for the regression test.
- `productId` in that same call is still never checked against the `Product` collection — a cart can reference ids that don't exist.
- No de-duplication and no remove/clear operation exist for the cart — `cart` can only ever grow, including duplicate entries for the same product.
- `POST /product/addproduct` has no auth either — any caller can create products. May be intentional pending an admin-role system that doesn't exist yet in this codebase.
- The `Product` model's registered name (`"Products"`, plural) is inconsistent with every other model in the codebase (`"user"`, `"Event"`, `"report"`, all singular) — no functional impact, just a naming inconsistency to match if you ever touch this.

## Payments

- No `Order`/`Payment` model — a Razorpay order is created but never persisted on this side, so there's no server-side record connecting an order to a user, product, or event, and no way to build "my order history" from this API alone.
- No webhook endpoint to receive Razorpay's payment-confirmation callback — this backend has no server-side way to know whether an order it minted was ever actually paid; whatever confirms success today is entirely client-side.
- Currency is hardcoded to `"INR"` throughout — no multi-currency support.

## Reports

- The 2-hour report-spam cooldown is per-email, not per-IP/session — trivially bypassed by using a different email each time. The IP-based `apiLimiter`/`authLimiter` (see [architecture.md](./architecture.md#middleware-stack-createapp-in-order)) are the only IP-level throttles in this API and aren't specific to this route.

## Build / config

- `env.IGNORE_ORIGINS` is read as the literal string `"true"` (not a real boolean) before being transformed — a `.env` value of anything else (including an actual unquoted `false`, or `1`) evaluates to `false` after the transform; only the exact string `"true"` enables it.
- Swagger's `@openapi` JSDoc blocks are hand-maintained next to each route and are not derived from (or checked against) the Zod validation schemas sitting right next to them in the same module — the two can silently drift; don't treat the `/docs` UI as authoritative over actually reading a module's `.validation.ts` file.

## Test coverage

`auth`, `events`, `products`, and `users` have test files (`tests/auth.test.ts`, `tests/events.test.ts`, `tests/products.test.ts`, `tests/users.test.ts`). `organizations`, `directory`, `payments`, and `reports` are completely untested — a change to any of them is only checked by `typecheck`/`lint`, not by CI-run behavioral tests, until coverage is added. See [architecture.md](./architecture.md#testing).

`apiLimiter`/`authLimiter` ([rate-limit.ts](../../src/middleware/rate-limit.ts)) are skipped when `NODE_ENV=test` — they weren't originally, and a test file making enough `/auth/*` calls across its whole suite (as `tests/auth.test.ts` does once its session-revocation tests were added) would start getting genuine `429`s partway through a run, unrelated to whatever behavior that test was actually checking. If you're ever debugging a mysteriously-failing test that looks like a state-leak between `it` blocks, check the response status/body before assuming it — a `429` disguised as a missing `Set-Cookie` header is exactly what this looked like before it was traced down.

## Keep this file honest

If you fix something this file calls out, remove that entry (and the matching note in the relevant module spec) in the same change. If a fix touches a cross-repo contract break, update the frontend's own specs too — see [api-contract.md](./api-contract.md#keeping-this-file-honest). If you notice something new and wrong while working nearby, add it here rather than leaving it undocumented.
