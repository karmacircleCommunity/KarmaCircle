# Organizations — Feature Spec

Colocated, implementation-level companion to
[docs/specs/organizations.md](../../../docs/specs/organizations.md). Small
feature: a directory page, a public profile page, an owner-only setup page, one
card component, the (now unrendered) sample-data file, the un-called
`ApiConnector` fetcher, the API→view adapter, and types.

## What this feature is responsible for

Two routes:

- `/organizations` — the directory, a filterable grid of organization cards.
- `/organization/:userName` — the **public** organization profile a card links
  to (`pages/OrganizationProfile.tsx`, August 2026). This route previously
  rendered `Profile.tsx` from `onboarding-profile`, the _account_ page shared
  with `/user/:userName`; that page is unchanged and still owns
  `/user/:userName` — see
  [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md). When a request
  says "the organization page", check which of the two is meant.

## Why it's shaped this way

The read path was built with a working fetcher that was never plugged into the
page — see [api-integration.md](../../../docs/specs/api-integration.md) for why
two separate call layers exist (`KarmaCircleApi.ts` vs. `ApiConnector`-based
`services/*.ts` fetchers) and which one this feature uses. **No longer true as
of August 2026:** both pages fetch live records, and a third page
(`pages/OrganizationSetup.tsx`) is what gets an organization published in the
first place. `constants/organizationDirectory.ts` is still in the tree but
nothing renders its records. See
[docs/specs/organizations.md](../../../../docs/specs/organizations.md).

## File manifest

| File                                                        | Role                                                                                                 | Live?                                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pages/Organizations.tsx`                                   | The `/organizations` directory                                                                       | ✅ routed; live, with server-side search/filter                                                                           |
| `pages/OrganizationProfile.tsx`                             | The `/organization/:userName` public profile                                                         | ✅ routed; live, 404s on a draft organization                                                                             |
| `pages/OrganizationSetup.tsx`                               | The `/organization/setup` owner-only wizard that publishes the organization                          | ✅ routed; live                                                                                                           |
| `hooks/useOrganizationSetup.ts`                             | The setup flow's state: record, taxonomy, form, stage, per-step save                                 | ✅ used by `OrganizationSetup.tsx`                                                                                        |
| `constants/organizationSetup.ts`                            | The wizard's steps as data, `REQUIRED_LABELS`, the five-domain cap                                   | ✅ read by the page, the hook and the draft notice                                                                        |
| `utils/organizationSetupForm.ts`                            | Pure helpers: seeding, per-step payloads, dirty check, outstanding counts                            | ✅ used by the hook                                                                                                       |
| `components/setup/*`                                        | `SetupLayout` (shell + progress bar), `SetupAside` (rotating quote panel), `SetupIntro`, `SetupQuestion`, `SetupLocationFields` (city/state suggestions + "use my current location"), `SetupFieldLabel` | ✅ used by `OrganizationSetup.tsx`                                                                                    |
| `components/OrganizationDraftNotice.tsx`                    | Dashboard reminder + way back in for an organization still in draft                                  | ✅ mounted by `dashboard/pages/Dashboard.tsx` for organization accounts                                                   |
| `utils/toDisplayOrganization.ts`                            | Maps the API shape onto what the card and profile render                                             | ✅ used by both public pages                                                                                              |
| `utils/monogram.ts`                                         | Initials for an organization with no image of its own                                                | ✅ used by the card and the profile header                                                                                |
| `components/OrganizationCard.tsx`                           | Presentational card for one organization                                                             | ✅ used by `Organizations.tsx`                                                                                            |
| `constants/organizationDirectory.ts`                        | The twelve sample organizations, the accent palette, `CAUSES`, `findOrganization()`, `formatCount()` | ⚠️ only the palette, `CAUSES` and `formatCount()` are still read — the records themselves are no longer rendered anywhere |
| `services/Organizations.ts`                                 | `getOrganizations()` — the real fetcher                                                              | ❌ **defined, never called from anywhere**                                                                                |
| `types/interfaces.ts` / `types/types.ts` / `types/index.ts` | Interfaces and type aliases, split by kind — see "Types" below                                       | ✅ imported by every other file in this folder                                                                            |

## `constants/organizationDirectory.ts`

Twelve `DirectoryOrganization` records, deliberately varied (different causes,
countries, sizes, verified and not), plus:

- `ORGANIZATION_ACCENTS` — six warm gradient/monogram palettes, indexed via each
  record's `accent`. **Not palette tokens and must not become any.** They used
  to identify the cards; since every record carries its own `cover` photo they
  only tint the monogram on the profile header.
- `CAUSES` — the closed cause taxonomy the toolbar's cause filters are generated
  from.
- `findOrganization(userName)` — the `:userName` route lookup.
- `formatCount(value)` — `Intl.NumberFormat`'s compact notation ("12.4k"), not a
  hand-rolled divide-and-round.

This replaced the twenty byte-for-byte identical `"God Father Org"` objects that
used to be declared inline in `Organizations.tsx` — every card looked the same
and every card linked to `/organization/tamalcodes`. That fixture also carried a
real-looking bcrypt `password` field; the replacement records don't, and new
demo data shouldn't either.

## `pages/Organizations.tsx`

**Rendered chrome:** `<ComponentHelmet type="Organizations" />` (see
[layout-navigation.md](../../../docs/specs/layout-navigation.md)), `<Navbar />`,
a heading block, the search + filter row, the results grid, `<Footer />`.

**Search and filters are real.** The previous version's `<input>` had no
`onChange` and its "Filters" `<button>` had no `onClick`. Today a `useMemo`
filter runs over the directory array on `query` (matched against name, tagline,
cause and city) and `cause` (filters generated from `CAUSES` plus an
`"All"` pseudo-option, rendered by the shared `DirectoryToolbar` in
`@components`). Both are pure client-side work over whatever array they're
handed, so wiring a real fetch in later doesn't touch them.

The dead `Loading` branch is gone — with real filters there is now a reachable
**empty state** ("Nothing matches that yet" + a reset-filters button) where the
unreachable loading fallback used to be. A real loading/error state comes with
the real fetch.

The grid (`1 / 2 / 3` columns at base / `sm` / `xl`, inside `max-w-7xl` with
`px-9` mobile padding) is scoped by
`useSectionReveal(gridRef, [results.length, cause])` — the dependency array
matters: without it, cards revealed by a filter change stay at the hook's
starting opacity.

Still no pagination.

## `pages/OrganizationProfile.tsx`

Looks up `findOrganization(useParams().userName)`; an unknown name renders a
dedicated not-found panel (with a link back to the directory) rather than a
blank page.

Sections: header card (cover photo + monogram + name/verified/tagline/meta +
Follow and website actions + a four-up stat strip), then a two-column body from
`lg` — "About us", "Drives running now" (progress bar, raised-of-goal,
supporters, days left), "Track record" (milestone timeline reusing `HowItWorks`'
rail-and-bead treatment) — and a `lg:sticky` sidebar holding a dark
`bg-surface-dark` support card and a contact card.

The Follow button is **local `useState` only**: there is no follow/subscribe
endpoint in `KarmaCircleApi.ts`/`ApiEndpoints.ts`. It's a plain `<button>` rather than
the shared `Button` because it has two visually distinct states, and a `variant`
class plus a state-dependent `className` would be two equal-specificity
utilities fighting over the same properties with no reliable winner (the cascade
decides by stylesheet order, not by className order).

## `components/OrganizationCard.tsx`

**Props:** `organization: DirectoryOrganization` (required, no longer
optional-with-fallback-text).

Everything it renders comes from that prop. The old card hardcoded the banner
image, the follower count and the event count regardless of what was passed in.

**One cover photo per organization:** `cover`/`coverAlt` on each record, files
in `assets/pictures/organizations/`, rendered as a 16:9 crop with the cause
label over a scrim - the same card `landing-home`'s `DrivesRail.tsx` uses. It
replaced a gradient band plus monogram that only existed because the app used to
ship a single shared banner the old card put on all twenty records. Keep the
one-image-per-organization rule whatever the data source becomes.

**The whole card is one `<Link>`** to `/organization/{userName}` — a card-sized
target rather than the old 32px arrow button, and no nested interactive elements
inside a clickable card. The corner arrow is `aria-hidden` decoration.

**Not exported from the shared barrel** `src/components/index.ts` — only ever
imported directly by `Organizations.tsx`.

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

Goes through `apiConnector()` (`src/services/ApiConnector.ts`) — the "Layer B"
call path described in
[api-integration.md](../../../docs/specs/api-integration.md), a thin
`axios.create({})` wrapper (`axiosInstance`), **not** the `Axios` instance
`KarmaCircleApi.ts`'s functions use. Unlike `KarmaCircleApi.ts`'s functions,
`getOrganizations()` **throws** on a non-200 status rather than returning the
error response — a caller needs a `try/catch`, not an
`if (response?.status === ...)` check; this is the opposite calling convention
from every `KarmaCircleApi.ts` function, so don't copy the `KarmaCircleApi.ts`
catch-and-return-response pattern if you wire this in — wrap the call site in
`try/catch` instead, or change `useSWR`'s error handling to expect a thrown
error (SWR natively supports throwing fetchers — this shape is actually
SWR-idiomatic, more so than `KarmaCircleApi.ts`'s pattern is).

`apiConnector()` itself has a dead/unreachable branch:
`if (response.status === 400) console.error("Logout triggered due to status 600 response")`
— the comment references a status `600` that the condition doesn't actually
check for (it checks `400`), and axios throws rather than resolving on 4xx by
default anyway, so in practice this branch is never reached via the normal
success path (a 400 would land in the `catch` block instead, which
unconditionally re-throws after logging). Not specific to this feature (shared
infra), but relevant since `getOrganizations()` is one of only two consumers of
this file (`getEvents()` in the `events` feature is the other) — see
[api-integration.md](../../../docs/specs/api-integration.md).

**Response shape is unverified from this app** — there is no backend code in
`apps/web`; `organizationEndpoints.all` resolves to
`GET ${VITE_API_URL}/organizations`, and [apps/api](../../../../../apps/api) is
the actual source of truth for what `getOrganizationsData.data` looks like.
Don't assume it matches the hardcoded fixture's shape (`_id`, `userType`,
`userName`, `name`, `email`, `password`, `cart`, `__v`) — that shape looks like
a raw Mongoose user/organization document (it even includes `password`, which a
real API response almost certainly would not include), not a curated API
response.

## Data flow summary — today vs. if wired up

**Today:**

```
Organizations.tsx render                    OrganizationProfile.tsx render
   ▼                                           ▼
organizationDirectory (12 sample records)   findOrganization(params.userName)
   ▼   (no network call)                       ▼   (no network call)
useMemo filter on query + cause             the matched record, or a not-found panel
   ▼
results.map(org => <OrganizationCard organization={org} />)
```

**If wired up:**

```
Organizations.tsx
   ▼
useSWR(organizationEndpoints.all, () => getOrganizations())
   │   getOrganizations() throws on non-200 — SWR's error state populates from that
   ▼
organizations = response   (shape TBD — verify against apps/api)
   ▼
the same useMemo filter, unchanged, then the same grid
```

The filtering, the card and the profile layout are all written against the
record shape, so this should be a fetch swap plus a mapping function — not a
re-layout.

## Types

This folder is fully TypeScript, and `types/` is split by declaration kind per
[CLAUDE.md](../../../../../CLAUDE.md):

- `interfaces.ts` — `Organization` (still deliberately loose, with an open index
  signature, since the real `/organizations` response shape is unverified from
  this repo), `DirectoryOrganization` (extends it with everything the card and
  profile render), `OrganizationStat`, `OrganizationDrive`,
  `OrganizationMilestone`, `OrganizationAccent`, `OrganizationCardProps`.
- `types.ts` — `Cause` (the closed cause union) and `CauseFilter`
  (`Cause | "All"`).
- `index.ts` — re-exports both.

`OrganizationDrive` is intentionally the same shape as `landing-home`'s
`SampleDrive` minus the organizer field, so the two can converge on one type
when a real drives endpoint exists. `UserType` (used for
`Organization.userType`) lives in `src/types/user/` instead, since
`authentication` needs it too. `services/Organizations.ts` types
`getOrganizations()` as returning `Promise<Organization[]>` — tighten or loosen
that once the real backend shape is confirmed.

## Known issues specific to this feature

- Both pages render sample data; `getOrganizations()` is fully implemented and
  correct but never called — already in `known-issues.md`.
- The Follow button on `OrganizationProfile.tsx` is local state with no endpoint
  behind it, and since the "Preview profile" chip was removed nothing on the
  page says so.
- No pagination on the directory — fine at twelve records, a problem at four
  hundred.

## If you're asked to...

- **"Make the organizations page live"** → replace `organizationDirectory` with
  `useSWR(organizationEndpoints.all, () => getOrganizations())` in
  `Organizations.tsx`, keep the `useMemo` filter as-is, and add a real
  loading/error branch alongside the existing empty state. `getOrganizations()`
  **throws** on non-200 (unlike every `KarmaCircleApi.ts` function, which
  catch-and-return) — that shape is SWR-idiomatic, so don't rewrite it to match
  `KarmaCircleApi.ts`.
- **"Make the organization profile live"** → same fetch, plus
  `organizationEndpoints.details(userName)` for the single record; the not-found
  panel already covers the "no such organization" case.
- **"Move filtering to the server"** → `getOrganizations()` doesn't forward
  params to `apiConnector` today; extend its signature rather than building a
  second fetch path.
- **"Swap the placeholder covers for real ones"** → replace the files in
  `assets/pictures/organizations/` (or point `cover` at a URL from the API).
  Keep a per-record image and don't reintroduce a single shared banner across
  every card — that's the bug this card was redesigned to fix.
- **"Add more sample organizations"** → keep them varied (cause, city, size,
  verified/not). A directory where every row looks alike is what
  `constants/organizationDirectory.ts` exists to prevent.
