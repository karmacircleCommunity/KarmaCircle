# Security

Audit of the whole monorepo (CI, `apps/api`, `apps/web`, dependencies), September 2026, triggered by a private report of a pull-request-target pwn request.
This repo is open source, so everything here assumes the attacker has read the code.

## Scope and honest scoring

There is no meaningful "percent safe" number for a codebase, and a made-up one would mislead more than it helps.
Instead, the table below scores coverage against a fixed checklist, so a future audit can be compared like for like.

| Area | Checked | Result |
| --- | --- | --- |
| GitHub Actions | triggers, secrets exposure, permissions, action pinning | 1 critical fixed, active actions pinned to full SHAs, repository security settings enabled; exposed Vercel token rotation remains open |
| Secrets in git (working tree) | tracked `.env*`, key/token patterns | none committed, `.env.example` only |
| Secrets in git history | not scanned | **open**, run `gitleaks` or `trufflehog` once |
| API authn/authz | cookie flags, JWT, revocation, route gating | sound, see open items |
| API input handling | Zod on routes, NoSQL/regex injection, mass assignment | 1 medium fixed (signup mass assignment) |
| API payments | signature check, amount limits, replay/race | 2 fixed, see below |
| API transport | helmet, CORS allowlist, rate limiting, proxy trust | 1 fixed (`trust proxy`) |
| Web (SPA) | XSS sinks, token storage, redirects, `VITE_` secrets, headers | no XSS sinks, headers added, CSP still open |
| Dependencies | `npm audit --omit=dev` both apps | 7 advisories fixed, both now report 0 |

## Fixed in this audit

### Critical: pwn request in `web-prtests.yml`
Reported privately by Humaira Akram (humaira924.github.io), confirmed by reading the workflow.

- **Cause:** trigger was `pull_request_target` (runs with base-repo secrets and a write token), the job checked out the fork's head (`repository: <fork>`), and `BetaHuhn/deploy-to-vercel-action` then installed and built that code with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` in scope and `DEPLOY_PR_FROM_FORK: true`.
  Any fork PR could add a `postinstall` script or a vite plugin that posts the token to a server.
- **Fix:** trigger is now `pull_request`, the job is skipped unless the PR head is in this repo, `DEPLOY_PR_FROM_FORK` is `false`, the fork checkout and the branch-creating step are gone, and permissions are explicit.
  Fork PRs no longer get a preview deploy.
  That is the intended trade: a preview deploy of untrusted code needs the secret, so it cannot be offered.
- **Rule going forward:** never combine `pull_request_target` with a checkout of PR head code and secrets.
  `pull_request_target` is only acceptable for workflows that never check out or run PR code (labelers, title lint).
- **Required manual step:** the token was exposed to that path for as long as the workflow existed.
  Rotate `VERCEL_TOKEN` in Vercel and the GitHub secret, and look at Vercel's audit log for deployments you did not make.
  Nothing in the repo can prove it was never abused.

### Other workflow hardening
- Every workflow now declares least-privilege `permissions:` (previously all used the repo default).
- `checkout` upgraded from v1/v2/v3 to v4 with `persist-credentials: false` where the token is not needed afterwards.
- Vercel CLI is installed at the exact reviewed version `65.9.0` in the frontend preview workflow, and production workflows still install `vercel@latest`.
  Pin exact versions in production workflows when those workflows are next updated.
- The frontend Vercel project uses the repository's pinned pnpm version and frozen workspace lockfile during deployment.
- `BetaHuhn/deploy-to-vercel-action@latest` is now `@v1`.
- Every active action reference across the workflows is pinned to a full commit SHA, including the welcome action that previously tracked `main`.
- `.github/workflows/ci.yml` runs on `pull_request` with read-only permissions and no repository secrets.
  It runs lint, type checks, builds, and both test suites before a pull request can be considered ready.

### Medium: signup mass assignment (`auth.service.ts`)
The signup schema is `.passthrough()` and the service spread the rest of the body into the model.
A caller could set `tokenVersion`, `resetPasswordToken`/`resetPasswordExpires`, `cart`, and `config.hasCompletedProfile` on their own account.
Now an allowlist (`SIGNUP_PROFILE_FIELDS`).
Regression test in `tests/auth.test.ts`.

### Medium: rate limiting keyed to the proxy (`app.ts`)
No `trust proxy` behind Vercel meant `req.ip` was the proxy address, so all clients shared one bucket.
One attacker could burn `authLimiter`'s 20 attempts for everyone, and per-IP limits did nothing.
Now `app.set("trust proxy", 1)`.

### Medium: payment verification race (`payment.service.ts`)
`verifySponsorshipPayment` read the order, then set it to paid, then incremented the organization total, non-atomically.
Two concurrent verify calls with a valid signature both passed the status check and both credited the organization.
The status flip is now a single `findOneAndUpdate` conditioned on not-yet-paid, and only the winner credits.

### Low: unauthenticated uncapped order creation
`POST /payment/razorpay` accepted any positive amount from anyone.
Now capped at 1,000,000 rupees, same as the sponsorship order route, and the paise conversion is rounded.
Still unauthenticated, see open items.

### Low: web hardening
- `apps/web/vercel.json` now sends `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and HSTS.
- `VITE_RAZORPAY_KEY_SECRET` removed from `apps/web/.env.example`.
  Anything prefixed `VITE_` is bundled into public JS, so a secret must never be named that way.
  Nothing in `src/` read it.

### Dependencies
`npm audit fix` cleared `js-yaml`, `qs`/`body-parser`/`express`, and `fast-uri` advisories in both apps, no major bumps.

## Still open (not fixed here)

Ordered by what I would do first.

1. **Rotate `VERCEL_TOKEN`** and audit Vercel deployment history (see above).
   The connected Vercel CLI identity cannot see KarmaCircle's deployment projects, and the Vercel app connection needs reauthentication, so the replacement token could not be safely created from this session.
2. **Scan git history for secrets** (`gitleaks detect`).
   Only the working tree was checked.
3. **Google OAuth `state` is used as `userType` with no CSRF nonce** (`auth.controller.ts`, `config/passport.ts`).
   It enables login CSRF and lets a crafted link choose the account type.
   Fix: sign `state` with a nonce cookie and verify it in the callback.
4. **`GET /auth/logout` is a GET that mutates** (bumps `tokenVersion`), so any page can log a user out with an image tag or a link.
   Fix: make it `POST`, and update the frontend caller.
5. **`POST /payment/razorpay` is unauthenticated.**
   The frontend caller is the older donate flow that its own spec marks as not fully wired.
   Fix: put `requireAuth` on it, or delete the route with that flow.
6. **Password policy is weak:** signup accepts a 1-character password, update/reset require 5.
   Align all three at 8 or more (and update the signup form and tests).
7. **`JWT_SECRET` has no minimum length** (`env.ts`, `.min(1)`), and `.env.example` ships `thiswillbeyourrandomkey`.
   Enforce 32+ characters when `NODE_ENV=production`, after confirming the production secret already meets it, otherwise the deploy will not boot.
8. **No CSP on the SPA.**
   Needs an allowlist for `checkout.razorpay.com`, Geoapify, Google fonts, and the API origin, tested in a browser before shipping, so it was left out rather than risk breaking checkout.
9. **GitHub Actions and workspace dependency updates need review.**
   All active workflow actions are pinned to full commit SHAs, including the welcome action that previously tracked `main`.
   `.github/dependabot.yml` now proposes weekly GitHub Actions and npm workspace updates; review and merge those updates through the normal pull request checks.
10. **`signin` returns faster for unknown emails** (no bcrypt compare), a timing user-enumeration signal.
    Signup's 409 and `/auth/check-email` already reveal existence, so this is low value until those are changed.
11. **`/docs` (Swagger UI) is served in production**, and `express.json` allows 10 MB bodies.
    Both are low; gate `/docs` behind `NODE_ENV !== "production"` and lower the body limit if no route needs more.
12. **`POST /user/report` is unauthenticated** and only covered by the global 300 requests per 15 minutes limiter.
    Give it its own tighter limiter.
13. **GitHub-side controls are enabled**: secret scanning, push protection, and private vulnerability reporting are on; default workflow token permissions are read-only; all external contributors require workflow approval.
   GitHub API confirmed each setting after the update on 2026-11-02.
   The active `main` ruleset requires pull requests, one approval, resolved review threads, and the `validate` check for everyone except Tamal, who can push directly.
   GitHub API also confirms Dependabot alerts and automated security fixes are enabled.
   The connected account cannot inspect organization secrets because it lacks the `admin:org` scope.
   Current `main` workflows do not reference `ADDLABELPAT`, `GH_PAT`, `MILAN_CICD`, `MILAN_SECRET_TOKEN`, `NPM_TOKEN`, or `VERCEL_PROJECT_ID_BETA`; review these repository secrets before removing them because their values and any use outside current `main` are unknown.

## Review checklist for future changes

- A workflow touching secrets: trigger is `push`/`pull_request` (same-repo only), never `pull_request_target` with a PR checkout.
- A new route: goes through `validate(...)`, `asyncHandler(...)`, and `requireAuth` unless it is deliberately public.
- A body spread into a Mongoose model: allowlist the fields, never `...req.body`.
- A new `VITE_*` variable: assume it is public.
- A new money path: signature verified, state transition atomic, amount capped.
