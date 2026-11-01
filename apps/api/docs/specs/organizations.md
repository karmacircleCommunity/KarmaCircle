# Organizations Module

[src/modules/organizations/](../../src/modules/organizations/) — the organization's own record: its public directory listing, its public profile, and the owner-only setup/edit endpoints behind them.

## The record, and why it is its own collection

An organization signs up exactly like an individual (`POST /auth/signup` with `userType: "organization"`) and that login **is** the organization — there is no separate "person" account today.
What changed (August 2026) is where an organization's *data* lives: signup now writes two documents, the `users` login and a new `organizations` document owned by it ([organization.model.ts](../../src/modules/organizations/organization.model.ts)).

The split exists because an organization grows fields a person never has — tag, domains, team size, funds, verification — and, later, affiliated members.
Hanging those off the shared `User` schema would bloat every individual's document or force a migration the day affiliates ship.
`ownerEmail` (keyed by email, because that is what a verified JWT carries as `req.auth.email`) and the initially-single `members` array are that future pre-wired: an affiliate accepting an invite becomes a row in `members`, and nothing else moves.

The `Organization` **discriminator on the `User` model** still exists and is still what `getUserModel("organization")` constructs the login with — it is not the same thing as this collection, and both are load-bearing. See [users.md](./users.md).

### Draft and live

A new organization is created with `status: "draft"` and is invisible to everyone but its owner: absent from `GET /organizations`, and a `404` on `GET /organizations/{handle}` — deliberately the same `404` an unknown handle gets, so a visitor cannot tell a half-finished signup from a nonexistent one.

`REQUIRED_FIELDS` in [organization.service.ts](../../src/modules/organizations/organization.service.ts) is the list that gates publication: `description`, `tag`, `domains` (at least one), `teamSize`, `city`.
They are deliberately **not** `required: true` on the schema — the setup form saves partial progress, and the record simply stays in draft.
`updateForOwner` re-checks the list on every save and flips `status` to `live` on the save that completes it.
The transition is one-way: a live organization that later blanks a required field stays live rather than vanishing from the directory mid-edit and breaking every link to it.

A logo is **not** on the required list, on purpose: there is no upload endpoint yet, so requiring one would gate every organization behind a field it cannot fill. The frontend falls back to an accent band with the organization's monogram.

### What the organization may not set about itself

`status`, `verified`, `followers`, `handle` and `ownerEmail` are absent from `updateOrganizationSchema`, which is `.strict()` — sending any of them is a `400`, not a silently-ignored field.
`verified` is an admin-only flag (there is no admin route for it yet); `followers` is a counted number, not a claimed one.
`fundsRaised` **is** the organization's own claim, and is named so it can sit alongside a counted figure later rather than being overwritten by one — the frontend labels it "stated" wherever it renders.

### What a contact detail has to look like

`website` and `contactEmail` have always been `.url()` / `.email()`, each with `.or(z.literal(""))` so clearing one is a save rather than a `400`.
`contactPhone` was only length-capped until now, so `8245034+======` stored fine and reached the public profile as the one way to reach that organization.
It is now checked as digits, separators (space, dash, dot, brackets) and an optional leading `+`, with 7 to 15 digits — the shortest real subscriber number, and E.164's ceiling — and the same empty-string escape hatch as the other two.

The web setup form checks the same shapes before it saves (`validateSetupField` in `apps/web/src/features/organizations/utils/organizationSetupForm.ts`) so the message names the field and appears under it.
That is a nicety, not the guarantee: this schema is the only thing standing between a direct `PATCH` and an unusable contact detail, so the rule lives in both places on purpose.

## Leadership, social links, sponsorship and events (September 2026)

Four more optional pieces of a public profile, none of them on `REQUIRED_FIELDS` — same precedent `logo` already set (an organization can go live, and stay live, without any of this):

- **`leadership`** (`IOrganizationLeader[]`, capped at 8 by `updateOrganizationSchema`) — `{ name, title, photo?, bio? }` per entry. Deliberately a *different* array from `members` (the private, email-keyed permissions list): this is display copy for a visitor, not a login grant, so it carries no email and implies no platform access. Rendered on the profile as "Our team."
- **`socialLinks`** (`{ instagram?, facebook?, twitter?, linkedin?, youtube? }`, each `.url()`-or-empty like `website`) — a small icon row on the profile, one icon per link actually set.
- **`location.address` / `location.mapIframe`** — a street address and a pasted map-embed URL, alongside the existing `city`/`state`. Same "paste a link" convention `Event.mapIframe` already uses.
- **`sponsorship.enabled`** (boolean, default `false`) — whether this organization's profile shows a real "Support" button wired to the payments module's own Razorpay flow. See [payments.md](./payments.md#the-organization-sponsorship-flow--order-model-september-2026) for the order-creation/verification routes this gates, and `raisedViaPlatformPaise` below for the number it feeds.
- **`raisedViaPlatformPaise`** — **not** settable through `updateOrganizationSchema` (absent from it entirely, same treatment as `verified`/`followers`). The sum, in paise, of every payment that has actually cleared signature verification for this organization. `toPublic()` exposes it as `raisedViaPlatform`, in rupees. Deliberately never merged with `fundsRaised` (the organization's own typed-in claim) into one number — the model draws that line and the frontend's stat strip keeps it, showing "Funds raised (stated)" and "Raised via KarmaCircle" as two separate figures whenever both are non-zero.
- **Events**: `Event.organizerHandle` (see [events.md](./events.md)) is the real link an organization's hosted events use — `GET /events?host=<handle>` is what the profile's "Events hosted" section and the About section's "most recently…" line both read.

### What a real file upload would still need

`logo`, `cover`, `gallery`, and every `leadership[].photo` are plain URL strings — an organization pastes a link, exactly like `website` always has. There is still no upload endpoint (multer/S3/GridFS/whatever), and building one is an explicit, deliberately deferred follow-up, not an oversight: it needs a storage decision this pass didn't make. See [known-issues.md](./known-issues.md#payments).

## Routes

| Route | Auth | Notes |
|---|---|---|
| `GET /organizations` | no | Live organizations only, `{ data, pagination }` via `toPublic()`, sorted `sponsorship.enabled` first, then `verified`, then newest — the frontend's directory reads that ordering to build its "Featured organizations" strip out of whichever sponsorship-enabled organizations land on page one, rather than a second query. Filters: `?search=` (case-insensitive partial match on name/description/city), `?tag=`, `?domain=`, plus `?page=&limit=`. |
| `GET /organizations?userName=` | no | **Legacy branch, unchanged**: an account lookup answered out of the `users` collection, not this one. The frontend endpoint builder remains, but `/user/:userName` was removed and the public organization page uses `GET /organizations/{handle}`. |
| `GET /organizations/taxonomy` | no | `{ tags, domains }` — the closed vocabularies in [organization.taxonomy.ts](../../src/modules/organizations/organization.taxonomy.ts). The frontend renders its directory filter dropdown and setup form from this rather than keeping a second copy. |
| `GET /organizations/me` | ✅ | The owner's own record via `toPrivate()` — public fields plus `ownerEmail`, `contactPhone`, `members`, `status`, `missingFields`, `isLive`. `403` for an individual account. Backfills the record for organizations that predate this collection (`findOrCreateForOwner`). |
| `PATCH /organizations/me` | ✅ | Saves any subset of `updateOrganizationSchema`, publishes if that completed the required list. Returns `{ message, organization }`. |
| `GET /organizations/dashboard` | ✅ | Owner-only dashboard contract documented below. Returns organization and sanitized account profile, aggregate metrics, daily profile views, recent events, supporters, and followers. Sample activity is marked and excluded from verified raised totals. Rejects individual accounts. |
| `POST /organizations/{handle}/analytics/profile-view` | no | Records one public profile view for a live organization; stores no IP or browser identifier. |
| `GET /organizations/{handle}/follow` | ✅ | Returns whether the caller follows the live organization. |
| `POST /organizations/{handle}/follow` | ✅ | Idempotently follows a live organization; self-follow is rejected. |
| `DELETE /organizations/{handle}/follow` | ✅ | Removes the caller's follow relationship. |
| `GET /organizations/{handle}` | no | One live organization via `toPublic()`. Declared last in the router — `/taxonomy`, `/me` and `/dashboard` would all match this wildcard otherwise. |

`toPublic()` is where the public/private line is drawn, once, rather than at each call site: `ownerEmail`, `members`, `contactPhone` and `status` never reach a public response, so a new public route cannot leak them by forgetting to filter.

## Owner dashboard metrics

### Response contract and dashboard-area mapping

`GET /organizations/dashboard` returns one owner-scoped JSON object with these top-level fields:

| Field | Shape and purpose |
|---|---|
| `organization` | `organizationService.toPrivate()` result. Supplies the header name and the organization overview, contact details, and publication state. Private owner fields are allowed here because this endpoint is authenticated and owner-only. |
| `profile` | `userService.sanitize(user)` result. Sanitized account profile only; no credential fields. |
| `includesDemoData` | Boolean provenance flag for sample event, follow, contribution, or view records. It describes data provenance and is not a dashboard section. |
| `period` | `{ days: 30 }`, the default aggregate period. |
| `metrics` | Aggregate counts and amounts. See exact members below. |
| `viewsByDay` | Up to 90 daily profile-view buckets, each with `views` and `demoViews`. |
| `events` | Up to 8 most recently scheduled hosted events, each with its registration count and `isDemo` marker. |
| `supporters` | Up to 8 latest paid contribution records, with supporter display name, amount, currency, time, and `isDemo`; no email. |
| `followers` | Up to 8 latest follower display records, with name, optional username, follow time, and `isDemo`; no email. |

`metrics` contains `followers`, `following`, `hostedEvents`, `eventRegistrations`, `supporters`, `verifiedSupporters`, `raisedViaPlatform`, `demoSupporters`, `demoRaisedViaPlatform`, and `profileViews.last7Days` / `profileViews.last30Days`.
Amounts are returned in whole rupees, floored from stored paise.
`supporters` counts paid contribution records, not unique people.
`following` counts organizations followed by this organization account; it does not mean individual followers who follow back.

The ten dashboard refinement areas map to the response as follows:

| Dashboard area | Response fields |
|---|---|
| 1. Header and actions | `organization.name`; actions use existing frontend routes and require no new API field. |
| 2. Organization profile overview | `organization.cover`, `logo`, `name`, `description`, `tag`, `domains`, `location`, `teamSize`, `website`, `socialLinks`, `verified`, `isLive`. The six-item profile checklist is derived in the frontend from these existing fields; the API adds no duplicate score field. |
| 3. Contact details and status | `organization.contactEmail`, `contactPhone`, `sponsorship.enabled`, `status`, `isLive`. |
| 4. Community metrics | `metrics.followers`, `metrics.following`. |
| 5. Event performance metrics | `metrics.hostedEvents`, `metrics.eventRegistrations`. |
| 6. Support metrics | `metrics.supporters`, `verifiedSupporters`, `raisedViaPlatform`, `demoSupporters`, `demoRaisedViaPlatform`. |
| 7. Profile reach analytics | `metrics.profileViews`, `viewsByDay`, `period`. |
| 8. Community and follower list | `followers[]`. |
| 9. Hosted events list | `events[]`. |
| 10. Supporter activity and giving breakdown | `supporters[]` plus the support metrics. |

This contract already supplies every field used by the current dashboard header and all ten planned dashboard areas.
No duplicate `header` payload is needed: `organization.name` is the source of truth.

`OrganizationFollow` stores unique `(organizationHandle, followerEmail)` relationships and supports the public profile's follow action.
The dashboard derives both follower count and the account's organization-following count from these records rather than trusting a client-provided number.
The dashboard returns follower display names only; it does not expose follower email addresses.

`OrganizationAnalyticsEvent` stores profile-view events with an organization handle and timestamp, with a one-year TTL index.
The public profile records a view after loading a live organization.
These are raw page views, not unique visitors or event impressions, and no IP/user-agent is stored.

Hosted event totals and registrations are read from `Event` and `EventRegistration`.
Support totals read paid `Order` records; verified counts and raised amounts exclude `isDemo: true` rows, while sample amounts are returned separately. Supporter email addresses are not returned.

Dashboard sample records can be loaded locally with `scripts/seed-organization-dashboard-demo.ts --confirm-demo-data`. The seed also fills reserved sample contact email/phone values, enables community support, and ensures the organization remains public; the email uses the reserved `.example` domain.
The seeder hard-refuses any database except `karmacircle_dev`, uses stable demo keys for repeatable upserts, and marks events, registrations, follows, contributions, and views as demo data.
Demo contributions are display-only sample records and do not represent a payment transaction.

## Tests

[tests/organizations.test.ts](../../tests/organizations.test.ts) covers dashboard sample-versus-verified totals and the individual-account gate, the draft-to-live transition (including that a partial save stays in draft), the `404` on a draft's public profile, the `401`/`403` gates on `/me`, the public shape's omissions, the search and domain filters, the `400` on an attempt to set `status`/`verified`, and (September 2026) `socialLinks`/`leadership`/`sponsorship`/`location.address`/`location.mapIframe` round-tripping through a save plus the `leadership` length cap and `socialLinks`' `.strict()` rejection of an unknown platform key.
`tests/auth.test.ts`'s discriminator test asserts the other half: a fresh organization signup does not appear in the directory.
[tests/payments.test.ts](../../tests/payments.test.ts) covers the sponsorship order/verify pair from the payments module's side — see [payments.md](./payments.md).

## What's known-broken here

The `?userName=` branch still looks up **any** user, not only organization-type ones, so `GET /organizations?userName=<an individual>` returns that individual with `200`.
