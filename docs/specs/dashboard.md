# Organization Dashboard

Routed at `/dashboard` and protected by `OrganizationSetupGate` for organization accounts.
The page reads `GET /organizations/dashboard` and refreshes the aggregate data every minute.

## Dashboard content

- The loaded page has seven core content areas: organization overview, contact details, metric summary, profile reach analytics, community, hosted events, and support received. These are arranged in six semantic `<section>` elements because the analytics/community and events/support areas each share a row. The optional demo-data note is a transient state message, not a dashboard section or refinement item.
- The dashboard header names the organization in its summary, explains what the page tracks, and gives clear actions to edit the organization profile or view the hosted-event list. Actions stack on mobile.
- Organization overview uses the live organization record: cover, logo, name, description, tag, domains, location, team size, website, social links, and verification state. Its cover is a shallow responsive banner, profile details sit below with deliberate spacing, and the description is capped at two lines so the organization identity and actions stay easy to scan. The dashboard seed's generic hands photo is replaced by the local flood-preparedness cover; existing records using that legacy seed URL receive the same replacement. It links to the public page with the action `Open public page`; it does not show a `Published profile` badge.
- A six-item profile checklist tracks description, logo, cover image, focus areas, location, and a website or social link. It appears in its own softly tinted, full-width panel inside the organization overview. Its count is derived from the dashboard organization record; the next missing item links to the existing profile editor. It does not represent engagement or predict performance.
- `Edit organization` opens the separate owner editor at `/organization/setup`.
- Contact details show contact email, contact phone, community-support availability, and public visibility with plain-language status (`Public page is live` or `Not public yet`). The local dashboard demo seeder supplies reserved sample contact details, enables community support, and keeps the demo organization public.
- Metric cards show followers, organizations followed, hosted events, attendee registrations, verified support contributions, and 30-day profile views.
- Analytics shows total and recorded views, average daily views, busiest day, and a daily line/area chart for 7, 30, or 90 days. Sample views use a separate series from recorded views.
- Hosted events lists the eight most recently scheduled events, with attendee registration totals; `Manage events` links to `/events`.
- Community lists the latest five followers; the total is shown separately.
- Support received separates verified contribution totals from sample totals, and labels sample supporter rows explicitly.
- Demo records carry `isDemo` markers. They are excluded from verified raised totals and displayed as sample activity; sample contributions are not payments.
- Dashboard data revalidates every 60 seconds while the page is open.

## Refinement checklist

Use this ten-part list to refine the dashboard one area at a time.
The demo-data note is not a work item.

1. **Dashboard header and actions** - done. Identify the organization, explain dashboard scope, and expose clear profile-edit and hosted-event actions.
2. **Organization profile overview** - done. Show live profile details, social links, a clear public-page action, and a data-derived profile checklist. Keep the cover shallow, description concise, and checklist visually separated from identity details.
3. **Contact details and organization status** - done. Show contact email, phone, support availability, and public visibility; demo seed includes sample values.
4. **Community metrics** - done. Follower count means people following this organization; following count means organizations this account follows, not followers who follow back.
5. **Event performance metrics** - pending. Clarify hosted event totals and attendee registrations.
6. **Support metrics** - pending. Make verified totals and sample activity unmistakably distinct.
7. **Profile reach analytics** - done. Show summary metrics, selectable ranges, recorded/sample trends, peak day, and raw-view limitation.
8. **Community and follower list** - pending. Improve recent-follower rows, useful identity details, and empty states.
9. **Hosted events list** - pending. Improve event summaries, dates, registration counts, and management paths.
10. **Supporter activity and giving breakdown** - pending. Improve verified contributions, sample amounts, supporter rows, and privacy-safe details.

## Design references

- [Shopify Analytics overview](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/using-the-overview-dashboard) - at-a-glance metric cards, date-range context, comparisons, and card paths into detailed reports.
- [Stripe Dashboard home charts](https://support.stripe.com/questions/dashboard-home-page-charts-for-business-insights) - configurable summaries prioritize useful business activity and common next actions.

Adapt these patterns to KarmaCircle's organization tasks and existing brand system.
For this header, prioritize organization context, one obvious edit action, a clearly named events action, generous spacing, and full-width stacked controls on narrow screens.

## Data and limits

`GET /organizations/dashboard` requires authentication and rejects individual accounts.
It returns the owner's private organization record, sanitized account profile, aggregate metrics, 90 days of daily profile-view counts (including the sample-view portion), recent hosted events, recent supporter names/amounts with demo markers, and recent follower names with demo markers.
Supporter email addresses are never returned.

`OrganizationFollow` stores authenticated follows by organization handle and follower email.
The public profile's follow button now persists through `POST` and `DELETE /organizations/{handle}/follow` and loads its state from `GET` on the same path.
The dashboard reports the account's organization follows and followers.
The API response already maps to all ten refinement areas; the header uses `organization.name` as its source of truth and adds no duplicate header-specific API field.
See the [backend response contract and dashboard-area mapping](../../apps/api/docs/specs/organizations.md#response-contract-and-dashboard-area-mapping).

`OrganizationAnalyticsEvent` stores profile-view events only and expires records after one year.
The public organization profile posts one view when its record loads; this is a raw page view, not a unique visitor count, impression, or click-through rate.
No IP address or browser identifier is stored.

Hosted event registrations come from the existing `EventRegistration` collection.
Support counts include `Order` records with `status: "paid"`; verified counts and raised amounts exclude records marked `isDemo`.
Payment support is a count of verified contributions, not necessarily unique people.
Existing typed organization follower numbers may predate follow records, so the owner's dashboard uses relationship records as its count.

## Files

- `apps/web/src/features/dashboard/pages/Dashboard.tsx` renders the owner workspace.
- `apps/web/src/features/dashboard/components/TrackSection.tsx` renders the date-range profile-view chart.
- `apps/web/src/features/dashboard/types/interfaces.ts` defines the dashboard response.
- `apps/web/src/features/organizations/pages/OrganizationProfile.tsx` records views and provides persistent follow controls.
- `apps/api/src/modules/organizations/organization.controller.ts` assembles the owner-only aggregate response and follow/view actions.
- `apps/api/src/modules/organizations/organization.model.ts` defines follow and analytics records.
- `apps/api/src/modules/organizations/organization.routes.ts` exposes dashboard, follow, and view routes.

## Follow-up analytics work

Event impressions, event detail views, website/contact link clicks, reach deduplication, export, and retention controls are not captured yet.
Those require event instrumentation decisions and a privacy/retention policy before the dashboard can report them accurately.
