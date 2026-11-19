# Events to-do list

Owner: Tamal.
Created: 2026-11-04, from an audit of the events module (frontend, backend, database).
This file is the single source for what is left to do on events.

## How an agent should use this file

When Tamal asks about the "events to-do list", read the sections out loud in the order below.
Use plain language, not jargon.
For each section say how many items are open and then read each open item as: what is wrong, why it matters, and what the fix is.
Do not skip a section because it is empty; say it is empty.
When an item is finished, tick it, move it to the "Done" section at the bottom, and update the specs in the same change.
Do not delete items on your own.
Mark an item superseded and say what replaced it.
Exception: on 2026-11-19 Tamal parked a batch of ideas and asked for them to be deleted from this file, so they are gone on purpose (large features, nice-to-haves and P3 cleanups).
Do not add them back unless he asks.

Item format: `ID`, then the title, then status, then the details.
Status is `open`, `needs decision`, or `done`.
Priority is P1 (fix first), P2 (soon), P3 (later).

Sections:

1. Product gaps (things users cannot do yet)
2. Code health (dead code and structure)
3. Testing
4. UI audit
5. Backend API validation
6. Database (MongoDB)
7. Backend security
8. Backend scalability and operations
9. Docs and diagrams
10. Decisions needed from Tamal
11. Done

## 1. Product gaps (things users cannot do yet)

### PG-1 Edit an event
Status: done (2026-11-16). Priority: P1.
Organizers cannot change an event after it is published.
A typo in the title, date or place can only be fixed by editing the database by hand.
The API has no update route, and the frontend has no edit page.
Fix: add an authenticated update route that only the owning organization can call, reuse the create validation, and add an edit mode to the full-page form.
Result: `PATCH /events/:uid` and an Edit link on every row of `/organization/events` that has not ended and is not cancelled, opening the shared form at `/organization/events/:eventId/edit`.
Only the hosting organization can edit (`403` for anyone else), and an event is editable until it ends and never after it is cancelled (`409`).
The body is any subset of the create fields and shares the create rules, except that a start time left alone may already be in the past, so an event in progress can fix a typo.
The page address cannot change, because registrations point at it, so sending `uid` is a `400`.
Switching between Online and In person drops the other mode's fields.
The form sends only what changed, so a cover image is not re-sent unless a new one was picked.
Not built: telling the people who joined (not planned), and editing the long-form detail fields, which the create form cannot set either (PG-7).

### PG-2 Cancel or delete an event
Status: done (2026-11-16), cancel only. Priority: P1.
There is no way to cancel or remove an event.
Decide first whether "cancel" keeps the event visible with a cancelled badge, or removes it.
People who already registered need to be told, which links to the email work in PG-6.
Result: `POST /events/:uid/cancel` and a "Cancel event" button on the same rows, behind a confirmation dialog.
Decided while Tamal was away, so Tamal should confirm it: a cancelled event stays public with a "Cancelled" badge on the card, the detail page and My Events, and there is no delete and no reinstate.
It adds an `Event.status` (`published` or `cancelled`) and `cancelledAt`; an event saved before the field existed reads as published.
New joins are refused with `409`, and existing registrations are kept.
Only the hosting organization can cancel, and only before the event ends.
Not built: emailing the people who joined (not planned), reinstating, and deleting.

### PG-3 Leave an event (undo a registration)
Status: done (2026-11-16). Priority: P2.
An attendee who joined cannot un-join.
There is no leave route and no button.
The registration table already has a unique rule per person and event, so a delete route is simple.
Result: `DELETE /events/:uid/registration` and a "Leave event" link under "You are going" on the event page, behind a confirmation dialog ("Stay registered" or "Leave event").
It gives the spot back (PG-5), refreshes the page, and removes the event from My Events.
It is allowed until the event starts (`409` after), and on a cancelled event, where the link reads "Remove my registration".
Not built: telling the organizer that someone left.

### PG-4 Invite-only events do not work end to end
Status: done (2026-11-19), with a small web side. Priority: P1.
The invite-only flag was only a label: the API refused every join with a 403 and nothing existed to invite or approve anyone.
Decided with Tamal on 2026-11-18 together with PG-14, built on 2026-11-19: one registration state machine instead of a flag.
Result: an event has one of three access levels, set in the "Who can join" dropdown of the create and edit forms.
**Open** (anyone joins), **Approval required** (anyone asks, the organizer approves or declines on the attendee page's Requests tab) and **Invite only** (only invited emails can join, still listed in the directory with a label).
An invited email skips approval on any level and can join a full event.
The organizer invites by email from the attendee page (up to 50 at a time, 200 per event), the invitee must sign in with that exact email, and in production the invitation email links to the event.
A declined person cannot ask again until the organizer approves them.
An approved person gets the join confirmation email in production.
The old `inviteOnly` flag is retired: an old event with it set reads as Approval required, with no migration.
The directory filter has "Open to all", "Approval required" and "Invite only".
Not built: an "Invited" tab in My Events (the API has `GET /events/invitations` for it), a note box on the request (the API takes up to 300 characters), and any email for a decline or for the organizer on a new request.
Inviting someone who already asked is skipped as already registered; the organizer approves them from the Requests tab instead.

### PG-5 Capacity and spots left
Status: done (2026-11-16). Priority: P2.
An organizer cannot set a maximum number of attendees, and the page cannot show spots left.
Registrations are stored separately and nothing totals them per event for the public.
This needs a capacity field on the event and an atomic check when joining so two people cannot take the last spot together.
Result: an optional "Maximum attendees" (1 to 100000) on the create and edit forms, stored as `capacity` with a `registrationCount` kept by atomic increments.
A full event refuses the join with `409 "This event is full."`, and eight people racing for two spots get exactly two (tested).
The card, the facts strip, the join panel and the mobile bar show going and spots left ("1 spot left", "Full") only for an event with a capacity, and "No limit" otherwise.
Setting a capacity on edit recounts the registrations, and cannot go below the people already registered.
Not built: a waitlist (PG-14).

### PG-6 Organizer attendee list and check-in
Status: done (2026-11-16). Priority: P2.
Organizers see only a registration count on the dashboard.
There is no attendee list, no check-in on the day, and no notification to the organizer when someone joins.
This is already drawn as "proposed" in the Miro data-flow frame.
Result: an "Attendees" link on every row of Your events opens `/organization/events/:eventId/attendees`: totals (registered of capacity, checked in), a search by name or email, a check-in toggle per person, "Download CSV", and 50 people at a time.
Only the hosting organization can read it (`403` for anyone else), and the CSV neutralizes cells that a spreadsheet would run as a formula.
A cancelled event keeps its list but has no check-in.
In production the organization owner also gets an email for each new registration (the attendee's name and the running total, never their email).
Not built: a digest or opt-out for those emails, check-in by QR code, and attendance numbers on the dashboard.
The Miro data-flow frame still shows the roster as proposed (see D-1).

### PG-7 The create form cannot collect the rich details
Status: done (2026-11-16), except the fundraiser. Priority: P1.
The detail page can show about text, agenda, what to bring, directions, link delivery, join requirements, cost, fundraiser, languages, minimum age and contact email.
The create form and the create API accept none of these.
Only the demo-data script can fill them, so real events look thinner than the design.
Fix: extend the Zod create schema and the form in small groups, starting with about text, contact email and cost.
The government-sponsored badge must stay server-only.
Result: the create and edit API accept, and a new "More about the event" section of the form collects, a full write-up, contact email, minimum age, a fee with currency and a note (empty means free, zero is rejected), what to bring, languages, an agenda editor, and "Getting there" for in-person events or the link notes for online ones.
Every field is optional, hidden from the event page when empty, validated on both sides with the same limits, and can be cleared again on edit.
Only the chosen mode's notes are kept.
The government-backed badge stays server-only.
Not done: `fundraiser`: events do not take money (decided 2026-11-19), so it stays unset.

### PG-8 Contribute button does nothing
Status: done (2026-11-16). Priority: P3.
The Contribute button on the detail page only shows a "coming soon" message.
Decide whether it links to the existing organization donation flow.
Result (decided while building it, easy to change): it links to the hosting organization's existing Support flow.
Contribute goes to the organization's profile with `?support=1`, which opens the Razorpay "Support" dialog straight away when that organization has direct support on, and just shows the profile when it does not.
The helper line now says the money goes to the organization through its Support page, not to this event alone.
An event from an individual host (no organization link) shows no button, and the "coming soon" toast is gone.
The panel's raised figure is not fed by any payment and a fundraiser cannot be set through the API; that stays as it is (decided 2026-11-19).

### Added 2026-11-16: gaps found by comparing with other event platforms

These come from a review of Devfolio, HackQuest, DoraHacks, Devpost, Unstop, Luma, Eventbrite, Meetup, Galaxy Digital, Better Impact, Zeffy and Givebutter.
Their feature lists come from their own help pages and marketing, so confirm a detail before copying it.
PG-1 to PG-8 above already cover edit, cancel, leave, invite-only, capacity, attendee list, rich details and the Contribute button.
The items below are new.

### PG-9 No event type, category or tags
Status: done (2026-11-16). Priority: P2.
A hackathon, a workshop, a clean-up drive and a fundraiser all look the same.
Discovery cannot filter by kind of event, and the detail page cannot change its layout by kind.
Fix: add a required event type and optional tags to the model, the create form, the card and the directory filter.
Result: seven kinds (Volunteering drive, Fundraiser, Workshop or training, Awareness campaign, Meetup or networking, Cultural or community event, Other) and up to eight tags per event.
The create and edit forms require a kind and take tags; the card shows the kind, the event page shows a kind badge and `#tag` chips, the directory has a third "Filter by kind" dropdown, and the directory search finds an event by its tags.
The kind is required by the form but optional in the API, so older events and API clients keep working; a legacy event must be given a kind before the edit form saves.
There is no Hackathon kind: hackathons are out of scope (decided 2026-11-19).
The local demo events now carry kinds in the seed script.

### PG-10 No Hybrid mode
Status: done (2026-11-16). Priority: P2.
An event is Online or Offline only.
An event that has a venue and a live stream cannot be described.
Fix: add a third mode that requires both the place and the meeting link.
Luma offers In-Person, Online and Hybrid.
Result: a third "Hybrid" format ("A place and a live stream") that requires the full venue and the platform and meeting link, keeps both sets of notes, and shows "Hybrid · City, Country" on cards and lists.
The event page shows both a venue card and a joining card under "Where it is and how to join", and the directory format filter has a Hybrid option.
Switching a Hybrid event to In person or Online drops the side that no longer applies.

### PG-11 No timezone on events
Status: done (2026-11-16). Priority: P2.
The form has no timezone field, and the code has no timezone handling.
A time is shown in each viewer's own browser timezone, so an event in one city can show the wrong clock time to someone elsewhere.
The agenda labels are plain wall-clock text for the same reason.
Fix: store the event's timezone, show times in it, and optionally show the viewer's local time beside it.
Result: events have an optional `timezone` (an IANA name such as `Asia/Kolkata`, checked against the runtime's own database; abbreviations like `IST` are refused).
The form has a Timezone picker (defaulting to the browser's) and reads its date and time pickers in that zone, so an organizer in London can set 10:00 in Tokyo and the stored start is 01:00 UTC; editing reads the times back in the event's zone, and changing only the zone moves the real moment.
Cards, the event page, the join panel, My Events, Your events and the organization's events list show the event's own clock with the zone named, the hero and the panel add the viewer's own time when it differs, and the join confirmation email uses the event's zone.
Older events have no timezone and keep showing in each viewer's own zone; the browser's zone is pinned onto one only when something else is saved.
Not built: a search box in the picker, the viewer note on cards and lists, and a timezone on the demo seed events.

### PG-12 Description is short and plain text
Status: done (2026-11-16). Priority: P2.
The create rule is 20 to 200 characters of plain text.
Devfolio's About accepts Markdown and Luma accepts formatted text.
Fix: decide a longer limit and a safe formatted-text format, and make sure it is sanitized before it is shown.
This pairs with PG-7, which adds the long-form about text.
Result (decided while building it): the short description stays plain text, 20 to 200 characters, because it is the card summary; the full write-up from PG-7 is where the longer formatted text lives.
The write-up now takes up to 4000 characters per paragraph (was 2000) and a small safe format: bold, italic, http and https links, bullet and numbered lists and line breaks.
It is parsed into data and rendered as React elements, never HTML, so organizer text cannot inject markup (tested with a script tag, an image tag and a `javascript:` link), and the form shows a live preview.
Not supported on purpose: headings, images, tables, code and nesting.

### PG-14 No waitlist and no approval step
Status: done (2026-11-19), with a small web side. Priority: P2.
Built together with PG-4, see there for the access levels.
Result: a registration has a status: going (holds a spot), pending (asked to join), waitlisted, declined.
A row with no status reads as going.
A full event with the waitlist on (the default, switched off with "Allow a waitlist when full" in the form, which appears once a maximum is set) sends a new joiner to the waitlist, shown as "On the waitlist" with a "Leave the waitlist" link.
With it off, a full event just says "Event is full" and the API answers 409.
On an Approval required event that is full, a new request goes to the waitlist; otherwise it is pending, shown as "Request sent" with "Withdraw my request".
Promotion is manual: the organizer clicks "Move up" or Approve, and nobody moves up on their own when a spot opens.
Approving or moving someone up on a full event goes past the capacity (Full is a soft limit, and the page shows "Full", never a count past the cap).
My Events labels a request, a waitlist spot or a decline on the card, and Your events shows "N waiting" on the Attendees link.

### PG-15 No draft, unpublish or event status
Status: done (2026-11-16), except postponed. Priority: P1.
The event model has no status field.
An event goes live the moment it is submitted, and cannot be hidden, cancelled or postponed.
PG-1 and PG-2 both need this.
Partly done 2026-11-16: the model now has `status` with `published` and `cancelled` (PG-2).
Result (2026-11-16): `status` also has `draft`.
"Save as draft" on the create form keeps an event visible only to its own organization: it is not in the directory, the public profile or the dashboard, answers as not found by address to everyone else (including other organizations), and cannot be joined.
A draft is edited at the same edit page ("Edit your draft"), and Publish (from Your events or the edit form) makes it public if it still passes the create rules (a stale start is refused).
A published event can be taken back to a draft with "Unpublish" only while nobody has registered, otherwise the message says to cancel instead; a draft can be deleted for good, and a published event never can.
Not built: postponed events, and a draft that skips the required fields (a draft is held to the full rules).
Fix: add a status (draft, published, cancelled, postponed), let organizers save a draft, and make public lists show only published events.

### PG-19 No add to calendar
Status: open. Priority: P2.
A search of the web code found no calendar export.
Luma, Eventbrite and Meetup all offer one.
Fix: add an `.ics` download and an "Add to Google Calendar" link on the detail page and in the confirmation email.

## 2. Code health (dead code and structure)

### CH-1 Delete the retired `CreateEvent.tsx`
Status: done (2026-11-04). Priority: P1.
`apps/web/src/features/events/components/CreateEvent.tsx` is 509 lines and not mounted anywhere.
It looks like an event form but saves to the user profile route, and several address fields are bound to the wrong keys.
It exists only as a trap.
Fix: delete it together with the `CreateEventCredentials` type, then update the events specs and the Miro "retired" note.
Result: the file and the `CreateEventCredentials` type are deleted, and the events specs are updated.
The Miro "retired" note for `CreateEvent.tsx` still needs updating (see D-1).

### CH-2 Delete the empty `HostedEvents.tsx`
Status: done (2026-11-04). Priority: P1.
The file is 0 bytes and nothing imports it.
Result: deleted.

### CH-3 Remove or wire `services/Events.ts`
Status: done (2026-11-04). Priority: P2.
The feature-level service is not used by any routed page.
All live calls go through `services/KarmaCircleApi.ts`.
Remove it, or move the live calls into it, so there is one place for event API calls.
Result: `services/Events.ts` (and the now-empty `services/` folder) is deleted, together with `eventEndpoints.all`, which only it used.
The write calls live in `services/KarmaCircleApi.ts` and the reads use `useSWR` with `eventEndpoints`.

### CH-4 `EventsMarqueeCards.tsx` and `getFormattedDate.ts`
Status: needs decision. Priority: P3.
Neither is rendered by a live route.
`getFormattedDate.ts` exists only for the marquee.
Decide to wire the marquee to live data or delete both.

### CH-6 Directory search runs in the browser
Status: done (2026-11-04). Priority: P2.
`/events` fetches up to 100 events and filters them in the browser.
Past 100 events, extra events silently never appear.
Fix: move search and the upcoming or past split to the API with real pagination.
Result: `GET /events` now takes `search`, `period`, `mode` and `inviteOnly`, sorts by start time with the id as tiebreaker, and the directory loads 12 events at a time with a "Load more events" button.
The directory still has no text index, so search is an unindexed scan on name, city and host name.
That is fine at today's scale and should become an index or prefix search if the collection grows.

### CH-7 Duplicate-address race on create
Status: done (2026-11-04). Priority: P2.
Create checks whether the page address exists and then saves.
Two organizers submitting the same address at the same moment can both pass the check.
The database already has a unique index, so the fix is to rely on it and turn error code 11000 into a friendly 409 for this route.
Also listed in the API known issues.
Result: create keeps the friendly pre-check, and now also turns error code 11000 on save into the same `409`.
The entry is removed from the API known issues.

## 3. Testing

### T-1 API tests missing for join rules
Status: done (2026-11-04). Priority: P1.
Covered today: create, list, host filter, validation, join happy path, duplicate join, registration check, and a non-organization creating.
Missing: joining an invite-only event returns 403.
Missing: joining an event that already started returns 409.
Missing: joining an unknown event returns 404.
Missing: the registration check for an unknown event returns 404.
Result: all four are covered in the "join rules and My Events" block of `apps/api/tests/events.test.ts`, plus the registration check for a known event the attendee has not joined and the `401` without sign-in.

### T-2 API tests missing for My Events
Status: done (2026-11-04). Priority: P2.
Missing: the upcoming and past period filter and its sort order.
Missing: pagination on `/events/mine`.
Missing: another user's registrations never appear.
Result: covered in the same block, plus an unknown `period` returning `400`, a `limit` over 100 returning `400`, and an empty page for an attendee who joined nothing.

### T-3 No browser tests for the attendee journey
Status: done (2026-11-16). Priority: P1.
Covered today: directory filters, search, responsive layout, and an organization publishing an in-person event.
Missing: opening the detail page, joining, the "You are going" state, My Events, the invite-only state, and the past-event state.
Result: `apps/web/e2e/events/attendee-journey.spec.ts` has 5 tests for these.
Run on 2026-11-16: all 5 pass on Chromium, Firefox and WebKit.
A signed-out visitor clicking Join is not covered, because the intended behavior is not decided.

### T-4 No test for online event publishing in the browser
Status: done (2026-11-16). Priority: P2.
The publish test covers an in-person event.
Add the online path with platform and meeting link, including a bad link.
Result: `apps/web/e2e/events/online-event-publishing.spec.ts` has 2 tests (platform and link errors with nothing published, then a successful publish, plus the default platform and the Online type filter).
Run on 2026-11-16: both pass on Chromium, Firefox and WebKit.
One needed its hosted-list link anchored (`^<name>`) after the Edit link was added.
The tests keep the form's default start (one hour from now), so they can fail within an hour of local midnight.

### T-5 No frontend unit tests
Status: done (2026-11-04). Priority: P2.
Pure helpers such as the date, duration and funded-percent helpers have no unit tests.
Add a small unit test setup for pure functions.
Result: Vitest is set up in `apps/web` (`vitest.config.mjs`, `pnpm test:unit`) with colocated `*.test.ts` files for the events helpers and `formatMoney`.
The `test` script is now `vitest run && playwright test`, so root `pnpm test` and CI run the unit tests first.
Not covered: `convertToBase64` (needs a browser `FileReader`, so it would need jsdom or happy-dom), components and hooks.
The tests found three helper bugs, tracked as T-8.

### T-7 API tests were not run in the last audit
Status: done (2026-11-04). Priority: P1.
Run `pnpm --filter karmacircle-api test` and record the result here.
Result, 2026-11-04: `npx --no-install jest` in `apps/api` passed 10 suites of 10 and 183 tests of 183, about 8 seconds.
`apps/web` `npx --no-install vitest run` passed 4 files of 4, 63 tests and 2 todo (65 total).
Playwright was not run, so no browser result is recorded.

### T-8 Helper bugs found by the new unit tests
Status: open. Priority: P3.
`formatDuration` in `formatEventFacts.ts` returns "NaN days" when either date cannot be read.
`getFormattedDate` returns "NaNth undefined" for a missing or invalid date, and is only used by the unused marquee card (see CH-4).
`fundedPercent` has no lower clamp, so a negative raised amount gives a negative percent, and a NaN goal or raised value gives NaN.
`isEventPast` treats an unreadable date as not past, which the tests record as current behavior.
Two of these are recorded as `it.todo` in the test files.
Fix: decide the fallback for an unreadable date, then change the helpers and the tests together.

### T-9 The existing responsive spec posts events the API now rejects
Status: done (2026-11-16). Priority: P1.
`apps/web/e2e/events/events-responsive.spec.ts` builds events through `POST /events/create` with an end time equal to the start time, and one of them in the past.
The create rules from V-1 and V-2 reject both, so three of its four tests (all but the UI publishing test) will fail on a real run.
Fix: create the events in the future with an end after the start, and move the past one into the past with the E2E-only backdate route (`apps/api/tests/e2e/test-routes.ts`).
Result: the spec now creates every event in the future with an end two hours after the start and backdates the past one through the E2E-only route.
All four of its tests pass on Chromium, Firefox and WebKit.

### T-10 Two browser tests time out when all three browsers run at once
Status: open. Priority: P3.
A run of the whole events folder on Chromium, Firefox and WebKit together (2026-11-16) passed 76 of 78.
The two failures were the WebKit "a full event refuses the next person until someone leaves" test (three sign-ups and a second context, 25 seconds) and the Firefox "default platform is saved as a Zoom meeting" test.
Both pass when run alone, and all 26 tests pass on each single browser (52 seconds on WebKit), so the cause looks like CPU load from three browsers plus the dev server, with the 10 second expect timeout too tight.
Not confirmed: the failing assertion was not captured, because the run that would have shown it was stopped.
Fix: rerun the three-browser folder once with the output saved, then either raise the expect timeout for the sign-up heavy specs or cap workers for this folder.

## 4. UI audit

Status of the whole section: not yet audited visually.
No pages were opened in a browser during the audit, because UI testing needs Tamal's go-ahead.
Say plainly that visual review is still pending until it is done.

### UI-1 Visual review of the three event pages
Status: open. Priority: P1.
Review the create form, the event detail page, and My Events in a browser, once Tamal says to test the UI.
Spot-checked on 2026-11-16 while building PG-1 and PG-2, which is not the full review: the create page, the edit page, Your events with its Edit and Cancel buttons, the cancel dialog, and the cancelled card and detail page at 1024px, and the cancelled detail page, card and edit page messages at 375px.
My Events was not looked at, and nothing was checked at 320px or on very wide screens.

### UI-2 Responsive check from 320px to 4K
Status: open. Priority: P1.
This is required for every changed component in this repo.
Check the create form, the live preview, the detail page, the floating mobile join bar, and the directory cards.
Check mobile padding against the `px-9` standard and cap very wide screens with a centered container.

### UI-3 Empty, loading and error states
Status: open. Priority: P2.
Check each page for the loading state, the failed-fetch state, and the empty state.

### UI-4 Accessibility pass
Status: open. Priority: P2.
Check keyboard use of the create form, the mode choice, the filter dropdowns, focus order, focus after a failed submit, and color contrast on the badges.

### UI-5 Cover image handling
Status: open. Priority: P2.
The form reads the image as a base64 string up to 5 MB.
Check the preview, the slow-network behavior, and what is shown when the image is very tall or very small.

## 5. Backend API validation

### V-1 End time is never checked on the server
Status: done (2026-11-04). Priority: P1.
Only the browser checks that the end is after the start.
A direct call to the API can create an event that ends before it starts.
Fix: add the check to the create schema.
Result: the create schema rejects an end time equal to or before the start time (`400`, path `endTime`).
The browser check is now strict too.

### V-2 Past start dates are accepted
Status: done (2026-11-04), decided: not allowed. Priority: P2.
The API accepts an event that starts in the past.
Decide whether that is allowed, for example to log a past drive, and enforce it either way.
Result: decided with Tamal's owner decision that past start dates are not allowed.
The create schema rejects a start time in the past (`400`, path `startTime`) and the browser form checks it as well.

### V-3 Name and description length only checked in the browser
Status: done (2026-11-04). Priority: P1.
The browser requires name 10 to 80 characters and description 20 to 200.
The API only requires not empty, so one call can store a huge description.
Fix: mirror the limits in the Zod schema.
Result: the schema now enforces name 10 to 80 and description 20 to 200 characters, with the same wording as the browser.

### V-4 Cover image is not really validated
Status: done (2026-11-04). Priority: P1.
The API only requires a non-empty string and relies on the global 10 MB body limit.
Fix: accept only an image data URL of a known type with a size cap, or an https link, and reject anything else.
See also DB-1 and S-4 for why this matters.
Result: the cover image must be an https link (up to 2048 characters) or a base64 data URL of PNG, JPEG, WebP or GIF that decodes to 5 MiB or less.
The browser picker accepts only the same four types.
This does not fix DB-1 or S-4: images are still stored inside the event document.

### V-5 Reserved page addresses
Status: done (2026-11-04). Priority: P2.
An event whose address is `mine` would clash with the `/events/mine` page, and similar words can clash with future routes.
Fix: reject a small list of reserved words in the address rule on both sides.
Result: `mine`, `new`, `create`, `edit`, `admin` and `api` are rejected by the API and by the create form, from one constant per app.

### V-6 Free-text fields have no length limits
Status: done (2026-11-04). Priority: P2.
City, state, country, address, platform and the meeting link have no maximum length.
Add sensible maximums.
Result: city, state and country are capped at 100, address at 200, platform at 60 and the meeting link at 2048 characters.
`mapIframe` is still an unbounded optional string.

## 6. Database (MongoDB)

### DB-1 Cover images are stored inside the event document
Status: open. Priority: P1.
The browser sends the image as a text string and it is saved in the event record.
The public list returns whole records, so every cover image travels in the list response.
With 100 events at a few megabytes each, one page load could be hundreds of megabytes.
Fix: upload images to object storage, save only a link on the event, and validate type and size on upload.
Short-term: stop returning the cover string in the list and serve it separately.

### DB-2 The event list has no fixed order
Status: done (2026-11-19). Priority: P1.
The list query used skip and limit with no sort, so pages could repeat or skip events.
Result: `GET /events` sorts by start time with the id as tiebreaker (done 2026-11-04, see CH-6), and the matching index now exists (see DB-3).

### DB-3 Missing indexes
Status: done (2026-11-19), with a manual cleanup left. Priority: P1.
The host filter matches on `hostUsername` or `organizerHandle`, but only `organizerHandle` was indexed, and `startTime` had no index, so list queries scanned the whole collection.
Result: events have `(startTime, _id)`, `(hostUsername, startTime, _id)` and `(organizerHandle, startTime, _id)`, and `tests/event-indexes.test.ts` checks the real query plans for no collection scan and no blocking sort.
The redundant single `eventUid` index on registrations is removed from the schema.
Mongoose builds missing indexes on connect but never drops old ones, so the old `organizerHandle_1` index on `events` and `eventUid_1` on `eventregistrations` stay in a database that already has them until someone drops them by hand.
They are harmless, only extra write cost, and not worth a risky production change by themselves.

### DB-6 Username uniqueness is not enforced by the database
Status: open. Priority: P2.
The user name has a plain index, not a unique one, so a race can create duplicates.
Events rely on the organization handle derived from it.
Fix: make it unique after cleaning existing data.

## 7. Backend security

### S-1 Session cookie is written to the logs
Status: done (2026-11-19). Priority: P1.
The request logger printed all request headers, including the cookie that holds the login token, so anyone with log access could copy a valid session.
Result: the logger redacts the `Cookie` and `Authorization` request headers and the `Set-Cookie` response header (`REDACTED_LOG_PATHS` in `apps/api/src/config/logger.ts`), tested against the real `pino-http` output in `tests/logger.test.ts`.
Logs written before this fix may still hold session tokens; sessions can be revoked by bumping the token version if that matters.

### S-2 Rate limits do not work across servers
Status: open. Priority: P1.
The limiter keeps its counts in memory on each server instance.
On Vercel, many instances run at once and each starts at zero, so the limit is easy to bypass.
Fix: use a shared store such as Redis or a database-backed counter, at least for sign-in and password reset.

### S-3 Known vulnerable packages
Status: partly done (2026-11-19). Priority: P1.
A dependency audit on 2026-11-04 found 1 critical, 12 high, 18 moderate and 4 low issues in the API, and GitHub counts 170 across the whole repo, mostly development tools.
Result for the API: every fix that does not need a breaking upgrade is applied in both lockfiles (`apps/api/package-lock.json` and the root `pnpm-lock.yaml`, which CI uses): express and proxy-addr, compression, body-parser, mongoose, axios, qs, follow-redirects, fast-uri (held at a safe version by an override in `pnpm-workspace.yaml`), ip-address and a few more.
What is left: `zod` 3 to 4 is a breaking upgrade that touches every schema in the API, skipped on purpose (the flaw is memory use on huge arrays).
The remaining critical `tar` and the npm tooling flaws live inside `semantic-release`'s bundled `npm`, which is development-only and never ships with the API.
`apps/web` was not touched, and `vite` in the web app has open advisories of its own.
`npm audit` also does not run in CI yet.

### S-4 Large request bodies are accepted on every route
Status: open. Priority: P2.
The JSON body limit is 10 MB for the whole API, because event covers need it.
Every other route accepts the same, which makes memory exhaustion easier.
Fix: set a small default and a larger limit only where needed, or remove the need through DB-1.

### S-5 Weak secret check
Status: open. Priority: P2.
The environment check only requires the token secret to be non-empty.
Require a minimum length and refuse obvious placeholder values in production.

### S-6 Payment routes are open to anyone
Status: done (2026-11-19), decided: anonymous donations stay. Priority: P2.
Creating a donation order and verifying a payment do not need sign-in.
That is intended, so anonymous donations stay as they are, and the signature check stays strict.
The signature check itself is present.

### S-7 Cart add trusts an email from the request
Status: done (already fixed, found stale on 2026-11-19). Priority: P1.
This entry was out of date: `POST /product/cart/add` is behind `requireAuth` and only ever changes the signed-in user's own cart (see `apps/api/docs/specs/known-issues.md`).
Still open elsewhere in the products module and not events code: `POST /product/addproduct` has no sign-in check, and the cart accepts product ids that do not exist.

## 8. Backend scalability and operations

### O-1 A failed first database connection is remembered
Status: done (2026-11-19). Priority: P1.
The serverless handler kept its first connection attempt for good, so one failed attempt broke every later request on that instance until it restarted.
Result: `createConnectionGate()` in `apps/api/src/config/database.ts` shares one attempt between concurrent requests and forgets it on failure, so the next request retries; the request that hit the failure gets `503`. Tested in `tests/database-gate.test.ts`.

### O-2 Unbounded work in some queries
Status: open. Priority: P2.
CH-6 is done, so the events directory now loads 12 at a time and the API list is capped at 100 per page.
Add a hard maximum page size everywhere, which exists for events at 100.

### O-5 No monitoring of errors
Status: open. Priority: P2.
Errors are logged but there is no alerting or error tracking.
Add error tracking and a health check that reports real database status to an uptime monitor.

## 9. Docs and diagrams

### D-1 Keep the Miro board in step
Status: open. Priority: P3.
The Miro "Claude Dashboard" board has three Events frames: inputs, data flow, and discover, join and follow up.
When any item above ships, update the matching frame, for example the proposed roster box after PG-6.
Pending from 2026-11-16: the roster box is still drawn as "proposed" although the attendee page now exists, and the discover and join frame has no leave, full or cancelled state (see `docs/specs/events.md` and `docs/specs/user-flows.md` for the new flow).
Pending from 2026-11-04: the "retired" note for `CreateEvent.tsx` (CH-1) now describes a deleted file, and the directory data flow (CH-6) is now server-side search with paging.

### D-2 Keep specs in step
Status: open. Priority: P2.
Every item here changes at least one of: `apps/web/src/features/events/SPEC.md`, `docs/specs/events.md`, `apps/api/docs/specs/events.md`, `apps/api/docs/specs/api-contract.md`, and the known-issues files.
Update them in the same change.

## 10. Decisions needed from Tamal

1. Decided 2026-11-18 and built 2026-11-19: invite-only is a private-style event for invited emails, next to an Approval required level (PG-4).
2. Decided 2026-11-16 while Tamal was away, still to confirm: a cancelled event stays visible with a badge, and there is no delete (PG-2).
3. Decided 2026-11-04: past start dates are not allowed (V-2).
4. Marquee cards: wire to live data or delete (CH-4). Leaning delete; Tamal wants to talk it through first.
5. Decided 2026-11-19: anonymous donations stay as they are (S-6).
6. Cover images: move to object storage now, or ship the short-term fix first (DB-1).
7. Decided 2026-11-18 and built 2026-11-19: waitlist and approval share one registration state machine with invite-only; manual promotion (PG-14 and PG-4).
8. Decided 2026-11-19: hackathons are out of scope.
9. Decided 2026-11-19: volunteering roles and shifts are not an event feature.
10. Decided 2026-11-19: events do not take money through tickets or donations.

## 11. Done

- 2026-11-04: events folder imports now use the `@features/events/...` and `@utils/...` aliases instead of `../../` paths.
- 2026-11-04: `formatMoney` and `fundedPercent` moved to the shared `apps/web/src/utils/formatMoney.ts`.
- 2026-11-04: corrected the events spec sentence that said the create form had no browser test.
- 2026-11-04: Miro Events section split into three frames (inputs, data flow, discover and follow up).
- 2026-11-04: CH-1, deleted the retired `CreateEvent.tsx` and the `CreateEventCredentials` type.
- 2026-11-04: CH-2, deleted the empty `HostedEvents.tsx`.
- 2026-11-04: CH-3, deleted the unused `services/Events.ts` and `eventEndpoints.all`.
- 2026-11-04: CH-6, `GET /events` has `search`, `period`, `mode` and `inviteOnly` with a stable order, and the directory pages 12 at a time.
- 2026-11-04: CH-7, a duplicate address that slips past the pre-check now returns `409` instead of a generic error.
- 2026-11-04: V-1, the API rejects an end time that is not after the start time.
- 2026-11-04: V-2, decided not allowed, and the API and the form reject a start time in the past.
- 2026-11-04: V-3, the API enforces name 10 to 80 and description 20 to 200 characters.
- 2026-11-04: V-4, the API only accepts an https cover link or a base64 PNG, JPEG, WebP or GIF up to 5 MiB.
- 2026-11-04: V-5, reserved page addresses are rejected on both sides.
- 2026-11-04: V-6, maximum lengths added for city, state, country, address, platform and meeting link.
- 2026-11-04: T-1, API tests added for the join rules and the registration check.
- 2026-11-04: T-2, API tests added for My Events (period, order, paging, isolation).
- 2026-11-04: T-5, Vitest unit tests added for the events helpers and `formatMoney`; `pnpm test` now runs them.
- 2026-11-04: T-7, API suite run: 10 suites and 183 tests passed; web unit suite run: 63 passed and 2 todo.
- 2026-11-04: T-3 and T-4 were written (7 Playwright tests in 2 files); they were run on 2026-11-16, see below.
- 2026-11-16: PG-1, edit an event (`PATCH /events/:uid`, the Edit page, only changed fields sent, page address fixed).
- 2026-11-16: PG-2, cancel an event (`POST /events/:uid/cancel`, confirmation dialog, `Event.status`, cancelled badge on card, detail page and My Events, joins refused).
- 2026-11-16: API tests for edit and cancel: `tests/events-manage.test.ts`, 34 tests; the API suite passed 11 suites and 217 tests.
- 2026-11-16: web unit tests for the edit helpers (`eventToFormState`, `buildEventChanges`) and the cancelled mapping; the web unit suite passed 76 tests and 2 todo.
- 2026-11-16: Playwright `event-management.spec.ts` (4 tests) for edit and cancel; the whole events folder passed 15 of 15 on Chromium, Firefox and WebKit.
- 2026-11-16: T-3, T-4 and T-9 closed by that run; `events-responsive.spec.ts` now seeds valid future events and backdates the past one.
- 2026-11-16: PG-3, leave an event (`DELETE /events/:uid/registration`, confirmation dialog, spot given back).
- 2026-11-16: PG-5, capacity and spots left (atomic reservation, "Event is full", going and spots left only for a capped event).
- 2026-11-16: PG-6, organizer attendee list, check-in, CSV export and a join notice to the organizer.
- 2026-11-16: PG-7, the optional detail fields in the create and edit forms and API (all except the fundraiser).
- 2026-11-16: API tests for these: `events-capacity.test.ts` (27), `events-attendees.test.ts` (24), `events-details.test.ts` (31); the API suite passed 14 suites and 301 tests.
- 2026-11-16: web unit tests for the new helpers; the web unit suite passed 121 tests and 2 todo.
- 2026-11-16: Playwright `event-attendees.spec.ts` (6) and `event-details.spec.ts` (5); the events folder is 26 tests; run alone on one browser all 26 pass on each of the three, and a full three-browser run passed 76 of 78 (two timeouts under heavy load, see T-10).
- 2026-11-16: PG-10, Hybrid format (both field sets required, both cards on the page, a Hybrid filter).
- 2026-11-16: PG-9, event kind and tags (a required kind in the form, tags, a kind label and badge, a "Filter by kind" dropdown, tag search).
- 2026-11-16: PG-15, drafts (save as draft, publish, unpublish while nobody has registered, delete a draft, hidden from everyone but the owner).
- 2026-11-16: API tests `events-hybrid.test.ts` (14), `events-types.test.ts` (23) and `events-drafts.test.ts` (27); the API suite passed 17 suites and 365 tests.
- 2026-11-16: web unit tests for `eventMode`, `eventTags`, the kinds and the new change builder cases; the web unit suite passed 150 tests and 2 todo.
- 2026-11-16: Playwright `event-hybrid.spec.ts` (3), `event-kind.spec.ts` (3) and `event-drafts.spec.ts` (5); all 37 tests of the events folder passed on Chromium.
- 2026-11-16: PG-8, Contribute opens the organization's Support dialog (`?support=1`) instead of a placeholder toast.
- 2026-11-16: PG-12, the full write-up takes bold, italic, links and lists (safe, no HTML), a live preview, and 4000 characters a paragraph.
- 2026-11-16: PG-11, event timezones (picker, pickers read in the event's zone, event's own clock with the viewer's beside it, email in the event's zone).
- 2026-11-16: API test `events-timezone.test.ts` (17) and two mailer tests; the API suite passed 18 suites and 386 tests.
- 2026-11-16: web unit tests for `eventTimezone`, `richText` and `RichText` plus new cases in the mapper, change builder and formatters; the web unit suite passed 196 tests and 2 todo.
- 2026-11-16: Playwright `event-contribute.spec.ts` (3), `event-timezone.spec.ts` (4) and a formatted write-up test; all 45 tests of the events folder passed on Chromium.
- 2026-11-16: the API tests' flaky `404`, `501` and timeouts fixed at the root: `buildTestApp()` now listens on 127.0.0.1 (see `apps/api/docs/specs/testing.md`).
- 2026-11-19: PG-4 and PG-14, access levels (open, approval required, invite only), registration statuses, the waitlist, approve and decline, email invitations, and the web side (form dropdown, labels, join states, Requests, Waitlist and Declined tabs, invite box, My Events pills); the retired `inviteOnly` flag reads as approval.
- 2026-11-19: API test `events-access.test.ts` (30); the API suite passed 19 suites and 418 tests.
- 2026-11-19: web unit tests for `joinView` and `parseInviteEmails` plus the access cases in the mapper and change builder; the web unit suite passed 235 tests and 2 todo.
- 2026-11-19: Playwright `event-access.spec.ts` (5) written but **not run**, and the older specs were updated for `access`; run the events folder once Tamal allows UI tests.
- 2026-11-19: S-6 decided (anonymous donations stay), and the decisions on hackathons, volunteering shifts and event payments recorded as out of scope.
- 2026-11-19: S-1 (cookie and set-cookie redacted from logs), O-1 (failed database connection is retried), DB-2 and DB-3 (event list indexes, checked by query-plan tests), S-3 (safe dependency updates in both lockfiles, zod 4 skipped), S-7 (found already fixed).
- 2026-11-19: API tests `logger.test.ts` (4), `database-gate.test.ts` (3) and `event-indexes.test.ts` (5); the API suite passed 22 suites and 430 tests.
