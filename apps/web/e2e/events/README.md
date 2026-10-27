# Events E2E coverage

`events-responsive.spec.ts` covers the public `/events` directory's live event
cards, Upcoming/Past filter, city search, and mobile/desktop overflow behavior.

It creates test events through the isolated E2E API and does not depend on
seeded demo records.

The attendee `/events/mine` page and its authenticated registration list do not
have browser coverage yet.

Run this feature with `npx playwright test e2e/events/` from `apps/web` when UI
testing is authorized.
