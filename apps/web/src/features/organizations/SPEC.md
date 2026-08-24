# Organizations — Feature Spec

Colocated, implementation-level companion to [docs/specs/organizations.md](../../../docs/specs/organizations.md).
This is the smallest feature folder in the app — three logic files plus a `types/index.ts` — and the simplest to bring to life if asked, since the fetcher already exists and just isn't called.

## What this feature is responsible for

The `/organizations` directory page: a grid of organization/org cards, each linking to that organization's public profile (`/organization/:userName`, handled by `Profile.tsx` in `onboarding-profile` — see [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md)).

## Why it's shaped this way

This page and `Events.jsx` (the `events` feature) are the two clearest examples in the codebase of "the read path was built with a working fetcher, but the fetcher was never actually plugged into the page" — see [api-integration.md](../../../docs/specs/api-integration.md) for why two separate call layers exist (`MilanApi.ts` vs. `ApiConnector`-based `services/*.js` fetchers) and which one this feature uses.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Organizations.tsx` | The `/organizations` page | ✅ routed, but renders **hardcoded data** |
| `pages/Organizations.scss` | Styles | ✅ |
| `components/OrganizationCard.tsx` | Presentational card for one organization | ✅ used by `Organizations.tsx` |
| `components/OrganizationCard.scss` | Styles | ✅ |
| `services/Organizations.ts` | `getOrganizations()` — the real fetcher | ❌ **defined, never called from anywhere** |
| `types/index.ts` | `Organization`/`OrganizationCardProps` interfaces — see "Types" below | ✅ yes — imported by every other file in this folder |

## `pages/Organizations.tsx`

**The entire `organizations` array is hardcoded, not fetched:**
```js
const organizations = Array.from({ length: 20 }, () => ({
  _id: "673ac2814c6e89e58af8ca11",
  userType: "organization",
  userName: "tamalcodes",
  name: "God Father Org",
  email: "tamalcodes@gmail.com",
  password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
  cart: [],
  __v: 0,
}));
```
20 **byte-for-byte identical** objects (the arrow function passed to `Array.from`'s second argument takes no index and returns the same literal every time — there's no `id`/`index` variation at all, not even the `_id`).
Every one of the 20 rendered `OrganizationCard`s links to the exact same `/organization/tamalcodes` URL.
Note this demo object includes a `password` field (a real-looking bcrypt hash) — harmless since it's fake data and never sent anywhere, but worth being aware of if this file is ever used as a template for other hardcoded-data pages; don't copy a real-looking password hash into new demo data without thinking about why that's an odd thing for a frontend fixture to contain in the first place.

**Rendered chrome:** `<ComponentHelmet type="Organizations" />` (correct type string, matching `Events.tsx`'s own `<ComponentHelmet type="Events" />`; see [layout-navigation.md](../../../docs/specs/layout-navigation.md)), `<Navbar />`, a header row with a search `<input>` and a "Filters" `<button>` — **neither has an `onChange`/`onClick` handler**, both are inert — plus a "Your Dashboard" button (`navigate("/dashboard")`, using the shared `Button` component correctly with `onClickfunction`), then the card grid, then `<Footer />`.

**The `Loading` fallback can never trigger today:** `{!organizations || organizations?.length === 0 ? <Loading /> : organizations.map(...)}` — since `organizations` is always a populated 20-item array (never `undefined`/`null`/empty), the `Loading` branch is dead code under the current implementation, not a real loading state tied to a fetch.

**No pagination, no empty state, no error state** — none of these exist yet because there's no real fetch to have loading/empty/error states *for*.

## `components/OrganizationCard.tsx`

**Props:** `organization` (a single organization object, shaped like the hardcoded fixture above, or eventually like whatever `getOrganizations()`'s real response looks like — see caveat below).

**What actually uses the `organization` prop:** `organization?.name` (with fallback `"The Monk community"`), `organization?.description` (with fallback lorem-ipsum-style bio text, also set as the `title` attribute for a native tooltip on truncated text), and `organization?.userName` (used to build the `/organization/${organization?.userName}` link).

**What's hardcoded regardless of the `organization` prop:** the banner image (always the same static `organizationbanner.jpg` asset — there is no per-organization image field consumed at all, so even if `organization.bannerImage` existed on a real record, this component has nowhere to plug it in without a code change) and the follower/event counts (`1.25k` Followers / `231` Events — static JSX, not derived from `organization`).

**Not exported from the shared barrel** `src/components/index.ts` — despite an earlier version of this doc claiming otherwise, `OrganizationCard` is only ever imported directly (`@features/organizations/components/OrganizationCard`) by `Organizations.tsx`; the barrel has no `OrganizationCard` entry.

## `services/Organizations.ts` — `getOrganizations()`, defined and correct, never called

```js
export const getOrganizations = async () => {
  const getOrganizationsData = await apiConnector("GET", organizationEndpoints.all);
  if (getOrganizationsData.status !== 200) {
    throw new Error("Could not get Organizations");
  }
  return getOrganizationsData.data;
};
```

Goes through `apiConnector()` (`src/services/ApiConnector.ts`) — the "Layer B" call path described in [api-integration.md](../../../docs/specs/api-integration.md), a thin `axios.create({})` wrapper (`axiosInstance`), **not** the `Axios` instance `MilanApi.ts`'s functions use.
Unlike `MilanApi.ts`'s functions, `getOrganizations()` **throws** on a non-200 status rather than returning the error response — a caller needs a `try/catch`, not an `if (response?.status === ...)` check; this is the opposite calling convention from every `MilanApi.ts` function, so don't copy the `MilanApi.ts` catch-and-return-response pattern if you wire this in — wrap the call site in `try/catch` instead, or change `useSWR`'s error handling to expect a thrown error (SWR natively supports throwing fetchers — this shape is actually SWR-idiomatic, more so than `MilanApi.ts`'s pattern is).

`apiConnector()` itself has a dead/unreachable branch: `if (response.status === 400) console.error("Logout triggered due to status 600 response")` — the comment references a status `600` that the condition doesn't actually check for (it checks `400`), and axios throws rather than resolving on 4xx by default anyway, so in practice this branch is never reached via the normal success path (a 400 would land in the `catch` block instead, which unconditionally re-throws after logging). Not specific to this feature (shared infra), but relevant since `getOrganizations()` is one of only two consumers of this file (`getEvents()` in the `events` feature is the other) — see [api-integration.md](../../../docs/specs/api-integration.md).

**Response shape is unverified from this app** — there is no backend code in `apps/web`; `organizationEndpoints.all` resolves to `GET ${VITE_API_URL}/organizations`, and [apps/api](../../../../../apps/api) is the actual source of truth for what `getOrganizationsData.data` looks like. Don't assume it matches the hardcoded fixture's shape (`_id`, `userType`, `userName`, `name`, `email`, `password`, `cart`, `__v`) — that shape looks like a raw Mongoose user/organization document (it even includes `password`, which a real API response almost certainly would not include), not a curated API response.

## Data flow summary — today vs. if wired up

**Today:**
```
Organizations.tsx render
   ▼
organizations = 20x identical hardcoded object   (no network call)
   ▼
organizations.map(organization => <OrganizationCard organization={organization} />)
   ▼
OrganizationCard reads organization.name / organization.description / organization.userName only
```

**If wired up** (the shape this page's own imports suggest it was heading toward):
```
Organizations.tsx
   ▼
useSWR(organizationEndpoints.all, () => getOrganizations())   or a fetcher passed through swr's default fetcher slot
   │   getOrganizations() throws on non-200 — SWR's error state would populate from that
   ▼
organizations = response.data   (shape TBD — verify against backend)
   ▼
{!organizations ? <Loading /> : organizations.map(...)}   ← this ternary already exists; just needs a real `organizations` value
```

## Types

This folder is fully TypeScript (`.ts`/`.tsx`) as of the auth+organizations conversion pass — see `tsconfig.json` at the repo root.
`types/index.ts` holds `Organization` (the shape `OrganizationCard.tsx` and the hardcoded fixture in `Organizations.tsx` both read — deliberately loose with an open index signature, since the real `/organizations` response shape is unverified from this repo, see above) and `OrganizationCardProps`.
`UserType` (used for `Organization.userType`) lives in `src/types/user.ts` instead, since `authentication` needs it too.
`services/Organizations.ts` types `getOrganizations()` as returning `Promise<Organization[]>` — tighten or loosen that once the real backend shape is confirmed.

## Known issues specific to this feature

- The entire organization list is hardcoded — already in `known-issues.md`.
- `getOrganizations()` is fully implemented and correct but never called — already in `known-issues.md`.
- Search input and Filters button are inert (no handlers) — not previously called out explicitly; both would need real state + either client-side filtering or query params passed to `getOrganizations()`/a new paginated endpoint.
- `OrganizationCard`'s banner image and follower/event counts ignore the `organization` prop entirely — already in `known-issues.md`.
- `Loading` fallback is currently unreachable dead code given the hardcoded array.

## If you're asked to...

- **"Make the organizations page live"** → replace the hardcoded `organizations` array with `useSWR(organizationEndpoints.all, getOrganizations)` (or a small wrapper fetcher — `getOrganizations` throws rather than resolving, see above) in `Organizations.tsx`. This is the single highest-value, most self-contained fix available in this feature — the card component, the loading fallback, and the fetcher are all already correct and just need connecting.
- **"Add search/filtering to the organizations page"** → both UI elements exist but are unwired; decide client-side filtering (over whatever `getOrganizations()` returns) vs. server-side (passing params through `apiConnector`'s `params` argument, which `getOrganizations()` doesn't currently forward — you'd extend its signature) before starting.
- **"Show real follower/event counts on organization cards"** → needs those fields added to whatever the backend's `/organizations` response includes, then read them in `OrganizationCard.tsx` in place of the hardcoded `1.25k`/`231`.
- **"Make each organization card show its own banner image"** → same as above — `OrganizationCard.tsx` has no prop path for a per-organization image today; you'd add one and fall back to `organizationbanner.jpg` when absent, matching the existing fallback pattern already used for `name`/`description`.
