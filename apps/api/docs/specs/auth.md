# Auth Module

[src/modules/auth/](../../src/modules/auth/) — email/password signup and signin, password change, Google OAuth, logout, and the `Token` JWT cookie that every other protected route relies on.
This module owns no Mongoose model of its own — it reads/writes through `users`' `User` model (see [users.md](./users.md#the-user-model-is-shared-by-five-modules)).

## Two parallel login mechanisms, one resulting cookie shape

There are two distinct ways a client ends up authenticated, and they set **different cookie sets**:

1. **Email/password** (`signup`/`signin`) sets **only** `Token` (via `readableCookieOptions()` — `httpOnly: false`).
2. **Google OAuth** (`googleInitiate` → Google → `googleCallback` → `loginSuccess`) sets **four** cookies: `Token` (via `httpOnlyCookieOptions()` — `httpOnly: true`, different flags than path 1's `Token` cookie), plus `userName`, `isLoggedIn`, `userType` (all `readableCookieOptions()`, all readable by JS).

**The `Token` cookie's `httpOnly` flag is inconsistent depending on which login path issued it** — `false` from `signup`/`signin`, `true` from OAuth's `loginSuccess`. Every route that checks auth (`requireAuth`) only cares that the cookie is present and valid, not how it was set, so this doesn't break auth itself — but any frontend code that reads `document.cookie` for `Token` directly (rather than relying on the browser to attach it automatically) will only ever see it after an email/password login, never after Google OAuth. Confirm with the frontend's own auth spec whether anything actually depends on this before assuming it's harmless.

## `POST /auth/signup`

`authLimiter` → `validate(signupSchema)` → `authController.signup`.

`signupSchema` (`z.object({ email, password }).passthrough()`) only *requires* `email` (valid format) and `password` (non-empty — **no length/strength check server-side**, unlike the frontend's client-side 8-char/mixed-case/digit regex; nothing stops a 1-character password from reaching this endpoint directly, e.g. via curl or a future non-web client). `.passthrough()` means **any additional body fields survive validation untouched** and get spread into the new `User` document by `authService.signup` (`{ ...data, userName, email, password: hashedPassword }`) — so a signup request can set `userType`, `name`, `phone`, etc. in the same call, but only fields that exist on the `User` schema actually persist (Mongoose's own `strict: true` default silently drops anything else at `.save()` time — see [users.md](./users.md#the-user-model-is-shared-by-five-modules)).

`authService.signup`: reject with `409 USER_ALREADY_EXISTS` if `email` is already taken (`userService.findByEmail`) → `bcrypt.hash(password, 10)` → `userService.generateUniqueUsername(email)` (see [users.md](./users.md)) → save → respond `201` with `{ message: SIGNUP_SUCCESS, user: <sanitized> }` and a `Token` cookie (readable, 30-day expiry, `SameSite=None; Secure`, scoped to `env.ORIGIN_DOMAIN`).

## `POST /auth/signin`

`authLimiter` → `validate(signinSchema)` → `authController.signin`. `signinSchema` is the same shape minus `.passthrough()`. `authService.signin`: `404`-shaped as `401 INVALID_CREDENTIALS` (not `404`) if the email isn't found — an existing-email check doesn't leak which part was wrong, both "no such user" and "wrong password" return the identical `401 INVALID_CREDENTIALS`. Same `Token` cookie/response shape as signup, `200` instead of `201`.

## `GET /auth/check-email`

`authLimiter` → `validate(checkEmailSchema, "query")` → `authController.checkEmail`. Takes `?email=` (must be a valid email format), calls `authService.emailExists` (a thin wrapper over `userService.findByEmail`), and responds `200 { exists: boolean }` — no other account data. Added so the frontend's sign-up form can tell a user their email already has an account right after they type it, before they invest time filling in a name/password, rather than only finding out via `signup`'s own `409 USER_ALREADY_EXISTS` at the very end. This is deliberately not a new information leak: `signup`'s 409 already reveals the identical "does this email exist" signal today, just later in the flow; this route only surfaces the same signal earlier, and sits behind the same `authLimiter` as every other route here.

## `POST /auth/update` — password change

`authLimiter` → `validate(updatePasswordSchema)` → `authController.updatePassword`. Body: `{ email, oldPassword, newPassword }` (`newPassword` must be 5+ chars — the *only* password-strength rule enforced anywhere server-side, and it's looser than the frontend's own 8-char/mixed-case/digit signup rule). Looks the user up **by `email` in the body**, not by the `Token` cookie/session — **this endpoint is unauthenticated**; nothing requires the caller to be logged in as the account they're changing the password for, only that they know the current email + old password. `404 USER_NOT_FOUND` if the email doesn't exist; **`401 USER_NOT_FOUND`** (not `INVALID_CREDENTIALS`) if `oldPassword` doesn't match — the status code (401) and message constant (`USER_NOT_FOUND`) are mismatched here, worth fixing together if you touch this path so callers aren't told "user not found" for a wrong-password case. On success: `201 PASSWORD_UPDATE_SUCCESS`, no cookie set/refreshed — the caller's existing `Token` (if any) is untouched, but it no longer works: this also increments `tokenVersion` (see `signToken` below), which invalidates **every** `Token` cookie issued for this account, including whichever session made this exact call. There is no re-issuance here to compensate — a client that calls this while already logged in should expect to need to sign in again afterward.

## Google OAuth flow

```
Frontend  GET /auth/google?userType=<individual|organization>
              │  googleInitiate: builds a Google OAuth URL, `state=<userType>`, returns { url } (201 — unusual for a GET, see known-issues.md)
              ▼
Frontend redirects the browser to that Google URL (full page nav, out of this API's control)
              │  user authenticates with Google
              ▼
Google redirects to  GET /auth/google/callback?code=...&state=<userType>
              │  passport.authenticate("google", { session: false, failureRedirect: "auth/login/failed" })
              │    → passport.ts's GoogleStrategy verify callback:
              │      - extracts email from the Google profile (no email ⇒ done(Error))
              │      - re-reads `req.query.state` as `userType` (the same value googleInitiate embedded)
              │      - authService.findOrCreateGoogleUser({ email, name, userType }):
              │          existing User with this email? return it as-is (userType from THIS login is discarded if the account already existed)
              │          else: create one via getUserModel(userType) (see users.md), with a random unusable
              │            bcrypt-hashed password (crypto.randomBytes(20))
              ▼
googleCallback: issueOAuthSession(res, req.user) signs the REAL Token (httpOnly) and sets userName/isLoggedIn/userType,
              │  THEN sets `OAuthLoginInitiated=true` (5-min expiry, NOT httpOnly, Secure, SameSite=None), redirects (302) to env.successURL
              ▼
Frontend's landing page (per its own spec) detects OAuthLoginInitiated on mount, calls  GET /auth/login/success
              │  loginSuccess is now requireAuth-gated: the Token cookie googleCallback just set on the redirect response
              │    is already present on this next request (browsers store Set-Cookie headers from redirect responses
              │    same as any other response), so requireAuth resolves req.auth.email from it like any other protected route
              │  looks the user back up by req.auth.email, clears OAuthLoginInitiated
              ▼
200 { message: LOGIN_SUCCESS, user: <sanitized> }
```

`GoogleStrategy` is registered with `passReqToCallback: true` specifically so the verify callback can reach `req.query.state` — that's the only reason `req` is threaded through. `state` is used here purely as a way to smuggle `userType` through Google's redirect round-trip, not as a CSRF nonce (Google's OAuth `state` param is conventionally for CSRF protection; this app repurposes it for a different, unrelated value, and does **not** validate the callback's `state` against what `googleInitiate` originally issued — there is no CSRF check on this flow).

**`GET /auth/login/success` reachability: fixed.** It used to call `authService.signToken(...)` directly off `req.user`, assuming Passport's auth artifact from the *earlier* `/auth/google/callback` request was still available — it never was, since `session: false` means nothing persists `req.user` across the redirect to a fresh request, so this route always hit its `401` branch in real traffic. The actual session issuance (`issueOAuthSession` — signs the JWT, sets `Token`/`userName`/`isLoggedIn`/`userType`) moved into `googleCallback`, the one request in this handshake that legitimately has `req.user`. `loginSuccess` is now just another `requireAuth`-gated route, reading the `Token` cookie `googleCallback` already set rather than depending on `req.user` at all. Verified live (not just read from source) — see `tests/auth.test.ts`'s "GET /auth/login/success" tests, which confirm the route is reachable given a valid `Token` cookie and 401s without one.

## `signToken` and session revocation

```ts
jwt.sign({ User: { id: email }, tokenVersion }, env.JWT_SECRET, { expiresIn: THIRTY_DAYS_MS / 1000 })
```

The JWT now expires — `expiresIn` is derived from `THIRTY_DAYS_MS` (exported from [auth.cookies.ts](../../src/modules/auth/auth.cookies.ts), the same constant the `Token` cookie's own `expires` is built from), so the token and the cookie carrying it always lapse at the exact same instant. This alone only bounds how long a leaked token stays valid (up to 30 days); actually killing a session on demand needed something more, which is what `tokenVersion` is for.

Every `User` document has a `tokenVersion` (default `0` — see [users.md](./users.md#the-user-model-is-shared-by-five-modules)), embedded in the JWT payload at sign time. [`requireAuth`](../../src/middleware/auth.ts) compares the token's `tokenVersion` against the DB's current value on every request and rejects a mismatch — so bumping a user's `tokenVersion` immediately invalidates every token issued before that point, not just ones that have naturally expired. Two things bump it:
- **`POST /auth/update`** (password change) — see above; always bumps, unconditionally logging out every existing session on that account.
- **`GET /auth/logout`** — see below; bumps only the account the cookie being cleared actually belonged to.

Nothing else bumps it — signing in on a second device, for instance, does not invalidate the first device's session; `tokenVersion` is a blunt "kill everything" tool, not per-device session tracking.

The payload's nested shape (`{ User: { id: <email> }, tokenVersion }`) is decoded as `decoded.User.id`, and that value — despite the field name `id` — **is the user's email**, not a Mongo `_id`. `requireAuth` exposes it as `req.auth.email`, which is the correctly-named surface; the `User.id` naming inside the JWT payload itself is the confusing part, worth knowing if you're ever debugging a decoded token by hand.

**Shipping this logs every existing session out.** A `Token` cookie issued before this change has no `tokenVersion` in its payload at all (`undefined`), which never equals a real user's `0`-or-higher `tokenVersion` — so `requireAuth`'s comparison fails for every pre-existing cookie the first time it's checked post-deploy. That's the intended, one-time cost of turning on revocation, not a bug to patch around.

## `requireAuth` middleware

[src/middleware/auth.ts](../../src/middleware/auth.ts), now `async`: reads `req.cookies.Token` → `401 UNAUTHORIZED` if absent → `jwt.verify(token, env.JWT_SECRET)` → `401` (generic, same message) if verification fails for any reason (expired, malformed, wrong secret) → **`User.findOne({ email: decoded.User.id }).select("tokenVersion")`** → `401` if no such user, or if `user.tokenVersion !== decoded.tokenVersion` → sets `req.auth = { email: decoded.User.id }` → `next()`. Consumers type their handler as `asyncHandler<AuthenticatedRequest>(...)` to get `req.auth.email` without an assertion, same as before.

**This is now the one DB read on every authenticated request** — a deliberate architecture trade-off (a few ms of latency per protected call) chosen specifically to get real, on-demand revocation instead of only a time-boxed token; see [known-issues.md](./known-issues.md#auth) for the reasoning. The projection (`.select("tokenVersion")`) keeps the read minimal — just `_id` + `tokenVersion`, not the full document.

Protected routes using it: `GET /user/profile`, `PATCH /user/update`, `PATCH /user/complete` ([users.md](./users.md)), `GET /organizations/dashboard` ([organizations.md](./organizations.md)), `POST /events/create` ([events.md](./events.md)), and — as of the `GET /auth/login/success` fix above — that route itself. Everything else in `auth` remains unauthenticated by design (you can't require a token to sign in).

## `GET /auth/logout`

No auth check required, no body — but now `async` and does real work: `authService.verifyTokenLoosely(req.cookies?.Token)` tries to decode the cookie (swallowing any failure — missing, expired, malformed, all treated the same as "nothing to revoke"); if it decodes to a real email, `authService.bumpTokenVersion(email)` runs **before** the cookies are cleared, so that account's `tokenVersion` moves and every outstanding token for it (including the one just used to call logout) stops passing `requireAuth`. Then, same as before: overwrites `Token`/`userName`/`isLoggedIn`/`userType` with `clearedCookieOptions(...)` (`expires: new Date(0)`) — `Token` cleared `httpOnly: true`, the other three `httpOnly: false`, matching how OAuth's `loginSuccess` originally set them. **A `Token` cookie set by the email/password path (`httpOnly: false`) is cleared here with `httpOnly: true`** — browsers key cookie deletion on name + path + domain, not `httpOnly`, so this still clears it correctly in practice; noted only because it's another spot where the two login paths' cookie flags don't quite line up. Always `200`, regardless of whether the caller was actually logged in — logout never fails, it just has nothing to revoke server-side if the cookie was already garbage or absent.

## Cookie option builders (`auth.cookies.ts`)

All three (`httpOnlyCookieOptions`, `readableCookieOptions`, `clearedCookieOptions`) hardcode `secure: true` and `sameSite: "none"` — this means **every cookie this API sets requires HTTPS**, including in local dev. If you're testing against `http://localhost` end-to-end (not just hitting the API directly), the browser will silently refuse to store any of these cookies (`Secure` cookies are dropped over plain HTTP by every modern browser) — this is a common source of "login works but nothing persists" confusion locally; use HTTPS (e.g. a local proxy/tunnel) or a browser flag to test the real cookie-based flow.

## What's known-broken here

See [known-issues.md](./known-issues.md#auth) for the full list. JWT expiry and session revocation, and `GET /auth/login/success`'s reachability, are **fixed** (see above). The frontend's profile-completion and profile-update calls now have matching backend routes too — see [users.md](./users.md) and [api-contract.md](./api-contract.md).
