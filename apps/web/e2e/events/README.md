# Events E2E coverage

`events-responsive.spec.ts` covers the public `/events` directory's live event
cards, Upcoming/Past filter, city search, mobile/desktop overflow, and the
organization's full-page event publishing flow.

It creates test events through the isolated E2E API and does not depend on
seeded demo records.

The organizer creation route is `/organization/events/new`. It requires a
signed-in organization whose public profile is live. The publishing test also
verifies the description prompt and character count, rejects a meeting address
without HTTP or HTTPS, then checks the published detail page and hosted-events
list.

The attendee `/events/mine` page and its authenticated registration list do not
have browser coverage yet.

Run this feature with `npx playwright test e2e/events/` from `apps/web` when UI
testing is authorized.
