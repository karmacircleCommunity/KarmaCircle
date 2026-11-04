# Security

Audit of the whole monorepo (CI, `apps/api`, `apps/web`, dependencies), started September 2026 after a private report of a pull-request-target pwn request and refreshed November 2026.
This repo is open source, so everything here assumes the attacker has read the code.

## Scope and honest scoring

There is no meaningful "percent safe" number for a codebase, and a made-up one would mislead more than it helps.
Instead, the table below scores coverage against a fixed checklist, so a future audit can be compared like for like.

| Area | Checked | Result |
| --- | --- | --- |
| GitHub Actions | triggers, secrets exposure, permissions, action pinning | 1 critical fixed in this repo; secret scanning and push protection enabled across public organization repositories; Vercel token rotated; invite tokens still need rotation or revocation |
| Secrets in git (working tree) | tracked `.env*`, key/token patterns | none committed, `.env.example` only |
| Secrets in git history | Gitleaks scan plus GitHub alerts through 2026-11-02 | One historical client-visible Geoapify key found by Gitleaks; it still works and its owning project is not in the signed-in Geoapify account; GitHub separately reports an old MongoDB Atlas URI, whose password was rotated and alert resolved as revoked, while database access-log review remains unavailable on Free tier |
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
- **Exposure response:** the replacement token is installed in both GitHub repositories, and the former token is revoked.
  Vercel's available 100-event window was reviewed against the current one-member roster, with no unrecognized actor or deployment found.
  This review cannot prove the token was never abused outside the available event window.
- **Current status (2026-11-02):** the replacement named `karmacircle-ci-2026-11` was created in the Personal Brave profile with team-wide project scope and a 90-day expiry.
-  Both `KarmaCircle` and `KarmaCircle-BE` repository secrets now contain the replacement, verified by their updated secret timestamps.
-  Production frontend and API workflows in `KarmaCircle` completed successfully with the replacement, and `https://api.karmacircle.org/health` returned HTTP 200 afterward.
-  The `KarmaCircle-BE` production workflow authenticated and pulled Vercel environment settings, but its build failed because Vercel expected a `public` output directory after TypeScript compilation.
-  The previous never-expiring token `karmacircle-ci` was deleted after the replacement was installed and deployment authentication succeeded.
-  The replacement token expires January 31, 2027; its value is not stored in this document or chat, and the system clipboard was cleared after updating both secrets.
  The latest 100 Vercel team events were reviewed against the current one-member roster.
  Long responses had truncated actor fields and initially looked like activity from another principal, but narrow event queries confirmed that the returned events came from the current team member.
  The four preview deployments on the `codex/agentic-readiness` branch match merged PR #1380 and its commit history; no unrecognized actor or deployment was found in this event window.
- **Current usage:** `VERCEL_TOKEN` remains in the preview workflow and production deployment workflows in this repository.
  The separate, active `karmacircleCommunity/KarmaCircle-BE` repository also uses its own `VERCEL_TOKEN` in two production workflows.
- Production, dev, and same-repository preview deployment jobs call the reusable CI workflow and wait for it to pass; production jobs are restricted to `main`, and dev jobs to `dev`.
  The active `main` ruleset requires the `validate` check and a review before pull requests can merge.
- **Deployment evidence:** the `KarmaCircle` production frontend and backend workflows completed successfully on 2026-11-02 using the replacement token.
  In `KarmaCircle-BE`, the November 2 workflow authenticated and pulled settings with the replacement but failed at the build because Vercel expected a `public` output directory.
  This is a project output configuration issue, not a token authentication failure.
- **Current exposure boundary:** fork PRs are skipped by this preview workflow, but same-repository PRs still pass `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to a deployment action that builds the PR.
  Treat contributors able to push branches in this repository as trusted with those credentials, and consider moving previews to Vercel's Git integration or a reviewed protected environment.

- **Vercel environment values:** readable-secret flags were cleared for `MONGO_URI`, `JWT_SECRET`, `SECRET_KEY`, `RAZORPAY_KEY_SECRET`, and `CLIENT_SECRET` in both API projects by changing their visibility to sensitive.
  No values were retrieved or changed.
  The KarmaCircle production API deployed successfully after these settings changed; the separate API development project still needs a fresh deployment check.
  The legacy `milan` and `milan-beta` Vercel projects had readable `MONGO_URI` and `JWT_SECRET` entries; the Production/Preview entries are now sensitive, and the stored values for both keys were cleared from all environments.
  `VITE_RAZORPAY_KEY_SECRET` entries were also cleared from both projects because neither deployed source commit references that variable.
  Their deployed commits use Vite, and source inspection found no code references to `MONGO_URI` or `JWT_SECRET`, so the old URIs were stale configuration and did not require replacement or redeployment.
  Both projects still have Vite deployments from 2024 and serve frontend pages on their `.vercel.app` domains.
  Their `VITE_GEOAPIFY_API_KEY` entries remain because the frontend uses that variable; their values differ from the historically leaked Geoapify key, and their provider-side restrictions remain unverified.
  The active `karmacircle-ui` Vercel project now has a Production Config `VITE_GEOAPIFY_API_KEY` for address autocomplete.
  It comes from a new `KarmaCircle Production` Geoapify project and is restricted to `https://www.karmacircle.org` for both allowed origin and CORS response origin.
  A fresh production deployment from the same `main` commit is Ready with the variable, and the custom production domains point to it.

### Critical: publicly leaked MongoDB Atlas credential in Git history

GitHub secret scanning opened alert #1 on 2026-11-02 for a MongoDB Atlas URI with credentials and marks it `publicly_leaked`.
The reported locations are historical `server/db.js` and `.env` commits; neither file is tracked at current `HEAD`.
The credential value is deliberately not copied into this document or terminal output.

- **Required action:** review database access logs and confirm no legitimate deployment still uses the old credential.
- **Current status:** the user rotated the legacy Milan project's `tamaldas69` database user's password, and GitHub alert #1 is resolved as revoked while its validity remains `unknown`.
  That user now has the custom role `milan_app_rw`, limited to `readWrite` on `milandatabase`.
  The active KarmaCircle API uses a separate database user with app-database-scoped access, and `https://api.karmacircle.org/health` returned HTTP 200 with MongoDB connected after the access changes.
  Atlas database access logs remain unreviewed, and the network access list still allows `0.0.0.0/0` in both Atlas projects.
- **Log availability:** both the KarmaCircle and legacy Milan clusters are Atlas Free clusters.
  Atlas does not provide Database Access History or downloadable cluster logs for Free clusters, so the old credential's connection history cannot be verified without changing tiers.
  See [Atlas Database Access History](https://www.mongodb.com/docs/atlas/access-tracking/) and [Atlas log availability](https://www.mongodb.com/docs/atlas/mongodb-logs/).
- **Detection gap:** the recent local Gitleaks history scan did not report this credential even though GitHub did.
  GitHub currently marks the alert resolved as revoked, but the alert's validity remains `unknown` and Atlas database access logs have not been reviewed.
  Investigate the scanner discrepancy before relying on Gitleaks as a complete history check, and reopen the alert if later evidence shows the old credential remains usable.

### Credential containment performed on 2026-11-02

- Removed the unused repository-level GitHub secrets `ADDLABELPAT`, `GH_PAT`, `MILAN_CICD`, `MILAN_SECRET_TOKEN`, and `NPM_TOKEN` after confirming no current workflow references them.
  This removes repository copies only; it does not revoke the corresponding credentials at their issuers.
- The organization secret inventory is now available after `admin:org` access was enabled.
  `INVITE_TOKEN` was visible to all public organization repositories and was narrowed to `karmacircleCommunity/KarmaCircle`, the only repository with an exact workflow reference.
  On 2026-11-02, it was replaced with the fine-grained token `KarmaCircle invite workflow 2026-11`, scoped to the organization with Members read/write permission and a one-year expiry.
  The new token value was pasted into this chat and remains active at the user's direction; replace it again through a direct clipboard-to-GitHub transfer if the user later wants to remove it from chat history.
  The previous token's issuer-side status remains unverified.
- The four public repositories in `karmacircleCommunity` were inventoried.
  `KarmaCircle-BE` is active and has two production workflows that now use the replacement `VERCEL_TOKEN`; its unused `NPM_TOKEN` and `RELEASE_SECRET` GitHub secret copies were deleted after confirming no current workflow references.
  The `.github` repository's `ORG_INVITE_TOKEN` was last updated in 2023 and fed an invite workflow targeting `MilanCommunity`, which currently returns 404 from GitHub.
  The repository secret copy was deleted on 2026-11-02; the original GitHub token remains unrevoked at its issuer, and the workflow still uses the unpinned `vj-abigo/invite-on-label@v1.4` reference.
- The Vercel connector lists many account projects, including five KarmaCircle-related projects: `karmacircle-ui`, `karmacircle-api`, `karmacircle-api-dev`, `karmacircle-ui-dev`, and `karmacircle-brand`.
  The legacy `milan` and `milan-beta` projects are also present under the account and use historical Vercel project names for the public KarmaCircle repository.
- The API projects' MongoDB URI, JWT, application, payment, and OAuth client secret entries now use Vercel's sensitive type, with no remaining `readable-secret` flags.
  The KarmaCircle production API deployed successfully after the change; the separate API development project still needs a fresh deployment check.
- Decrypted the standard Production and Preview `MONGO_URI` entries in `karmacircle-api` and `karmacircle-api-dev` only for an in-memory comparison with both GitHub alert-location credentials.
  No credential match was found, and no URI values were printed.
- All repository environment secret inventories were empty, and none of the four organization repositories has a deploy key.
- Secret scanning and push protection are enabled for public organization repositories.
  The three repositories other than `KarmaCircle` had both controls disabled before this audit; after enabling them, GitHub listed no alerts in those repositories at the time checked.
  The full initial scan completion could not be verified.
- Redacted Gitleaks history scans of `KarmaCircle-BE`, `.github`, and `karmacircle-brand` returned no findings on 2026-11-02.
  Gitleaks also missed GitHub's known MongoDB alert in this organization's `KarmaCircle` repository, so a clean Gitleaks result is not proof that no credentials were exposed.
- Current `KarmaCircle` repository and GitHub environment secret inventories were checked after cleanup.
  This repository still stores `VERCEL_TOKEN` and Vercel project identifiers; the `Preview`, `Production`, and `github-pages` environments have no secrets.
- Workflow history shows former `NOW_TOKEN` use for Vercel deployments, `DEPLOY_KEY` for version-bump checkout, `NPM_TOKEN` for package publishing and GitHub actions, and `CHANGELOG_RELEASE`, `RELEASE_SECRET`, `ADDLABELPAT`, `GH_PAT`, and `MILAN_SECRET_TOKEN` as GitHub action tokens.
  `MILAN_CICD` also served as a GitHub token input to the old preview action.
  Their GitHub secret entries are absent from `KarmaCircle`, but issuer-side revocation remains unverified.
- Set local ignored environment files and backups to owner-only permissions, then blanked secret values in the two old API environment backups.
  Removed the old public Geoapify key and unused `VITE_RAZORPAY_KEY_SECRET` setting from local frontend environment files; current frontend source does not reference the Razorpay setting.
  Removed expired local `VERCEL_OIDC_TOKEN` values.
- A redacted whole-working-tree scan now finds one credential-shaped value in the active ignored API `.env`, under `CLIENT_SECRET`.
  No value was displayed, and this scan does not establish that the local OAuth client is the production client or that the value was exposed publicly.
- The active local API `.env` still contains `CLIENT_SECRET`, `JWT_SECRET`, `SECRET_KEY`, and `RAZORPAY_KEY_SECRET`; Resend is unset and the active `MONGO_URI` is not an Atlas URI.
  These values are local-only by file location, but the OAuth, payment, and JWT credentials must be compared with deployed settings before any production rotation.
- The historical Atlas password and exposed Vercel token were rotated.
  The signed-in Geoapify key is restricted to the KarmaCircle production origin.
  A different historical browser key remains active and unrestricted; it is not present in current tracked source, and production uses the separate restricted key.
  Tamal accepts this residual exposure and has decided not to pursue recovery or revocation, so it is retained here as incident history rather than an open action.
  No evidence currently shows that the Google OAuth or Razorpay credentials were exposed, so their presence in Vercel is not by itself a reason to rotate them.

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

1. **Review MongoDB Atlas access logs and restrict network access.**
   GitHub alert #1 is resolved as revoked, but its validity remains unknown and both Atlas projects still allow `0.0.0.0/0`.
   Both clusters are Free tier, which does not provide Atlas Database Access History or downloadable cluster logs.
   That prevents reviewing the exposed credential's use unless the cluster tier is changed.
   Vercel deployment events for the KarmaCircle projects show the Hobby plan, which does not include Static IPs.
   Vercel documents Static IPs for Pro and Enterprise plans; enable an eligible network option or change the database connection architecture before removing the current broad Atlas entries, or production may stop reaching Atlas.
2. **Repair the legacy `KarmaCircle-BE` Vercel output configuration and audit deployment history.**
   The replacement `VERCEL_TOKEN` is installed in both repositories, the former never-expiring token was revoked, and the current KarmaCircle frontend and API deployments passed.
   The older backend workflow authenticates successfully but its build expects a `public` directory that TypeScript compilation does not create.
   Fix the Vercel output configuration or retire the obsolete deployment workflow, then run a successful deployment before considering that legacy project healthy.
3. **Historical Geoapify browser key: accepted residual risk, no action planned.**
   Gitleaks scanned Git history through 2026-11-02 and found one `VITE_GEOAPIFY_API_KEY` in the old root `.env.example` from 2023; it found no other candidates.
   The same value was present in ignored local frontend environment files and was removed on 2026-11-02, so local address autocomplete now needs a replacement key.
   Geoapify documents that browser keys are visible to users and should be limited by allowed origins or HTTP referrers; see its [API key guidance](https://myprojects.geoapify.com/help/api-keys/).
   The signed-in Geoapify account has one `Milan` project key created June 13, 2023, but that key does not match the leaked value.
   A separate `KarmaCircle Production` Geoapify project and key were created on 2026-11-02.
   The new key allows only the `https://www.karmacircle.org` origin and returns CORS responses only to that origin.
   It is configured on the active Vercel production project, and a fresh production deployment from the same `main` commit is Ready with the custom production domains assigned.
   A live request with the new key returned HTTP 200 from `https://www.karmacircle.org` and HTTP 401 from an unrelated origin.
   The earlier `Milan` project key also remains restricted to that origin; one request from that origin returned HTTP 200.
   The historical key still returned HTTP 200 from an unrelated origin, so it remains active and unrestricted.
   It is not present in the signed-in account, and the user reports that the owning account is lost.
   The owning account is unavailable; Tamal accepts that the old key may remain active and unrestricted and has decided not to pursue recovery or provider revocation.
   The `milan` and `milan-beta` Vercel projects still have Geoapify environment variables, but their values do not match the historical key and their provider restrictions are unverified.
   The active `karmacircle-ui` Vercel project now uses the new restricted key for production address autocomplete.
   The old value is not in current tracked source; the frontend still supports Geoapify autocomplete through `VITE_GEOAPIFY_API_KEY`.
4. **Finish GitHub invite-token cleanup.**
   Organization secret `INVITE_TOKEN` is now limited to `KarmaCircle` and has a fine-grained replacement with Organization Members read/write permission, expiring November 3, 2027.
   The new token was shared in chat and remains active at the user's direction; replace it again via direct clipboard transfer if they want it removed from chat history.
   Identify and revoke the previous issuer-side token, whose status cannot be matched from the available token inventory.
   The `MilanCommunity` organization currently returns 404, so its `.github` repo secret copy was removed; verify whether its old issuer-side token remains active and remove or repair the now-nonfunctional invite workflow, pinning its action to a full commit SHA if retained.
   See GitHub's documented [Members permission for organization invitations](https://docs.github.com/en/rest/orgs/members) and [fine-grained token guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
5. **Google OAuth `state` is used as `userType` with no CSRF nonce** (`auth.controller.ts`, `config/passport.ts`).
   It enables login CSRF and lets a crafted link choose the account type.
   Fix: sign `state` with a nonce cookie and verify it in the callback.
6. **`GET /auth/logout` is a GET that mutates** (bumps `tokenVersion`), so any page can log a user out with an image tag or a link.
   Fix: make it `POST`, and update the frontend caller.
7. **`POST /payment/razorpay` is unauthenticated.**
   The frontend caller is the older donate flow that its own spec marks as not fully wired.
   Fix: put `requireAuth` on it, or delete the route with that flow.
8. **Password policy is weak:** signup accepts a 1-character password, update/reset require 5.
   Align all three at 8 or more (and update the signup form and tests).
9. **`JWT_SECRET` has no minimum length** (`env.ts`, `.min(1)`), and `.env.example` ships `thiswillbeyourrandomkey`.
   Enforce 32+ characters when `NODE_ENV=production`, after confirming the production secret already meets it, otherwise the deploy will not boot.
10. **No CSP on the SPA.**
   Needs an allowlist for `checkout.razorpay.com`, Geoapify, Google fonts, and the API origin, tested in a browser before shipping, so it was left out rather than risk breaking checkout.
11. **GitHub Actions and workspace dependency updates need review.**
   All active workflow actions are pinned to full commit SHAs, including the welcome action that previously tracked `main`.
   `.github/dependabot.yml` now proposes weekly GitHub Actions and npm workspace updates; review and merge those updates through the normal pull request checks.
12. **`signin` returns faster for unknown emails** (no bcrypt compare), a timing user-enumeration signal.
    Signup's 409 and `/auth/check-email` already reveal existence, so this is low value until those are changed.
13. **`/docs` (Swagger UI) is served in production**, and `express.json` allows 10 MB bodies.
    Both are low; gate `/docs` behind `NODE_ENV !== "production"` and lower the body limit if no route needs more.
14. **`POST /user/report` is unauthenticated** and only covered by the global 300 requests per 15 minutes limiter.
    Give it its own tighter limiter.
15. **GitHub-side controls are enabled**: secret scanning and push protection are on for public organization repositories; private vulnerability reporting is on for `KarmaCircle`; default workflow token permissions are read-only; all external contributors require workflow approval.
   GitHub API confirmed the scanning settings after the update on 2026-11-02.
   The active `main` ruleset requires pull requests, one approval, resolved review threads, and the `validate` check for everyone except Tamal, who can push directly.
   GitHub API also confirms Dependabot alerts and automated security fixes are enabled.
   Organization secrets are now inventoried; `INVITE_TOKEN` is restricted to `KarmaCircle` and was replaced, with issuer-side cleanup still open.
   `VERCEL_PROJECT_ID_BETA` is an unused project identifier, not a credential.
   Unused repository secret copies were removed from `KarmaCircle` and `KarmaCircle-BE`, but their issuer-side credentials still need revocation checks.
16. **Generic secret scanning and validity checks are off.**
   GitHub reports `secret_scanning_non_provider_patterns` and `secret_scanning_validity_checks` disabled for this public repository as of 2026-11-02.
   Generic-pattern scanning for organization-owned repositories may require GitHub Secret Protection; confirm entitlement with an organization owner before enabling it.

## Review checklist for future changes

- A workflow touching secrets: trigger is `push`/`pull_request` (same-repo only), never `pull_request_target` with a PR checkout.
- A new route: goes through `validate(...)`, `asyncHandler(...)`, and `requireAuth` unless it is deliberately public.
- A body spread into a Mongoose model: allowlist the fields, never `...req.body`.
- A new `VITE_*` variable: assume it is public.
- A new money path: signature verified, state transition atomic, amount capped.
