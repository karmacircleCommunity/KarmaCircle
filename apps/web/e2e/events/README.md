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

## Attendee journey and online publishing (written, not yet run)

`attendee-journey.spec.ts` (5 tests) and `online-event-publishing.spec.ts` (2
tests) were added in November 2026. Playwright was not authorized, so none of the
7 tests has ever run (`npx playwright test --list` lists all 7). Expect selector
or timing fixes on the first real run. Do not call this coverage done until a
real run passes.

- `attendee-journey.spec.ts`: finds an event in the directory by search, opens
  the detail page, joins, sees "You are going" (and again after a reload), opens
  My Events from the Profile menu, and goes back to the detail page. Also covers
  the My Events empty states (Upcoming and Past copy, "Explore events" link on
  Upcoming only), an invite-only event (label, no Join button, API join returns
  `403`, no registration left), a past event (completed state, Share still
  present, API join returns `409`), and a joined event moving from Upcoming to
  Past after it is backdated. A signed-out visitor clicking Join is not covered
  because the intended behavior is undecided.
- `online-event-publishing.spec.ts`: picks Google Meet, tries a missing link, a
  link with no scheme and an `ftp://` link (checking each error and that nothing
  was published), then publishes an https link and checks the "How to join"
  section, the join link, the saved API record and the hosted-events list. A
  second test publishes with the default Zoom Meeting and checks the directory's
  Online and Offline type filter.
- `event-helpers.ts`: shared setup (organization and individual sign-up through
  the real UI, publishing the organization profile, creating a future event
  through the API, backdating an event, opening My Events from the menu). It uses
  a data-URL cover image so no third-party host is hit. It is not a test file.

The attendee runs in a second browser context from the organization, and specs
seed future events through the API. Past events come from the E2E-only
`POST /__test__/events/:uid/backdate` route
([`apps/api/tests/e2e/test-routes.ts`](../../../api/tests/e2e/test-routes.ts)),
because the API refuses to create a past event or to join one that has started.
The online-publishing tests keep the form's default start (one hour from now), as
the in-person test does, so they can fail within an hour of local midnight.

## Known breakage: `events-responsive.spec.ts` seeding

Its `createEvent` helper posts `endTime` equal to `startTime`, and one test
creates an event 30 days in the past, both through `POST /events/create`. The API
now rejects an end time that is not after the start and a start in the past, so
three of its four tests (all but the UI publishing test) will fail on a real run. It needs future
events with an end after the start, and the backdate route for the past one.
Not run.

## Directory search after November 2026

The directory loads 12 cards at a time and searches on the API. The directory
tests therefore narrow to their own events through a `searchDirectory` helper,
using the unique stamp in each event name, and the city test uses a per-stamp
city name so it checks the API-side city match. These edits to
`events-responsive.spec.ts` have not been run either.

Run this feature with `npx playwright test e2e/events/` from `apps/web` when UI
testing is authorized.
