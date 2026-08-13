# Clubs — Feature Spec

Colocated, implementation-level companion to [docs/specs/clubs.md](../../../docs/specs/clubs.md).
This is the smallest feature folder in the app — three real files — and the simplest to bring to life if asked, since the fetcher already exists and just isn't called.

## What this feature is responsible for

The `/clubs` directory page: a grid of club/org cards, each linking to that club's public profile (`/club/:userName`, handled by `Profile.jsx` in `onboarding-profile` — see [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md)).

## Why it's shaped this way

This page and `Events.jsx` (the `events` feature) are the two clearest examples in the codebase of "the read path was built with a working fetcher, but the fetcher was never actually plugged into the page" — see [api-integration.md](../../../docs/specs/api-integration.md) for why two separate call layers exist (`MilanApi.js` vs. `ApiConnector`-based `services/*.js` fetchers) and which one this feature uses.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Clubs.jsx` | The `/clubs` page | ✅ routed, but renders **hardcoded data** |
| `pages/Clubs.scss` | Styles | ✅ |
| `components/ClubCard.jsx` | Presentational card for one club | ✅ used by `Clubs.jsx` |
| `components/ClubCard.scss` | Styles | ✅ |
| `services/Clubs.js` | `getClubs()` — the real fetcher | ❌ **defined, never called from anywhere** |

## `pages/Clubs.jsx`

**The entire `clubs` array is hardcoded, not fetched:**
```js
const clubs = Array.from({ length: 20 }, () => ({
  _id: "673ac2814c6e89e58af8ca11",
  userType: "club",
  userName: "tamalcodes",
  name: "God Father Org",
  email: "tamalcodes@gmail.com",
  password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
  cart: [],
  __v: 0,
}));
```
20 **byte-for-byte identical** objects (the arrow function passed to `Array.from`'s second argument takes no index and returns the same literal every time — there's no `id`/`index` variation at all, not even the `_id`).
Every one of the 20 rendered `ClubCard`s links to the exact same `/club/tamalcodes` URL.
Note this demo object includes a `password` field (a real-looking bcrypt hash) — harmless since it's fake data and never sent anywhere, but worth being aware of if this file is ever used as a template for other hardcoded-data pages; don't copy a real-looking password hash into new demo data without thinking about why that's an odd thing for a frontend fixture to contain in the first place.

**Rendered chrome:** `<ComponentHelmet type="Clubs" />` (correct type string — contrast with `Events.jsx`, which passes the wrong one; see [layout-navigation.md](../../../docs/specs/layout-navigation.md)), `<Navbar />`, a header row with a search `<input>` and a "Filters" `<button>` — **neither has an `onChange`/`onClick` handler**, both are inert — plus a "Your Dashboard" button (`navigate("/dashboard")`, using the shared `Button` component correctly with `onClickfunction`), then the card grid, then `<Footer />`.

**The `Loading` fallback can never trigger today:** `{!clubs || clubs?.length === 0 ? <Loading /> : clubs.map(...)}` — since `clubs` is always a populated 20-item array (never `undefined`/`null`/empty), the `Loading` branch is dead code under the current implementation, not a real loading state tied to a fetch.

**No pagination, no empty state, no error state** — none of these exist yet because there's no real fetch to have loading/empty/error states *for*.

## `components/ClubCard.jsx`

**Props:** `club` (a single club object, shaped like the hardcoded fixture above, or eventually like whatever `getClubs()`'s real response looks like — see caveat below).

**What actually uses the `club` prop:** `club?.name` (with fallback `"The Monk community"`), `club?.description` (with fallback lorem-ipsum-style bio text, also set as the `title` attribute for a native tooltip on truncated text), and `club?.userName` (used to build the `/club/${club?.userName}` link).

**What's hardcoded regardless of the `club` prop:** the banner image (always the same static `clubbanner.jpg` asset — there is no per-club image field consumed at all, so even if `club.bannerImage` existed on a real record, this component has nowhere to plug it in without a code change) and the follower/event counts (`1.25k` Followers / `231` Events — static JSX, not derived from `club`).

**Exported from the shared barrel** `src/components/index.js` as well as being importable directly — both import styles appear at different call sites across the app (see [ui-kit.md](../../../docs/specs/ui-kit.md)); prefer the barrel for new code.

## `services/Clubs.js` — `getClubs()`, defined and correct, never called

```js
export const getClubs = async () => {
  const getClubsData = await apiConnector("GET", clubEndpoints.all);
  if (getClubsData.status !== 200) {
    throw new Error("Could not get Clubs");
  }
  return getClubsData.data;
};
```

Goes through `apiConnector()` (`src/services/ApiConnector.js`) — the "Layer B" call path described in [api-integration.md](../../../docs/specs/api-integration.md), a thin `axios.create({})` wrapper (`axiosInstance`), **not** the `Axios` instance `MilanApi.js`'s functions use.
Unlike `MilanApi.js`'s functions, `getClubs()` **throws** on a non-200 status rather than returning the error response — a caller needs a `try/catch`, not an `if (response?.status === ...)` check; this is the opposite calling convention from every `MilanApi.js` function, so don't copy the `MilanApi.js` catch-and-return-response pattern if you wire this in — wrap the call site in `try/catch` instead, or change `useSWR`'s error handling to expect a thrown error (SWR natively supports throwing fetchers — this shape is actually SWR-idiomatic, more so than `MilanApi.js`'s pattern is).

`apiConnector()` itself has a dead/unreachable branch: `if (response.status === 400) console.error("Logout triggered due to status 600 response")` — the comment references a status `600` that the condition doesn't actually check for (it checks `400`), and axios throws rather than resolving on 4xx by default anyway, so in practice this branch is never reached via the normal success path (a 400 would land in the `catch` block instead, which unconditionally re-throws after logging). Not specific to this feature (shared infra), but relevant since `getClubs()` is one of only two consumers of this file (`getEvents()` in the `events` feature is the other) — see [api-integration.md](../../../docs/specs/api-integration.md).

**Response shape is unverified from this repo** — there is no backend code here; `clubEndpoints.all` resolves to `GET ${VITE_API_URL}/clubs`, and the [NgoWorld-Backend](https://github.com/ngoworldcommunity/NGOWorld-Backend) repo is the actual source of truth for what `getClubsData.data` looks like. Don't assume it matches the hardcoded fixture's shape (`_id`, `userType`, `userName`, `name`, `email`, `password`, `cart`, `__v`) — that shape looks like a raw Mongoose user/club document (it even includes `password`, which a real API response almost certainly would not include), not a curated API response.

## Data flow summary — today vs. if wired up

**Today:**
```
Clubs.jsx render
   ▼
clubs = 20x identical hardcoded object   (no network call)
   ▼
clubs.map(club => <ClubCard club={club} />)
   ▼
ClubCard reads club.name / club.description / club.userName only
```

**If wired up** (the shape this page's own imports suggest it was heading toward):
```
Clubs.jsx
   ▼
useSWR(clubEndpoints.all, () => getClubs())   or a fetcher passed through swr's default fetcher slot
   │   getClubs() throws on non-200 — SWR's error state would populate from that
   ▼
clubs = response.data   (shape TBD — verify against backend)
   ▼
{!clubs ? <Loading /> : clubs.map(...)}   ← this ternary already exists; just needs a real `clubs` value
```

## Known issues specific to this feature

- The entire club list is hardcoded — already in `known-issues.md`.
- `getClubs()` is fully implemented and correct but never called — already in `known-issues.md`.
- Search input and Filters button are inert (no handlers) — not previously called out explicitly; both would need real state + either client-side filtering or query params passed to `getClubs()`/a new paginated endpoint.
- `ClubCard`'s banner image and follower/event counts ignore the `club` prop entirely — already in `known-issues.md`.
- `Loading` fallback is currently unreachable dead code given the hardcoded array.

## If you're asked to...

- **"Make the clubs page live"** → replace the hardcoded `clubs` array with `useSWR(clubEndpoints.all, getClubs)` (or a small wrapper fetcher — `getClubs` throws rather than resolving, see above) in `Clubs.jsx`. This is the single highest-value, most self-contained fix available in this feature — the card component, the loading fallback, and the fetcher are all already correct and just need connecting.
- **"Add search/filtering to the clubs page"** → both UI elements exist but are unwired; decide client-side filtering (over whatever `getClubs()` returns) vs. server-side (passing params through `apiConnector`'s `params` argument, which `getClubs()` doesn't currently forward — you'd extend its signature) before starting.
- **"Show real follower/event counts on club cards"** → needs those fields added to whatever the backend's `/clubs` response includes, then read them in `ClubCard.jsx` in place of the hardcoded `1.25k`/`231`.
- **"Make each club card show its own banner image"** → same as above — `ClubCard.jsx` has no prop path for a per-club image today; you'd add one and fall back to `clubbanner.jpg` when absent, matching the existing fallback pattern already used for `name`/`description`.
