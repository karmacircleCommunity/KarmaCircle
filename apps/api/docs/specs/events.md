# Events Module

[src/modules/events/](../../src/modules/events/) — list events (all, or one by
`uid`), create an event as the authenticated host, edit it and cancel it, let an
attendee join and leave (with an optional capacity), and give the host an attendee
list with check-in. Owns the `Event` and `EventRegistration` models.

## `event.model.ts`

`model<IEvent>("Event", ...)`, `{ timestamps: true }` (adds
`createdAt`/`updatedAt` automatically).

| Field                                              | Type                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `description`                              | `string` (required, trimmed)                                       |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `uid`                                              | `string` (required, unique URL-safe slug)                          | The final path segment for the event's KarmaCircle page at `/events/:uid`; it is not an external website URL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `hostUsername`, `hostName`                         | `string` (required)                                                | **Set by the server** from the authenticated caller's own `User` record — never accepted from the request body (see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `organizerHandle`                                  | `string?`, indexed                                                 | **September 2026, tightened later the same month.** The real link to the `organizations` collection, set by the server (never from the request body) from the host's own `Organization` record. `createEvent()` now rejects a non-organization host outright (`403 NOT_AN_ORGANIZATION` - see `event.service.ts` below), so this is never unset for a newly created event; still `?`/optional on the schema only for defensive typing against a pre-existing/malformed document. `hostUsername`/`hostName` above are unchanged and stay as the free-text snapshot; this is the field an organization's public profile actually queries by (see below) |
| `coverImage`                                       | `string?` (trimmed)                                                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `mode`                                             | `"Online" \| "Offline" \| "Hybrid"` (required, `enum`) | Where it happens. **`Hybrid` (November 2026, PG-10)** has a venue and a live stream, so it needs the in-person fields and the online ones and keeps both sets of notes. `enum:` is the only hard constraint on a field in this module otherwise |
| `address`, `city`, `state`, `country`, `mapIframe` | `string?` (trimmed)                                                | Offline events require address, city, state, and country; the legacy `mapIframe` field remains optional and is not rendered by event detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `platform`, `platformLink`                         | `string?` (trimmed)                                                | Online events require a platform and an absolute HTTP or HTTPS meeting URL; offline events do not require these fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `startTime`, `endTime`, `startDate`, `endDate`     | `Date` (all required)                                              | Four separate date/time fields rather than two combined datetimes — see the frontend's own event-creation spec for how its date/time pickers populate these                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `isGovernmentSponsored`                            | `boolean`, default `false`                                         | **September 2026.** A trust badge, not a real government API integration — mirrors `Organization.verified` exactly: server/seed-set only, absent from `createEventSchema` entirely, so a client-supplied value is silently stripped by Zod before it ever reaches `event.service.ts` (see `tests/events.test.ts`). Letting an event's own creator self-declare government backing would be trivially fake-able, which is the whole reason `Organization.verified` isn't client-writable either                                                                                                                                                        |
| `access`                                           | `open` \| `approval` \| `invite`, absent on old events           | **November 2026 (PG-4).** Who can join. Organizer-settable on create and edit. Always read through `effectiveAccess()`: an event with no `access` is `open`, or `approval` if its old `inviteOnly` flag was set. The JSON the API returns always carries `access` and never `inviteOnly` |
| `inviteOnly`                                       | `boolean?`, retired                                                | **Retired November 2026.** Never written or accepted any more; kept in the schema only so old documents can be read (see `access`). Create and edit drop it like any unknown field |
| `waitlistEnabled`                                  | `boolean`, default `true`                                          | **November 2026 (PG-14).** Whether a full event takes a waitlist. Organizer-settable on create and edit |
| `capacity`                                         | `number?` (integer, 1 to 100000)                                   | **November 2026 (PG-5).** Most people who can join; absent means no limit. Settable on create and edit (`null` removes it on edit)                                                                                                                                                                                                              |
| `registrationCount`                                | `number`, default `0`                                              | **November 2026 (PG-5).** How many people are registered, kept in step with `EventRegistration` by `joinEvent` and `leaveEvent` with atomic `$inc`s so the last spot cannot be taken twice. **Only trustworthy for an event with a `capacity`**: `updateEvent` recounts it from the registrations whenever it sets a capacity, which also covers events saved before the field existed, and the web only shows going and spots left when a capacity exists |
| `status`                                           | `"draft" \| "published" \| "cancelled"`, default `"published"`   | **November 2026 (PG-2, PG-15).** Where the event is in its life. A **draft** is saved but visible only to its own organization; **published** is public; **cancelled** stays public with a badge. Postponed is still to do. A document with no stored status reads as `published`. Create may send `draft` or `published`; after that only the publish, unpublish and cancel routes change it (an edit body with `status` is a `400`) |
| `cancelledAt`                                      | `Date?`                                                            | Set when `status` becomes `cancelled`, never cleared (there is no reinstate)                                                                                                                                                                                                                                                                  |
| `timezone`                                         | `string?` (an IANA name such as `Asia/Kolkata`, or `UTC`)           | **November 2026 (PG-11).** Which clock the organizer meant. `startTime` and `endTime` are exact instants either way; this does not move them. Validated against the runtime's own timezone database (`isValidTimeZone`) and only the full `Area/Location` form is accepted (legacy abbreviations such as `IST` are refused because they are ambiguous). Optional, so older events and clients keep working; the web form always sends one. Editable, never removable (`null` is a `400`) |
| `eventType`                                        | `"volunteering" \| "fundraiser" \| "workshop" \| "awareness" \| "meetup" \| "cultural" \| "other"`? | **November 2026 (PG-9).** What kind of event it is. Optional in the API for compatibility with older events and clients; the web form requires it. No `hackathon` value: whether hackathons are an event type is still decided in PG-27 |
| `tags`                                             | `string[]` (lower-case, trimmed, de-duplicated, at most 8, each at most 30 characters) | **November 2026 (PG-9).** Free-text tags. The directory search matches them; `[]` clears them on edit. Counting is on what was submitted, so a ninth tag is refused even if it repeats an earlier one |
| `about`                                            | `string[]?`                                                        | Long-form paragraphs for the detail page's "About this event" section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `agenda`                                           | `{ time, title, detail? }[]?`, own sub-schema                      | The timeline/run-sheet. `time` is a pre-formatted wall-clock label ("9:00 am"), not a `Date` — a schedule is written in the event's own timezone, and converting it to a reader's own would be actively wrong for anyone reading from elsewhere                                                                                                                                                                                                                                                                                                                                                                                                       |
| `bringAlong`                                       | `string[]?`                                                        | What an attendee should turn up with, or be ready for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `gettingThere`                                     | `string?`                                                          | Offline events — directions, alongside `address`/`city`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `linkDelivery`, `joinRequirements`                 | `string?`                                                          | Online events — how/when the join link reaches an attendee, and anything they need ready before joining                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `cost`                                             | `{ amount, currency, note? }?`, own sub-schema                     | Absent means free, which is nearly every event on the circle — never set `amount: 0` for a free event; omit the field entirely instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `fundraiser`                                       | `{ purpose, goal, raised, currency, supporters }?`, own sub-schema | The money an event is raising alongside the volunteering, if any — same vocabulary as `Organization.fundsRaised`/`fundsGoal`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `languages`                                        | `string[]?`                                                        | Languages the session is actually run in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `minimumAge`                                       | `number?`                                                          | Set only where there's a real restriction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `contactEmail`                                     | `string?`                                                          | Shown on the detail page's join panel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

All of the September 2026 fields above follow the same nested-sub-schema
convention `organization.model.ts` established for
`leadership`/`socialLinks`/`sponsorship` — `_id: false` sub-schemas for
structured fields (`agenda`, `cost`, `fundraiser`) rather than flat scalars, and
a plain default for the two booleans.

**Capacity (November 2026, PG-5).** An event can carry a `capacity`. Joining
reserves a spot first with one atomic update (`findOneAndUpdate` on the event,
matching only while there is no capacity or `registrationCount < capacity`, with
`$inc: { registrationCount: 1 }`); no match is `409 "This event is full."`. If the
registration cannot then be saved, the spot is given back. An attendee who is
already registered still gets `200 alreadyJoined` from a full event, because that
check comes before the reservation. Leaving gives a spot back (never below zero).
`GET /events` returns `capacity` and `registrationCount` with every event; the
count is an aggregate, never identities.

**Public reads remain unauthenticated, while joining requires `requireAuth`.**
`POST /events/:uid/join` stores one registration per event and authenticated
user and, depending on the event's access level, makes the person going, pending
or waitlisted (see "Access levels, requests, the waitlist and invitations"
below); it blocks past events, and sends a confirmation email to the
account email only to a person who is going, and only in production. In development and test, delivery is
suppressed and `emailSent` is `false`. A production email failure does not undo
registration; response also includes `emailSent: false`. Editing or cancelling an
event does not email the people who joined (PG-18). A new registration does email the organization owner
(see `POST /events/:uid/join`). The separate organization dashboard aggregates registration counts but
does not return attendee identities. The full-page frontend form at
`/organization/events/new` calls this `POST /events/create`; the API
independently enforces organization account access. See the frontend's
[event lifecycle reference](../../../../docs/specs/events.md#event-lifecycle-agent-reference)
and [API contract map](./api-contract.md).

## `event.service.ts`

- **`findByUid(uid)`** / **`findAll(filters, pagination)`** - no projection
  (unlike `users`, nothing here strips fields - an `Event` document has no
  secret fields to hide, so this is fine as-is). `findAll` builds one `$and` of
  the optional filters (`host`, `search`, `period`, `mode`, `type`, `access`; see
  `GET /events`), sorts by `startTime` then `_id`, and counts with the same
  filter.
- **`createEvent(email, data)`** — `409 EVENT_UID_ALREADY_EXISTS` if `data.uid`
  is already taken. A friendly `Event.exists({ uid })` pre-check answers the
  common case; because that check is not race-safe on its own, `event.save()` is
  wrapped so a Mongo `11000` duplicate-key error from the schema's unique `uid`
  index (two organizers submitting the same address at once) is also turned into
  `AppError(409, EVENT_UID_ALREADY_EXISTS)` (`'Please choose another unique event
  uid !'`). The unique index is the real guard (fixed November 2026, was CH-7).
  Looks up the host via `findByEmail(email)` (from `requireAuth`'s
  `req.auth.email`) — `401 UNAUTHORIZED` if that somehow fails (same "token
  valid but account gone" edge case as
  [organizations.md](./organizations.md#get-organizationsdashboard)).
  **`403 NOT_AN_ORGANIZATION` if that host isn't an organization** (tightened
  after September 2026's own launch of this pass - previously an individual host
  was allowed through with `organizerHandle` left `undefined`, which meant a
  card/detail page for one of those events had no organization to link back to;
  every event on the circle is meant to be an NGO-run drive). For an
  organization host, resolves the `Organization` record via `organizations`'
  `findOrCreateForOwner` (not `findByOwnerEmail`) - the same backfill
  `organization.controller.ts#getMine`/`updateMine` already rely on, so a
  pre-split legacy organization account still resolves to a real document rather
  than `null`. Builds the `Event` as
  `{ ...data, hostName: host.name, hostUsername: host.userName, organizerHandle: organization.handle }`
  — **`hostName`/`hostUsername`/`organizerHandle` in the request body, if sent,
  are silently overwritten** by the authenticated caller's own values; there's
  no way to create an event on someone else's behalf through this endpoint,
  which is presumably intentional.
- **`leaveEvent(email, uid)`**, **`listAttendees`**, **`exportAttendeesCsv`**,
  **`setCheckIn`**, **`findOrganizerEmail`** (November 2026, PG-3, PG-5 and
  PG-6) - see the leave, attendees, join and Capacity sections above.
  `updateEvent` applies `capacity` through `applyCapacity`: a number recounts
  `registrationCount` from the real registrations and is refused with `409
  "Capacity cannot be lower than the N people already registered."` if it would be
  below them; `null` removes the limit.
- **`updateEvent(email, uid, data)`** / **`cancelEvent(email, uid)`** (November
  2026, PG-1 and PG-2) - both start with `findManagedEvent` (event exists, caller
  is an organization, caller hosts it) and `assertEventStillOpen` (`409` for a
  cancelled or ended event). `updateEvent` merges the body onto the stored
  event, re-checks the cross-field rules with `assertEventRules` (a future start
  is required only if `startTime` changed), applies the body with `event.set`,
  unsets the other mode's fields, and saves. `cancelEvent` sets `status` and
  `cancelledAt` and saves. `joinEvent` now also refuses a cancelled event.

## `PATCH /events/:uid` (edit)

**November 2026 (PG-1).** `requireAuth` → `validate(eventUidParamsSchema,
"params")` → `validate(updateEventSchema)` → `eventController.updateEvent`.
Only the organization that hosts the event can call it.

- **Body:** any non-empty subset of `name`, `description`, `coverImage`, `mode`,
  `startTime`, `endTime`, `startDate`, `endDate`, `access`, `waitlistEnabled`, `city`, `state`,
  `country`, `address`, `mapIframe`, `platform`, `platformLink`. Each present
  field follows the same rule as create (lengths, cover image type and size).
  The schema is `.strict()`: an unknown key is a `400`, so a client can never
  slip in `isGovernmentSponsored`, `status`, or `hostUsername`, and sending
  **`uid` is a `400`** because the page address never changes (registrations
  point at it, see DB-5 in the events to-do list). An empty body is a `400`.
- **Cover image:** omit it to keep the current one. The web edit form only sends
  it when a new image was chosen. A new cover is an https link to an uploaded
  image (see "Cover images" below).
- **Cross-field rules** run in the service on the stored event merged with the
  body (`assertEventRules`, shared with create through `addEventRuleIssues` in
  `event.validation.ts`): the end must follow the start; an Offline event needs
  city, state, country and address; an Online event needs platform and an
  http(s) meeting link. A **start time that is left alone may already be in the
  past** (an event in progress can still fix a typo), but a **new start time
  must be in the future** (`requireFutureStart` is only set when the body's
  `startTime` differs from the stored one). A failure is the usual
  `400 { message: "Validation failed", errors: [{ path, message }] }`.
- **Switching mode** drops the other mode's fields from the document (Offline
  to Online unsets `address`, `city`, `state`, `country`, `mapIframe`; Online to
  Offline unsets `platform`, `platformLink`), so a stale address is never stored
  but hidden.
- **Ownership** (`findManagedEvent`, shared with cancel): `404` for an unknown
  event, `401` if the token's account is gone, `403 NOT_AN_ORGANIZATION` for a
  personal account, `403 FORBIDDEN` for another organization's event. An event
  matches its host by `organizerHandle` or, for events saved before that field
  existed, by `hostUsername`.
- **Locked events:** `409 "A cancelled event cannot be edited."` and `409 "An
  event that has already ended cannot be edited."` (an event is editable until
  its `endTime`).
- **Success:** `200 { message: "Event Updated", event }` with the saved
  document. Existing registrations are untouched.

## `POST /events/:uid/cancel`

**November 2026 (PG-2).** `requireAuth` → `validate(eventUidParamsSchema,
"params")` → `eventController.cancelEvent`. Same ownership checks as edit.
Decided while Tamal was away, to be confirmed: a cancelled event **stays public
with a badge** instead of being removed, and there is **no delete route and no
reinstate**.

- Sets `status: "cancelled"` and `cancelledAt: now`; `200 { message: "Event
  Cancelled", event }`.
- `409 "This event is already cancelled."` for a second cancel, and `409 "An
  event that has already ended cannot be cancelled."` once `endTime` has passed.
- **Effects elsewhere:** `GET /events` and `GET /events/mine` keep returning the
  event with `status: "cancelled"`; `POST /events/:uid/join` refuses it with
  `409 "This event was cancelled."` (checked before the access level); existing
  registrations are kept, so the event stays in each attendee's My Events.
  Nobody is emailed (PG-18).

## `GET /events`

No auth. `validate(listEventsQuerySchema, "query")` —
`{ uid?, slug?, host?, search?, period?, mode?, type?, access?, page?, limit? }`
(pagination merged in from
[src/utils/pagination.ts](../../src/utils/pagination.ts), default
`page=1`/`limit=20`, capped at 100), and the controller reads **either**
`uid`/`slug` (`const eventUid = uid ?? slug`, `uid` wins if both are present).
If either is set: `findByUid` → `404 NOT_FOUND` if none, single event object
(`page`/`limit` accepted but ignored on this branch). Otherwise: the events as
`{ data, pagination }` - `eventService.findAll({ host, search, period, mode,
type, access }, { skip, limit })` runs the `find` and a `countDocuments` in
parallel over the same filter, so `pagination.total` counts every matching event,
not the page size. The response shape is unchanged. **`host`**
(August 2026, matching widened September 2026) narrows that list to one host's
own events, matched with `$or` against **either** `organizerHandle` (the real
link) **or** the legacy `hostUsername` string — so an event created before
`organizerHandle` existed still matches with no backfill migration needed, since
an organization's `hostUsername` has always equalled its `handle`. It backs the
frontend's `/organization/events` page and, new in September 2026, an
organization's public profile ("Events hosted"); the filter is server-side
precisely so a host with more events than one page still sees all of them (see
the frontend's [events.md](../../../../docs/specs/events.md)). The `slug` alias
exists because the frontend's `eventEndpoints`/route naming uses "slug" in some
places and "uid" in others for what is the same field on this side — see
[api-contract.md](./api-contract.md#get-events) before assuming which query
param name a given frontend call site actually sends.

**Directory filters (November 2026).** All optional, all combinable with `host`
and with each other:

- **`search`** - trimmed, at most 100 characters; a blank value is ignored. A
  case-insensitive literal match (regex characters are escaped) on `name`,
  `city` or `hostName`. It is an unindexed scan.
- **Indexes (November 2026, was DB-3):** `(startTime, _id)` serves the directory's
  period split and order; `(hostUsername, startTime, _id)` and
  `(organizerHandle, startTime, _id)` serve a host's list, one per branch of its
  `$or`, in either direction; `uid` is unique. `tests/event-indexes.test.ts` asks
  MongoDB for the query plans and fails on a collection scan or a blocking sort.
  Mongoose builds missing indexes when the app connects, but never drops old ones:
  the retired `organizerHandle_1` index on `events` and `eventUid_1` on
  `eventregistrations` stay in a database that already has them until someone drops
  them by hand (harmless, only extra write cost).
- **`period`** - `upcoming` (`startTime >= now`, server clock) or `past`
  (`startTime < now`). Left out, every event is returned.
- **`mode`** - `Online`, `Offline` or `Hybrid`.
- **`type`** (November 2026, PG-9) - one of the seven event kinds above; an event
  with no kind never matches it. The kind filter combines with every other filter.
- **`search`** also matches an event's **tags** (since PG-9).
- **Drafts** (November 2026, PG-15) are never in a list unless the signed-in
  caller is the organization named by `host`: `optionalAuth` (it never rejects)
  reads the `Token` cookie, and only then does that host's own list include its
  drafts. `GET /events?uid=` returns a draft only to its own organization and `404`
  to everyone else, including another organization.
- **`access`** - `open`, `approval` or `invite`. `open` also matches events with
  no stored `access` and no old flag, and `approval` also matches events saved
  with the old `inviteOnly: true` flag, so no migration was needed.
- **`requestCount`** - on the host's own list only (the caller owns the `host`
  handle), each event also carries how many people are pending or waitlisted, from
  one grouped query for the page.
- **Order** - `startTime` then `_id` (the tiebreaker, so a page boundary never
  repeats or skips an event), soonest first, except `period=past` (most recent
  first). A host-filtered list with no `period` is newest first, so a host with
  more events than one page keeps its newest and upcoming ones and loses its
  oldest; the web `byHost` call asks for `limit=100`. Any other list with no
  `period` is soonest first.
- **Paging** - `page` and `limit` as before: default `limit` 20, hard maximum
  100. The web directory asks for 12 per page.

The `uid`/`slug` single-event branch ignores all of these. Tests:
`tests/events-directory.test.ts` (period split and order, search by name, city
and host, literal handling of regex characters, blank search, filter
combinations, mode and access including events with no stored `access`, `400`
for bad input, tied start times, totals, a page past the end, the 100 maximum,
the host filter, and a host with 21 events).

Every event the API returns carries `status` (`published` or `cancelled`). The
list filters do not hide cancelled events: the directory and the host list show
them with a badge.

## `POST /events/create`

`requireAuth` → `validate(createEventSchema)` → `eventController.createEvent`.
`createEventSchema` is `uid` plus `editableEventShape`, the field set it shares
with the edit schema (see `PATCH /events/:uid` above), then the shared
cross-field rules with a required future start.
**`403 NOT_AN_ORGANIZATION` if the authenticated account isn't an organization**
(see `event.service.ts` above) - every event needs a real organization behind
it, so this is checked before anything else in the service. Required always:
`uid`, `name`, `description`, `coverImage`, `mode`, `startTime`, `endTime`,
`startDate`, `endDate` (the four dates go through `z.coerce.date()`, so ISO
strings or anything `Date`-constructible are accepted, not just already-`Date`
values).

**Validation rules (November 2026)**, mirroring the browser form
(`useEvent.ts`). A failure returns `400 { message: "Validation failed", errors:
[{ path, message }] }`, one entry per broken rule:

- `uid` - lowercase letters, numbers and single hyphens, and not a reserved
  word: `mine`, `new`, `create`, `edit`, `admin`, `api`
  (`RESERVED_EVENT_UIDS` in `event.constants.ts`; the browser keeps its own copy).
- `name` 10 to 80 characters, `description` 20 to 200 characters.
- `endTime` must be strictly after `startTime` (error path `endTime`).
- `startTime` must not be in the past (error path `startTime`). Owner decision:
  past events cannot be created. A test that needs a past or already-started
  event therefore creates it through the `Event` model (and its registrations
  through the `EventRegistration` model), not through this route; the seed
  scripts write through the model too, so they are unaffected.
- `coverImage` - an https URL, at most 2048 characters: the link of an image
  uploaded through `POST /uploads/event-covers`, or one hosted elsewhere. A base64
  data URL is refused with "Upload the cover image and send its https link" (it is
  what used to put every image inside every event record, DB-1), and so are
  `http`, `javascript:` and `file:` links. In development and test only, an
  `http` link to this API's own `/uploads/files/event-covers/` is accepted too,
  because the local upload driver has no TLS. Events saved with a data URL before
  still read fine until `scripts/migrate-event-covers.ts` moves them.
- Maximum lengths: `city`, `state`, `country` 100; `address` 200; `platform` 60;
  `platformLink` 2048. `mapIframe` is still unbounded. Required **only if `mode` is `Offline` or `Hybrid`** (`createEventSchema`'s
`superRefine`): `city`, `state`, `country`, and `address` — each missing one
adds its own Zod issue at that field's path, so a partially-filled offline event
gets one `400` response listing every missing field at once, not just the first.
The old `mapIframe` field remains optional for legacy records and is not part of
the create form; event detail builds a map search link from the address. Online
and Hybrid events require `platform` and `platformLink` at the validation layer,
matching the organizer form, so a **Hybrid** event needs all six fields and a
`400` lists every missing one at once; the link must be http or https for both.
`eventType` and `tags` are optional (see the model table). `access` is optional and defaults to `open`; `waitlistEnabled` is optional and defaults to `true`. `capacity` is
optional (an integer from 1 to 100000; `null` is ignored on create).

**Optional detail fields (November 2026, PG-7).** The detail-page fields are now
accepted by create and edit through one shared shape (`detailShape` in
`event.validation.ts`). All are optional, and on edit `null` removes a scalar or
object field and `[]` clears a list:

| Field | Rule |
| --- | --- |
| `about` | up to 20 paragraphs, each trimmed, non-empty, at most **4000** characters (raised from 2000 in November 2026, PG-12). The text is stored exactly as typed; the web renders a small formatting set from it (bold, italic, http(s) links, lists) as React elements, never HTML, so the API does not sanitize and has no markup to strip |
| `contactEmail` | a valid email, at most 254 characters |
| `cost` | `{ amount, currency, note? }`: `amount` above zero and at most 10,000,000 (**zero is rejected**: absent means free), `currency` a 3-letter code (upper-cased), `note` at most 200; unknown keys rejected |
| `bringAlong` | up to 20 items, each at most 100 characters |
| `languages` | up to 10 items, each at most 40 characters |
| `minimumAge` | an integer from 1 to 120 |
| `agenda` | up to 30 rows of `{ time (1 to 30), title (1 to 100), detail? (at most 200) }`; unknown keys rejected |
| `gettingThere` | at most 500 characters, **in-person events only** |
| `linkDelivery`, `joinRequirements` | at most 300 characters each, **online events only** |

Only the chosen mode's notes are kept: `createEvent` and `updateEvent` drop
`gettingThere` from an Online event and `linkDelivery` and `joinRequirements`
from an Offline one. **Still not accepted:** `isGovernmentSponsored` (a
server-only trust badge, silently stripped on create and a `400` on edit) and
`fundraiser` (waiting on the money decision, PG-26); both are written by the seed
script directly. A duplicate `uid` is
`409` (see `createEvent` above), including the race where two requests pass the
pre-check together. On success:
`201 { message: "Event Created", savedEvent }` — note this response's top-level
shape (`message` + `savedEvent`, not `message` + `user`/`event`) is unique to
this route; every other module's create/success response in this API uses a
different key name for the payload (compare `users`' `user`, `products`' bare
object).

## `POST /events/:uid/join`

Requires `requireAuth`; registration identity and confirmation destination come
from the authenticated account, never the request body. Returns `404` for an
unknown event, `409` for a cancelled event, `409` once `startTime` has passed, and
`403` for an invite-only event when the person is not invited. An attendee who is
already registered gets `200 alreadyJoined` (with the standing they hold) next. Then, for an event with a capacity, **`409 "This event
is full."`** when no spot is left (see Capacity above: the spot is reserved
atomically before the registration is written and returned if the write fails).
A unique compound index on `(eventUid, userId)` makes the write
idempotent across retries and concurrent clicks. **A new registration also emails
the organization owner** (`sendEventJoinOrganizerNotice`: the attendee's name and
the running total, never their email), production only and best effort like the
attendee's own confirmation, and the owner is found from `organizerHandle` (or the
host user for an older event). There is no opt-out or digest yet, so a very
popular event sends one email per registration. New registration returns
`201 { joined: true, alreadyJoined: false, emailSent }`; an existing
registration returns
`200 { joined: true, alreadyJoined: true, emailSent: false }`. In development
and test, `emailSent` is `false` because delivery is suppressed. A production
confirmation failure is logged and also returns `emailSent: false`, while the
saved registration remains successful.

## `DELETE /events/:uid/registration` (leave)

**November 2026 (PG-3).** `requireAuth` → `eventController.leaveEvent`. Removes
the caller's own registration and gives the spot back (`releaseSpot`, which never
takes `registrationCount` below zero). `200 { message: "You left this event.",
joined: false }`. `404` for an unknown event, `404 "You are not registered for
this event."` if they were not registered, `401` without sign-in, and `409`
once the event has started (a registration from then on is a record of who was
there). A **cancelled** event can still be left, so an attendee can clear it from
My Events. The same person can join again afterwards if there is room.

## `GET /events/:uid/attendees`, check-in and CSV export

**November 2026 (PG-6).** All three are host only (same ownership checks as edit:
`401`, `403 NOT_AN_ORGANIZATION` for a personal account, `403 FORBIDDEN` for
another organization, `404` unknown event). The public never sees attendee
identities.

- **`GET /events/:uid/attendees`** - `?page=&limit=` (default 20, maximum 100) and
  an optional `search` (at most 100 characters, a literal case-insensitive match
  on name or email, regex characters escaped). Registrations oldest first. Returns
  `{ event: { uid, name, status, capacity }, data: [{ id, name, email, joinedAt,
  checkedIn, checkedInAt }], pagination, summary: { registered, checkedIn } }`;
  `pagination.total` counts the matches and `summary` counts the whole event.
- **`PATCH /events/:uid/attendees/:registrationId`** - body `{ checkedIn: boolean }`
  (strict). `registrationId` must be a 24-character ObjectId (`400` otherwise),
  and must belong to this event (`404` if not). Checking in someone already
  checked in keeps the original `checkedInAt`; `checkedIn: false` unsets it. A
  **cancelled** event answers `409 "A cancelled event has no check-in."`.
  Returns `{ attendee }`.
- **`GET /events/:uid/attendees/export`** - every registration as
  `text/csv; charset=utf-8` with `Content-Disposition: attachment;
  filename="<uid>-attendees.csv"`, columns Name, Email, Registered at (ISO),
  Checked in, Checked in at. Every cell is quoted, and a cell that starts with
  `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with `'` so a
  spreadsheet cannot run attendee-controlled text as a formula.

`EventRegistration` gained `checkedInAt` (a date, absent until checked in).

## Timezone (November 2026, PG-11)

`timezone` is optional on create and edit (`z.string().trim()`, at most 64 characters,
refined by `isValidTimeZone`: `UTC` or an `Area/Location` name that
`Intl.DateTimeFormat` accepts). A bad name is a `400` on path `timezone`. It never
changes `startTime` or `endTime`; the web form reads its date and time pickers in the
chosen zone and sends the resulting instants. `GET /events` returns it with every
event that has one. The join confirmation email (`sendEventJoinConfirmation`) writes
the start in the event's own zone with the zone named ("10:00 AM GMT+5:30") when
there is one, and in UTC with the old " UTC" suffix when there is not or the stored
value is unusable. `tests/events-timezone.test.ts` (17 tests) covers the validator,
saving, the instants staying exactly as sent, optional, invalid values, trimming,
editing, an older event gaining a zone, an untouched zone, and `null` refused;
`tests/mailer.test.ts` covers the email.

## `POST /events/:uid/publish`, `POST /events/:uid/unpublish`, `DELETE /events/:uid` (drafts)

**November 2026 (PG-15).** All three are host only (same checks as edit). The model
is: a draft is a saved event only its organization can see; publishing it makes it
public; a published event can go back to a draft while nobody has registered; a
draft can be deleted. A published event is never deleted, only cancelled.

- **`POST /events/:uid/publish`** - draft to published. The event must still pass
  the create rules (`assertEventRules` with a required future start, plus the
  mode's fields), so a draft whose start has since passed is a `400` on
  `startTime`. `409` if it is already published, cancelled or ended. `200 {
  message: "Event Published", event }`.
- **`POST /events/:uid/unpublish`** - published to draft. `409` if it is already a
  draft, cancelled or ended, and **`409 "N people have already registered, so this
  event cannot go back to a draft. Cancel it instead."`** once anyone has
  registered. `200 { message: "Event Unpublished", event }`.
- **`DELETE /events/:uid`** - deletes a **draft** for good (`200 { message: "Draft
  Deleted" }`); a published or cancelled event is `409 "Only a draft can be
  deleted. Cancel a published event instead."`. The page address is free again.
- **Cancelling a draft** is `409` (there is nothing public to cancel; delete it).
- **A draft cannot be joined, left or checked** by anyone: the join, leave and
  registration-check routes answer `404` for it (`findPublicByUid`), as if it did
  not exist. It is not counted or listed on the organization dashboard.
- **Creating** takes an optional `status` of `draft` or `published` (default
  published); a draft is held to the same rules as a published event.

## `GET /events/:uid/registration`

Requires `requireAuth`; looks up only the caller's registration and returns
`{ joined: boolean }`. Event detail calls this after loading when Redux reports
an authenticated session, so returning attendees see the registered state
without exposing attendee data publicly. Unknown event returns `404`.

## `GET /events/mine`

Requires `requireAuth`; resolves the caller from the auth cookie and returns
only events linked to that user's saved registrations as `{ data, pagination }`.
Accepts shared `page`/`limit` parameters (default page 1, limit 20, max 100) and
`period=upcoming|past` (default `upcoming`). Upcoming events have
`startTime >= now` and sort ascending; past events have `startTime < now` and
sort descending. The endpoint does not accept a user identifier and never
returns registration attendee details. The registration schema indexes `userId`
for this attendee lookup, alongside its unique `(eventUid, userId)` constraint and
`(eventUid, status, createdAt)` for the attendee list. A separate `eventUid` index
was removed in November 2026 because those two compound indexes already start with it.

## Access levels, requests, the waitlist and invitations (November 2026, PG-4 and PG-14)

This replaces the old `inviteOnly` flag, which was only a label that made every
join answer `403`. An event has an **access level** (`access`) and a registration
has a **status**.

- **Access levels.** `open`: anyone signed in joins. `approval`: anyone can ask
  and the organizer approves or declines each person. `invite`: only emails the
  organizer invited can join (still listed in the directory). A person who is
  invited joins straight in on any level.
- **Registration status** (`EventRegistration.status`, absent reads as `going`).
  `going` holds a spot and counts in `registrationCount`. `pending` (asked to join
  an approval event), `waitlisted` (the event was full) and `declined` hold no spot.
  A declined person cannot ask again; only the organizer can approve them later.
  `note` (up to 300 characters, `joinBodySchema`) is stored on a request and shown
  on the attendee list.
- **`POST /events/:uid/join`** (optional body `{ note? }`, ignored when the person
  goes straight in): an invited email becomes `going`, on any level, even when full
  and past the capacity, and marks the invitation used; an `invite` event without
  an invitation is `403`; an `open` event takes a spot atomically, or waitlists the
  person when full and `waitlistEnabled`, or answers `409 "This event is full."`
  when the waitlist is off; an `approval` event makes the person `pending`, or
  `waitlisted` when it is already full and the waitlist is on. Response:
  `{ message, joined, status, alreadyJoined, emailSent }` (`201`, or `200` for a
  repeat). Only a person who is going gets the confirmation and the organizer's
  notice email.
- **Waitlist.** Promotion is manual: nobody moves up when a spot opens or the
  capacity is raised. Approving or moving someone up on a full event is allowed and
  goes past the capacity (Full is a soft limit, and the page shows no spots left,
  never a count past the cap).
- **`POST /events/:uid/attendees/:registrationId/approve`** and **`/decline`**
  (host only, `requireAuth`): approve moves a pending, waitlisted or declined person
  to `going` and takes a spot (idempotent for someone already going), and emails
  them the join confirmation in production; decline sets `declined`, releases the
  spot if they were going and clears their check-in. `409` for a cancelled event
  (and for approving after the event ended), `404` for an unknown registration,
  `403` for anyone but the host. Response `{ attendee }`.
- **`GET /events/:uid/attendees?status=`** (`going` by default, or `pending`,
  `waitlisted`, `declined`, `all`) lists that status; `event` now carries `access`
  and `waitlistEnabled`, each attendee carries `status` and `note`, and `summary`
  adds `pending`, `waitlisted` and `declined` next to `registered` and `checkedIn`.
  The CSV export and check-in apply to people who are going.
- **Invitations.** `POST /events/:uid/invites` `{ emails: string[] }` (1 to 50, at
  most 200 per event; lower-cased, de-duplicated) saves an `EventInvite` per new
  email and emails each one (`sendEventInvitation`, production only, best effort).
  Emails already invited, or already holding a registration for the event, are
  skipped and reported: `{ invited, skipped: [{ email, reason }] }` with
  `already-invited` or `already-registered` (to settle someone who already asked,
  the organizer approves them instead). `409` for a draft, a cancelled or an ended
  event. `GET /events/:uid/invites` lists them (`{ id, email, invitedAt, joined }`)
  and `DELETE /events/:uid/invites/:inviteId` takes back an unused one (`409` once
  the person joined through it). All host only. The invited person must sign in
  with that exact email.
- **`GET /events/invitations`** (signed in; `{ data, pagination }`) lists the
  upcoming, published events the caller is invited to and has not joined: what an
  "Invited" tab would show. The web app does not use it yet.
- **`GET /events/:uid/registration`** now returns `{ joined, status, invited }`:
  `status` is `going`, `pending`, `waitlisted`, `declined` or `none`, `invited`
  says an unused invitation exists, and `joined` is true only for `going`.
- **`GET /events/mine`** lists an event for a person who holds any registration
  and adds `registrationStatus` to each row.
- **Leaving.** `DELETE /events/:uid/registration` works for going, pending and
  waitlisted people (a spot is released only when they were going); a declined
  person gets `409`.
- **Tests:** `tests/events-access.test.ts` (30 tests: the levels and the legacy
  flag, requests, notes, approve and decline, the waitlist, invitations, host-only
  and cancelled rules).

## Cover images (November 2026, DB-1)

A cover used to be saved as a base64 string inside the event document, so the
directory list sent every image of every event. Now the image lives in object
storage and the event keeps only its https link. The upload endpoints are in the
`uploads` module (`src/modules/uploads/`), documented in
[api-contract.md](./api-contract.md).

- **Flow:** the organizer's browser calls `POST /uploads/event-covers` with the
  file's type and size, gets an upload ticket, sends the bytes straight to storage
  (never through this API: a serverless function cannot take a body that large),
  and puts the resulting link in `coverImage` when it creates or edits the event.
- **Production** uses Vercel Blob. The ticket is a short-lived client token that
  allows one pathname (`event-covers/<uuid>.<ext>`), one content type and 5 MiB.
  It needs `BLOB_READ_WRITE_TOKEN` (a public Blob store) in the API's environment.
  Without it a production API answers `503` to a ticket request.
- **Development and test** use the local disk when there is no token: the ticket
  is a signed URL on this API, the bytes go to `UPLOADS_DIR` (default `.uploads`,
  ignored by git) and are served from `/uploads/files`. The signed ticket fixes the
  file name and image type, and the real bytes must match that type (checked by
  their first bytes), so nothing but one of the four image types can be written.
- **Moving old covers:** `scripts/migrate-event-covers.ts --dry-run` lists events
  whose cover is still a data URL, and `--confirm` uploads each to Blob and
  replaces it with the link. It is safe to run twice and never overwrites a cover
  that changed while it ran. It needs `MONGO_URI` and `BLOB_READ_WRITE_TOKEN`.
- **Tests:** `tests/uploads.test.ts` (tickets for both drivers, the local upload
  and its checks, serving, an event keeping the link) and
  `tests/cover-migration.test.ts`.

## Tests

`tests/events.test.ts` (78 tests when last run) covers create, list, host filter,
the create-validation rules above (valid and invalid values, boundaries, and the
`11000` path, tested by mocking the pre-check to return `null` so the real unique
index rejects the second save), join, the registration check, and `/events/mine`.
Its "join rules and My Events" block covers: joining an invite-only event
without an invitation (`403`), an already-started event (`409`), an unknown event (`404`); the
registration check for an unknown event (`404`), for a known event not joined
(`{ joined: false }`) and without sign-in (`401`); and `/events/mine`
defaulting to upcoming, `period=past` order, paging for both periods, a page
past the end, `limit=101` and an unknown `period` returning `400`, and one
attendee's registrations never showing for another. Order of checks in
`joinEvent`: event not found (`404`), attendee not found (`401`), cancelled
(`409`), already started (`409`), already registered (`200`, or `403` if the
organizer declined them), invite-only without an invitation (`403`), then the
capacity, so a cancelled event always answers `409 "This event was cancelled."`,
an invite-only event that has also started answers `409`, and a full event still
reports "already joined" to its own attendees. `tests/events-directory.test.ts` covers the list filters (see
`GET /events`). `tests/events-hybrid.test.ts` (14 tests, PG-10) covers a Hybrid
event needing both field sets (each missing field named), the link rule, both sets
of notes kept, editing Online or Offline into Hybrid (and the missing fields it
asks for), Hybrid into Online or Offline dropping the other side, an untouched
Hybrid edit, the three-way mode filter and an unknown mode.
`tests/events-types.test.ts` (23 tests, PG-9) covers saving a kind and tags
(lower-cased, trimmed, de-duplicated), every invalid kind and tag, all seven kinds,
the eight-tag limit, editing and clearing, the kind filter (alone, with the mode,
leaving untyped events out, unknown kind) and the tag search.
`tests/events-drafts.test.ts` (27 tests, PG-15) covers saving a draft and the
status values refused, who can see one (visitor, another organization, the owner,
the host list, an invalid cookie), drafts being unjoinable, off the dashboard and
editable, publish (including a stale start and the `409`s), unpublish (including
the registration rule) and deleting a draft. `tests/events-capacity.test.ts` (27 tests) covers leaving (removes
the registration and My Events entry, can rejoin, only the caller's own, `404`
twice, `401`, `409` after the start, still allowed on a cancelled event) and
capacity (optional, validation, counting, refusing when full, a repeat join not
counted twice, **eight people racing for two spots get exactly two**, a freed spot
reused, the counter never below zero, returned publicly, and edit: set and
recount, below the registered, equal, removal with `null`, invalid, untouched).
`tests/events-attendees.test.ts` (24 tests) covers the attendee list (order,
totals, paging, search, `401`, `404`, `403` for a personal account and another
organization, never on public routes), check-in (idempotent, undo, bad id and body,
another event's registration, cancelled, guards), the CSV (content, formula
neutralizing, host only) and the organizer notice (sent per new registration, not
for a repeat or refused join, a failure does not undo the registration, the legacy
host lookup). `tests/events-details.test.ts` (31 tests) covers the optional
details: create, null ignored on create, mode-specific fields, the server-only
badge and fundraiser, every validation rule, trimming, and edit (add, clear with
`null` and `[]`, untouched, validation, mode switch). `tests/events-manage.test.ts` (34 tests, November 2026) covers
edit and cancel: a new event is `published`; edit changes only the sent fields,
keeps or replaces the cover, rejects a bad cover, `uid`, an unknown key such as
`isGovernmentSponsored`, an empty body, bad lengths, an end not after the start,
a new start in the past and a mode change missing its fields; a running event
can fix a typo, mode switches drop the old fields both ways, a non-http link is
rejected, registrations survive an edit, `401`, `404`, `403` (personal account,
another organization) and `409` (cancelled, ended) are checked, plus a legacy
event with no `organizerHandle`. Cancel marks the event and keeps it public and
in My Events, blocks new joins with `409`, answers `409` to a second cancel or an
ended event, checks `401`, `404` and `403`, and shows a document with no stored
status reading as published. See [testing.md](./testing.md) for counts.

## What's known-broken here

See [known-issues.md](./known-issues.md#events). The frontend's broken
profile-editor copy remains retired; both live creation entry points use the
full-page form and this route.

## Refreshing local demo events

Demo event dates are relative to when the seed script runs, so an old seed can
leave the default Upcoming view empty even while the API returns events. From
`apps/api`, run `pnpm exec tsx scripts/seed-demo-data.ts --events-only` to
refresh only the known demo event records in the configured database. This
upserts the demo events with fresh relative dates, including future and past
examples, without changing users, organizations, products, reports, or non-demo
events. The directory keeps its normal date filters; past records belong under
Past.
