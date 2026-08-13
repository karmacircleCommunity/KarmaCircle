# Clubs

The clubs directory, routed at `/clubs`.

## `Clubs.jsx`

[src/features/clubs/pages/Clubs.jsx](../../src/features/clubs/pages/Clubs.jsx).
Renders `<ComponentHelmet type="Clubs" />` (SEO title/meta — see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a search input + "Filters" button (both non-functional — no `onChange`/`onClick` wired), a "Your Dashboard" button that navigates to `/dashboard`, a grid of `<ClubCard />`, and `<Footer />`.

**The club list is entirely hardcoded**: `clubs = Array.from({ length: 20 }, () => ({ _id: "673ac2814c6e89e58af8ca11", userType: "club", userName: "tamalcodes", name: "God Father Org", ... }))` — 20 identical fake club objects, not a fetch.
The real data-fetching function, `getClubs()` in [src/features/clubs/services/Clubs.js](../../src/features/clubs/services/Clubs.js) (`GET /clubs` via `clubEndpoints.all`), exists but is never called by this page.
When asked to make this page live, wire `getClubs()` (or a new SWR call against `clubEndpoints.all`) in here instead of building a new fetch path — see [api-integration.md](./api-integration.md) for the two-layer call-pattern context.

The `Loading` fallback (`!clubs || clubs?.length === 0`) can currently never trigger, since `clubs` is always a populated hardcoded array.

## `ClubCard`

[src/features/clubs/components/ClubCard.jsx](../../src/features/clubs/components/ClubCard.jsx).
Presentational card: banner image (always the same static `clubbanner.jpg` asset, regardless of the club passed in — there's no per-club image field consumed), `club?.name`/`club?.description` with hardcoded fallback text, static follower/event counts (not derived from the `club` prop), and a link to `/club/{club?.userName}` (which resolves to `Profile.jsx` — see [onboarding-profile.md](./onboarding-profile.md)).

Exported from the shared barrel: `src/components/index.js`.
