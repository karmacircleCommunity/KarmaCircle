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

## Routes

| Route | Auth | Notes |
|---|---|---|
| `GET /organizations` | no | Live organizations only, `{ data, pagination }` via `toPublic()`. Filters: `?search=` (case-insensitive partial match on name/description/city), `?tag=`, `?domain=`, plus `?page=&limit=`. |
| `GET /organizations?userName=` | no | **Legacy branch, unchanged**: an account lookup answered out of the `users` collection, not this one. Still what `Profile.tsx` calls for `/user/:userName` and `/organization/:userName` account views. |
| `GET /organizations/taxonomy` | no | `{ tags, domains }` — the closed vocabularies in [organization.taxonomy.ts](../../src/modules/organizations/organization.taxonomy.ts). The frontend renders its filter chips and setup form from this rather than keeping a second copy. |
| `GET /organizations/me` | ✅ | The owner's own record via `toPrivate()` — public fields plus `ownerEmail`, `contactPhone`, `members`, `status`, `missingFields`, `isLive`. `403` for an individual account. Backfills the record for organizations that predate this collection (`findOrCreateForOwner`). |
| `PATCH /organizations/me` | ✅ | Saves any subset of `updateOrganizationSchema`, publishes if that completed the required list. Returns `{ message, organization }`. |
| `GET /organizations/dashboard` | ✅ | Unchanged: the caller's own sanitized **user** document, not this collection. |
| `GET /organizations/{handle}` | no | One live organization via `toPublic()`. Declared last in the router — `/taxonomy`, `/me` and `/dashboard` would all match this wildcard otherwise. |

`toPublic()` is where the public/private line is drawn, once, rather than at each call site: `ownerEmail`, `members`, `contactPhone` and `status` never reach a public response, so a new public route cannot leak them by forgetting to filter.

## Tests

[tests/organizations.test.ts](../../tests/organizations.test.ts) covers the draft-to-live transition (including that a partial save stays in draft), the `404` on a draft's public profile, the `401`/`403` gates on `/me`, the public shape's omissions, the search and domain filters, and the `400` on an attempt to set `status`/`verified`.
`tests/auth.test.ts`'s discriminator test asserts the other half: a fresh organization signup does not appear in the directory.

## What's known-broken here

The `?userName=` branch still looks up **any** user, not only organization-type ones, so `GET /organizations?userName=<an individual>` returns that individual with `200`. `GET /organizations/dashboard` is likewise not filtered to organizations. Both are unchanged legacy behavior, informational rather than bugs unless product intent says otherwise.
