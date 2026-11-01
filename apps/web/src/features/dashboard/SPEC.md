# Organization Dashboard

See the cross-feature summary in [docs/specs/dashboard.md](../../../../../docs/specs/dashboard.md).
The backend contract is in [apps/api/docs/specs/organizations.md](../../../../../apps/api/docs/specs/organizations.md).

## `pages/Dashboard.tsx`

Renders the signed-in organization's workspace at `/dashboard`.
`OrganizationSetupGate` keeps draft organizations in the setup/resume flow.
`useMyOrganization()` supplies the public/private organization record and identifies organization accounts.
SWR reads `GET /organizations/dashboard` only for organization accounts and revalidates every 60 seconds.
The page shows live profile information, a separate profile editor link, community metrics, profile views, hosted events and registrations, verified support, and clearly marked sample activity. Follower count means people following this organization; following count means organizations this account follows. The overview uses a shallow cover, clamps the description to two lines, gives the profile details room below the cover, and places the profile-completeness checklist in its own softly tinted full-width panel. The generic legacy dashboard seed cover resolves to the local flood-preparedness cover at `/images/organization-covers/riverbend-resilience.jpg`. It links to the public page using `Open public page`; it has no `Published profile` badge. Visibility status uses `Public page is live` or `Not public yet`.
The profile overview derives a six-item checklist from description, logo, cover, focus areas, location, and website/social-link fields. It shows completion count, a labeled progress bar, and the next missing detail with a link to the existing editor. This is profile guidance, not an engagement metric or performance prediction.
The edit button opens `/organization/setup`, which is the owner-only organization profile editor.
The loaded page has seven core content areas arranged in six semantic `<section>` elements.
The optional demo-data note is a transient state message, not a dashboard section or refinement item.
The header identifies the organization, explains the dashboard's scope, and exposes `Edit organization profile` and `View hosted events`; both actions stack at mobile widths.
`View hosted events` points to `/organization/events`, the organization's live hosted-event list.
The organization overview card uses its border without an outer box shadow.
See [docs/specs/dashboard.md](../../../../../docs/specs/dashboard.md#refinement-checklist) for the ten-area refinement checklist and design references.

## `components/TrackSection.tsx`

Renders a 7/30/90 day daily profile-view chart from the dashboard response, with totals, recorded views, daily average, busiest day, and separate recorded/sample lines.
The backend stores raw profile page views and does not deduplicate visitors.
The chart has an explicit empty state until profile traffic arrives.

## Data shape

`types/interfaces.ts` defines `OrganizationDashboardData`, including the API's default `period` metadata.
The dashboard endpoint responds with the private organization record, sanitized account profile, aggregate metrics, daily views for 90 days, eight recent hosted events, eight recent paid contributions, and eight recent followers.
Sample events, follows, views, and contributions carry demo markers, and sample contribution amounts are excluded from verified raised totals.
Supporter emails and follower emails do not reach the frontend.
The exact field-to-dashboard-area mapping lives in [the API organization contract](../../../../../apps/api/docs/specs/organizations.md#response-contract-and-dashboard-area-mapping).

## Related behavior

`organizations/pages/OrganizationProfile.tsx` sends a profile-view event after the public organization record loads.
Its Follow button checks `GET /organizations/{handle}/follow`, then persists changes through `POST` or `DELETE`.
The frontend enables the follow-state request from Redux's authenticated state; the API authenticates the request using its HTTP-only `Token` cookie.

## Limits

Profile views are raw page loads, not unique reach or impressions.
The current view metric does not include event detail views, event list impressions, website/contact clicks, export, or attribution.
Support count means paid contributions, which can include multiple contributions from one supporter.
The hosted event list shows eight recent events; `/events` links to the event management/listing flow.
