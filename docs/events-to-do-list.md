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
Status: open. Priority: P1.
Organizers cannot change an event after it is published.
A typo in the title, date or place can only be fixed by editing the database by hand.
The API has no update route, and the frontend has no edit page.
Fix: add an authenticated update route that only the owning organization can call, reuse the create validation, and add an edit mode to the full-page form.

### PG-2 Cancel or delete an event
Status: open. Priority: P1.
There is no way to cancel or remove an event.
Decide first whether "cancel" keeps the event visible with a cancelled badge, or removes it.
People who already registered need to be told, which links to the email work in PG-6.

### PG-3 Leave an event (undo a registration)
Status: open. Priority: P2.
An attendee who joined cannot un-join.
There is no leave route and no button.
The registration table already has a unique rule per person and event, so a delete route is simple.

### PG-4 Invite-only events do not work end to end
Status: needs decision. Priority: P1.
The invite-only flag is only a label.
The API refuses every join on an invite-only event with a 403, and nothing exists to invite or approve anyone.
Today nobody at all can join an invite-only event.
Options: remove the flag until it is real, or build invitations or an approval request.

### PG-5 Capacity and spots left
Status: open. Priority: P2.
An organizer cannot set a maximum number of attendees, and the page cannot show spots left.
Registrations are stored separately and nothing totals them per event for the public.
This needs a capacity field on the event and an atomic check when joining so two people cannot take the last spot together.

### PG-6 Organizer attendee list and check-in
Status: open. Priority: P2.
Organizers see only a registration count on the dashboard.
There is no attendee list, no check-in on the day, and no notification to the organizer when someone joins.
This is already drawn as "proposed" in the Miro data-flow frame.

### PG-7 The create form cannot collect the rich details
Status: open. Priority: P1.
The detail page can show about text, agenda, what to bring, directions, link delivery, join requirements, cost, fundraiser, languages, minimum age and contact email.
The create form and the create API accept none of these.
Only the demo-data script can fill them, so real events look thinner than the design.
Fix: extend the Zod create schema and the form in small groups, starting with about text, contact email and cost.
The government-sponsored badge must stay server-only.

### PG-8 Contribute button does nothing
Status: open. Priority: P3.
The Contribute button on the detail page only shows a "coming soon" message.
Decide whether it links to the existing organization donation flow.

## 2. Code health (dead code and structure)

### CH-1 Delete the retired `CreateEvent.tsx`
Status: open. Priority: P1.
`apps/web/src/features/events/components/CreateEvent.tsx` is 509 lines and not mounted anywhere.
It looks like an event form but saves to the user profile route, and several address fields are bound to the wrong keys.
It exists only as a trap.
Fix: delete it together with the `CreateEventCredentials` type, then update the events specs and the Miro "retired" note.

### CH-2 Delete the empty `HostedEvents.tsx`
Status: open. Priority: P1.
The file is 0 bytes and nothing imports it.

### CH-3 Remove or wire `services/Events.ts`
Status: open. Priority: P2.
The feature-level service is not used by any routed page.
All live calls go through `services/KarmaCircleApi.ts`.
Remove it, or move the live calls into it, so there is one place for event API calls.

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
Status: open. Priority: P2.
`/events` fetches up to 100 events and filters them in the browser.
Past 100 events, extra events silently never appear.
Fix: move search and the upcoming or past split to the API with real pagination.

### CH-7 Duplicate-address race on create
Status: open. Priority: P2.
Create checks whether the page address exists and then saves.
Two organizers submitting the same address at the same moment can both pass the check.
The database already has a unique index, so the fix is to rely on it and turn error code 11000 into a friendly 409 for this route.
Also listed in the API known issues.

## 3. Testing

### T-1 API tests missing for join rules
Status: open. Priority: P1.
Covered today: create, list, host filter, validation, join happy path, duplicate join, registration check, and a non-organization creating.
Missing: joining an invite-only event returns 403.
Missing: joining an event that already started returns 409.
Missing: joining an unknown event returns 404.
Missing: the registration check for an unknown event returns 404.

### T-2 API tests missing for My Events
Status: open. Priority: P2.
Missing: the upcoming and past period filter and its sort order.
Missing: pagination on `/events/mine`.
Missing: another user's registrations never appear.

### T-3 No browser tests for the attendee journey
Status: open. Priority: P1.
Covered today: directory filters, search, responsive layout, and an organization publishing an in-person event.
Missing: opening the detail page, joining, the "You are going" state, My Events, the invite-only state, and the past-event state.

### T-4 No test for online event publishing in the browser
Status: open. Priority: P2.
The publish test covers an in-person event.
Add the online path with platform and meeting link, including a bad link.

### T-5 No frontend unit tests
Status: open. Priority: P2.
Pure helpers such as the date, duration and funded-percent helpers have no unit tests.
Add a small unit test setup for pure functions.

### T-6 No coverage threshold
Status: open. Priority: P3.
The API Jest config has no coverage report or minimum.
Add a coverage report, then a threshold per module once a baseline is known.

### T-7 API tests were not run in the last audit
Status: open. Priority: P1.
Run `pnpm --filter karmacircle-api test` and record the result here.

## 4. UI audit

Status of the whole section: not yet audited visually.
No pages were opened in a browser during the audit, because UI testing needs Tamal's go-ahead.
Say plainly that visual review is still pending until it is done.

### UI-1 Visual review of the three event pages
Status: open. Priority: P1.
Review the create form, the event detail page, and My Events in a browser, once Tamal says to test the UI.

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
Status: open. Priority: P1.
Only the browser checks that the end is after the start.
A direct call to the API can create an event that ends before it starts.
Fix: add the check to the create schema.

### V-2 Past start dates are accepted
Status: open. Priority: P2.
The API accepts an event that starts in the past.
Decide whether that is allowed, for example to log a past drive, and enforce it either way.

### V-3 Name and description length only checked in the browser
Status: open. Priority: P1.
The browser requires name 10 to 80 characters and description 20 to 200.
The API only requires not empty, so one call can store a huge description.
Fix: mirror the limits in the Zod schema.

### V-4 Cover image is not really validated
Status: open. Priority: P1.
The API only requires a non-empty string and relies on the global 10 MB body limit.
Fix: accept only an image data URL of a known type with a size cap, or an https link, and reject anything else.
See also DB-1 and S-4 for why this matters.

### V-5 Reserved page addresses
Status: open. Priority: P2.
An event whose address is `mine` would clash with the `/events/mine` page, and similar words can clash with future routes.
Fix: reject a small list of reserved words in the address rule on both sides.

### V-6 Free-text fields have no length limits
Status: open. Priority: P2.
City, state, country, address, platform and the meeting link have no maximum length.
Add sensible maximums.

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
This works while addresses never change, which PG-1 may change.
Decide whether the address becomes permanent, or registrations point at the event id.

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
Status: open. Priority: P1.
The request logger prints all request headers, including the cookie that holds the login token.
Anyone with log access could copy a valid session.
Fix: configure the logger to remove the cookie and authorization headers.

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
See CH-6 and DB-4.
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

### D-2 Keep specs in step
Status: open. Priority: P2.
Every item here changes at least one of: `apps/web/src/features/events/SPEC.md`, `docs/specs/events.md`, `apps/api/docs/specs/events.md`, `apps/api/docs/specs/api-contract.md`, and the known-issues files.
Update them in the same change.

### D-3 Document the backend audit
Status: open. Priority: P3.
Add the database and security findings above to the API known issues, so they survive outside this file.

## 10. Decisions needed from Tamal

1. Invite-only: remove the flag until it is real, or build invitations (PG-4).
2. Cancel: keep a cancelled event visible, or remove it (PG-2).
3. Past start dates: allowed or not (V-2).
4. Marquee cards: wire to live data or delete (CH-4).
5. Anonymous donations: intended or not (S-6).
6. Cover images: move to object storage now, or ship the short-term fix first (DB-1).

## 11. Done

- 2026-11-04: events folder imports now use the `@features/events/...` and `@utils/...` aliases instead of `../../` paths.
- 2026-11-04: `formatMoney` and `fundedPercent` moved to the shared `apps/web/src/utils/formatMoney.ts`.
- 2026-11-04: corrected the events spec sentence that said the create form had no browser test.
- 2026-11-04: Miro Events section split into three frames (inputs, data flow, discover and follow up).
