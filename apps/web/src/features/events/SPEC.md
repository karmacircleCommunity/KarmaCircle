# Events — Feature Spec

Colocated, implementation-level companion to
[docs/specs/events.md](../../../../../docs/specs/events.md). The event feature
previously had two competing creation forms and neither organizer entry point
worked end to end. The organizer flow was repaired in November 2026: the shared
`CreateEvents` page is linked from the public directory and hosted-event
workspace, and the broken copy-pasted form (`CreateEvent.tsx`) was deleted in
November 2026 along with the empty `HostedEvents.tsx` and the unused
`services/Events.ts`.

## Event creation access

`Events.tsx` renders its creation link for Redux `isLoggedIn` organization
accounts. It does not inspect the HTTP-only `Token` cookie from browser
JavaScript. The Hosting view of My events (`HostedEvents.tsx`) is for organization
accounts only; the page's create link opens
`/organization/events/new`. That full-page route requires sign-in and uses
`OrganizationSetupGate` (`requireLive={false}`): it needs an organization account but not a finished profile, so a
brand-new organization can publish straight away (November 2026). Personal
accounts and signed-out visitors can browse
events but cannot open either creation entry point. The API also checks the
stored account type and returns `403` for individual hosts.
`e2e/events/events-responsive.spec.ts` covers live directory cards,
Upcoming/Past filtering, city search, mobile/desktop overflow, and publishing an
in-person event through the full-page form. `attendee-journey.spec.ts` (detail
page, join, My Events, invite-only, past event), `event-access.spec.ts`
(approval, waitlist and invitations),
`online-event-publishing.spec.ts` (online platform and meeting link) and
`event-management.spec.ts` (edit and cancel) were added in November 2026. All 15
specs passed on Chromium, Firefox and WebKit on 2026-11-16 (45 of 45), after
`events-responsive.spec.ts` was changed to seed future events that end after they
start and to backdate its past event. See
[e2e/events/README.md](../../../e2e/events/README.md).
`event-attendee-states.spec.ts` and `event-draft-minimum.spec.ts` were written on 2026-11-26, when `attendee-journey.spec.ts` and `event-access.spec.ts` were also changed; these have **not been run** since.

## What this feature is responsible for

The public `/events` directory and `/events/:eventId` detail page, attendee
registration and My Events, hosted-event listings, event display, and event
creation. The directory, detail, registration status, My Events, and
hosted-event pages read real API data. Both organization event-creation entry
points navigate to `/organization/events/new`, which submits through
`POST /events/create`. Organizations can edit an event (`PATCH /events/:uid`) and
cancel it (`POST /events/:uid/cancel`) from `/events/mine?tab=hosting`, set a capacity
and the optional details in the form, and see who is coming, check people in and
download the list at `/organization/events/:eventId/attendees` (November 2026).
Attendees can leave an event they joined. The organization dashboard still shows
only aggregate and per-event registration totals.

## Why it's shaped this way

`CreateEvent.tsx` was copied from profile editing and called
`PATCH /user/update`; it was deleted in November 2026, so it cannot be
reconnected by mistake. The purpose-built `CreateEvents.tsx` page is the sole
event-creation flow. The directory and hosted-event workspace link to
`/organization/events/new`. The feature has no `services/` folder: every event
write goes through `src/services/KarmaCircleApi.ts` (`CreateEvent`, `UpdateEvent`, `CancelEvent`, `JoinEvent`, `LeaveEvent`, `SetAttendeeCheckIn`, `FetchAttendeesCsv`)
and every read goes through `useSWR` with `eventEndpoints` from
`src/services/ApiEndpoints.ts`.

## File manifest

| File                                | Role                                                                                                                                                                                                                                      | Live?                                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/Events.tsx`                  | The `/events` page                                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events` (September 2026)                                                                                                                                                    |
| `components/HostedEvents.tsx` | My events' Hosting view: the organization's own events in Upcoming, Past and Drafts lists, with their actions | ✅ used by `MyEvents.tsx`, renders **live data** via `GET /events?host={handle}` |
| `components/AttendingEvents.tsx` | My events' Attending view: Upcoming, Past and Invited lists | ✅ used by `MyEvents.tsx` |
| `components/MyEventsTabs.tsx` | Keyboard-usable tab list for both switches of My events | ✅ used by `MyEvents.tsx`, `AttendingEvents.tsx` and `HostedEvents.tsx` |
| `utils/joinedMessage.ts` | The toast after a join; warns about email only when a send failed | ✅ used by `DetailedEvent.tsx` |
| `pages/MyEvents.tsx` | The `/events/mine` page: the Attending view for everyone, plus a Hosting view for organization accounts (2026-11-27; `/organization/events` redirects here) | ✅ routed, renders **live data** |
| `pages/DetailedEvent.tsx`           | The `/events/:eventId` detail page                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events?uid={id}` (September 2026 — see below)                                                                                                                               |
| `components/detail/`                | The nine pieces that page composes — `EventHero`, `EventFacts`, `EventCalendarLinks` (PG-19), `EventAgenda`, `EventLocationPanel`, `EventJoinPanel`, `EventMobileActionBar`, `EventFundraiserPanel`, `EventSection`                                                    | ✅ rendered by `DetailedEvent.tsx` only                                                                                                                                                                                |
| `utils/toDisplayEventDetail.ts`     | Maps a live `ApiEvent` onto the `{ event, detail }` shape `DetailedEvent.tsx` renders                                                                                                                                                     | ✅ used by `DetailedEvent.tsx`                                                                                                                                                                                         |
| `utils/formatEventFacts.ts`         | `formatEventDate`/`formatEventBadge`/`formatEventTime` plus duration, maps-URL and `eventPhase` helpers - one home for "format an event" (the first three moved here from the now-deleted `constants/eventDirectory.ts` fixture). Money helpers (`formatMoney`, `fundedPercent`) live in the shared `@utils/formatMoney`, not here | ✅ used across `EventCard`, the detail components, My Events and the organization profile's events list                                                                                                                 |
| `components/CreateEvents.tsx`       | Responsive full-page event creation flow with preview                                                                                                                                                                                     | ✅ routed at `/organization/events/new`                                                                                                                                                                                |
| `pages/EditEvent.tsx` | The `/organization/events/:eventId/edit` page (November 2026, PG-1): loads the stored event, checks the signed-in organization hosts it, shows an explanation for a missing, foreign, cancelled, ended or expired-draft event, or a retry for a failed load, otherwise renders `EventForm` filled in | ✅ routed behind `RequireSignIn` |
| `components/CancelEventDialog.tsx` | Confirmation before cancelling an event (November 2026, PG-2): a native `<dialog>` opened with `showModal()`, "Keep event" focused first | ✅ used by `HostedEvents.tsx` |
| `hooks/useEventSnapshot.ts` | One fetch of an event per page visit, keyed on the viewer, then held still; `replace` is the only change; returns `event`, `loadedAt`, `error`, `isLoading`, `retry`. Deliberately not `useSWR`: the shared `byUid` cache could hand a form an older copy | ✅ used by `EditEvent.tsx` |
| `utils/editEvent.ts` | `isMissingEvent` and `editBlocker` (foreign, cancelled, ended or draft-expired, judged at the load time) | ✅ used by `EditEvent.tsx` |
| `utils/eventToFormState.ts` | Turns a stored `ApiEvent` into the form's starting values for editing | ✅ used by `EditEvent.tsx` |
| `utils/buildEventChanges.ts` | Diffs the form against the stored event into the `PATCH /events/:uid` body (only changed fields; cover only if replaced; a start left alone is not re-sent; location fields travel as a group; an emptied description or location field goes as `null`). Also `buildCreatePayload`, the `POST /events/create` body (only filled-in fields) | ✅ used by `useEvent.ts` |
| `pages/EventAttendees.tsx` | The `/organization/events/:eventId/attendees` page (November 2026, PG-6): totals, search, per-person check-in toggle, CSV download, load more (50 per page); host only | ✅ routed behind `RequireSignIn` |
| `components/EventInvitePanel.tsx` | The "Invite people" box on the attendee page (November 2026, PG-4): emails typed, sent to `POST /events/:uid/invites`, list of invitations with remove for unused ones; closed (list read only) once the event has started | ✅ used by `EventAttendees.tsx` for approval and invite-only events |
| `utils/joinView.ts` | `joinView(event, registration)` and `leaveLabel`: the one place that decides what the join controls offer (PG-4, PG-14); unit tested | ✅ used by `DetailedEvent.tsx` and both join controls |
| `utils/validateEvent.ts` | `validateEventForm` in draft and publishing strength, `EVENT_LIMITS`, `onlyKindStopsPublish`, and the mapping of API field errors onto form fields (`formErrorsFromApi`) | ✅ used by `useEvent.ts`, `CreateEvents.tsx` and `HostedEvents.tsx` |
| `utils/joinLinkNote.ts` | The joining card's sentence when the viewer has no meeting link | ✅ used by `DetailedEvent.tsx` |
| `utils/myEvents.ts` | `myEventsUrl`, `myEventStatusLabel`, and the page's address helpers (`myEventsView`, `myEventsList`, `myEventsSearch`, `hostingPath`) | ✅ used by `MyEvents.tsx` and links back to it |
| `components/JoinNoteDialog.tsx` | Optional note (up to 300 characters) before a request or a waitlist spot, built on `ConfirmDialog` | ✅ used by `DetailedEvent.tsx` |
| `utils/inviteEmails.ts` | `parseInviteEmails`: splits the typed emails and folds case | ✅ used by `EventInvitePanel.tsx` |
| `constants/eventAccess.ts` | The three access levels (slug, label, hint), `accessLabel` and `REGISTRATION_STATUS_LABELS`; mirrors the API | ✅ used by the form, card, hero, facts and My Events |
| `components/ConfirmDialog.tsx` | Shared native `<dialog>` confirmation (safe answer focused first, Escape held while busy) | ✅ used by `CancelEventDialog.tsx`, `JoinNoteDialog.tsx`, `HostedEvents.tsx` and the leave confirmation in `DetailedEvent.tsx` |
| `components/EventDetailsSection.tsx` | Section 04 of the event form (November 2026, PG-7): write-up, contact email, minimum age, fee, what to bring, languages, agenda editor and the mode's own notes | ✅ used by `CreateEvents.tsx` |
| `components/EventFormParts.tsx` | `Field`, `FormSection` and the shared input classes of the event form; `FormSection` becomes a `role="tabpanel"` in edit mode | ✅ used by `CreateEvents.tsx` and `EventDetailsSection.tsx` |
| `components/EditSectionTabs.tsx` | The four section tabs of the edit form (Basics, Date & place, Attendance, More details): underline tabs in the page flow, roving tabindex, arrow-key navigation, error dot | ✅ used by `CreateEvents.tsx` in edit mode |
| `utils/eventDetailFields.ts` | Form text to API shape and back for the optional details: `normalizeDetails`, `detailPayloadForCreate`, `detailChanges`, `validateDetails`, limits (mirror the API) | ✅ used by `validateEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` |
| `utils/eventMode.ts` | `hasVenue`, `hasOnlineAccess`, `hasVenueContent`, `hasJoiningContent`, `MODE_LABELS` and `describeWhere` for the three formats (In person, Online, Hybrid; November 2026, PG-10) | ✅ used by the form, hero, card, lists and location panel |
| `utils/eventTags.ts` | `parseTags`, `formatTags`, `validateTags` (comma separated, lower-cased, de-duplicated, up to 8; PG-9) | ✅ used by `validateEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` |
| `utils/eventTimezone.ts` | `combineInZone`, `partsInZone`, `startOfDayInZone`, `listTimeZones`, `zoneOptionLabel`, `zoneAbbreviation`, `viewerTimeNote`, `eventZone`, `browserTimeZone` (PG-11); loads dayjs's `utc` and `timezone` plugins | ✅ used by the form, `validateEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` and `formatEventFacts.ts` |
| `utils/richText.ts` | Parses the write-up's small format (bold, italic, http(s) links, bullet and numbered lists, line breaks) into data; never produces HTML (PG-12) | ✅ used by `components/RichText.tsx` |
| `components/RichText.tsx` | Renders the parsed write-up as React elements for the event page and the form's preview | ✅ used by `DetailedEvent.tsx` and `EventDetailsSection.tsx` |
| `constants/eventTypes.ts` | The seven event kinds (slug and label), `eventTypeLabel`, tag limits; mirrors the API (PG-9) | ✅ used by the form, card, hero and directory filter |
| `hooks/useEvent.ts`                 | Calls the validator, submits (create, edit, publish), reports refusals, refreshes lists                                                                                                                                                                                 | ✅ used by `CreateEvents` page                                                                                                                                                                                         |
| `components/EventCard.tsx`          | Card rendered in the `/events` grid                                                                                                                                                                                                       | ✅ rendered, typed against `EventCardEvent`                                                                                                                                                                            |
| `utils/toDisplayEvent.ts`           | Maps a live `ApiEvent` onto `EventCardEvent`                                                                                                                                                                                              | ✅ used by `Events.tsx`                                                                                                                                                                                                |
| `utils/uploadCoverImage.ts`         | Uploads one cover to object storage and returns its https link (November 2026, DB-1)                                                                                                                                                                        | ✅ used by `CreateEvents` only                                                                                                                                                                                         |
| `constants/reservedEventAddresses.ts` | `RESERVED_EVENT_ADDRESSES`: page addresses the create form refuses (`mine`, `new`, `create`, `edit`, `admin`, `api`). The API keeps its own copy | ✅ used by `validateEvent.ts` |
| `constants/coverImageTypes.ts` | `COVER_IMAGE_MIME_TYPES`, `COVER_IMAGE_ACCEPT`, `COVER_IMAGE_TYPE_ERROR`: the four cover image types the API accepts | ✅ used by `CreateEvents.tsx` |
| `utils/*.test.ts` | Vitest unit tests next to `formatEventFacts.ts`, `calendarLinks.ts` and `toDisplayEvent.ts` (the last also covers `toDisplayEventDetail`); `src/utils/formatMoney.test.ts` covers the shared money helpers | ✅ run by `pnpm test:unit` in `apps/web` |

**Retired, September 2026:** `constants/eventDirectory.ts` (twelve sample
events) and `constants/eventDetails.ts` (their detail-page content), plus the
twelve placeholder cover photos under `assets/pictures/events/` — deleted
outright, not just unused, once `DetailedEvent.tsx` no longer read them.
`DirectoryEvent`/`EventDetail`/`EventVenue`/`EventOnlineAccess` (the
fixture-shaped types) are gone from `types/interfaces.ts` too, replaced by
`DisplayEvent`/`EventDetailContent`. `utils/groupEventsByDay.ts` is also gone
(same month, later pass) - `Events.tsx` renders one flat grid now instead of
same-day sections; see below.

## `pages/Events.tsx`

**`ComponentHelmet type="Events"`** — correct `type` string, matching
`ComponentHelmet`'s dedicated `"Events"` branch; see
[layout-navigation.md](../../../../../docs/specs/layout-navigation.md). Was
previously a copy-paste leftover from `Organizations.tsx`
(`type="Organizations"`, wrong for this page) — fixed August 2026 alongside the
club → organization rename.

**The event list is live (September 2026) and server-driven (November 2026)** -
`GET /events` through
`eventEndpoints.directory({ period, search, mode, type, access, page, limit })`
with `useSWRInfinite`, 12 cards per page (`PAGE_SIZE`), mapped through
`utils/toDisplayEvent.ts` into `EventCardEvent`. Search, the Upcoming/Past split
and the type filter are all sent to the API; the browser no longer fetches 100
events and filters them. The count above the grid is `pagination.total`, and a
next page loads itself as the end of the grid comes near (`InfiniteScroll`,
2026-11-27, replacing a "Load more events" button), with card placeholders while
it does. Typing is debounced by 300 ms
(`SEARCH_DEBOUNCE_MS`) before it is sent. The page has error and retry states and
passes `{ keepPreviousData: true, parallel: true }` to `useSWRInfinite`:
`keepPreviousData` avoids an empty-grid flash while a new filter loads, and
`parallel` stops a new page waiting for the first one to be rechecked. Pages kept
from an earlier visit are refetched once when `/events` is reopened, which is
how a newly created event shows up (SWR's global `mutate` skips `useSWRInfinite`
keys, so `useEvent.ts` does not try to refresh the directory itself). Replaces the
twelve-event fixture that used to live in `constants/eventDirectory.ts`, now
deleted (see below) - `DetailedEvent.tsx` stopped reading it too, in the same
September 2026 pass.

Until August 2026 this array was **twenty copies of one object shaped like the
wrong kind of record** -
`{ _id, userType, userName, name, email, password, cart, __v }`, a
user/organization record copy-pasted from `Organizations.tsx`, with no
`startDate`, `mode` or `coverImage` anywhere in it. That was invisible on screen
only because `EventCard` read no props at all. Both halves of that are gone; if
a future change reintroduces fixture data here, it has to be event-shaped.

A live `Event` has no cause taxonomy and no capacity tracking (`event.model.ts`)
— unlike the fixture, which invented both. `toDisplayEvent.ts`/`EventCardEvent`
leave `cause`/`going`/`spotsLeft` undefined rather than fabricate them;
`EventCard` renders around the gap (no cause badge, no bottom stat rule) instead
of showing invented numbers. **Results render as one flat grid
(September 2026)**, not the same-day sections (`utils/groupEventsByDay.ts`,
deleted) an earlier pass grouped them into - with the seed data's actual date
spread, most day-sections held exactly one event, so the headers cost vertical
rhythm without adding information a visitor couldn't already read off
`EventCard`'s own date badge.

**Chrome: still deliberately close to `/organizations`** - heading, then the
shared `DirectoryToolbar` (`@components`): a search field that actually filters
(sent to the API, which matches the name, city and host name), a live result count
and the page's one primary button, then the flat grid with an empty state. Two
real divergences: the first filter is **Upcoming/Past**, not a cause
taxonomy - a live event has no cause field to filter by, and "what's happening
soon" is the more useful question here anyway - and there are two more:
`TypeFilter`
(`All formats`/`Open to all`/`Approval required`/`Invite only`/`Online`/`Offline`/`Hybrid`),
a flat single-select list over the two real `access`/`mode` fields, and the
event kind. All three sit behind one "Filters" button (`FilterMenu`,
2026-11-28, replacing three dropdowns): a glass dialog from 640px up, a bottom
sheet below it, with an active-filter count and "Clear all". Choices take effect
only on "Apply filters", as one request, and the previous cards stay up
("Updating events") until the answer arrives. Both directories still
render the same `DirectoryToolbar` component, so its search/count/button chrome
cannot drift between them again; this page passes a `FilterMenu` as its
`filters`, `/organizations` a single `FilterDropdown`. Nothing is printed under
the last card.
`GET /events` takes `search`, `period`, `mode` and `access` (November 2026),
so the type filter maps to API params: `Open to all`, `Approval required` and
`Invite only` are `access=open`, `access=approval` and `access=invite`, and
`Online`/`Offline`/`Hybrid` are `mode`. Search matches
only name, city and host name now; the old browser search also matched summary,
country, platform and mode. Upcoming sorts soonest first and Past most recent
first, decided by the API.
The API puts an event in a tab by its end time, so Upcoming includes events that are running.

Gone with that rewrite: the inert "Filters" button (it never had a handler), the
`<EventSlider />` carousel and its `FeaturedEventCard`/`FeaturedEventImage`
slides (all hardcoded, nothing else imported them - files deleted), the `<hr>`,
the unused `swiper/css` imports, and the `Loading` fallback that could never
render.

The "Create an event" action is available only to authenticated organization
accounts and navigates to `/organization/events/new`. After successful creation,
the new event opens at `/events/:uid` and the current organization's host event
cache is revalidated; the public directory refetches when `/events` is next
opened.

**Reading states and small rules (November 2026).** A card title runs to two
lines. The first load shows six `EventCardSkeleton`s under a "Loading events"
summary; a failed first load shows an alert with "Try again" and no count; the
empty state is left-aligned on a phone. The event page loads into
`DetailedEventSkeleton`. Agenda times are free text, so `formatAgendaTime`
rewrites an unambiguous clock time ("9:00 am", "18:45") in the visitor's clock
style, matching the hero, and shows anything else as typed.

## `DetailedEvent.tsx` — the page a card opens

Routed at `/events/:eventId` (`app/routes/routesConfig.tsx`), where `:eventId`
is a real event's `uid`.

**Live data, September 2026.**
`useSWR<ApiEvent>(eventId ? eventEndpoints.byUid(eventId) : null, fetcher)`.
It branches in this order (November 2026): not found (`EventNotFound`) when there
is no id or the API answers 404 or 400; the view whenever there is data, so a
failed background refresh keeps the event on screen; `EventLoadError`, with
"Try again", for any other failure; otherwise loading. Before this every error
was shown as "not found". `OrganizationProfile.tsx` still does that.
This `byUid` cache entry is shared (the edit form deliberately does not read it, and a successful edit drops it), and every cached response, this one included, is dropped when the signed-in identity changes, so a meeting link cached for one account is never shown to the next visitor (see [state-management.md](../../../../../docs/specs/state-management.md#5-cached-responses-and-the-signed-in-identity)).
`eventEndpoints.byUid(uid)` hits `GET /events?uid={uid}`, reusing the backend's
existing single-event branch (`event.controller.ts#listEvents`) rather than
adding a dedicated `GET /events/:uid` route. `utils/toDisplayEventDetail.ts`
maps the raw `ApiEvent` onto the `{ event, detail }` shape the page and its
`components/detail/` pieces render — the detail-page equivalent of
`toDisplayEvent.ts`.

Signed-in visitors also fetch `GET /events/:uid/registration` via
`eventEndpoints.registration(uid)`, with the SWR cache key scoped to account
email. While that status loads, both Join controls stay disabled; when
registration exists, they render the joined state instead. If the check fails,
both controls offer a retry rather than risking a duplicate registration. This
makes the confirmation email's event link land on a page that recognizes the
attendee.

**Join flow (2026-11-26).**
A signed-out press on a joinable button navigates to `/auth/signin` with `returnTo` in router state; a `401` from the join resets the Redux user and does the same.
A request or a waitlist spot (`join.asks`) opens `JoinNoteDialog` first; a direct join and accepting an invitation send at once.
The meeting link is removed from the cached event after a leave, and every cached response is dropped when the signed-in identity changes.
A signed-out visitor sees "Already joined? Sign in" on a running event and "Invited? Sign in" on an invite-only or full-without-waitlist event (`signInPrompt`).
A draft shows no time badge and "Planned for" on the panel.
`eventPhase` decides "Happening now" and "Completed", and `joinLinkNote` explains a missing meeting link.
Full wording: "Time, meeting link, sign-in and emails" in [docs/specs/events.md](../../../../../docs/specs/events.md).

This replaces the fixture-driven version this page ran until September 2026: two
lookups (`findEvent`/`findEventDetail`) against
`constants/eventDirectory.ts`/`eventDetails.ts`, which went stale the moment
`Events.tsx`'s own August-2026 live-data change started linking cards to real
`uid`s the fixture didn't contain — every real event's card led here to the
not-found state instead of a detail page. Both fixture files, and their
placeholder cover photos, are deleted now that nothing reads them.

**`event.model.ts` grew the fields this page needs**, in the same pass that
wired the fetch: `about`, `agenda`, `bringAlong`,
`gettingThere`/`linkDelivery`/`joinRequirements`, `cost`, `fundraiser`,
`languages`, `minimumAge`, `contactEmail`, plus two flags —
`isGovernmentSponsored` (server/seed-only, mirrors `Organization.verified`;
`EventHero` renders a brand-tinted "Government-backed" pill when set) and
`access` (organizer-settable: `open`, `approval` or `invite`; `EventJoinPanel`
and `EventMobileActionBar` offer a join, a request, the waitlist, accepting an
invitation, or nothing, from `utils/joinView.ts`, and `EventFacts`'s "Who can
come" cell reports a restricted level). See "Who can join, requests and the
waitlist" in [docs/specs/events.md](../../../../../docs/specs/events.md). See
[apps/api/docs/specs/events.md](../../../../../apps/api/docs/specs/events.md)
for the schema.

**Registration is saved.** Joining calls authenticated `POST /events/:uid/join`
and saves one registration per account, which is going, pending (asked to join an
approval event), waitlisted (the event was full) or declined. The API sends
confirmation to the account email only in production, and only to a person who is
going; development and test suppress delivery and report `emailSent: false` with
`emailFailed: false`, and the page warns about email only when `emailFailed` is true. Events
that have started are rejected by the API, and so is a person who is not invited to an
invite-only event. `going`/`spotsLeft` come from the event's capacity
(`capacityCounts`); do not derive counts from registrations. See
[known-issues.md](../../../../../docs/specs/known-issues.md#events--attendee-capacity-built-november-2026-pg-5).

**Every `EventSection` with nothing behind it doesn't render** — "About this
event" (`detail.about`), "How the day runs" (`detail.agenda`), and "What to
bring" (`detail.bringAlong`) are all conditional on their array being non-empty,
matching `OrganizationProfileView`'s own rule for sections with nothing behind
them. "The details" (`EventFacts`) always renders — it degrades gracefully
per-cell instead of disappearing. The location/join section renders only when
there is a venue to show or something to say about joining (`hasVenueContent`,
`hasJoiningContent`), and its title names only the half that is there.

**Cost.** `cost` is _omitted_ on the model for free events rather than set to
zero — nearly everything here is a nonprofit drive, so a price is the exception
worth spelling out. The free branch says so in words ("Free to attend"), never a
currency-formatted zero.

**Join writes a registration.** `DetailedEvent.tsx` calls `JoinEvent` from
`KarmaCircleApi.ts`; the API returns whether it joined and whether confirmation
email was sent. Success updates SWR registration state and shows feedback, while
failures leave Join available for retry. The mobile action bar and side panel
share the same joined/loading state. Share is `navigator.share` with a clipboard
fallback, treating a dismissed sheet (`AbortError`) as a non-event.

**Layout.** Two columns from `lg`, with the sidebar `order-1` on mobile — on a
narrow screen "can I go, and what does it cost" comes before the reading. One
rendered instance either way; never a duplicated panel with duplicated state.

**Below `lg`, the join CTA also lives in a floating bottom capsule
(September 2026, `EventMobileActionBar`)**, so it's reachable regardless
of scroll position, not just at the top of the page.
Solid white since November 2026 (it was translucent "liquid glass", which let the
page text show through), inset the
same `px-9` margin as `EventHero`/`EventJoinPanel` above it rather than flush
with the screen edges. It shares the same `joined` state and `onToggleJoin`
callback as `EventJoinPanel` — one state, mirrored in two places, not two
controls that could disagree (while the event runs it says "Happening now" and offers "Join online", "Going" or "Closed") - and mirrors only the primary action (cost,
spots-left, Join/Ask), not `EventJoinPanel`'s Share/Ask pair or its "Starts …"
line. `lg:hidden` — the sidebar's own `lg:sticky` already keeps the join control
in view at that width, so there's nothing for this bar to solve there. Two
independent checks gate its `hidden` prop rather than showing it
unconditionally, deliberately using two different mechanisms. An
`IntersectionObserver` on `EventJoinPanel` itself covers "is the real button on
screen right now" — a symmetric, bidirectional question `IntersectionObserver`
answers correctly regardless of scroll jump size (the first cut of this showed
both at once right after the hero, an exact duplicate control caught in review
before it shipped). "Has the footer been reached" is **not** symmetric — it
should stay true for every scroll position past the sentinel, not just the frame
it crosses — and `IntersectionObserver` only calls back when `isIntersecting`
itself flips: verified live, scrolling from deep in the footer back toward the
top skipped straight from "sentinel above the viewport" to "sentinel below it"
with `isIntersecting` false both times, so no callback ever fired and
`nearFooter` got stuck `true`, hiding the bar permanently. That check instead
reads the sentinel's `getBoundingClientRect()` off a rAF-throttled native
`scroll`/`resize` listener - correct for any jump size because it's polling the
sentinel's actual position, not waiting on a threshold-crossing notification
that can be skipped. Also fixed in the same pass: `hidden` translated by
`translate-y-full` (the bar's own height) rather than
height-plus-its-`bottom`-gap, which left a real sliver of the "Join event"
button visible over the footer - reported as the glass bar "glitching."

## Event creation form history and current flow

### `CreateEvent.tsx` - deleted, November 2026

The legacy profile-editor copy (509 lines, saved to `PATCH /user/update`, could
never enable its Save button, and bound eight inputs to two state slots) was
deleted together with its `CreateEventCredentials` type. Do not recreate it; all
event creation belongs in `CreateEvents.tsx` and `useEvent.ts`.

### `CreateEvents.tsx` — the shared live implementation

Routed at `/organization/events/new` for signed-in organization accounts, with
or without a live public profile. Since November 2026 the file exports `EventForm` (the form
itself) next to the default `CreateEvents` (which renders `EventForm` with blank
values); `pages/EditEvent.tsx` renders the same `EventForm` with a stored event
for `/organization/events/:eventId/edit`. In edit mode (`original` prop) the
page address is read-only, the heading is "Edit your event", and `useEvent`
sends only the changed fields to `PATCH /events/:uid`. Edit mode shows Basics,
Date & place, Attendance, and More details as one section at a time, chosen from
underline tabs (`components/EditSectionTabs.tsx`) that sit in the page flow and
scroll away with the form rather than being pinned to the window. The tabs
follow the ARIA tabs pattern (Left, Right, Home and End move between them), and
a red dot marks a tab whose section has a validation error. Switching sections
keeps the current values, and validation opens the section with the first
invalid field. A fixed bottom Save changes action appears only while the
form differs from the stored event. The event page address is clearly marked as
locked after publishing. Leaving through an in-app link or browser Back asks
before discarding edits; closing or refreshing uses the browser's
unsaved-changes prompt. The blank values are built by `createInitialEvent()`
when the form opens, no longer once at module load.

This is a page, not a modal. It uses a responsive form with four sections,
native date/time controls, mode-specific location or meeting details,
who can join (a dropdown) and an optional waitlist, image upload, and a live event preview. Edit mode shows one
section at a time; event creation keeps the sections together. Event name and
description character counts sit beside their field labels. The description
includes a prompt for useful event details. The event page address is an
editable URL-safe path ending generated from the event name; it is part of the
KarmaCircle page URL, not an external site. Online meeting URLs must be absolute
HTTP or HTTPS URLs. Submit errors are shown inline and focus moves to the first
invalid field. On success, the organizer lands on `/events/:uid`.

**Local state, `event`** (`createInitialEvent()`, where `start` is a day and an hour from now and `end` is an hour later):

```js
{
  name: "", startDate: start, endDate: end, startTime: start, endTime: end,
  mode: "Offline", uid: "", description: "",
  city: "", state: "", address: "", country: "India",
  coverImage: "", platform: "Zoom Meeting", platformLink: "",
  access: "open", waitlistEnabled: true, capacity: "",
  timezone: browserTimeZone(), eventType: "", tags: "",
  ...emptyDetailFields(),
}
```

The date and time pickers hold separate values; `buildCreatePayload` (and `buildEventChanges` when editing) combines each pair
into a timestamp in the event's timezone before the API request.

**Cover image:** image uploads are limited to 5 MB and to PNG, JPEG, WebP or GIF
(`constants/coverImageTypes.ts`, mirroring `COVER_IMAGE_MIME_TYPES` in the API's
`event.constants.ts`; the file input's `accept` and the error text come from
the same constant), and uploaded as soon as it is chosen by
`uploadCoverImage(file)` (`utils/uploadCoverImage.ts`, November 2026, DB-1): it
asks `POST /uploads/event-covers` where to send the file, sends it there (Vercel
Blob with a short-lived token in production, a signed URL on the API in
development and test), and the form keeps only the returned https link in
`coverImage`. The chosen file previews from the browser with an "Uploading…" label,
the file input and every submit button are disabled until it finishes, and a
failure keeps the previous cover and shows the message inline. The API rejects
any other type, so the browser blocks SVG, AVIF and BMP up front instead of
failing on submit. Events saved before this change may still hold a data URL; they
display as before, and an edit that does not change the cover does not send it. The form starts without
a placeholder asset and shows an intentional preview placeholder until the
organizer chooses an image.

**Mode-dependent fields:** `mode === "Offline"` shows address, city, state, and
country; `mode === "Online"` shows a video platform and meeting link. The API no
longer requires the legacy `mapIframe` field; event detail builds a map search
link from the saved address.

**Submit:** the form's own submit (`handleSubmit`) is the publish intent, and the "Save as draft" button calls `submit("draft")`.
Both validate for that intent, open the section of and focus the first invalid field, and prevent duplicate submission while the API call is in flight; only the pressed button shows its busy label.
Fields the API refuses are marked the same way.
`SaveRequirements` (`EventFormParts.tsx`) states beside the buttons what a draft needs and what publishing also needs.
After a publish the organizer lands on `/events/:uid`; after a draft save, on `/events/mine?tab=hosting&show=drafts`.
Pressing Enter in a text box submits the form, so it publishes (see [known-issues.md](../../../../../docs/specs/known-issues.md#events---open-points-2026-11-26)).

## `hooks/useEvent.ts` - pairs with `CreateEvents` only

```ts
useEvent(event, original?) → { validateEvent, submitCallback }
```

**Called once per render** of `CreateEvents.tsx` (it's invoked directly in the
component body, not memoized), receiving that render's current `event` state.
The submit handler passes the validation result directly to `submitCallback`, so
a later render cannot replace it with an empty or stale error object.

**`validateEvent(intent = "publish")`** returns `validateEventForm(event, intent, original)` from `utils/validateEvent.ts`.

1. Always: name 10 to 80 characters, a format, the start and end date and time, and the end strictly after the start.
   A new or moved start, and the start of a draft being published, must be in the future.
2. Creating only: the page address uses lowercase letters, numbers and single hyphens, and is not a reserved word (`RESERVED_EVENT_ADDRESSES`).
3. Publishing, or saving a published event: also a description of 20 to 200 characters, a cover image, the kind of event, and the format's venue (address, city, state, country) and/or platform and meeting link.
4. Both strengths: anything filled in must be valid (maximum lengths from `EVENT_LIMITS`, an http or https meeting link, tags, a whole-number capacity, the optional details through `validateDetails`).

The API enforces its own copy of these rules, except that only the web requires a kind and it holds every edit of a published event to the publishing rules (see
[apps/api/docs/specs/events.md](../../../../api/docs/specs/events.md#drafts-and-publishing-rules)).

**`submitCallback(event, onSuccess, errors, intent = "publish")`** resolves with the fields the API refused, if it named any, otherwise `undefined`.

- A non-empty `errors` object sends nothing and shows "Please fix the highlighted fields" (the form itself returns before calling it).
- Creating: `CreateEvent(buildCreatePayload(event, intent))` (`POST /events/create`).
  Only filled-in fields go, only the chosen format's venue or joining fields, and `status: "draft"` for a draft.
- On `response.status === 201`, it shows a success toast, runs the success callback and revalidates the current organization's
  `eventEndpoints.byHost()` key. It does not touch the public directory: that
  uses `useSWRInfinite`, whose keys SWR's global `mutate` skips, so
  `Events.tsx` refetches the pages it kept when it is reopened.
- **Edit mode** (`useEvent(event, original)`, November 2026): it builds the body with
  `buildEventChanges(event, original)`; an empty body on a save that is not a publish shows "Nothing has changed
  yet." and sends nothing; otherwise it calls `UpdateEvent(original.uid, changes)`
  (`PATCH /events/:uid`, returns `{ ok, status, message, errors }` instead of
  throwing). Publishing a draft then calls `PublishEvent(uid)`; if that step is refused the changes stay saved.
  Success shows "Event updated", "Draft saved" or "Event published", runs the success callback and
  drops the `eventEndpoints.byUid(uid)` cache entry and revalidates the host list.
  `UpdateEvent` returns the stored event, and `onStored` hands it to `EditEvent` when the publish step after a save is refused.
- **Refusals** (create, edit or publish): the toast shows the first field error, else the API's message, else a fallback, and `formErrorsFromApi` turns `errors: [{ path, message }]` into form errors that the form shows under the boxes.
  This includes the `409 "This event just changed. Reload and try again."` an edit or publish can get; unpublish, cancel and draft delete can get it too.
  `EventInvitePanel` closes its form once the event has started, and toasts the API's `409` if the start came after the page loaded.
  A problem naming no box (the `409` for a taken address) is only in the toast.

## Event display components

- **`EventCard.tsx`** — renders from its `event: EventCardEvent` prop. It shows
  a cover image or fallback, a date badge, event name and summary, and event
  location or online details. Live records have no cause field, and only an event with a
  capacity has a "going / spots left" count (PG-5, see
  [known-issues.md](../../../../../docs/specs/known-issues.md#events--attendee-capacity-built-november-2026-pg-5)),
  so the card does not invent a cause label or a count. **The date is split across the two surfaces on purpose** -
  `formatEventBadge` on the cover ("12 SEP"), `formatEventTime` in the meta row
  ("Sat · 9:00 pm"). Both used to call `formatEventDate`, so every card printed
  the same day number twice. The meta block carries `mb-4` rather than leaning
  on the bottom rule's `mt-auto`, which resolves to zero once the copy fills the
  card and left the rule touching the location line. **September 2026:** the
  meta block's own vertical rhythm was loosened (`mt-2.5`→`mt-3`,
  `gap-1.5`→`gap-2`) and its date/time line's icon swapped from a second
  `FiCalendar` to `FiClock` — the repeated calendar glyph (already on the cover
  badge above it) read as the same fact printed twice rather than two distinct
  ones, and the tight gap between the two meta lines made the block read as
  cramped. Two badge pills — "Govt" (`isGovernmentSponsored`, brand-tinted) and
  the access label ("Approval required" or "Invite only", from `access`,
  neutral; an open event has none) — were added top-right on the cover in
  the same slot `OrganizationCard`'s "Featured" pill uses, stacked when an event
  carries both.
  The cover's bottom-left label reads "Cancelled", "Completed" (the end has passed) or "Happening now" (between start and end), and otherwise the kind of event.

  **The card links to `/events/:id`** — a stretched overlay on the title link
  (`after:absolute after:inset-0`) rather than an `<a>` wrapped around the card,
  so there is one accessible name for the destination and the organizer link,
  which goes somewhere else entirely, stays clickable on top of it
  (`relative z-1`). Until August 2026 the card was not a link at all, because
  the detail page was an unregistered stub. Until August 2026 this component
  **declared no parameters at all**: every field ("Food Marathon, 2025",
  "GodLike Organization", three identical GitHub avatars, "+300 Participated")
  was hardcoded, identical across all twenty cards, while `Events.tsx` passed it
  an `event` prop it never read. (`FeaturedEventCard.tsx`,
  `FeaturedEventImage.tsx`, `EventSlider.tsx` and `Slider.css` were deleted in
  the August 2026 directory rewrite - a hand-rolled 3s carousel over ten slides
  of identical hardcoded content, with no pause-on-hover, no manual controls and
  no accessibility affordances. Nothing outside itself imported them.)

- `EventsMarqueeCards.tsx` and `utils/getFormattedDate.ts` (with its test) were deleted on 2026-11-23 (CH-4): neither was rendered by any route.

## Deleted files, November 2026

An earlier `components/HostedEvents.tsx` (an empty 0-byte file) and `services/Events.ts`
(`getEvents()`, an unused `apiConnector` fetcher) were deleted, together with
`eventEndpoints.all`, which only `getEvents()` used. The orphaned
`HosedEvents.scss` sibling mentioned in earlier versions of this spec no longer
exists on disk either. The name `HostedEvents.tsx` was reused on 2026-11-27 for
the Hosting view of My events, which replaced `pages/YourEvents.tsx`.

## `utils/uploadCoverImage.ts`

`uploadCoverImage(file)` returns the https link of an uploaded cover and throws
`CoverUploadError` (its message is safe to show) when the ticket request, the
Blob upload or the direct upload fails. `convertToBase64.ts` was deleted in
November 2026: an image no longer travels as data inside the form or the event.
Unit tests cover both strategies and the failures (`uploadCoverImage.test.ts`).

## Data flow summary — live event reads and creation

```
Events.tsx render
   ▼
GET /events via eventEndpoints.directory({ period, search, mode, type, access, page, limit })
and useSWRInfinite (12 per page, next page on scroll)
   ▼
toDisplayEvent() maps each ApiEvent to EventCardEvent
   ▼
EventCard renders the live event
```

```
CreateEvents.tsx — full-page form at /organization/events/new
   ▼
local `event` state (name/dates/mode/uid/description/coverImage/mode-specific fields/access/waitlistEnabled)
   ▼
Publish (form submit) or Save as draft → validateEvent(intent) → submitCallback(event, onSuccess, errors, intent)
   ▼
CreateEvent(buildCreatePayload(event, intent))   [KarmaCircleApi.ts, POST /events/create]
   ▼
201 ──► toast, open event detail (a draft: back to My events, Drafts), revalidate current host list
400 ──► toast the first field message, mark the refused fields
```

```
EditEvent.tsx - /organization/events/:eventId/edit
   ▼
useEventSnapshot: one GET /events?uid per visit, held still → owner, not cancelled, not ended (at load time)?
   ▼
EventForm (original = stored event) → validateEvent(intent) → submitCallback()
   ▼
buildEventChanges() → UpdateEvent(uid, changes)   [PATCH /events/:uid]
   ▼
200 ──► toast, open event detail, revalidate that event and the host list
```

```
EventAttendees.tsx - /organization/events/:eventId/attendees
   ▼
GET /events/:uid/attendees (useSWRInfinite, 50 a page, search debounced) - host only
   ▼
Check in toggle → SetAttendeeCheckIn()   [PATCH /events/:uid/attendees/:id]
Download CSV    → FetchAttendeesCsv()    [GET  /events/:uid/attendees/export]
```

```
DetailedEvent.tsx: join button
   ▼
signed out ──► /auth/signin with router state returnTo = /events/:uid
request or waitlist ──► JoinNoteDialog (optional note)
   ▼
JoinEvent(uid, note?)   [POST /events/:uid/join]
   ▼
success ──► registration state set, event refetched (counts, meeting link)
401 ──► reset Redux user, sign in and return
```

```
DetailedEvent.tsx: "Leave event" → ConfirmDialog → LeaveEvent(uid)
   ▼                                              [DELETE /events/:uid/registration]
200 ──► toast, registration state and the event (going, spots left) revalidated
```

```
HostedEvents.tsx → "Cancel event" → CancelEventDialog → CancelEvent(uid)
   ▼                                                  [POST /events/:uid/cancel]
200 ──► toast, revalidate the host list (row gets a Cancelled pill, no actions)
```

## Types

`types/index.ts` re-exports the feature interfaces and types. `ApiEvent` models
the API event response, `EventCardEvent` is the directory card view model, and
`DisplayEvent` plus `EventDetailContent` provide the detail-page view model.
`Events.tsx` maps `ApiEvent` records with `toDisplayEvent()` and passes the
resulting `EventCardEvent` to `EventCard`. `EventFormState`, `EventFormErrors`,
and `UseEventResult` describe the shared live form and its hook.
`JoinAsk`, `EventPhase`, `MyEventsTab` and `JoinNoteDialogProps` cover the join note, the time phase and the My Events tabs; `ApiEvent.description` is optional (a draft may have none) and `EventCardEvent` carries `endsAt`. (The
`CreateEventCredentials` type of the deleted legacy form is gone.)

**September 2026, detail-page types:**
`DirectoryEvent`/`EventDetail`/`EventVenue`/`EventOnlineAccess` (the
fixture-shaped types `constants/eventDirectory.ts`/`eventDetails.ts` used to
satisfy) are gone from `types/interfaces.ts`, replaced by `DisplayEvent` (the
detail page's near-superset of `EventCardEvent`, plus
`address`/`state`/`platformLink`/`endsAt`/the two always-boolean trust flags)
and `EventDetailContent` (the long-form/timeline/mode-specific fields, flat
rather than nested in a `venue`/`onlineAccess` sub-object — `EventLocationPanel`
reads `event.address`/`city`/`platform`/`platformLink` and
`detail.gettingThere`/`linkDelivery`/`joinRequirements` directly). `ApiEvent`
grew the matching fields 1:1 with `event.model.ts`'s `IEvent`; the two must keep
changing together.

## Known issues specific to this feature (superset of known-issues.md's events entries, plus new findings)

- **Fixed November 2026:** `validateEvent()` now checks mode-specific fields
  independently of top-level required fields.
- **Fixed November 2026:** `submitCallback` now receives the validation result
  directly, so validation no longer depends on a shared closure object.
- **Import convention (November 2026):** every file in this feature imports
  across folders with the `@features/events/...` and `@utils/...` aliases, never
  `../../` paths. Only same-folder `./` imports remain, in `types/`. Keep it that
  way when adding files. Generic helpers with no event knowledge (money, counts)
  belong in shared `apps/web/src/utils/`, not in `features/events/utils/`.
- **Unreadable dates and amounts in helpers (November 2026, T-8):**
  `formatDuration` returns "Duration unknown" for a date it cannot read, and
  `fundedPercent` (shared `@utils/formatMoney`) clamps to 0-100 and returns 0 for
  a negative or NaN value. `eventPhase` judges a record with no readable end by
  its start, and treats one with no readable time as upcoming; the unit tests
  record that as a decision, not a bug.
- **Format example is en-GB, output is en-US:** the JSDoc on `formatEventDate`
  shows "Sat 12 Sep · 9:00 pm", but only the first ", " is replaced, so en-US
  actually yields "Sat · Sep 12, 9:00 PM". The format is locale-dependent by
  design; the unit tests pin `TZ=UTC` and `en_US`.
- **Cover image picker vs API:** the picker now matches the API's four types
  (PNG, JPEG, WebP, GIF). Both enforce 5 MB. Keep `constants/coverImageTypes.ts`
  and the API's `event.constants.ts` in step.

## If you're asked to...

- **"Timezone" / "formatted write-up" / "Contribute button"** → all exist (November
  2026): an event's `timezone` (the form reads its pickers in that zone, the pages
  show its own clock with the viewer's beside it; `eventTimezone.ts`), the write-up's
  small safe format (`richText.ts` and `RichText.tsx`, no HTML), and Contribute as a
  link to the organization's Support flow (`?support=1`, which
  `OrganizationProfile.tsx` reads). See
  [docs/specs/events.md](../../../../../docs/specs/events.md).
- **"Hybrid" / "event kind" / "tags" / "draft" / "publish" / "unpublish"** → all
  exist (November 2026): `eventMode.ts` and the three-way format in the form,
  `eventTypes.ts` and `eventTags.ts`, and `PublishEvent`, `UnpublishEvent`,
  `DeleteDraft` with the draft rows in `HostedEvents.tsx`. Hybrid needs both the venue
  and the stream to publish; the kind is required to publish by the form; a draft needs little and is visible only to its
  organization. See [docs/specs/events.md](../../../../../docs/specs/events.md).
- **"Leave an event" / "capacity" / "attendee list" / "check-in" / "more event
  details"** → all exist (November 2026): `LeaveEvent` and `ConfirmDialog` in
  `DetailedEvent.tsx`, `capacity` in the form and `capacityCounts` in
  `toDisplayEvent.ts`, `EventAttendees.tsx`, and `EventDetailsSection.tsx` with
  `eventDetailFields.ts`. Going and spots left are shown only for an event with a
  capacity. See [apps/api/docs/specs/events.md](../../../../apps/api/docs/specs/events.md).
- **"Edit an event" / "cancel an event"** → both exist (November 2026): edit is
  `EditEvent.tsx` + `EventForm` + `buildEventChanges`, cancel is
  `CancelEventDialog` in `HostedEvents.tsx`. The page address cannot change, a
  cancelled event cannot be edited, and the API emails the people affected (2026-11-26, superseding "nobody is emailed"); see
  [apps/api/docs/specs/events.md](../../../../apps/api/docs/specs/events.md).
- **"Add event creation" / "fix the create event button"** → both `/events` and
  the Hosting view of My events link to `CreateEvents.tsx` + `useEvent.ts`, which
  submit to `POST /events/create`. The old `CreateEvent.tsx` profile-editor copy
  is deleted; do not recreate it. The backend schema accepts the basic fields
  plus `access` and `waitlistEnabled`, and
  the optional detail-page fields; `fundraiser` is still not creatable through
  the endpoint and needs the money decision (PG-26).
- **"Review the Events page SEO label"** → `Events.tsx` currently uses
  `type="Events"`; verify the route and title branch before changing it.
- **"Build a 'my hosted events' view for the dashboard"** → `HostedEvents.tsx`
  (`/events/mine?tab=hosting`) is the existing hosted-events view.
- **"Show a real event's location/platform info somewhere"** -> the routed event
  directory, event detail page, organization profile's hosted-event section, and
  My Events page already render live event data. Check the relevant feature spec
  before adding another surface.
- **"Add RSVP / attendee capacity"** → already built (November 2026, PG-5 and
  PG-3): an optional `capacity` on the event, an atomic join that refuses when
  full, a leave route, and the attendee list. See
  [known-issues.md](../../../../../docs/specs/known-issues.md#events--attendee-capacity-built-november-2026-pg-5).
- **"Let organizers set the government-sponsored flag themselves"** → don't —
  that's the one field deliberately kept server/seed-only, mirroring
  `Organization.verified`, precisely so it can't be self-declared. If a real
  verification workflow is ever wanted, it needs an admin-only route (which
  doesn't exist for `Organization.verified` either yet), not a client-writable
  field on `createEventSchema`.
