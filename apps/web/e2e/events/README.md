# Events E2E coverage

`events-responsive.spec.ts` covers the public `/events` directory's live event
cards, Upcoming/Past filter, city search, mobile/desktop overflow, that the
search, "Filters" button, create button and filter dialog stay on screen from
640 to 1024px and at 3840px, that filters are fetched once and only on "Apply
filters" (closing discards the choices), that a phone opens them as a bottom
sheet and shows a long name on two lines, that the list shows skeletons while
loading and no count after a failed load, and the organization's full-page event publishing flow.

`events-loading.spec.ts` (4 tests, 2026-11-27 and 2026-11-28): applying a filter keeps the old cards up until the answer arrives, scrolling to the end loads the next page with placeholders, no "Load more" button and no closing message, a failed page can be retried, and the event page shows placeholders until the event arrives.

`event-details.spec.ts` also covers a failed event load: it shows a retry, not
"not found", while an unknown event still shows "not found".

It creates test events through the isolated E2E API and does not depend on
seeded demo records.

The organizer creation route is `/organization/events/new`. It requires a
signed-in organization account; a finished public profile is not needed
(`event-fresh-organization.spec.ts` covers a brand-new draft organization).
The publishing test also
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
  `403`, no registration left; the invited path is in `event-access.spec.ts`), a past event (completed state, Share still
  present, API join returns `409`), and a joined event moving from Upcoming to
  Past after it is backdated. The signed-out Join click is covered by
  `event-attendee-states.spec.ts` (superseding the note that the behavior was
  undecided).
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
  It also holds `chooseFilter` for the directory's "Filters" dialog, and `dropdown`, `chooseOption` and `chooseKind` for the form's
  custom `Dropdown` lists (there is no native `<select>` to call `selectOption`
  on): `dropdown(page, "Timezone")` finds the trigger by its label and exposes
  the chosen value as its `data-value` attribute, and `chooseOption` opens it
  and clicks an option by name. `openEditSection(page, "Attendance")` opens one
  section tab of the edit form: the edit form shows one section at a time (Basics,
  Date & place, Attendance, More details), so a field in another section is hidden
  until its tab is open.

The attendee runs in a second browser context from the organization, and specs
seed future events through the API. Past events come from the E2E-only
`POST /__test__/events/:uid/backdate` route
([`apps/api/tests/e2e/test-routes.ts`](../../../api/tests/e2e/test-routes.ts)),
because the API refuses to create a past event or to join one that has started.
The online-publishing and in-person publishing tests keep the form's default
start. Since 2026-11-26 that is a day and an hour from now, so the earlier risk of
failing within an hour of local midnight is gone.

## `events-responsive.spec.ts` seeding (fixed)

Its `createEvent` helper used to post `endTime` equal to `startTime`, and one test
created an event 30 days in the past, both through `POST /events/create`, which
the API now rejects. It now creates every event in the future with an end two
hours after the start, and moves the past one with the E2E-only
`POST /__test__/events/:uid/backdate` route, as the attendee specs do.

## Editing and cancelling an event

`event-management.spec.ts` (4 tests, November 2026, plus 2 written 2026-11-26 that have **not been run**, below). Each test signs its own
organization up through the UI, publishes the profile and an event through the API
(`event-helpers.ts`), and uses unique names.

- An organization opens Edit from the Hosting tab of My events: the page address is read-only,
  the form starts as stored (name, "Who can join" set to Invite only), the change is saved, "Event
  updated" shows, the event page has the new name and no "Invite only" label, and
  the API record matches.
- An unchanged form offers no "Save changes" (the bar appears once a field
  differs and goes away when it is put back).
- Cancelling: "Keep event" closes the dialog and the event stays published;
  confirming shows "Event cancelled", a "Cancelled" pill and no Edit or Cancel
  actions; the public page says "This event was cancelled" with no Join button; an
  attendee's `POST /events/:uid/join` returns `409`; the edit page shows "This
  event was cancelled" instead of a form.
- A second organization sees "You can only edit your own events" on the edit page,
  and the API returns `403` for its edit and cancel calls; the event is unchanged.
- Not run: the edit form starts from a fresh copy, not the one the event page cached.
  The meeting link of a draft is changed through the API after the event page loaded, the form is reached by links only (a full load would empty the cache), it shows the new link, and saving the name keeps that link.
- Not run: an edit form that cannot load its event shows "Could not load this event" with no form, and "Try again" opens it once the request works.

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
- The organizer opens "Attendees for <event>" from the Hosting tab, sees the totals
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
  removes them; the directory's "Kind" filter narrows to one kind and "All kinds"
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

## Contribute, formatted write-up and timezone

Added November 2026; all 45 tests of the folder pass on Chromium.

- `event-contribute.spec.ts` (3 tests, PG-8): an event with a fundraiser shows
  "Raising for this event" and the helper line naming the organization;
  **Contribute** goes to `/organization/<handle>?support=1` and opens the "Support
  <org>" dialog when the organization has direct support on; with it off the profile
  loads and no dialog opens; a plain profile visit never opens the dialog. Fundraiser
  fields cannot be set through the API (PG-26), so the test uses the E2E-only
  `POST /__test__/events/:uid/fundraiser` route
  ([`apps/api/tests/e2e/test-routes.ts`](../../../api/tests/e2e/test-routes.ts)).
- `event-details.spec.ts` gained a formatted write-up test (PG-12): the form's live
  **Preview** and the published page show bold, italic, a link that opens in a new tab
  with `noopener`, a bullet list and a numbered list, while a `javascript:` link and a
  `<script>` tag stay literal text, no script element exists and `window.__pwned` is
  never set.
- `event-timezone.spec.ts` (4 tests, PG-11), each in an explicit browser timezone
  (`timezoneId`): an organizer in London sets 10:00 in **Asia/Tokyo** and the API
  stores 01:00 UTC; the event page shows "10:00 AM GMT+9" with the viewer's clock
  beside it, a reader in Los Angeles sees the same event hour with their own time
  beside it, and the directory card shows the event's zone; an event in the reader's
  own zone shows no "your time" note; editing a Kolkata event from New York opens on
  the Kolkata clock and changing only the zone to Tokyo moves the real start by 3.5
  hours; an older event with no timezone shows no zone, opening and saving it
  unchanged offers no Save changes and a real change pins the browser's
  zone without moving the event.

## Directory search after November 2026

The directory loads 12 cards at a time and searches on the API. The directory
tests therefore narrow to their own events through a `searchDirectory` helper,
using the unique stamp in each event name, and the city test uses a per-stamp
city name so it checks the API-side city match. These edits to
`events-responsive.spec.ts` were run with the rest of this folder on 2026-11-16.

Run this feature with `npx playwright test e2e/events/` from `apps/web` (add
`--project=chromium` for one browser). The run starts its own web and API servers
on ports 3001 and 5051, so it does not touch a running `pnpm dev` session.

## Who can join and the waitlist

`event-access.spec.ts` (5 tests, 2026-11-19; first run 2026-11-23, after which
three stale expectations were corrected and all 5 pass on Chromium, Firefox and
WebKit). Organizations are
signed up and their profile published through the UI, events are published through
the API with `access`, and each attendee has their own browser context.

- An approval event: the page says "Approval required" and offers "Request to join",
  the attendee sees "Request sent" and "Requested" on My Events, the organizer sees
  the person on the Requests tab and approves, and the attendee then sees "You are
  going".
- A declined request: the attendee sees "did not approve your request" and no
  button, the organizer sees the person on the Declined tab, and approving reverses
  it.
- A full event with the waitlist on: the next person sees "Join the waitlist" and
  then "On the waitlist", and the organizer's "Move up" on the Waitlist tab makes
  them going.
- An invite-only event: the organizer invites an email from the attendee page, that
  person sees "Accept invitation" and joins, and another signed-in person only sees
  the invite-only message.
- The create form's "Who can join" dropdown and the "Allow a waitlist when full"
  switch, which only appears once a capacity is typed.

The full-event refusal test in `event-attendees.spec.ts` now creates its event with
`waitlistEnabled: false`, because a full event takes a waitlist by default.

`event-access.spec.ts` was changed on 2026-11-26: a request and a waitlist join
now go through the note dialog ("Send request", "Join waitlist").
That change has **not been run**.

## Attendee states and draft minimum

Both files were written on 2026-11-26 and have **not been run** (UI tests wait for Tamal's go-ahead), so nothing below is verified in a browser.

`event-attendee-states.spec.ts`:

- The meeting link shows to the host, not to a visitor or a person who has not joined, appears on joining and goes on leaving.
- A running event reads "Happening now": a person going keeps "You are going" and a "Join online" link with no Leave control; someone else is told joining has closed and the API answers `409`; the event stays under Upcoming in the directory and on My Events.
- A signed-out visitor who presses Join signs up and returns to the event; on a phone, the bottom bar sends them to sign in and back, with no note dialog first.
- A request carries an optional note: the field takes focus and is capped at 300 characters, Escape sends nothing, and the organizer reads the note on the Requests tab.
- The My Events Invited tab lists an invitation until it is accepted.
- A draft with only a name and dates opens for its organization: a bare Hybrid draft says no meeting link has been added and offers no map link, and a bare In person draft has no location section.
- A signed-out invitee of a full event with no waitlist sees a disabled "Event is full" and an "Invited? Sign in" button that goes to `/auth/signin`.
- An organization's own profile labels a draft "Draft" in a "Drafts" group, gives it no "Happening now" even when its dates are running, and shows no "Most recently" link for it.

`event-draft-minimum.spec.ts`:

- A draft is saved with only a name and dates, reloads as saved, is refused by the form on Publish with nothing sent, and publishes once complete.
- A draft may have a short description, but a bad meeting link is refused; emptying the description clears it.
- Publish on My events says what is missing on the row and "Finish this event" opens the edit form, including for a draft whose only gap is its kind.

Google sign-in's return path is not covered here because it needs a real Google account; `returnPath.test.ts` covers the helper.

## Cover uploads (DB-1)

Since 2026-11-19 an event keeps only the https link of its cover. The specs that pick a cover with `setInputFiles` on `#coverImage` now go through the real upload: the form asks `POST /uploads/event-covers`, the e2e API has no Blob token so it answers with the local driver, the browser `PUT`s the file to a signed URL on the API, and the form keeps the returned link (files go to a temp folder, see `apps/api/tests/e2e/env.setup.ts`). `createEvent` in `event-helpers.ts` posts a plain https cover link instead of a data URL, because the API now refuses data URLs.
These specs have **not been run** since that change (UI tests wait for Tamal's go-ahead), so treat the upload path in them as written but unverified.

## My events tabs

`my-events-tabs.spec.ts` (2 tests, written 2026-11-27, **not run**).

- An organization that hosts and attends sees only its own events under Hosting (drafts under Drafts) and only the joined event under Attending, with no "Create event" there. The tab survives a reload and moves with the arrow keys.
- At 320px wide the page with both tab rows does not scroll sideways.

The other specs that opened `/organization/events` now open `/events/mine?tab=hosting` (`&show=drafts` for drafts); those edits are not run either.

## A brand-new organization

`event-fresh-organization.spec.ts` (1 test, 2026-11-23). The only events spec that does
not call `publishOrganizationProfile`: it signs an organization up and leaves its
profile as a draft, then checks that `/organization/events/new` opens the form (no
"finish your profile" panel), that an event can be published, that the Hosting tab lists
it, and that the attendee page opens.
