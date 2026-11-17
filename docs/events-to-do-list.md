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
Do not delete items.
Mark an item superseded and say what replaced it.

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
Not built: telling the people who joined (PG-18), and editing the long-form detail fields, which the create form cannot set either (PG-7).

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
Not built: emailing the people who joined (PG-18), reinstating, and deleting.

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
Status: needs decision. Priority: P1.
The invite-only flag is only a label.
The API refuses every join on an invite-only event with a 403, and nothing exists to invite or approve anyone.
Today nobody at all can join an invite-only event.
Options: remove the flag until it is real, or build invitations or an approval request.

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
Not done: `fundraiser`, which waits on the money decision (PG-26).

### PG-8 Contribute button does nothing
Status: done (2026-11-16). Priority: P3.
The Contribute button on the detail page only shows a "coming soon" message.
Decide whether it links to the existing organization donation flow.
Result (decided while building it, easy to change): it links to the hosting organization's existing Support flow.
Contribute goes to the organization's profile with `?support=1`, which opens the Razorpay "Support" dialog straight away when that organization has direct support on, and just shows the profile when it does not.
The helper line now says the money goes to the organization through its Support page, not to this event alone.
An event from an individual host (no organization link) shows no button, and the "coming soon" toast is gone.
Still open under PG-26: the panel's raised figure is not fed by any payment, and a fundraiser still cannot be set through the API.

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
There is no Hackathon kind, because whether hackathons are an event type is still decision 8 (PG-27).
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

### PG-13 No registration window and no registration questions
Status: open. Priority: P2.
Registration cannot open or close on a date, and an organizer cannot ask attendees anything when they join.
Fix: add optional registration open and close times, and a small set of custom questions with answers saved on the registration.

### PG-14 No waitlist and no approval step
Status: needs decision. Priority: P2.
Once capacity (PG-5) exists, a full event needs a waitlist, and some events need the organizer to approve each person.
This is the same decision as invite-only (PG-4).
Capacity (PG-5) now exists, so a full event refuses the next person with no waitlist.
Fix: design one registration state machine (pending, approved, waitlisted, declined) and use it for capacity, approval and invite-only together.

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

### PG-16 No clone event
Status: open. Priority: P3.
An organization running the same drive every month retypes everything.
Eventbrite lets organizers copy details from a past event.
Fix: add a "Duplicate event" action that prefills the form with a new date and a new page address.

### PG-17 One owner only, no co-hosts or roles
Status: open. Priority: P3.
Only the organization owner can create or manage events.
Luma has co-hosts, DoraHacks has multiple admins and Eventbrite has team permissions.
Fix: decide whether organization members (the `members` array already exists) can manage events, and with which roles.

### PG-18 No announcements, reminders or change notices
Status: open. Priority: P2.
The only email is the join confirmation, and only in production.
There is no reminder before the event, no email when an event changes or is cancelled, no message from organizer to attendees, and no notice to the organizer when someone joins.
Fix: add reminders and change or cancel notices first, then organizer announcements.
This builds on PG-6 and the confirmation email work in O-6.
The organizer already gets one email per new registration (PG-6, production only); attendees still get nothing about changes.

### PG-19 No add to calendar
Status: open. Priority: P2.
A search of the web code found no calendar export.
Luma, Eventbrite and Meetup all offer one.
Fix: add an `.ics` download and an "Add to Google Calendar" link on the detail page and in the confirmation email.

### PG-20 No search-engine event markup
Status: open. Priority: P2.
A search of the web code found no structured event data.
Google reads event name, dates, location, status and attendance mode from that markup to show events in search.
Fix: add event markup to the detail page, and make sure what it states is visible on the page.
This needs the status from PG-15 and the mode from PG-10, both of which now exist; only published and cancelled events should get markup, never a draft.

### PG-21 Discovery filters are limited
Status: open. Priority: P3.
The directory has search, Upcoming or Past, and one combined type filter.
It cannot filter by event type (PG-9), cause, city or date range, and filters cannot be combined.
Fix: add those filters and make them combinable, after PG-9.
Update 2026-11-16: PG-9 is done and the directory now has a separate "Filter by kind" dropdown that combines with the others and with search; cause, city and date range are still missing.

### PG-22 No recurring or multi-session events
Status: open. Priority: P3.
A weekly class or a series needs one event per date today.
Eventbrite, Meetup and Galaxy Digital support repeating events or shifts.
Fix: decide whether a series is one event with many dates or many linked events.

### PG-23 No accessibility, dietary or safeguarding information
Status: open. Priority: P2.
An organizer cannot say whether the venue is step-free, whether there is a quiet space or sign language, or how to ask for an accommodation.
Registration cannot collect dietary needs.
An event with minors has no consent or safeguarding step.
Only a minimum age field exists on the model, and the create form cannot set it.
Fix: add optional accessibility fields to the form and detail page, a dietary question (see PG-13), and a minors rule once the decision is made.

### PG-24 No volunteer roles or shifts
Status: needs decision. Priority: P2.
Most KarmaCircle events are drives and community work, but an event has only one kind of attendee.
Galaxy Digital and Better Impact let organizers define roles and shifts with slot counts, and let volunteers sign up and drop.
Fix: decide whether volunteering is a feature of an event (roles with slots) or a separate opportunity type.

### PG-25 No waivers, hours tracking or certificates
Status: open. Priority: P3.
Volunteer tools store signed waivers, log hours and export impact reports.
Unstop and Devfolio give certificates.
Fix: after PG-6 (check-in) and PG-24, record hours per attendee and offer a certificate or hours export.

### PG-26 No paid or donation tickets, and the fundraiser cannot be set
Status: needs decision. Priority: P3.
Update 2026-11-16: the form can now set a fee (`cost`, PG-7), but it is only shown on the page: nothing collects the money, and the `fundraiser` fields still cannot be set.
Every event is free to join in practice, and the create form cannot set the `fundraiser` field that the detail page can show.
Eventbrite supports free, paid and donation tickets, and Zeffy and Givebutter put donations, auctions and raffles on the event page.
Fix: decide whether events take money, then wire the fields, the Contribute button (PG-8) and the existing organization Support payment flow together.

### PG-27 Hackathon-style events do not exist
Status: needs decision. Priority: P3.
There are no tracks, prizes, problem statements, team size limits, teams, project submissions, judging, winners, voting or certificates.
Devfolio, HackQuest, DoraHacks and Devpost all provide these.
This is a large module of its own and most NGO events will not need it.
Fix: decide first whether hackathons are an event type here.
If yes, start with PG-9 and PG-13, then tracks and teams, then submissions, then judging.

### PG-28 Organizer analytics are counts only
Status: open. Priority: P3.
The dashboard shows registration totals.
It does not show event page views, registrations over time, or where visitors came from.
Luma and Devfolio both show more.
Fix: record event page views and show a per-event chart.

### PG-29 No code of conduct or reporting path
Status: open. Priority: P3.
MLH requires events to publish a code of conduct, ask registrants to agree, and have a way to report incidents.
Fix: add an optional code of conduct link and agreement checkbox, and a report route.

### PG-30 No speakers, sponsors, FAQ, links or gallery on the event page
Status: open. Priority: P3.
An event has one cover image and the text fields above.
It cannot list speakers or judges, sponsors or partners, a FAQ, social or website links, or more photos.
Fix: add these as optional sections that stay hidden when empty, like the existing detail sections.

### PG-31 No option to register on another site
Status: open. Priority: P3.
An organizer who already sells tickets or collects sign-ups elsewhere cannot point the Join button at that link.
Fix: add an optional external registration link that replaces the Join panel.

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

### CH-5 Loose `EventRecord` type
Status: open. Priority: P3.
`EventRecord` has an open index signature and is still used by the organization events list and the detail mapper.
Replace it with the precise `ApiEvent` type and remove the loose one.

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

### T-6 No coverage threshold
Status: open. Priority: P3.
The API Jest config has no coverage report or minimum.
Add a coverage report, then a threshold per module once a baseline is known.

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

### UI-6 Design system conformity
Status: open. Priority: P3.
Check the new form and panels against `docs/specs/design-system/README.md`: tokens, radii, shadows, shared components.

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

### V-7 Online platform is free text
Status: open. Priority: P3.
The browser offers a fixed list, but the API accepts any string.
Decide whether to enforce the list.

### V-8 Response shape differs from other routes
Status: open. Priority: P3.
Create returns `message` plus `savedEvent`, unlike other modules.
Keep as is, or standardize with a note in the API contract.

## 6. Database (MongoDB)

### DB-1 Cover images are stored inside the event document
Status: open. Priority: P1.
The browser sends the image as a text string and it is saved in the event record.
The public list returns whole records, so every cover image travels in the list response.
With 100 events at a few megabytes each, one page load could be hundreds of megabytes.
Fix: upload images to object storage, save only a link on the event, and validate type and size on upload.
Short-term: stop returning the cover string in the list and serve it separately.

### DB-2 The event list has no fixed order
Status: open. Priority: P1.
The list query uses skip and limit with no sort.
Without a sort, MongoDB does not guarantee a stable order, so pages can repeat or skip events.
Fix: sort by start time with the id as a tiebreaker, and add a matching index.
Partly done 2026-11-04: `GET /events` now sorts by start time with the id as tiebreaker (see CH-6), so pages no longer repeat or skip events.
The matching index is still missing, so this item stays open until DB-3 adds it.

### DB-3 Missing indexes
Status: open. Priority: P1.
The host filter matches on `hostUsername` or `organizerHandle`, but only `organizerHandle` is indexed.
The `$or` therefore falls back to scanning the collection.
`startTime` is used for upcoming and past and has no index.
Fix: index `hostUsername`, index `startTime`, and consider a compound index with the host.
The separate `eventUid` index on registrations is redundant with the unique pair index and can be dropped.

### DB-4 Fetching all of a user's registrations at once
Status: open. Priority: P3.
My Events loads every registration id for the user and then queries events with `$in`.
This is fine today and will slow down for very active users.
Fix: switch to an aggregation with a lookup, with paging applied in the database.

### DB-5 Events and registrations have no link by id
Status: open. Priority: P3.
Registrations link to the event by its text address, not by its id.
This works while addresses never change.
PG-1 shipped with the address locked (the edit route rejects `uid`), so it holds today.
Decide whether the address becomes permanent for good, or registrations point at the event id, before anything lets an address change.

### DB-6 Username uniqueness is not enforced by the database
Status: open. Priority: P2.
The user name has a plain index, not a unique one, so a race can create duplicates.
Events rely on the organization handle derived from it.
Fix: make it unique after cleaning existing data.

### DB-7 No data migrations
Status: open. Priority: P3.
Older events were handled by a fallback match instead of a migration.
Decide on a small migration tool so the fallback can be removed.

## 7. Backend security

### S-1 Session cookie is written to the logs
Status: done (2026-11-17). Priority: P1.
The request logger prints all request headers, including the cookie that holds the login token.
Anyone with log access could copy a valid session.
Fix: configure the logger to remove the cookie and authorization headers.
Result: `config/logger.ts` now redacts the request `cookie`, `authorization` and `proxy-authorization` headers and the response `set-cookie` header (shown as `[Redacted]`).
Sessions already written to old logs are not covered: log retention and rotating `JWT_SECRET` or bumping `tokenVersion` are separate steps if those logs were ever shared.

### S-2 Rate limits do not work across servers
Status: open. Priority: P1.
The limiter keeps its counts in memory on each server instance.
On Vercel, many instances run at once and each starts at zero, so the limit is easy to bypass.
Fix: use a shared store such as Redis or a database-backed counter, at least for sign-in and password reset.

### S-3 Known vulnerable packages
Status: open. Priority: P1.
A production dependency audit on 2026-11-04 found 1 critical, 12 high, 18 moderate and 4 low issues.
The critical one is in `proxy-addr`, which affects how the client address is read, and the rate limiter and trusted proxy setting depend on it.
Others include `compression`, `body-parser`, `zod`, `follow-redirects`, `qs` and `fast-uri`.
GitHub also reports 165 issues across the whole repo, including development tools.
Fix: update the packages, rerun the audit, and add the audit to CI.

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
Status: needs decision. Priority: P2.
Creating a donation order and verifying a payment do not need sign-in.
This may be intended for anonymous donations.
Confirm it, and keep the signature check strict.
The signature check itself is present.

### S-7 Cart add trusts an email from the request
Status: open. Priority: P1.
This is the access gap already listed in the API known issues.
It is not events code, but it is the most serious access problem in the backend.

### S-8 Per-request database read for sign-in checks
Status: open. Priority: P3.
Each authenticated request reads the user to check the token version.
This is a deliberate choice so sessions can be revoked.
It is fine now and can be cached briefly if traffic grows.

### S-9 Reports route is open and only globally rate limited
Status: open. Priority: P3.
Anyone can submit a report without signing in.
Add a stricter limit or a simple bot check.

## 8. Backend scalability and operations

### O-1 A failed first database connection is remembered
Status: open. Priority: P1.
The serverless handler stores the connection attempt once and never clears it.
If the first attempt fails, every later request on that instance fails until it restarts.
Fix: clear the stored attempt when it fails so the next request retries.

### O-2 Unbounded work in some queries
Status: open. Priority: P2.
CH-6 is done, so the events directory now loads 12 at a time and the API list is capped at 100 per page; DB-4 remains.
Add a hard maximum page size everywhere, which exists for events at 100.

### O-3 No connection settings
Status: open. Priority: P3.
The database connection uses defaults.
Set pool size and timeouts explicitly, which matters most on serverless.

### O-4 Shutdown does not close the database
Status: open. Priority: P3.
Graceful shutdown stops the server but does not close the MongoDB connection.

### O-5 No monitoring of errors
Status: open. Priority: P2.
Errors are logged but there is no alerting or error tracking.
Add error tracking and a health check that reports real database status to an uptime monitor.

### O-6 Confirmation email is production-only and best-effort
Status: open. Priority: P3.
A failed email is logged and not retried.
Decide whether to queue and retry.

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

### D-3 Document the backend audit
Status: open. Priority: P3.
Add the database and security findings above to the API known issues, so they survive outside this file.

## 10. Decisions needed from Tamal

1. Invite-only: remove the flag until it is real, or build invitations (PG-4).
2. Decided 2026-11-16 while Tamal was away, please confirm: a cancelled event stays visible with a badge, and there is no delete (PG-2).
3. Decided 2026-11-04: past start dates are not allowed (V-2).
4. Marquee cards: wire to live data or delete (CH-4).
5. Anonymous donations: intended or not (S-6).
6. Cover images: move to object storage now, or ship the short-term fix first (DB-1).
7. Added 2026-11-16: waitlist and approval share one registration design with invite-only (PG-14 and PG-4).
8. Added 2026-11-16: are hackathons an event type on KarmaCircle, or out of scope (PG-27).
9. Added 2026-11-16: is volunteering a role-and-shift feature of an event, or a separate opportunity type (PG-24).
10. Added 2026-11-16: do events take money, through tickets or donations (PG-26).

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
- 2026-11-17: S-1, the request logger redacts the cookie, authorization and set-cookie headers; new `tests/logger.test.ts` (3 tests) fails without the redaction. Run on its own without MongoDB (the Mongo binary download is blocked in this sandbox); the full API suite was not run.
