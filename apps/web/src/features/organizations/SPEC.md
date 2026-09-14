# Organizations — Feature Spec

Colocated, implementation-level companion to
[docs/specs/organizations.md](../../../docs/specs/organizations.md). A directory
page, a public profile page, an owner-only setup/edit wizard, one card
component, a sponsorship payment flow, the un-called `ApiConnector` fetcher,
the API→view adapter, and types. The twelve-organization sample-data file is
retired (September 2026) — see below.

**This file previously described the pre-August-2026 fixture-only version of
this feature as current** (both pages rendering `organizationDirectory`'s
sample records, no network call). That was already wrong by the time this
September 2026 pass started — both pages have fetched live data since the
organization model landed — and is corrected here in the same change that
adds real leadership/social/sponsorship/events data, per this repo's own
"keep the specs honest" rule.

## What this feature is responsible for

Two public routes, plus the owner-only wizard that publishes and edits a
record:

- `/organizations` — the directory, a filterable grid of organization cards,
  live data via `useSWR` + `organizationEndpoints.directory({...})`.
- `/organization/:userName` — the **public** organization profile a card
  links to (`pages/OrganizationProfile.tsx`), fetching
  `GET /organizations/{handle}` live. This route previously rendered
  `Profile.tsx` from `onboarding-profile`, the _account_ page shared with
  `/user/:userName`; that page is unchanged and still owns `/user/:userName`
  — see [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md). When a
  request says "the organization page", check which of the two is meant.
- `/organization/setup` — `pages/OrganizationSetup.tsx`, the Typeform-style
  wizard that both publishes a draft organization and doubles as its edit
  flow once live. Three steps as of September 2026: "about" and "reach"
  (the original required-field steps) plus "presence" (new, entirely
  optional — logo/cover, social links, address/map, leadership, sponsorship).

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Organizations.tsx` | The `/organizations` directory | ✅ routed; live data, server-side search/filter, a featured strip for sponsorship-enabled organizations |
| `pages/OrganizationProfile.tsx` | The `/organization/:userName` public profile | ✅ routed; live, 404s on a draft organization |
| `pages/OrganizationSetup.tsx` | The `/organization/setup` owner-only wizard | ✅ routed; live; also the edit flow for a live organization |
| `hooks/useOrganizationSetup.ts` | The setup flow's state: record, taxonomy, form, stage, per-step save | ✅ used by `OrganizationSetup.tsx`; fully generic over `SETUP_STEPS`, no changes needed to add the "presence" step |
| `hooks/useRazorpayCheckout.ts` | Lazy-loads Razorpay's Checkout script exactly once (module-level cached promise), opens it with caller-supplied options | ✅ used by `SponsorOrganizationModal.tsx` |
| `constants/organizationSetup.ts` | The wizard's steps as data, `FIELD_SPECS`, `FIELD_CY`, `REQUIRED_LABELS` | ✅ read by the page, the hook and the draft notice |
| `utils/organizationSetupForm.ts` | Pure helpers: seeding, per-step payloads, dirty check, outstanding counts, validation | ✅ used by the hook |
| `components/setup/*` | `SetupLayout`, `SetupAside`, `SetupIntro`, `SetupQuestion` (renders every question kind, including the new `"list"`/`"toggle"`), `SetupLocationFields`, `SetupLeadershipEditor` (new), `SetupFieldLabel` | ✅ used by `OrganizationSetup.tsx` |
| `components/OrganizationDraftNotice.tsx` | Dashboard reminder + way back in for an organization still in draft | ✅ mounted by `dashboard/pages/Dashboard.tsx` for organization accounts |
| `components/OrganizationEventsList.tsx` | The profile's "Events hosted" section — upcoming/past groups off the raw `GET /events?host=` shape | ✅ new (September 2026), used by `OrganizationProfile.tsx` |
| `components/SponsorOrganizationModal.tsx` | The real "Support {org}" payment flow (amount → Razorpay Checkout → verify) | ✅ new (September 2026), used by `OrganizationProfile.tsx` |
| `utils/toDisplayOrganization.ts` | Maps the API shape onto what the card and profile render | ✅ used by both public pages |
| `utils/monogram.ts` | Initials for an organization (or a leader) with no image of its own | ✅ used by the card, the profile header, and the "Our team" section |
| `components/OrganizationCard.tsx` | Presentational card for one organization | ✅ used by `Organizations.tsx`, including its featured strip (`featured` prop) |
| `constants/organizationDisplay.ts` | The accent palette (`ORGANIZATION_ACCENTS`) and `formatCount()` — display-only helpers, not business data | ✅ used by both public pages and, for the no-cover fallback, `events/utils/toDisplayEvent.ts`/`toDisplayEventDetail.ts`/`EventCard.tsx`/`EventHero.tsx` |
| `services/Organizations.ts` | `getOrganizations()` — a real fetcher | ❌ **defined, never called from anywhere** — `Organizations.tsx` fetches through `useSWR` + `organizationEndpoints.directory()` directly instead |
| `types/interfaces.ts` / `types/types.ts` / `types/index.ts` | Interfaces and type aliases, split by kind — see "Types" below | ✅ imported by every other file in this folder |

**Retired, September 2026:** `constants/organizationDirectory.ts` (the twelve-organization sample fixture, `CAUSES`, `findOrganization()`) and its twelve placeholder cover photos under `assets/pictures/organizations/` — deleted outright, not kept as a reference shape (superseding this file's own earlier note that it was "kept... rather than deleted"; nothing has read the fixture's records since both pages went live, so there was nothing left for keeping it to protect). `ORGANIZATION_ACCENTS`/`formatCount()`, its only two still-live exports, moved to the new `constants/organizationDisplay.ts` above. `DirectoryOrganization` (the fixture-shaped type) is gone from `types/interfaces.ts`; `CauseFilter` (already unused) went with it. Real demo data lives entirely in `apps/api/scripts/seed-demo-data.ts` now — the same place events' demo data moved to in the same pass.

## `pages/Organizations.tsx`

**Rendered chrome:** `<ComponentHelmet type="Organizations" />`, `<Navbar />`, a
heading block, `DirectoryToolbar` (search + cause filters + result count +
"Your dashboard" button), the results grid, `<Footer />`.

**Live data, server-side filtered.** `useSWR(organizationEndpoints.directory({
search, domain }), fetcher, { keepPreviousData: true })` — both the search
term and the cause chip go to the backend, not applied to an already-fetched
page (the directory is paginated). The cause chips themselves come from
`useSWR(organizationEndpoints.taxonomy, fetcher)`, never a hardcoded list.

**Featured strip (September 2026).** Only on the unfiltered default view
(`query === "" && domain === "All"`):

```ts
const featured = isUnfiltered
  ? results.filter((org) => org.sponsorship?.enabled).slice(0, 2)
  : [];
const featuredIds = new Set(featured.map((org) => org._id));
const rest = results.filter((org) => !featuredIds.has(org._id));
```

Deliberately a *filter*, not "the first two results" — an organization only
ever appears there because it actually turned sponsorship on, matching this
codebase's own "nothing invented" convention (see the profile's
"sections with nothing behind them don't render" rule, and
[design-system/09-components-feature.md](../../../docs/specs/design-system/09-components-feature.md)'s
note about not fabricating stats). The backend already sorts
`sponsorship.enabled` organizations first (`organization.service.ts#findLive`),
so this reads an existing order rather than issuing a second query. `rest`
excludes whatever `featured` already showed, so nothing repeats between the
two grids.

**Search field fix (September 2026).** `DirectoryToolbar`'s `<input>` is
`type="text" role="searchbox"`, not `type="search"` — see
[docs/specs/design-system/08-components-shared.md](../../../docs/specs/design-system/08-components-shared.md#directorytoolbar)
for exactly why (`type="search"` layered extra, inconsistently-hidden
browser-native chrome on top of this component's own icon/clear button,
which read as "a weird animation"). The clear button is now always mounted
(opacity/`pointer-events` toggle) rather than conditionally rendered, so it
fades rather than pops in.

**Search and filters actually work**, replacing the pre-live version's inert
input/button. `aria-live` result count, "nothing matches / reset filters"
empty state.

That chrome is shared with `/events` via
[`DirectoryToolbar`](../../../components/DirectoryToolbar.tsx). The grid is
`1 / 2 / 3` columns (`sm` / `xl`) inside `max-w-7xl` with `px-9` mobile
padding. Scoped by `useSectionReveal(gridRef, [results.length, domain])`.

Still no pagination (the directory fetches `limit: 60` and stops there).

## `pages/OrganizationProfile.tsx`

Fetches `GET /organizations/{handle}` via `useSWR`; an unknown or draft
handle renders a dedicated not-found panel rather than a blank page.

Sections, in order: header card (cover, logo-or-monogram badge, name +
verified badge, tagline, social links row, meta row, Follow + website
actions, four-up stat strip) → "About us"/"What we work on" (+ a
"Most recently: {event}" link when the organization has hosted one) → "Drives
running now" (always empty today — no drives endpoint exists) → **"Our
team"** (leadership cards) → **"Events hosted"** (upcoming/past, via
`OrganizationEventsList`) → "Track record" (milestones, always empty today)
→ sidebar (a "Support"/"Back" card, a contact card with an optional map
embed).

**New sections, all September 2026, all following the existing "nothing
invented" rule — they render only when the record actually has the data:**

- **Logo.** `organization.logo`, when set, renders as a real `<img>` in the
  header badge slot that used to be monogram-only. This was previously a
  silent gap: `logo` has existed on `ApiOrganization` and the backend's
  `toPublic()` since the organization model landed, but
  `toDisplayOrganization.ts` never mapped it and no UI slot read it.
- **Social links.** A row of `react-icons/fa6` icons
  (`FaInstagram`/`FaFacebook`/`FaXTwitter`/`FaLinkedin`/`FaYoutube`) under the
  tagline, one per platform the organization actually filled in.
- **Location.** The contact card's existing address line now also includes
  `location.address` (a street address, alongside the pre-existing
  city/state), and grows an `<iframe>` map embed when `location.mapIframe`
  is set — the same "paste an embed URL" convention `Event.mapIframe`
  already used.
- **"Our team".** A card grid off `organization.leadership`: photo (or a
  monogram fallback, reusing `utils/monogram.ts`), name, title, bio.
- **"Events hosted".** `OrganizationEventsList` fetches
  `useSWR(eventEndpoints.byHost(organization.userName), fetcher)` — the same
  endpoint `YourEvents.tsx` already used for an organization's own dashboard
  view — and splits the result into "Upcoming"/"Past events" groups by
  `startTime` against now. Built against the *raw* `GET /events` shape
  directly (a local `HostedEvent` type, extending the shared `EventRecord`),
  not `EventCard` — that component depends on fixture-only fields
  (`spotsLeft`, `organizer`) the real API doesn't return. Each row links to
  `/events/:uid`, which today renders `DetailedEvent.tsx`'s fixture-only
  lookup (`findEvent`) and will show that page's not-found state for a real
  event uid until that page is wired to the real API — a pre-existing,
  separately-tracked gap (see the frontend's own `events.md`), not something
  this change fixes.
- **Sponsorship.** When `organization.sponsorship?.enabled`, the sidebar's
  dark card's button becomes "Support {name}" and opens
  `SponsorOrganizationModal.tsx` instead of the old (never-reachable —
  `activeDrives` is always empty today) "Sponsor a drive" scroll button. See
  "Sponsorship flow" below.
- **Funds stat strip.** `toDisplayOrganization.ts` now pushes a second stat,
  "Raised via KarmaCircle" (`raisedViaPlatform`, in rupees), alongside the
  pre-existing "Funds raised (stated)" (`fundsRaised`) whenever the counted
  figure is non-zero — the two are never merged into one number, matching
  the backend model's own stated-vs-counted distinction (see
  [apps/api/docs/specs/organizations.md](../../../../api/docs/specs/organizations.md#leadership-social-links-sponsorship-and-events-september-2026)).

**`useSectionReveal`'s dependency array grew `events.length`** — the events
fetch resolves *after* the organization record does (it's a second,
independent `useSWR` call inside `OrganizationProfileView`), so without it in
the array, "Events hosted"'s own `data-reveal` elements could get stuck at
their pre-animation opacity exactly the way this page's own documented
history already has one regression for (see the note in
[organizations.md](../../../docs/specs/organizations.md#organizationprofiletsx--the-public-profile)).

## `components/OrganizationCard.tsx`

**Props:** `organization: DisplayOrganization` (required), `featured?:
boolean` (new — renders a small "Featured" badge, top-right on the cover;
purely presentational, set only by `Organizations.tsx`'s featured strip).

Everything else it renders comes from the `organization` prop, unchanged
from before this pass. New in September 2026:

- **No logo badge on the card.** Briefly added (a small circular badge,
  top-left on the cover, mirroring the profile header) and removed again in
  the same pass on direct feedback — a plain lettermark circle on top of a
  photo the card already uses for the cause label and the "Featured" pill
  read as clutter, not identity, at card size. `organization.logo` still
  renders — large, in the profile header — see `OrganizationProfile.tsx`
  below.
- **Meta-row spacing.** The divider above the stat row used to rely
  entirely on `mt-auto` (flex space that only fills what's *left over*),
  which could collapse to almost nothing on a short card and leave the rule
  sitting on top of the meta-row text above it. The meta row now carries an
  explicit `mb-4` as a floor, with `mt-auto` still pinning the stat row to
  the bottom edge whenever there's slack to fill — direct feedback: "the
  line is very much attached to the texts."
- **Meta-row separator** — a drawn `size-1 rounded-full` dot instead of a
  `•` character, fixing a real (if subtle) alignment complaint: a text
  bullet's vertical position varies by font/renderer and read noticeably
  high against the pin icon and the surrounding digits under close zoom.
- **Stat-row `truncate`** on both `dt`/`dd` — "Focus areas" wrapping to two
  lines while its neighbours stayed on one is what threw the row off between
  columns; every label now stays single-line.

Not exported from the shared barrel (`apps/web/src/components/index.ts`) —
only ever imported directly by `Organizations.tsx`.

## Sponsorship flow (September 2026)

The organization profile's first real payment feature — see
[apps/api/docs/specs/payments.md](../../../../api/docs/specs/payments.md) for
the backend side.

- **`SponsorOrganizationModal.tsx`** — amount presets (₹500/1000/2500/5000) +
  a custom-amount field + an optional supporter name. Builds its own overlay
  markup rather than the unused shared `Modal.tsx`, matching every other
  modal in this app (see `known-issues.md`).
- **`hooks/useRazorpayCheckout.ts`** — `openCheckout(options)` lazy-loads
  `https://checkout.razorpay.com/v1/checkout.js` exactly once for the whole
  app (a module-level cached promise), then opens `new window.Razorpay(...)`.
  This is the fixed version of a bug `donate-shop-trending/pages/Donate.tsx`
  has: its own script-loading `useEffect` has no dependency array and
  re-injects the `<script>` tag on every render. That page is unrelated and
  untouched — this is a new, independent implementation of the same idea,
  not a shared fix.
- **Flow:** `CreateSponsorshipOrder(handle, { amount, supporterName })` →
  `POST /payment/organizations/:handle/order` → `openCheckout` with the
  returned order id → Razorpay Checkout's `handler` fires with
  `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` →
  `VerifySponsorshipPayment(handle, response)` →
  `POST /payment/organizations/:handle/verify`, which is the only step that
  actually credits the organization (the backend re-derives and checks
  Razorpay's HMAC signature; the browser's own "it said success" is never
  trusted). On success, `globalMutate(organizationEndpoints.byHandle(handle))`
  revalidates the profile's own SWR key so "Raised via KarmaCircle" updates
  without a manual refresh.
- **`KarmaCircleApi.ts`/`ApiEndpoints.ts`** gained `CreateSponsorshipOrder` /
  `VerifySponsorshipPayment` and a new `paymentEndpoints` export
  (`sponsorshipOrder(handle)` / `sponsorshipVerify(handle)`), following the
  existing catch-and-return-`error.response` convention — these are public
  routes (a supporter need not have a KarmaCircle account), so neither call
  sets `withCredentials`.
- **`RazorpayCheckoutOptions`** (`donate-shop-trending/types/interfaces.ts`,
  the one place `window.Razorpay`'s type is declared) grew `method`,
  `theme`, `modal`, and a typed `handler` callback — additive only, and
  reused here rather than duplicating a second global `Window.Razorpay`
  declaration. `method` is deliberately left unset: which payment methods
  actually show (cards, UPI, netbanking, international cards) is a Razorpay
  dashboard/account setting, not something either side of this app
  restricts — see that field's own doc comment.

**Not built in this pass, on purpose:** a webhook endpoint. Verification is
entirely client-callback-driven; see
[apps/api/docs/specs/payments.md](../../../../api/docs/specs/payments.md#the-organization-sponsorship-flow--order-model-september-2026)
for the one real gap that leaves (a payment that succeeds after the browser
closes before `.../verify` fires).

## The setup wizard's new "presence" step (September 2026)

`constants/organizationSetup.ts`'s `PRESENCE_QUESTIONS` — five questions,
none of them required, added as `SETUP_STEPS[2]`:

1. **`logoCover`** (`group`) — `logo`, `cover` URLs.
2. **`socials`** (`group`) — the five social-platform URL fields.
3. **`addressMap`** (`group`) — `address`, `mapIframe`.
4. **`leadership`** (`list`, new question kind) — renders
   `components/setup/SetupLeadershipEditor.tsx`, a repeating card editor
   (name/title/photo URL/bio, add/remove, capped at 8).
5. **`sponsorship`** (`toggle`, new question kind) — a single on/off switch
   for `sponsorshipEnabled`, rendered inline in `SetupQuestion.tsx` rather
   than its own component (unlike leadership, there's no per-item state to
   manage).

**Why two new question kinds rather than reusing `group`:** `group` renders
a fixed, known set of fields once; leadership is a repeating, unbounded (well,
capped-at-8) list, and a toggle isn't a text field at all — neither fits the
existing generic `<input>`-per-`FIELD_SPECS`-entry rendering loop.

**`toStepPayload` gained real special-casing**, because these fields don't
all map 1:1 onto flat top-level PATCH keys the way every prior field did:

- `leadership` and `domains` are both **always sent whole**, never
  conditionally on "has content" — removing the last person (or chip) is a
  real edit an empty-means-untouched rule would silently drop.
- `sponsorshipEnabled` is **always sent** as `{ sponsorship: { enabled } }` —
  a toggle has no "untouched" reading; it's always in a defined state.
- The five `social*` form fields **always reassemble into one `socialLinks`
  object**, never sent individually. This is load-bearing, not a style
  choice: the backend's `PATCH /organizations/me` `.set()`s the whole
  `socialLinks` subdocument at once (Mongoose's normal per-key-merge doesn't
  apply to a subdocument replace), so sending only the one platform the
  visitor just edited would silently wipe every other platform already
  saved. Sending the complete current form state (seeded from the server,
  edited locally) every time is what keeps this safe — see
  `toStepPayload`'s own comments.

`isFieldFilled`/`invalidFields`/`isStepDirty` all grew defensive branches for
booleans and object-array fields (a toggle is "always filled"; `leadership`'s
entries are freshly-built objects on every edit, so `isStepDirty` compares
them by `JSON.stringify` rather than by reference, or every visit to the step
would look dirty regardless of whether anything actually changed).

`validateSetupField` grew one shared case for every pasted-link field
(`logo`, `cover`, `mapIframe`, the five social fields): they must start with
`http://`/`https://`, unlike `website` (which accepts a bare host and gets a
scheme added by `normalizeWebsite`) — these are links copied from elsewhere,
not typed by hand.

## `services/Organizations.ts` — `getOrganizations()`, defined and correct, never called

```js
export const getOrganizations = async () => {
  const getOrganizationsData = await apiConnector(
    "GET",
    organizationEndpoints.all,
  );
  if (getOrganizationsData.status !== 200) {
    throw new Error("Could not get Organizations");
  }
  return getOrganizationsData.data;
};
```

Goes through `apiConnector()` (`src/services/ApiConnector.ts`) — the "Layer
B" call path described in
[api-integration.md](../../../docs/specs/api-integration.md), **not** the
`Axios` instance `KarmaCircleApi.ts`'s functions use (`CreateSponsorshipOrder`/
`VerifySponsorshipPayment` included). `Organizations.tsx` fetches through
`useSWR` + `organizationEndpoints.directory()` directly instead, which is why
this function still has no caller despite being fully correct.

## Data flow summary

```
Organizations.tsx                              OrganizationProfile.tsx
   ▼                                              ▼
useSWR(organizationEndpoints.directory(...))    useSWR(organizationEndpoints.byHandle(handle))
   ▼                                              ▼
toDisplayOrganization per record                toDisplayOrganization(data)
   ▼                                              ▼
featured = sponsorship.enabled orgs (≤2)        OrganizationProfileView
   │            rest = everything else             ├─ useSWR(eventEndpoints.byHost(handle)) → "Events hosted"
   ▼                                                └─ SponsorOrganizationModal (if sponsorship.enabled)
grid
```

## Types

This folder is fully TypeScript, and `types/` is split by declaration kind
per [CLAUDE.md](../../../../../CLAUDE.md):

- `interfaces.ts` — `Organization` (loose, unverified-shape fallback),
  `OrganizationStat`/`OrganizationDrive`/`OrganizationMilestone`,
  `OrganizationAccent`, `OrganizationCardProps` (now with `featured?`),
  `DisplayOrganization` (now with `logo?`, `mapIframe?`, `socialLinks?`,
  `leadership?`, `sponsorship?`, `raisedViaPlatform?` — all optional on the
  type even though a live record always has them filled in, since a
  freshly-drafted organization may genuinely have none of them yet),
  `ApiOrganization`/`MyOrganization` (same new fields, mirroring
  `toPublic()`/`toPrivate()`), new `LeadershipMember`/`SocialLinks`
  interfaces, and the setup form/question types (`OrganizationSetupForm`
  with the presence step's fields, `OrganizationSetupQuestionKind` with
  `"list"`/`"toggle"`). `DirectoryOrganization` (the fixture's own shape) is
  gone, retired alongside the fixture itself — see the file manifest above.
- `types.ts` — `Cause`/`CauseFilter`, and `OrganizationSetupStepId` (now
  including `"presence"`).
- `index.ts` — re-exports both.

`UserType` lives in `src/types/user/` instead, since `authentication` needs
it too.

## Known issues specific to this feature

- `getOrganizations()` is fully implemented and correct but never called —
  already in `known-issues.md`.
- The Follow button on `OrganizationProfile.tsx` is still local state with no
  endpoint behind it.
- No pagination on the directory beyond a `limit: 60` fetch.
- `Events.tsx`/`EventCard` still render fixture data (a separate,
  pre-existing gap this change didn't touch) — the "Events hosted" section
  and the "Most recently…" link both work off the real API directly instead,
  and their links to `/events/:uid` land on `DetailedEvent.tsx`'s
  fixture-only lookup until that page is wired up.
- No file-upload endpoint exists — `logo`/`cover`/`gallery`/leadership
  `photo` are all pasted URLs, an explicit, deliberately deferred choice
  (see [known-issues.md](../../../docs/specs/known-issues.md)), not an
  oversight.
- No Razorpay webhook — see "Sponsorship flow" above.

## If you're asked to...

- **"Add another social platform"** → `IOrganizationSocialLinks`
  (`organization.model.ts`), the `socialLinksSchema` in
  `organization.validation.ts`, `SocialLinks` (this feature's
  `types/interfaces.ts`), the `socialLinks` mapping in
  `toDisplayOrganization.ts`, the `socialX` field on `OrganizationSetupForm`
  + its `FIELD_SPECS`/`FIELD_CY` entries + `SOCIAL_FIELDS` in
  `organizationSetupForm.ts`, and the icon row in
  `OrganizationProfile.tsx`. Seven files, all mechanical.
- **"Let an organization upload leadership photos/logo/cover directly"** →
  that's the file-upload gap above; it needs a storage decision (disk vs.
  Mongo GridFS vs. a cloud bucket) this pass deliberately didn't make, not a
  quick add.
- **"Add a webhook for sponsorship payments"** → new module or a new file in
  `payments`, `POST /payment/webhook/razorpay`, verified against a new
  `RAZORPAY_WEBHOOK_SECRET` env var, updating `Order.status`/
  `Organization.raisedViaPlatformPaise` the same way `.../verify` does today
  — see that function's own idempotency guard (`if (order.status !==
  ORDER_STATUS.Paid)`) before writing a second code path that credits twice.
- **"Add more sample organizations"** → `apps/api/scripts/seed-demo-data.ts`
  now, not this folder's fixture file — see that script's own doc comment
  for the placeholder-image conventions (DiceBear/Picsum/pravatar) it uses.
