# Organizations

The organizations directory, routed at `/organizations`.

## `Organizations.tsx`

[apps/web/src/features/organizations/pages/Organizations.tsx](../../apps/web/src/features/organizations/pages/Organizations.tsx).
Renders `<ComponentHelmet type="Organizations" />` (SEO title/meta — see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a search input + "Filters" button (both non-functional — no `onChange`/`onClick` wired), a "Your Dashboard" button that navigates to `/dashboard`, a grid of `<OrganizationCard />`, and `<Footer />`.

**The organization list is entirely hardcoded**: `organizations = Array.from({ length: 20 }, () => ({ _id: "673ac2814c6e89e58af8ca11", userType: "organization", userName: "tamalcodes", name: "God Father Org", ... }))` — 20 identical fake organization objects, not a fetch.
The real data-fetching function, `getOrganizations()` in [apps/web/src/features/organizations/services/Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) (`GET /organizations` via `organizationEndpoints.all`), exists but is never called by this page.
When asked to make this page live, wire `getOrganizations()` (or a new SWR call against `organizationEndpoints.all`) in here instead of building a new fetch path — see [api-integration.md](./api-integration.md) for the two-layer call-pattern context.

The `Loading` fallback (`!organizations || organizations?.length === 0`) can currently never trigger, since `organizations` is always a populated hardcoded array.

## `OrganizationCard`

[apps/web/src/features/organizations/components/OrganizationCard.tsx](../../apps/web/src/features/organizations/components/OrganizationCard.tsx).
Presentational card: banner image (always the same static `organizationbanner.jpg` asset, regardless of the organization passed in — there's no per-organization image field consumed), `organization?.name`/`organization?.description` with hardcoded fallback text, static follower/event counts (not derived from the `organization` prop), and a link to `/organization/{organization?.userName}` (which resolves to `Profile.tsx` — see [onboarding-profile.md](./onboarding-profile.md)).

Not exported from the shared barrel (`apps/web/src/components/index.ts`) — only imported directly by `Organizations.tsx`.

## Types

Both files, plus `services/Organizations.ts`, are TypeScript; `types/index.ts` in this folder defines `Organization`/`OrganizationCardProps`. See [organizations/SPEC.md](../../apps/web/src/features/organizations/SPEC.md#types) for the full breakdown, including how `UserType` is shared with `authentication`.
