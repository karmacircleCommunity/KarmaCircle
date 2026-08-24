# Users Module

[src/modules/users/](../../src/modules/users/) — look up a user by username (or list all individuals), and let the authenticated user update their own profile. Owns the `User` Mongoose model, which is also the backing store for `organizations`, `directory`, `auth`, `events` (host lookup), and `products` (cart writes).

## The `User` model is shared by five modules

[user.model.ts](../../src/modules/users/user.model.ts) — one physical collection (`model<IUser>("user", ...)`) holds **both individuals and organizations**, split at the schema level via a Mongoose discriminator keyed on `userType` (`discriminatorKey: "userType"`). `Individual` and `Organization` are exported discriminator models off the same base `User` model/collection — both currently add no extra fields (there's no organization-only data yet), but it's the home for that once it exists, instead of it landing loosely on the shared base schema. The field itself stays an unconstrained `string` at the base-schema level (not a Mongoose `enum:` constraint — see the comment in the source explaining this is deliberate, so pre-existing rows with other/missing values don't fail schema validation); it's the discriminator models, not the field type, that give `"individual"`/`"organization"` their real structure now. Construct a new user document via `getUserModel(userType)` (also exported from `user.model.ts`) rather than `new User(...)` directly — it resolves to `Organization` only for exactly `"organization"`, defaulting to `Individual` otherwise, and both `auth.service.ts` construction sites (`signup`, `findOrCreateGoogleUser`) go through it. If you ever need to bulk-*change* `userType` on existing documents rather than construct a new one, see [known-issues.md#mongoose-discriminator-key-bulk-updates-silently-no-op](./known-issues.md#mongoose-discriminator-key-bulk-updates-silently-no-op) first — `User.updateMany()`/`updateOne()` silently no-op on a `$set` of the discriminator key against this project's actual database.

| Field | Type | Notes |
|---|---|---|
| `userType` | `string?`, indexed | `"individual"` \| `"organization"` in practice, unenforced. Indexed (plain, not unique) since `findByType`/`findIndividuals` filter on it — backs `organizations`, `directory`, and the unfiltered branch of `GET /user` |
| `userName` | `string` (required), indexed | Unique in practice (see `generateUniqueUsername` below) but **not** declared `unique: true` on the schema — a race between two concurrent signups reading "is this taken?" then writing could still produce a duplicate; low likelihood, not impossible. The index (added alongside pagination/indexing work) only speeds up lookups by `userName` — it's deliberately a plain index, not unique, so it can't fail to build even if duplicates already exist in a live deployment; closing the race itself would need a separate, coordinated migration |
| `name` | `string?` | |
| `email` | `string` (required, `unique: true`) | The de facto identity field — see [auth.md](./auth.md) for how the JWT encodes it |
| `phone` | `string?` | |
| `profilePicture` / `bannerPicture` | `string?` | URLs, presumably; nothing in this repo uploads/hosts images — that's out of scope for this API today |
| `password` | `string` (required) | bcrypt hash; **never** returned by `sanitize()` (see below) |
| `description` | `string?` | |
| `address` | `{ line1?, line2?, city?, state?, country?, pincode? }` | A **nested object**, not a flat string — see the profile-update mismatch below |
| `config.hasCompletedProfile` | `boolean`, default `false` | Defaults `false` at creation; flipped to `true` by `PATCH /user/complete` (see below) — the only route that ever writes it |
| `cart` | `{ id: string }[]` | Written to by `products.addToCart` ([products.md](./products.md)) — no other cart mutation (remove/clear) exists anywhere |
| `tokenVersion` | `number`, default `0` | Session-revocation counter — bumped on logout/password-change, checked on every `requireAuth`-gated request. Never returned to a client (excluded from `PUBLIC_FIELDS` and `sanitize()`, same as `password`). See [auth.md](./auth.md#signtoken-and-session-revocation) |

Modules touching `User` directly: `users` (this file), `auth` (create/find/update for login+signup), `organizations` (find, filtered by `userType`), `directory` (find, unfiltered), `events` (read-only, to resolve a host's name/username), `products` (push into `cart`).

## `user.service.ts`

- **`generateUniqueUsername(email)`** — starts from the local part of the email (`email.split("@")[0]`), and while a `User` with that `userName` already exists, appends a random 0–9999 suffix and retries. Unbounded loop (no max-attempt cap) — in the extremely unlikely case of sustained collisions this could loop for a while, but with a 0–9999 random suffix space this is not a realistic concern in practice.
- **`findByEmail` / `findByUsername` / `findIndividuals` / `findAll` / `findByType`** — thin `User.find*` wrappers. All but `findByEmail` project with `PUBLIC_FIELDS = "-password -__v"` (excludes the hash and Mongoose's version key, but **does not exclude `_id`** — see `sanitize()` below for the one place `_id` is stripped too). `findByEmail` is used internally by `auth`/services that need the raw document (including `password`) to verify credentials, so it intentionally returns everything.
- **`updateProfile(email, data)`** — `User.findOneAndUpdate({ email }, { $set: data }, { new: true })`, projected through `PUBLIC_FIELDS`. `data` is whatever `updateProfileSchema` validated — see the mismatch below.
- **`sanitize(user)`** — `user.toObject()` then destructures off `password`, `_id`, `__v`, returning the rest. This is the shape sent back to the client on signup/signin/dashboard/etc. Note it strips `_id` entirely — **the sanitized user object the frontend receives has no id field at all**, only `userName`/`email`/etc.; anything that needs to reference "this user" by a stable id has to use `email` or `userName` instead.

## `GET /user`

No auth. `validate(listUsersQuerySchema, "query")` — `{ userName?: string, page?: number, limit?: number }` (`page`/`limit` merged in from the shared `paginationQuerySchema`, [src/utils/pagination.ts](../../src/utils/pagination.ts) — default `page=1`, `limit=20`, `limit` capped at 100). If `userName` is present: `findByUsername` → `404 NOT_FOUND` if none, else the single user object (through `PUBLIC_FIELDS`, so `_id` **is** present here, unlike the `sanitize()`-shaped responses elsewhere — a real shape difference between "look someone up" and "signup/signin/dashboard" responses); `page`/`limit` are accepted but ignored on this branch. If `userName` is absent: returns every `userType: "individual"` user as `{ data: IUser[], pagination: { page, limit, total, totalPages } }` — `userService.findIndividuals({ skip, limit })` runs the `find` and a `countDocuments` in parallel via `Promise.all`.

## `GET /user/profile` — the authenticated user's own profile record

`requireAuth` → `userController.profile`. Looks the caller up by `req.auth.email` (`userService.findByEmail`) → `404 PROFILE_FETCH_FAILED` if it doesn't resolve (shouldn't normally happen, same reasoning as `GET /organizations/dashboard`'s equivalent check — see [organizations.md](./organizations.md#get-organizationsdashboard)) → `200` with `{ user: userService.sanitize(user) }`. The `{ user }` wrapper (rather than returning the sanitized object bare, like `GET /organizations/dashboard` does) matches what `Dashboard.tsx`'s `useSWR(userEndpoints.profile, fetcher)` call already reads (`profileData?.user`) on the frontend. **This route didn't exist until this was fixed** — see the "resolved" note in [known-issues.md](./known-issues.md#cross-repo-contract-breaks).

## `PATCH /user/update` — the authenticated user's own profile update

`requireAuth` → `validate(updateProfileSchema)` → `userController.updateProfile`. **Method fixed to `PATCH`** (was `POST`, which the frontend's `updateUserProfile()` never actually called — it always sent `PATCH`). Body (`updateProfileSchema`, all optional): `{ name?, description?, coverImage?, address?: { line1?, line2?, city?, state?, country?, pincode? } }` — this now matches exactly what `ProfileUpdate.tsx` sends (per the frontend's own spec), instead of the old flat-string shape that didn't line up with `IUser.address`'s nested object at all. `coverImage` maps onto `IUser.bannerPicture` (`user.service.ts`'s `toUserUpdate`) — the schema has no `coverImage` field, `bannerPicture` is the field it's describing. Response unchanged: `200 { message: PROFILE_UPDATE_SUCCESS }`.

## `PATCH /user/complete` — mark the authenticated user's profile complete

`requireAuth` → `validate(completeProfileSchema)` → `userController.completeProfile`. Same body shape as `PATCH /user/update` (`userService.completeProfile` reuses the same `toUserUpdate` field mapping), but **always** sets `config.hasCompletedProfile: true` server-side — the client's body is not trusted to assert this itself, even though the frontend's `completeProfileApiCall()` does send `config: { hasCompletedProfile: true }` in its payload (that field is simply ignored; the server always sets it true on this route regardless). `404 USER_NOT_FOUND` if the caller's account doesn't resolve; `200 { message: PROFILE_COMPLETE_SUCCESS }` on success. **This route didn't exist until this was fixed** — previously `config.hasCompletedProfile` could never become `true` through any code path in this API. See [known-issues.md](./known-issues.md#cross-repo-contract-breaks).

## What's known-broken here

Nothing left open in this module from the original spec pass — see the "resolved" note in [known-issues.md](./known-issues.md#cross-repo-contract-breaks) for what was fixed and how it was verified (`tests/users.test.ts`).
