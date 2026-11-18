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
JavaScript. `YourEvents.tsx` is an organization-only workspace behind
`OrganizationSetupGate`; its create link opens `/organization/events/new`. That
full-page route requires sign-in and uses `OrganizationSetupGate` to require a
live organization profile. Personal accounts and signed-out visitors can browse
events but cannot open either creation entry point. The API also checks the
stored account type and returns `403` for individual hosts.
`e2e/events/events-responsive.spec.ts` covers live directory cards,
Upcoming/Past filtering, city search, mobile/desktop overflow, and publishing an
in-person event through the full-page form. `attendee-journey.spec.ts` (detail
page, join, My Events, invite-only, past event),
`online-event-publishing.spec.ts` (online platform and meeting link) and
`event-management.spec.ts` (edit and cancel) were added in November 2026. All 15
specs passed on Chromium, Firefox and WebKit on 2026-11-16 (45 of 45), after
`events-responsive.spec.ts` was changed to seed future events that end after they
start and to backdate its past event. See
[e2e/events/README.md](../../../e2e/events/README.md).

## What this feature is responsible for

The public `/events` directory and `/events/:eventId` detail page, attendee
registration and My Events, hosted-event listings, event display, and event
creation. The directory, detail, registration status, My Events, and
hosted-event pages read real API data. Both organization event-creation entry
points navigate to `/organization/events/new`, which submits through
`POST /events/create`. Organizations can edit an event (`PATCH /events/:uid`) and
cancel it (`POST /events/:uid/cancel`) from `/organization/events`, set a capacity
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

## Add to calendar (PG-19)

`components/detail/AddToCalendar.tsx`, rendered by `EventJoinPanel` above the Share and Ask buttons for an upcoming event that is not a draft and not cancelled, whether or not the person has joined.
It is three plain links under an "Add to calendar" label (no menu, no script, so nothing to open or dismiss and it works with a keyboard and a screen reader as it is):
- **Google** and **Outlook** open those services' "new event" pages with the title, times (UTC), place and a description with the event page link already filled in. They open in a new tab and say so to screen readers.
- **Apple or other** downloads the `.ics` file from the API (`GET /events/:uid/calendar.ics`, `eventEndpoints.calendar`), which Apple Calendar, desktop Outlook and almost everything else open directly.

`utils/calendarLinks.ts` builds the entry and the two URLs (`toCalendarEntry`, `googleCalendarUrl`, `outlookCalendarUrl`, `icsUrl`, `calendarLocation`); `calendarLinks.test.ts` has 18 tests, including that a title with `&`, `#`, quotes or emoji comes through the URL intact. An end time that is not after the start becomes one hour, and an unreadable start renders nothing. The wording of the place mirrors `placeOf` in the API's `event.place.ts` so the three ways of adding an event never describe it differently.
Not checked in a browser: the look of the row at 320 px and on a wide screen, and the links opening the real Google and Outlook pages (visual review is pending, UI testing is not authorized).

## File manifest

| File                                | Role                                                                                                                                                                                                                                      | Live?                                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/Events.tsx`                  | The `/events` page                                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events` (September 2026)                                                                                                                                                    |
| `pages/YourEvents.tsx`              | The `/organization/events` page — one organization's own events, behind `OrganizationSetupGate`                                                                                                                                           | ✅ routed, renders **live data** via `GET /events?host={handle}`                                                                                                                                                       |
| `pages/MyEvents.tsx`                | The signed-in individual's `/events/mine` page — registered events split into Upcoming and Past                                                                                                                                           | ✅ routed, reads authenticated attendee data from `GET /events/mine`                                                                                                                                                   |
| `pages/DetailedEvent.tsx`           | The `/events/:eventId` detail page                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events?uid={id}` (September 2026 — see below)                                                                                                                               |
| `components/detail/`                | The nine pieces that page composes — `EventHero`, `EventFacts`, `EventAgenda`, `EventLocationPanel`, `EventJoinPanel`, `AddToCalendar`, `EventMobileActionBar`, `EventFundraiserPanel`, `EventSection`                                                    | ✅ rendered by `DetailedEvent.tsx` only                                                                                                                                                                                |
| `utils/toDisplayEventDetail.ts`     | Maps a live `ApiEvent` onto the `{ event, detail }` shape `DetailedEvent.tsx` renders                                                                                                                                                     | ✅ used by `DetailedEvent.tsx`                                                                                                                                                                                         |
| `utils/formatEventFacts.ts`         | `formatEventDate`/`formatEventBadge`/`formatEventTime` plus duration, maps-URL and `isEventPast` helpers — one home for "format an event" (the first three moved here from the now-deleted `constants/eventDirectory.ts` fixture). Money helpers (`formatMoney`, `fundedPercent`) live in the shared `@utils/formatMoney`, not here | ✅ used across `EventCard` and the detail components                                                                                                                                                                   |
| `components/CreateEvents.tsx`       | Responsive full-page event creation flow with preview                                                                                                                                                                                     | ✅ routed at `/organization/events/new`                                                                                                                                                                                |
| `pages/EditEvent.tsx` | The `/organization/events/:eventId/edit` page (November 2026, PG-1): loads the stored event, checks the signed-in organization hosts it, shows an explanation for a missing, foreign, cancelled or ended event, otherwise renders `EventForm` filled in | ✅ routed behind `RequireSignIn` |
| `components/CancelEventDialog.tsx` | Confirmation before cancelling an event (November 2026, PG-2): a native `<dialog>` opened with `showModal()`, "Keep event" focused first | ✅ used by `YourEvents.tsx` |
| `utils/eventToFormState.ts` | Turns a stored `ApiEvent` into the form's starting values for editing | ✅ used by `EditEvent.tsx` |
| `utils/buildEventChanges.ts` | Diffs the form against the stored event into the `PATCH /events/:uid` body (only changed fields; cover only if replaced; a start left alone is not re-sent; location fields travel as a group) | ✅ used by `useEvent.ts` |
| `pages/EventAttendees.tsx` | The `/organization/events/:eventId/attendees` page (November 2026, PG-6): totals, search, per-person check-in toggle, CSV download, load more (50 per page); host only | ✅ routed behind `RequireSignIn` |
| `components/ConfirmDialog.tsx` | Shared native `<dialog>` confirmation (safe answer focused first, Escape held while busy) | ✅ used by `CancelEventDialog.tsx` and the leave confirmation in `DetailedEvent.tsx` |
| `components/EventDetailsSection.tsx` | Section 04 of the event form (November 2026, PG-7): write-up, contact email, minimum age, fee, what to bring, languages, agenda editor and the mode's own notes | ✅ used by `CreateEvents.tsx` |
| `components/EventFormParts.tsx` | `Field`, `FormSection` and the shared input classes of the event form | ✅ used by `CreateEvents.tsx` and `EventDetailsSection.tsx` |
| `utils/eventDetailFields.ts` | Form text to API shape and back for the optional details: `normalizeDetails`, `detailPayloadForCreate`, `detailChanges`, `validateDetails`, limits (mirror the API) | ✅ used by `useEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` |
| `utils/eventMode.ts` | `hasVenue`, `hasOnlineAccess`, `MODE_LABELS` and `describeWhere` for the three formats (In person, Online, Hybrid; November 2026, PG-10) | ✅ used by the form, hero, card, lists and location panel |
| `utils/eventTags.ts` | `parseTags`, `formatTags`, `validateTags` (comma separated, lower-cased, de-duplicated, up to 8; PG-9) | ✅ used by `useEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` |
| `utils/eventTimezone.ts` | `combineInZone`, `partsInZone`, `startOfDayInZone`, `listTimeZones`, `zoneOptionLabel`, `zoneAbbreviation`, `viewerTimeNote`, `eventZone`, `browserTimeZone` (PG-11); loads dayjs's `utc` and `timezone` plugins | ✅ used by the form, `useEvent.ts`, `buildEventChanges.ts`, `eventToFormState.ts` and `formatEventFacts.ts` |
| `utils/richText.ts` | Parses the write-up's small format (bold, italic, http(s) links, bullet and numbered lists, line breaks) into data; never produces HTML (PG-12) | ✅ used by `components/RichText.tsx` |
| `components/RichText.tsx` | Renders the parsed write-up as React elements for the event page and the form's preview | ✅ used by `DetailedEvent.tsx` and `EventDetailsSection.tsx` |
| `constants/eventTypes.ts` | The seven event kinds (slug and label), `eventTypeLabel`, tag limits; mirrors the API (PG-9) | ✅ used by the form, card, hero and directory filter |
| `hooks/useEvent.ts`                 | Validator, date/time payload conversion, submit and list refresh                                                                                                                                                                          | ✅ used by `CreateEvents` page                                                                                                                                                                                         |
| `components/EventCard.tsx`          | Card rendered in the `/events` grid                                                                                                                                                                                                       | ✅ rendered, typed against `EventCardEvent`                                                                                                                                                                            |
| `utils/toDisplayEvent.ts`           | Maps a live `ApiEvent` onto `EventCardEvent`                                                                                                                                                                                              | ✅ used by `Events.tsx`                                                                                                                                                                                                |
| `components/EventsMarqueeCards.tsx` | Data-driven event card (correctly reads an `event` prop)                                                                                                                                                                                  | ❌ not rendered anywhere                                                                                                                                                                                               |
| `utils/uploadCover.ts` | Cover upload: token from the API, picture to the image service, the card link back; falls back to base64 on `503`. Pure, with its dependencies passed in (`utils/uploadCover.test.ts`, 20 tests) |
| `utils/convertToBase64.ts`          | File→base64 helper, now only the fallback for a server without the image service                                                                                                                                                                        | ✅ used by `CreateEvents` only                                                                                                                                                                                         |
| `utils/getFormattedDate.ts`         | Ordinal-suffix date formatter (`"1st January"`)                                                                                                                                                                                           | ✅ used by `EventsMarqueeCards` only (itself unused)                                                                                                                                                                   |
| `constants/reservedEventAddresses.ts` | `RESERVED_EVENT_ADDRESSES`: page addresses the create form refuses (`mine`, `new`, `create`, `edit`, `admin`, `api`). The API keeps its own copy | ✅ used by `useEvent.ts` |
| `constants/coverImageTypes.ts` | `COVER_IMAGE_MIME_TYPES`, `COVER_IMAGE_ACCEPT`, `COVER_IMAGE_TYPE_ERROR`: the four cover image types the API accepts | ✅ used by `CreateEvents.tsx` |
| `utils/*.test.ts` | Vitest unit tests next to `formatEventFacts.ts`, `getFormattedDate.ts` and `toDisplayEvent.ts` (the last also covers `toDisplayEventDetail`); `src/utils/formatMoney.test.ts` covers the shared money helpers | ✅ run by `pnpm test:unit` in `apps/web` |

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
`eventEndpoints.directory({ period, search, mode, inviteOnly, page, limit })`
with `useSWRInfinite`, 12 cards per page (`PAGE_SIZE`), mapped through
`utils/toDisplayEvent.ts` into `EventCardEvent`. Search, the Upcoming/Past split
and the type filter are all sent to the API; the browser no longer fetches 100
events and filters them. The count above the grid is `pagination.total`, and a
"Load more events" pill button (same `rounded-full border-brand/35 text-brand`
style as "Reset filters") fetches the next page. Typing is debounced by 300 ms
(`SEARCH_DEBOUNCE_MS`) before it is sent. The page has error and retry states and
passes `{ keepPreviousData: true, revalidateAll: true }` to `useSWRInfinite`:
`keepPreviousData` avoids an empty-grid flash while a new filter loads, and
`revalidateAll` refetches every loaded page when `/events` is reopened, which is
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
real divergences: the primary filter dropdown is **Upcoming/Past**, not a cause
taxonomy - a live event has no cause field to filter by, and "what's happening
soon" is the more useful question here anyway - and a second dropdown
(`secondaryFilter`, September 2026) filters by `TypeFilter`
(`All`/`Invite only`/`Open to all`/`Online`/`Offline`), a flat single-select
list over the two real `inviteOnly`/`mode` fields rather than combinable
checkboxes. Both directories still render the same `DirectoryToolbar` component,
so its search/count/button chrome cannot drift between them again; this page
supplies its own copy, filter options and button, plus the `secondaryFilter`
prop `/organizations` doesn't use (one filterable dimension there vs. two here).
`GET /events` takes `search`, `period`, `mode` and `inviteOnly` (November 2026),
so the type filter maps to API params: `Invite only` is `inviteOnly=true`, `Open
to all` is `inviteOnly=false`, and `Online`/`Offline` are `mode`. Search matches
only name, city and host name now; the old browser search also matched summary,
country, platform and mode. Upcoming sorts soonest first and Past most recent
first, decided by the API.

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

## `DetailedEvent.tsx` — the page a card opens

Routed at `/events/:eventId` (`app/routes/routesConfig.tsx`), where `:eventId`
is a real event's `uid`.

**Live data, September 2026.**
`useSWR<ApiEvent>(eventId ? eventEndpoints.byUid(eventId) : null, fetcher)` —
the same conditional-key / loading / error-or-missing / view four-way branch
`OrganizationProfile.tsx` already uses for its own single-record fetch.
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
`inviteOnly` (organizer-settable; `EventJoinPanel` replaces the Join control
with an honest "ask the organizer" state, and `EventFacts`'s "Who can come" cell
reports it, when set). See
[apps/api/docs/specs/events.md](../../../../../apps/api/docs/specs/events.md)
for the schema.

**Registration is saved, but capacity is still untracked.** Joining calls
authenticated `POST /events/:uid/join` and saves one registration per account.
The API sends confirmation to the account email only in production; development
and test suppress delivery and report `emailSent: false`. Past and invite-only
events are rejected by the API. `going`/`spotsLeft` stay undefined on
`DisplayEvent`; do not derive counts from registrations. See
[known-issues.md](../../../../../docs/specs/known-issues.md#events--attendee-capacity-not-tracked).

**Every `EventSection` with nothing behind it doesn't render** — "About this
event" (`detail.about`), "How the day runs" (`detail.agenda`), and "What to
bring" (`detail.bringAlong`) are all conditional on their array being non-empty,
matching `OrganizationProfileView`'s own rule for sections with nothing behind
them. "The details" (`EventFacts`) always renders — it degrades gracefully
per-cell instead of disappearing. The location/join section renders
unconditionally too, but `EventLocationPanel` itself returns `null` if there's
genuinely nothing to show (no address on an offline event, no platform on an
online one).

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

**Below `lg`, the join CTA also lives in a floating "liquid glass" bottom
capsule (September 2026, `EventMobileActionBar`)**, so it's reachable regardless
of scroll position, not just at the top of the page.
`backdrop-blur-2xl backdrop-saturate-150` over a translucent white, inset the
same `px-9` margin as `EventHero`/`EventJoinPanel` above it rather than flush
with the screen edges. It shares the same `joined` state and `onToggleJoin`
callback as `EventJoinPanel` — one state, mirrored in two places, not two
controls that could disagree — and mirrors only the primary action (cost,
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

Routed at `/organization/events/new` for signed-in organization accounts with a
live public profile. Since November 2026 the file exports `EventForm` (the form
itself) next to the default `CreateEvents` (which renders `EventForm` with blank
values); `pages/EditEvent.tsx` renders the same `EventForm` with a stored event
for `/organization/events/:eventId/edit`. In edit mode (`original` prop) the page
address is read-only, the heading is "Edit your event", the buttons read "Save
changes" and "Discard changes", and `useEvent` sends only the changed fields to
`PATCH /events/:uid`. The blank values are built by `createInitialEvent()` when
the form opens, no longer once at module load.

This is a page, not a modal. It uses a responsive form with three sections,
native date/time controls, mode-specific location or meeting details,
invite-only access, image upload, and a live event preview. Event name and
description character counts sit beside their field labels. The description
includes a prompt for useful event details. The event page address is an
editable URL-safe path ending generated from the event name; it is part of the
KarmaCircle page URL, not an external site. Online meeting URLs must be absolute
HTTP or HTTPS URLs. Submit errors are shown inline and focus moves to the first
invalid field. On success, the organizer lands on `/events/:uid`.

**Local state, `event`:**

```js
{
  name: "", startDate: dayjs().add(1, "day"), endDate: dayjs().add(1, "day"),
  startTime: dayjs().add(1, "hour"), endTime: dayjs().add(2, "hour"),
  mode: "Offline", uid: "", description: "",
  city: "", state: "", address: "", country: "India",
  coverImage: "", inviteOnly: false,
  platform: "Zoom Meeting", platformLink: "",
}
```

The date and time pickers hold separate values; `useEvent` combines each pair
into a timestamp before sending the API request.

**Cover image:** image uploads are limited to 5 MB and to PNG, JPEG, WebP or GIF
(`constants/coverImageTypes.ts`, mirroring `COVER_IMAGE_MIME_TYPES` in the API's
`event.constants.ts`; the file input's `accept` and the error text come from
the same constant). Choosing a file runs `uploadCover` (`utils/uploadCover.ts`):
it asks the API for a five minute token (`RequestCoverUpload`, `POST
/events/cover-upload`), sends the picture straight to the image service
(`SendCoverImage`, multipart, `Authorization: Bearer`, no cookies) and keeps
the `card` link it returns as `coverImage`, so the event stores a link of about
70 characters instead of the picture. While it uploads the form shows the chosen
file as a local preview with a progress bar (`role="status"`), and Publish,
Save as draft and Save changes are disabled, because saving then would lose the
cover. Choosing another file cancels the first, and leaving the page cancels
it too. When the API answers `503` (image uploads are not set up on that
server) the picture is read with `convertToBase64(file)` into a data URL and
sent inside the event as before, so a server without the image service still
works. Failures show the service's own message (too large, not an image,
damaged) or a plain one (expired, busy, no connection). The API rejects any other type, so the browser blocks
SVG, AVIF and BMP up front instead of failing on submit. The form starts without
a placeholder asset and shows an intentional preview placeholder until the
organizer chooses an image.

**Mode-dependent fields:** `mode === "Offline"` shows address, city, state, and
country; `mode === "Online"` shows a video platform and meeting link. The API no
longer requires the legacy `mapIframe` field; event detail builds a map search
link from the saved address.

**Submit:** `handleSubmit()` validates the current values, focuses the first
invalid field, and prevents duplicate submission while the API call is in
flight. `submitCallback` receives a success callback; after the API confirms
creation, it navigates to the new event detail page.

## `hooks/useEvent.ts` — pairs with `CreateEvents` only

```js
export function useEvent(event) → { validateEvent, submitCallback }
```

**Called once per render** of `CreateEvents.tsx` (it's invoked directly in the
component body, not memoized), receiving that render's current `event` state.
The submit handler passes the validation result directly to `submitCallback`, so
a later render cannot replace it with an empty or stale error object.

**`validateEvent()`:**

1. `const { uid, ...data } = event;` — `uid` is checked separately from the rest
   of `data`.
2. The event page address must use lowercase letters, numbers, and single
   hyphens, and must not be a reserved word (`RESERVED_EVENT_ADDRESSES` in
   `constants/reservedEventAddresses.ts`: `mine`, `new`, `create`, `edit`,
   `admin`, `api`). Offline events require city, state, country, and address;
   online events require a platform and an absolute HTTP or HTTPS meeting URL.
3. Name length must be 10–80 characters, description length must be 20–200
   characters, the combined end date/time must be strictly after the combined
   start date/time, and the start date/time must be in the future. The API
   enforces the same rules (see
   [apps/api/docs/specs/events.md](../../../../apps/api/docs/specs/events.md)).
4. Returns the field-error object for display and submission.

**`submitCallback(event, onSuccess, errors)`:**

- If the supplied error object is empty, calls `CreateEvent()`
  (`KarmaCircleApi.ts`, `POST /events/create`). It combines each selected date
  with its selected clock time before sending `startTime` and `endTime`, and
  sends date-only `startDate` and `endDate` values.
- On `response.status === 201`, it shows a success toast, runs the success
  callback to open event detail, and revalidates the current organization's
  `eventEndpoints.byHost()` key. It does not touch the public directory: that
  uses `useSWRInfinite`, whose keys SWR's global `mutate` skips, so
  `Events.tsx` refetches every loaded page itself (`revalidateAll`).
- On failure, it shows the API error message when available, otherwise a generic
  retry message.
- **Edit mode** (`useEvent(event, original)`, November 2026): if `original` is
  passed it takes the edit branch instead. It builds the body with
  `buildEventChanges(event, original)`; an empty body shows "Nothing has changed
  yet." and sends nothing; otherwise it calls `UpdateEvent(original.uid, changes)`
  (`PATCH /events/:uid`, returns `{ ok, status, message, errors }` instead of
  throwing), shows "Event updated" on success, runs the success callback and
  revalidates `eventEndpoints.byUid(uid)` and the host list, and on failure shows
  the API's first field error or message. `validateEvent()` skips the page address
  checks when editing and applies "start in the future" only to a moved start.
- If `errors` is non-empty: a single generic toast, "Please fill all the
  required fields" — no per-field detail in the toast (per-field detail is shown
  inline via `errors.name`/`errors.uid`/etc. in the form itself).
- Server-side rule failures (a `400` with `errors: [{ path, message }]`, or the
  `409` for a taken address) only surface as the API's top-level message
  (`Validation failed` for a `400`); the per-field messages are not shown yet.

## Event display components

- **`EventCard.tsx`** — renders from its `event: EventCardEvent` prop. It shows
  a cover image or fallback, a date badge, event name and summary, and event
  location or online details. Live records have no cause or capacity fields, so
  the card does not invent a cause label or "going / spots left" count (see
  [known-issues.md](../../../../../docs/specs/known-issues.md#events--rsvp-and-attendee-capacity-future-scope-deliberately-not-built),
  future scope). **The date is split across the two surfaces on purpose** -
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
  "Invite only" (`inviteOnly`, neutral) — were added top-right on the cover in
  the same slot `OrganizationCard`'s "Featured" pill uses, stacked when an event
  carries both.

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

- **`EventsMarqueeCards.tsx`** - an unused event card component that renders a
  cover, name, location or online platform, and start date/time from its `event`
  prop. **Not rendered by any page.** Its future placement remains undecided.

## Deleted files, November 2026

`components/HostedEvents.tsx` (an empty 0-byte file) and `services/Events.ts`
(`getEvents()`, an unused `apiConnector` fetcher) were deleted, together with
`eventEndpoints.all`, which only `getEvents()` used. The orphaned
`HosedEvents.scss` sibling mentioned in earlier versions of this spec no longer
exists on disk either. A "my hosted events" view for the dashboard is new work;
`YourEvents.tsx` is the existing hosted-events page.

## `utils/convertToBase64.ts`

`convertToBase64(file)` wraps `FileReader.readAsDataURL` in a promise and
rejects if the result cannot be read. The page validates the selected image and
handles upload errors inline before updating form state.

## `utils/getFormattedDate.ts`

Pure function, `getFormattedDate(dateString) → "1st January"`-style string
(day + ordinal suffix + full month name, no year). Correctly handles the
11th–13th "th" exception (unit-tested in `getFormattedDate.test.ts`). A missing
or invalid date returns "NaNth undefined" (recorded as an `it.todo`). No timezone handling - relies on
`new Date(dateString)`'s local-timezone interpretation, whatever that resolves
to in the visitor's browser. Only consumer is `EventsMarqueeCards.tsx` (itself
unused) — so this function currently has no live call path either.

## Data flow summary — live event reads and creation

```
Events.tsx render
   ▼
GET /events via eventEndpoints.directory({ period, search, mode, inviteOnly, page, limit })
and useSWRInfinite (12 per page, Load more events)
   ▼
toDisplayEvent() maps each ApiEvent to EventCardEvent
   ▼
EventCard renders the live event
```

```
CreateEvents.tsx — full-page form at /organization/events/new
   ▼
local `event` state (name/dates/mode/uid/description/coverImage/mode-specific fields/inviteOnly)
   ▼
handleSubmit() → validateEvent() → submitCallback(event, onSuccess, errors)
   ▼
CreateEvent(event)   [KarmaCircleApi.ts, POST /events/create]
   ▼
201 ──► toast, open event detail, revalidate directory and current host list
```

```
EditEvent.tsx - /organization/events/:eventId/edit
   ▼
GET /events?uid (SWR, no revalidate on focus) → owner, not cancelled, not ended?
   ▼
EventForm (original = stored event) → validateEvent() → submitCallback()
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
DetailedEvent.tsx: "Leave event" → ConfirmDialog → LeaveEvent(uid)
   ▼                                              [DELETE /events/:uid/registration]
200 ──► toast, registration state and the event (going, spots left) revalidated
```

```
YourEvents.tsx → "Cancel event" → CancelEventDialog → CancelEvent(uid)
   ▼                                                  [POST /events/:uid/cancel]
200 ──► toast, revalidate the host list (row gets a Cancelled pill, no actions)
```

## Types

`types/index.ts` re-exports the feature interfaces and types. `ApiEvent` models
the API event response, `EventCardEvent` is the directory card view model, and
`DisplayEvent` plus `EventDetailContent` provide the detail-page view model.
`Events.tsx` maps `ApiEvent` records with `toDisplayEvent()` and passes the
resulting `EventCardEvent` to `EventCard`. `EventFormState`, `EventFormErrors`,
and `UseEventResult` describe the shared live form and its hook. (The
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
- `EventsMarqueeCards.tsx` still isn't rendered anywhere, and
  `getFormattedDate.ts` exists only for it. `utils/formatEventFacts.ts` has its
  own `formatEventDate`/`formatEventBadge` (real ISO timestamps, matching every
  live `Event` field) while `getFormattedDate` takes the API's `{ date, time }`
  string pair — if `EventsMarqueeCards.tsx` is ever wired up against a live
  record, the two date formatters should collapse into one rather than staying
  split.
- `convertToBase64.ts`'s `converter` can hang forever on a falsy file (currently
  unreachable via the guarded call site) — new finding.
- **Unit-tested helpers with open bugs (November 2026):** `formatDuration`
  returns "NaN days" for an unreadable date, `getFormattedDate` returns "NaNth
  undefined", and `fundedPercent` (shared `@utils/formatMoney`) has no lower
  clamp and returns NaN for NaN input. See `known-issues.md` and the events
  to-do list (T-8).
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
  `DeleteDraft` with the draft rows in `YourEvents.tsx`. Hybrid needs both the venue
  and the stream; the kind is required by the form; a draft is visible only to its
  organization. See [docs/specs/events.md](../../../../../docs/specs/events.md).
- **"Leave an event" / "capacity" / "attendee list" / "check-in" / "more event
  details"** → all exist (November 2026): `LeaveEvent` and `ConfirmDialog` in
  `DetailedEvent.tsx`, `capacity` in the form and `capacityCounts` in
  `toDisplayEvent.ts`, `EventAttendees.tsx`, and `EventDetailsSection.tsx` with
  `eventDetailFields.ts`. Going and spots left are shown only for an event with a
  capacity. See [apps/api/docs/specs/events.md](../../../../apps/api/docs/specs/events.md).
- **"Edit an event" / "cancel an event"** → both exist (November 2026): edit is
  `EditEvent.tsx` + `EventForm` + `buildEventChanges`, cancel is
  `CancelEventDialog` in `YourEvents.tsx`. The page address cannot change, a
  cancelled event cannot be edited, and nobody is emailed (PG-18); see
  [apps/api/docs/specs/events.md](../../../../apps/api/docs/specs/events.md).
- **"Add event creation" / "fix the create event button"** → both `/events` and
  `/organization/events` now mount `CreateEvents.tsx` + `useEvent.ts`, which
  submit to `POST /events/create`. The old `CreateEvent.tsx` profile-editor copy
  is deleted; do not recreate it. The backend schema accepts the basic fields
  plus `inviteOnly`; detail-page fields
  (`about`/`agenda`/`cost`/`fundraiser`/etc.) are still not creatable through
  the endpoint and require a future API change.
- **"Review the Events page SEO label"** → `Events.tsx` currently uses
  `type="Events"`; verify the route and title branch before changing it.
- **"Build a 'my hosted events' view for the dashboard"** → `YourEvents.tsx`
  (`/organization/events`) is the existing hosted-events page; the empty
  `HostedEvents.tsx` placeholder was deleted in November 2026.
- **"Show a real event's location/platform info somewhere"** -> the routed event
  directory, event detail page, organization profile's hosted-event section, and
  My Events page already render live event data. Check the relevant feature spec
  before wiring the unused `EventsMarqueeCards.tsx` into a new surface.
- **"Add RSVP / attendee capacity"** → deliberately not built yet, see
  [known-issues.md](../../../../../docs/specs/known-issues.md#events--rsvp-and-attendee-capacity-future-scope-deliberately-not-built)
  for what it would need (a `capacity` field, a write endpoint, an attendee
  collection). A materially bigger piece of work than the trust/detail fields
  added in September 2026 — don't fold it into a smaller-scoped change without
  calling that out.
- **"Let organizers set the government-sponsored flag themselves"** → don't —
  that's the one field deliberately kept server/seed-only, mirroring
  `Organization.verified`, precisely so it can't be self-declared. If a real
  verification workflow is ever wanted, it needs an admin-only route (which
  doesn't exist for `Organization.verified` either yet), not a client-writable
  field on `createEventSchema`.
