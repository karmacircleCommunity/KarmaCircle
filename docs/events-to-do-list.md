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

1. Testing
2. UI audit
3. Database (MongoDB)
4. Backend security
5. Backend scalability and operations
6. Docs and diagrams
7. Decisions needed from Tamal
8. Done

On 2026-11-23 Tamal had the sections for product gaps (PG items), code health (CH items) and backend API validation (V items) deleted, because every item in them was done.
Their IDs now survive only in the Decisions and Done sections, and the specs hold the detail.

## 1. Testing

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
Superseded 2026-11-26: the visitor is sent to sign in and brought back to the event; `event-attendee-states.spec.ts` covers it and has not been run yet.

### T-4 No test for online event publishing in the browser
Status: done (2026-11-16). Priority: P2.
The publish test covers an in-person event.
Add the online path with platform and meeting link, including a bad link.
Result: `apps/web/e2e/events/online-event-publishing.spec.ts` has 2 tests (platform and link errors with nothing published, then a successful publish, plus the default platform and the Online type filter).
Run on 2026-11-16: both pass on Chromium, Firefox and WebKit.
One needed its hosted-list link anchored (`^<name>`) after the Edit link was added.
The tests keep the form's default start (one hour from now), so they can fail within an hour of local midnight.
Superseded 2026-11-26: the default start is now a day and an hour from now, so that midnight risk is gone.

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
Status: done (2026-11-23). Priority: P3.
`formatDuration` returned "NaN days" for an unreadable date, and `fundedPercent` could go negative or NaN.
Result: `formatDuration` now returns "Duration unknown", and `fundedPercent` is clamped to 0-100 and returns 0 for a negative or NaN value.
Decided: `isEventPast` keeps treating an unreadable date as not past, and the test now says so.
The `it.todo` became real tests; the unit suite passes 244 of 244.

### T-9 The existing responsive spec posts events the API now rejects
Status: done (2026-11-16). Priority: P1.
`apps/web/e2e/events/events-responsive.spec.ts` builds events through `POST /events/create` with an end time equal to the start time, and one of them in the past.
The create rules from V-1 and V-2 reject both, so three of its four tests (all but the UI publishing test) will fail on a real run.
Fix: create the events in the future with an end after the start, and move the past one into the past with the E2E-only backdate route (`apps/api/tests/e2e/test-routes.ts`).
Result: the spec now creates every event in the future with an end two hours after the start and backdates the past one through the E2E-only route.
All four of its tests pass on Chromium, Firefox and WebKit.

### T-10 Two browser tests time out when all three browsers run at once
Status: done (2026-11-23), not reproduced. Priority: P3.
A three-browser run on 2026-11-16 passed 76 of 78, with two timeouts that looked like CPU load.
On 2026-11-23 the whole events folder (50 tests, 150 results) was run on Chromium, Firefox and WebKit with the output saved.
Neither of the two earlier tests failed.
Thirteen other results failed, and none of them was a timeout:
- A real bug: My Events showed "You're going" on every card, even for a pending request, a waitlist place or a declined request. It now shows the person's own standing (Requested, Waitlisted, Not approved).
- Three stale test expectations in the first run of `event-access.spec.ts` and `event-attendees.spec.ts` (the registration status reply now has `status` and `invited`, the capacity message now says "already going", and "On the waitlist" also matched a toast).
- Two one-off Chromium failures (a page load aborted, and a sign-up field slow to appear) that did not come back on the rerun, so they look like load, as the original item guessed.
Rerun after the fixes: both files pass on all three browsers (33 of 33), and every other spec had already passed.
No timeout or worker change was made, because nothing needed it.

## 2. UI audit

Status of the whole section: not yet audited visually.
No pages were opened in a browser during the audit, because UI testing needs Tamal's go-ahead.
Say plainly that visual review is still pending until it is done.

### UI-1 Visual review of the three event pages
Status: open. Priority: P1.
Review the create form, the event detail page, and My Events in a browser, once Tamal says to test the UI.
The 2026-11-26 additions (draft and publishing note, join note dialog, "Happening now", Invited tab, publish refusal row) have not been reviewed in a browser.
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
Check keyboard use of the create form, the mode choice, the filters panel, focus order, focus after a failed submit, and color contrast on the badges.

### UI-5 Cover image handling
Status: open. Priority: P2.
The form reads the image as a base64 string up to 5 MB.
Superseded by DB-1: the image is uploaded to object storage when it is picked, still up to 5 MB.
Check the preview, the slow-network behavior, and what is shown when the image is very tall or very small.

## 3. Database (MongoDB)

### DB-1 Cover images are stored inside the event document
Status: done (2026-11-23). Priority: P1.
The browser sent the image as a text string and it was saved in the event record, so the public list returned every cover image in every response.
Decided with Tamal on 2026-11-19: the long-term fix, real object storage.
Result: the cover is uploaded as soon as it is chosen, straight from the browser to Vercel Blob with a short-lived token from the API (`POST /uploads/event-covers`), and the event keeps only the https link.
The API now refuses a base64 cover and the JSON body limit dropped from 10 MB to 1 MB (this also closes S-4).
Local development and the test suites need nothing: with no Blob token the API writes uploads to `apps/api/.uploads` and serves them itself.
`scripts/migrate-event-covers.ts` moves existing data-URL covers to Blob (`--dry-run` to look, `--confirm` to do it).
Checked 2026-11-23 through the Vercel connection: both `karmacircle-api` and `karmacircle-api-dev` already have their own Blob store with `BLOB_READ_WRITE_TOKEN` and `BLOB_STORE_ID` set (added 2026-11-19, so every deploy since includes them), and the upload route answers `401` when signed out in production, so it is deployed.
The migration is not needed: production has no events yet, and the dev site's 23 events hold no inline images.
Verified live on 2026-11-23: both Blob stores are set to Public in the Vercel dashboard, and picking a cover on the production create form uploaded it to the production store (the form then held the `https://...public.blob.vercel-storage.com/event-covers/...png` link, which answers `200 image/png` with the exact file size).
The form was not saved, so no test event exists.

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
Status: done (2026-11-23). Priority: P2.
The user name has a plain index, not a unique one, so a race can create duplicates.
Events rely on the organization handle derived from it.
Fix: make it unique after cleaning existing data.
Done: the field is `unique: true`. Not checked: whether production already holds two users with the same name; if it does, MongoDB cannot build the index and the app keeps running without it, so look at the logs for an index error after the next deploy.

## 4. Backend security

### S-1 Session cookie is written to the logs
Status: done (2026-11-19). Priority: P1.
The request logger printed all request headers, including the cookie that holds the login token, so anyone with log access could copy a valid session.
Result: the logger redacts the `Cookie` and `Authorization` request headers and the `Set-Cookie` response header (`REDACTED_LOG_PATHS` in `apps/api/src/config/logger.ts`), tested against the real `pino-http` output in `tests/logger.test.ts`.
Logs written before this fix may still hold session tokens; sessions can be revoked by bumping the token version if that matters.

### S-2 Rate limits do not work across servers
Status: done (2026-11-23). Priority: P1.
The limiter keeps its counts in memory on each server instance.
On Vercel, many instances run at once and each starts at zero, so the limit is easy to bypass.
Fix: use a shared store such as Redis or a database-backed counter, at least for sign-in and password reset.
Done: a small MongoDB-backed store (`mongo-rate-limit-store.ts`) for the auth limiter only. The general 300-per-15-minutes limiter stays in memory on purpose, and if the database cannot be reached the request is let through.

### S-3 Known vulnerable packages
Status: partly done (2026-11-19). Priority: P1.
A dependency audit on 2026-11-04 found 1 critical, 12 high, 18 moderate and 4 low issues in the API, and GitHub counts 170 across the whole repo, mostly development tools.
Result for the API: every fix that does not need a breaking upgrade is applied in both lockfiles (`apps/api/package-lock.json` and the root `pnpm-lock.yaml`, which CI uses): express and proxy-addr, compression, body-parser, mongoose, axios, qs, follow-redirects, fast-uri (held at a safe version by an override in `pnpm-workspace.yaml`), ip-address and a few more.
What is left: `zod` 3 to 4 is a breaking upgrade that touches every schema in the API, skipped on purpose (the flaw is memory use on huge arrays).
The remaining critical `tar` and the npm tooling flaws live inside `semantic-release`'s bundled `npm`, which is development-only and never ships with the API.
`apps/web` was not touched, and `vite` in the web app has open advisories of its own.
`npm audit` also does not run in CI yet.

### S-4 Large request bodies are accepted on every route
Status: done (2026-11-19). Priority: P2.
The JSON body limit was 10 MB for the whole API, because event covers travelled inside it.
Result: covers are uploaded to object storage (DB-1), so the limit is now 1 MB everywhere. A body over it answers `413` instead of a generic `500`.

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

## 5. Backend scalability and operations

### O-1 A failed first database connection is remembered
Status: done (2026-11-19). Priority: P1.
The serverless handler kept its first connection attempt for good, so one failed attempt broke every later request on that instance until it restarted.
Result: `createConnectionGate()` in `apps/api/src/config/database.ts` shares one attempt between concurrent requests and forgets it on failure, so the next request retries; the request that hit the failure gets `503`. Tested in `tests/database-gate.test.ts`.

### O-2 Unbounded work in some queries
Status: open. Priority: P2.
CH-6 is done, so the events directory now loads 12 at a time and the API list is capped at 100 per page.
Add a hard maximum page size everywhere, which exists for events at 100.

### O-5 No monitoring of errors
Status: done for the health check (2026-11-23); error tracking left out on purpose. Priority: P2.
Errors are logged but there is no alerting or error tracking.
Add error tracking and a health check that reports real database status to an uptime monitor.
Done in part: the health check part only. Unhandled errors are still only logged (Vercel keeps them, readable under runtime logs); no error-tracking service was added, on purpose. To get alerts, point a free uptime monitor at `https://api.karmacircle.org/health`.

## 6. Docs and diagrams

### D-1 Keep the Miro board in step
Status: done for this pass (2026-11-23); it is ongoing, so the rule stays. Priority: P3.
The Miro "Claude Dashboard" board has three Events frames: inputs, data flow, and discover, join and follow up.
When any item above ships, update the matching frame.
2026-11-23 pass (Miro reconnected as the board owner, so the earlier permission block is gone):
- Inputs: the table now lists cover as an uploaded link, the access level, waitlist and maximum attendees, Hybrid mode, and the optional details section; the retired `CreateEvent.tsx` boxes became "Draft or publish".
- Data flow: the cover step says it uploads to storage on pick, and the attendee roster box is drawn as built.
- Discover and join: invite-only and approval are real states, the join step can request or waitlist, the saved registration can be going, pending or waitlisted, cancelled events show no Join, and a Leave event box was added.
Left as is: the roster box still has a dashed border (the Miro tool could not clear it), and the data-flow frame has no draft branch.

### D-2 Keep specs in step
Status: done for this pass (2026-11-23); it is ongoing, so the rule stays. Priority: P2.
Every item here changes at least one of: `apps/web/src/features/events/SPEC.md`, `docs/specs/events.md`, `apps/api/docs/specs/events.md`, `apps/api/docs/specs/api-contract.md`, and the known-issues files.
Update them in the same change.
2026-11-23 pass: every events route and every web API call appears in the specs, and every events Playwright spec is in its README. Fixed: four statements that still said attendee capacity was "future scope, not built" (and their broken links), and the API known-issues line that listed invite and approval, the waitlist, indexes and cover storage as open. Added the shared sign-in limiter to the API architecture spec.

## 7. Decisions needed from Tamal

1. Decided 2026-11-18 and built 2026-11-19: invite-only is a private-style event for invited emails, next to an Approval required level (PG-4).
2. Decided 2026-11-16 and confirmed by Tamal 2026-11-19: a cancelled event stays up with a Cancelled label (PG-2).
3. Decided 2026-11-04: past start dates are not allowed (V-2).
4. Decided 2026-11-23: marquee cards and `getFormattedDate.ts` are deleted (CH-4).
5. Decided 2026-11-19: anonymous donations stay as they are (S-6).
6. Decided 2026-11-19: cover images move to real object storage, the long-term fix (DB-1). Built and verified live on production.
7. Decided 2026-11-18 and built 2026-11-19: waitlist and approval share one registration state machine with invite-only; manual promotion (PG-14 and PG-4).
8. Decided 2026-11-19: hackathons are out of scope.
9. Decided 2026-11-19: volunteering roles and shifts are not an event feature.
10. Decided 2026-11-19: events do not take money through tickets or donations.
11. Decided and built 2026-11-23: a brand-new organization needs nothing beyond its account to host events. What Tamal meant was the "Finish your organization profile before publishing events" gate, not the event fields. The create, edit, Your events and attendee pages now pass `requireLive={false}` to `OrganizationSetupGate`, and Your events no longer waits for the profile to be live. The event form's own required fields are unchanged (superseded 2026-11-26: a draft now needs only the name, page address, format and dates, while publishing and saving a published event need everything). The dashboard still needs a finished profile.
12. Decided and built 2026-11-23: a one-off email when an organization signs up, saying it can host events now and that its public page stays a draft until it adds its details (`sendOrganizationSetupReminder`, production only, best effort). No repeat reminders and no scheduler, on purpose. Not sent for organizations created through Google sign-in. The organizer link on an event page still leads to a "Not found" page until the profile is live (see known issues).

## 8. Done

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
- 2026-11-19: Playwright `event-access.spec.ts` (5) written, and the older specs were updated for `access`; first run 2026-11-23 (see T-10).
- 2026-11-19: S-6 decided (anonymous donations stay), and the decisions on hackathons, volunteering shifts and event payments recorded as out of scope.
- 2026-11-19: S-1 (cookie and set-cookie redacted from logs), O-1 (failed database connection is retried), DB-2 and DB-3 (event list indexes, checked by query-plan tests), S-3 (safe dependency updates in both lockfiles, zod 4 skipped), S-7 (found already fixed).
- 2026-11-19: API tests `logger.test.ts` (4), `database-gate.test.ts` (3) and `event-indexes.test.ts` (5); the API suite passed 22 suites and 430 tests.
- 2026-11-19: DB-1 (code) and S-4: event covers are uploaded to object storage and the event keeps a link; JSON body limit is 1 MB. API tests `uploads.test.ts` (17) and `cover-migration.test.ts` (7); the API suite passed 24 suites and 450 tests, and the web unit suite 241 tests and 2 todo. Production setup and the one-time migration are Tamal's to do.
- 2026-11-19: decided that a cancelled event stays up with a Cancelled label (decision 2), and that cover images get the long-term fix (decision 6).
- 2026-11-23: DB-6 (unique user names in the database), S-2 (shared sign-in rate limit in MongoDB) and O-5 (`/health` answers 503 when the database is down; no error-tracking service added). API tests `rate-limit-store.test.ts` (4), `health.test.ts` (2) and a uniqueness test in `users.test.ts`; the API suite passed 26 suites and 457 tests.
- 2026-11-23: PG-19, add to calendar (Google Calendar link and `.ics` download on the event page). Web unit tests `calendarLinks.test.ts` (6); the web unit suite passed 247 tests and 2 todo. Not looked at in a browser yet, so UI-1 and UI-2 still cover it.
- 2026-11-23: CH-4, `EventsMarqueeCards.tsx`, `getFormattedDate.ts` and its test deleted (no route used them); the web unit suite passed 241 tests and 1 todo.
- 2026-11-23: T-8, the helper bugs fixed and the `it.todo` turned into tests.
- 2026-11-23: T-10, the whole events folder run on three browsers (150 results); a My Events label bug fixed (a request, waitlist place or decline no longer reads "You're going") and three stale test expectations corrected; all pass.
- 2026-11-23: DB-1 verified live: Blob stores are public and a real cover upload on production landed in the store.
- 2026-11-23: decision 11, a draft organization can now create and edit events, see Your events and open the attendee list; new Playwright spec `event-fresh-organization.spec.ts` (3 browsers pass).
- 2026-11-23: decision 12, the finish-your-details email on organization sign-up; API tests added, the API suite passed 26 suites and 462 tests.
- 2026-11-26: UI-1 and UI-2 partly done: the events list and one event page were reviewed in a browser at 320 to 2560px, and the tablet toolbar cut-off, the false "not found" on a failed load and the navbar menus were fixed. The create form and My Events are still not reviewed; open findings are in `docs/specs/known-issues.md`.
- 2026-11-26: the remaining events findings of that review were fixed: two-line card titles, text contrast, phone filters, loading, empty and error states, one time style and a solid join bar. The contrast part of UI-4 and the states part of UI-3 are covered for the list and event page only.
- 2026-11-26: meeting links only for the host or a going person; events are Completed by end time, with "Happening now" and Upcoming including running events; signed-out Join goes to sign-in and back; drafts need only name, address, format and dates (superseding full rules for drafts) while publishing needs everything; optional join note; Invited tab in My Events; emails for cancel, material edit, decline and new request (superseding no emails about edits and cancels). New Playwright specs are written but not yet run.
- 2026-11-28: the three directory filters moved behind one "Filters" button (glass dialog on wide screens, bottom sheet on phones, active count, "Clear all"), choices now take effect only on "Apply filters" as one request, old cards stay up while the answer loads, and the "That's all N events." line under the directory was removed. The panel then got a liquid glass surface, and long filter lists now show 8 options with "Show all" and a search box above 15. Web unit tests (399) and the five affected Playwright specs on Chromium (20 tests) passed; the latest look has not been checked by eye.
