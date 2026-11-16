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

## Attendee journey and online publishing

`attendee-journey.spec.ts` (5 tests) and `online-event-publishing.spec.ts` (2
tests) were added in November 2026 and first run on 2026-11-16, together with
the rest of this folder: all 15 specs pass on Chromium, Firefox and WebKit (45 of
45). Two of them needed a fix on that first run: the hosted-events list now has an
"Edit <name>" link per row, so a link lookup by event name is anchored (`^<name>`)
to match only the row's main link.

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

## `events-responsive.spec.ts` seeding (fixed)

Its `createEvent` helper used to post `endTime` equal to `startTime`, and one test
created an event 30 days in the past, both through `POST /events/create`, which
the API now rejects. It now creates every event in the future with an end two
hours after the start, and moves the past one with the E2E-only
`POST /__test__/events/:uid/backdate` route, as the attendee specs do.

## Editing and cancelling an event

`event-management.spec.ts` (4 tests, November 2026). Each test signs its own
organization up through the UI, publishes the profile and an event through the API
(`event-helpers.ts`), and uses unique names.

- An organization opens Edit from "Your events": the page address is read-only,
  the form starts as stored (name, invite-only), the change is saved, "Event
  updated" shows, the event page has the new name and no "Invite only" label, and
  the API record matches.
- Saving an unchanged form shows "Nothing has changed yet." and stays on the page.
- Cancelling: "Keep event" closes the dialog and the event stays published;
  confirming shows "Event cancelled", a "Cancelled" pill and no Edit or Cancel
  actions; the public page says "This event was cancelled" with no Join button; an
  attendee's `POST /events/:uid/join` returns `409`; the edit page shows "This
  event was cancelled" instead of a form.
- A second organization sees "You can only edit your own events" on the edit page,
  and the API returns `403` for its edit and cancel calls; the event is unchanged.

## Leave, capacity and the attendee list

`event-attendees.spec.ts` (6 tests, November 2026). Attendees sign up through the
UI in their own browser contexts (`openAttendee`, a different stamp each); the
organization publishes through the API, and `createEvent` in `event-helpers.ts` now
takes an optional `capacity`.

- An attendee joins, is asked to confirm leaving ("Stay registered" changes
  nothing), leaves ("You left this event", Join is back, the API says not joined,
  My Events no longer lists it) and joins again.
- A capacity-of-one event: one spot is shown, the person who joined sees "You are
  going" and "Full", the next person sees a disabled "Event is full", the API
  refuses their join with `409`, and once the first person leaves the spot can be
  taken.
- The edit form's capacity field: `0` is rejected by the form, `2` saves and shows
  "1 spot left", and emptying it returns to "No limit".
- The API refuses a capacity below the number already registered (`409`, shown in
  the form).
- The organizer opens "Attendees for <event>" from Your events, sees the totals
  ("2 of 5"), both people, narrows by email, checks someone in, undoes it, checks
  in again, finds nobody for a bad search, and downloads the CSV (file name, both
  emails, the check-in, three lines).
- Another organization sees "You can only see your own events' attendees" and gets
  `403` from the list and CSV routes.

## Optional event details

`event-details.spec.ts` (5 tests, November 2026). A full event is published
through the form with every optional detail (write-up, contact email, minimum age,
fee and note, what to bring, languages, directions, two agenda rows) and the event
page shows each section, the "Ask" mail link and the stored values match. A basic
event shows none of those sections and reads "Free". Details are added and then
cleared from the edit form (sections disappear, the record loses them). The form
rejects a bad email, a zero fee, a zero age and a half-filled agenda row before
anything is sent. An online event shows its link notes and stores no directions.

## Hybrid, kind and tags, and drafts

Added November 2026; all 37 tests of the folder pass on Chromium. Every test that
publishes through the form now picks the required "Kind of event" first
(`chooseKind` in `event-helpers.ts`), and `createEvent` seeds `eventType:
"volunteering"` (so the edit form, which requires a kind, opens valid) and accepts
`status: "draft"` and `mode: "Hybrid"`.

- `event-hybrid.spec.ts` (3 tests): choosing Hybrid shows the venue fields and the
  stream fields together and both sets of notes; a venue alone is refused until the
  meeting link is there; the published page shows "Hybrid · Guwahati, India", the
  "Where it is and how to join" section with the venue, the directions, "Open in
  maps", "On Zoom Meeting", the link note and the join link; the edit form moves an
  event In person to Hybrid (asking for the link) to Online (the venue is dropped);
  the directory's Hybrid filter separates it from an Online and an In person event.
- `event-kind.spec.ts` (3 tests): publishing needs a kind ("Choose what kind of
  event this is") and refuses more than eight tags; the page shows the kind badge and
  the `#beach #clean-up` chips and the API stores them lower-cased and de-duplicated;
  the edit form opens with the stored kind, changes it, and clearing the tags
  removes them; the directory's "Filter by kind" narrows to one kind and "All kinds"
  brings the rest back.
- `event-drafts.spec.ts` (5 tests): Save as draft keeps the event out of the
  directory and its address for a visitor (a separate context with no cookies) while
  the owner sees a "Draft" row and a banner; Publish from the list makes it public;
  a draft edits (heading "Edit your draft"), saves as a draft and publishes from the
  edit form; Unpublish with a confirmation takes a published event with no
  registrations offline and Publish brings it back; an event with a registration
  cannot be unpublished and the message says to cancel; Delete draft (with "Keep
  draft" first) removes a draft, a published event offers no delete, the API answers
  `409`, and the address is free again.

## Directory search after November 2026

The directory loads 12 cards at a time and searches on the API. The directory
tests therefore narrow to their own events through a `searchDirectory` helper,
using the unique stamp in each event name, and the city test uses a per-stamp
city name so it checks the API-side city match. These edits to
`events-responsive.spec.ts` were run with the rest of this folder on 2026-11-16.

Run this feature with `npx playwright test e2e/events/` from `apps/web` (add
`--project=chromium` for one browser). The run starts its own web and API servers
on ports 3001 and 5051, so it does not touch a running `pnpm dev` session.
