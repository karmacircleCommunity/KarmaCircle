# Organizations

The organizations directory (`/organizations`) and the public organization profile it links to (`/organization/:userName`).

## Sample data: `constants/organizationDirectory.ts`

[apps/web/src/features/organizations/constants/organizationDirectory.ts](../../apps/web/src/features/organizations/constants/organizationDirectory.ts) is the single source of content for both pages in this feature.
It holds twelve `DirectoryOrganization` records — different causes, countries, sizes, and a mix of verified/unverified — plus `ORGANIZATION_ACCENTS` (the decorative gradient palette the profile monogram is tinted by), `CAUSES` (the filter taxonomy), `findOrganization(userName)`, and `formatCount()`.

**None of it is fetched.**
This replaced (August 2026) the twenty identical `"God Father Org"` objects that used to be declared inline in `Organizations.tsx`, which rendered as twenty visually identical cards.
The real data-fetching function, `getOrganizations()` in [apps/web/src/features/organizations/services/Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) (`GET /organizations` via `organizationEndpoints.all`), still exists and is still never called.
When asked to make this live, swap `organizationDirectory` for a `useSWR` call (or `getOrganizations()`) and keep the filtering in `Organizations.tsx`, which is deliberately pure client-side work over whatever array it is handed — see [api-integration.md](./api-integration.md).
Both pages state on screen that the content is a preview rather than implying a live feed, the same convention `DrivesRail.tsx` follows on the landing page.

The record shape is deliberately the shape a real organization record would have: `tagLine`, `cause`, `city`/`country`, `founded`, `verified`, `followers`/`drives`/`volunteers`, `focusAreas`, `about` (paragraphs), `stats`, `activeDrives`, `milestones`, `website`, `contactEmail`, `address`.

## `Organizations.tsx` — the directory

[apps/web/src/features/organizations/pages/Organizations.tsx](../../apps/web/src/features/organizations/pages/Organizations.tsx).
Renders `<ComponentHelmet type="Organizations" />` (SEO title/meta — see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a page heading, the search + filter row, the results grid, and `<Footer />`.

**Search and filters actually work now.**
The previous version had an input with no `onChange` and a "Filters" button with no `onClick`.
Today:
- a pill search field (icon, clear button, `focus-within` brand ring) filtering on name, tagline, cause, city and country, so "kolkata" or "water" both find something;
- a row of cause chips generated from `CAUSES` (plus an `"All"` pseudo-option), horizontally scrollable below `sm` so eight chips don't wrap into four rows above the fold;
- an `aria-live` result count, and a "nothing matches / reset filters" empty state — reachable now that the filters are real, unlike the old `Loading` fallback, which could never trigger.

The "Your dashboard" button still navigates to `/dashboard`.
The grid is `1 / 2 / 3` columns (`sm` / `xl`) inside a `max-w-7xl` centered container with `px-9` mobile padding, matching the app's responsive standard in [CLAUDE.md](../../CLAUDE.md).
It is scoped by `useSectionReveal` (`@hooks`) with `[results.length, cause]` as dependencies, so cards revealed by a filter change animate in rather than staying at the hook's starting opacity.

## `OrganizationCard`

[apps/web/src/features/organizations/components/OrganizationCard.tsx](../../apps/web/src/features/organizations/components/OrganizationCard.tsx).
Renders entirely from its `organization` prop — nothing on it is hardcoded any more.

- **The same card as the landing page's drives rail** (see [landing-home.md](./landing-home.md#drivesrailtsx)): a 16:9 cover photo with the cause as a small uppercase label over a bottom scrim, then a one-line name (`truncate`), a two-line tagline (`line-clamp-2` on a `min-h-11` box), the meta line and the stat rule. Both surfaces show the same kind of record, so they are deliberately not two card designs.
- **Every organization has its own cover photo** — a real file per record in `apps/web/src/assets/pictures/organizations/` (800x450 CC0 photos, imported so Vite fingerprints them), read from `cover`/`coverAlt`. This replaced a per-organization gradient band plus a monogram badge, which existed only because the app used to ship a single shared banner (`organizationbanner.jpg`) that the pre-August-2026 card put on all twenty records. The rule that produced that workaround still stands: whatever replaces the fixture must give each organization its own image rather than reusing one banner. `ORGANIZATION_ACCENTS` survives, but now only tints the monogram on the profile header.
- **No monogram on the card.** Over a photo it read as clutter, and overlapping it across the cover/body seam clipped the initials. It stays on the profile header, where a profile picture belongs.
- **The whole card is one `<Link>`** to `/organization/{userName}` — a card-sized target instead of the old 32px arrow button, and no nested interactive elements. The corner arrow is `aria-hidden` decoration that animates on `group-hover`.
- The three-up stat row (`Followers` / `Drives` / `Volunteers`) is pushed to the card's bottom edge with `mt-auto`, so the rules line up across a row of cards even before the tagline's fixed two-line box is accounted for.
- Carries `data-reveal` (see the grid above) and the standardised card hover — lift + brand-token glow. See [ui-kit.md](./ui-kit.md#card-components).

Not exported from the shared barrel (`apps/web/src/components/index.ts`) — only imported by `Organizations.tsx`.

## `OrganizationProfile.tsx` — the public profile

[apps/web/src/features/organizations/pages/OrganizationProfile.tsx](../../apps/web/src/features/organizations/pages/OrganizationProfile.tsx), routed at `/organization/:userName` (August 2026).

**This route used to render `Profile.tsx`** — the account page shared with `/user/:userName`, which for a visitor who isn't the organization rendered a stock external logo and two dead buttons on an otherwise empty screen.
`Profile.tsx` is unchanged and still owns `/user/:userName`; see [onboarding-profile.md](./onboarding-profile.md).
If a request is about "the organization page", check which of the two is meant — the public directory profile (this file) or the signed-in account view (`Profile.tsx`).

Structure:
- **Header card** — the same cover photo as the card the visitor clicked (so arriving reads as the card opening), under a bottom scrim that keeps the corner calm enough for the white-bordered badge that overlaps it, an overlapping monogram (still tinted by `accent`), name + verified pill, tagline, a location/founded/volunteers meta row, a Follow toggle and a website link, and a four-up stat strip.
- **Main column** — "About us" paragraphs + focus-area chips; "Drives running now" (each with a progress bar, raised-of-goal, supporters and days left, the same vocabulary as `DrivesRail`'s cards); "Track record", a milestone timeline using the same rail-and-bead treatment as `HowItWorks`' playbook.
- **Sidebar** — a dark `bg-surface-dark` "Back <org>" card (the app's one dark-surface treatment, matching `OpenSource`/`Footer`) whose CTA scrolls to the drives list, and a contact card (address, email, community counts). `lg:sticky` from `lg` up only.
- **Not-found state** — an unknown `:userName` renders a dedicated panel with a link back to the directory instead of a blank page.

The Follow button is local `useState` and deliberately so: there is no follow/subscribe endpoint in `MilanApi.ts`/`ApiEndpoints.ts`, and a control that acknowledges a press beats one that looks live and does nothing (which is what `Profile.tsx`'s Subscribe/Sponsor pair does).
It is a plain `<button>` rather than the shared `Button` because it has two visually distinct states, and a `variant` class plus a state-dependent `className` would be two equal-specificity utilities fighting over the same properties with no reliable winner.
The page is scoped by `useSectionReveal`.

## Types

Every file in this feature is TypeScript.
`types/` is split by declaration kind per [CLAUDE.md](../../CLAUDE.md): `interfaces.ts` (`Organization`, `DirectoryOrganization`, `OrganizationStat`, `OrganizationDrive`, `OrganizationMilestone`, `OrganizationAccent`, `OrganizationCardProps`) and `types.ts` (`Cause`, `CauseFilter`), re-exported from `index.ts`.
`UserType` is shared with `authentication` — see [organizations/SPEC.md](../../apps/web/src/features/organizations/SPEC.md#types).
