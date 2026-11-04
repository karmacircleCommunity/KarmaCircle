# Events — Feature Spec

Colocated, implementation-level companion to
[docs/specs/events.md](../../../../../docs/specs/events.md). The event feature
previously had two competing creation forms and neither organizer entry point
worked end to end. The organizer flow was repaired in November 2026: the shared
`CreateEvents` page is linked from the public directory and hosted-event
workspace, while the broken copy-pasted form remains retired legacy code.

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
in-person event through the full-page form.

## What this feature is responsible for

The public `/events` directory and `/events/:eventId` detail page, attendee
registration and My Events, hosted-event listings, event display, and event
creation. The directory, detail, registration status, My Events, and
hosted-event pages read real API data. Both organization event-creation entry
points navigate to `/organization/events/new`, which submits through
`POST /events/create`. Capacity remains unsupported. The organization dashboard
shows aggregate and per-event registration totals; attendee names and check-in
remain unsupported.

## Why it's shaped this way

`CreateEvent.tsx` was copied from profile editing and still calls
`PATCH /user/update`; it is now retired and not mounted. The purpose-built
`CreateEvents.tsx` page is the sole live event-creation flow. The directory and
hosted-event workspace link to `/organization/events/new`.

## File manifest

| File                                | Role                                                                                                                                                                                                                                      | Live?                                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/Events.tsx`                  | The `/events` page                                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events` (September 2026)                                                                                                                                                    |
| `pages/YourEvents.tsx`              | The `/organization/events` page — one organization's own events, behind `OrganizationSetupGate`                                                                                                                                           | ✅ routed, renders **live data** via `GET /events?host={handle}`                                                                                                                                                       |
| `pages/MyEvents.tsx`                | The signed-in individual's `/events/mine` page — registered events split into Upcoming and Past                                                                                                                                           | ✅ routed, reads authenticated attendee data from `GET /events/mine`                                                                                                                                                   |
| `pages/DetailedEvent.tsx`           | The `/events/:eventId` detail page                                                                                                                                                                                                        | ✅ routed, renders **live data** via `GET /events?uid={id}` (September 2026 — see below)                                                                                                                               |
| `components/detail/`                | The eight pieces that page composes — `EventHero`, `EventFacts`, `EventAgenda`, `EventLocationPanel`, `EventJoinPanel`, `EventMobileActionBar`, `EventFundraiserPanel`, `EventSection`                                                    | ✅ rendered by `DetailedEvent.tsx` only                                                                                                                                                                                |
| `utils/toDisplayEventDetail.ts`     | Maps a live `ApiEvent` onto the `{ event, detail }` shape `DetailedEvent.tsx` renders                                                                                                                                                     | ✅ used by `DetailedEvent.tsx`                                                                                                                                                                                         |
| `utils/formatEventFacts.ts`         | `formatEventDate`/`formatEventBadge`/`formatEventTime` plus duration, maps-URL and `isEventPast` helpers — one home for "format an event" (the first three moved here from the now-deleted `constants/eventDirectory.ts` fixture). Money helpers (`formatMoney`, `fundedPercent`) live in the shared `@utils/formatMoney`, not here | ✅ used across `EventCard` and the detail components                                                                                                                                                                   |
| `components/CreateEvent.tsx`        | Retired profile-editor copy with event labels                                                                                                                                                                                             | ❌ not mounted; do not reconnect                                                                                                                                                                                       |
| `components/CreateEvents.tsx`       | Responsive full-page event creation flow with preview                                                                                                                                                                                     | ✅ routed at `/organization/events/new`                                                                                                                                                                                |
| `hooks/useEvent.ts`                 | Validator, date/time payload conversion, submit and list refresh                                                                                                                                                                          | ✅ used by `CreateEvents` page                                                                                                                                                                                         |
| `components/EventCard.tsx`          | Card rendered in the `/events` grid                                                                                                                                                                                                       | ✅ rendered, typed against `EventCardEvent`                                                                                                                                                                            |
| `utils/toDisplayEvent.ts`           | Maps a live `ApiEvent` onto `EventCardEvent`                                                                                                                                                                                              | ✅ used by `Events.tsx`                                                                                                                                                                                                |
| `components/EventsMarqueeCards.tsx` | Data-driven event card (correctly reads an `event` prop)                                                                                                                                                                                  | ❌ not rendered anywhere                                                                                                                                                                                               |
| `components/HostedEvents.tsx`       | **Completely empty file (0 bytes)**                                                                                                                                                                                                       | ❌ importing this throws — no default export                                                                                                                                                                           |
| `components/HosedEvents.scss`       | Orphaned stylesheet — note the filename typo ("Hosed" not "Hosted"); not imported by anything, including the (empty) `HostedEvents.tsx`                                                                                                   | ❌ dead file                                                                                                                                                                                                           |
| `services/Events.ts`                | `getEvents()` — the `apiConnector`-based fetcher                                                                                                                                                                                          | ❌ still unused — `Events.tsx` fetches via `useSWR` + `eventEndpoints.directory()` instead, matching this repo's read convention (see `organizations/services/Organizations.ts#getOrganizations` for the same pattern) |
| `utils/convertToBase64.ts`          | File→base64 helper used by `CreateEvents.tsx`'s cover-image upload                                                                                                                                                                        | ✅ used by `CreateEvents` only                                                                                                                                                                                         |
| `utils/getFormattedDate.ts`         | Ordinal-suffix date formatter (`"1st January"`)                                                                                                                                                                                           | ✅ used by `EventsMarqueeCards` only (itself unused)                                                                                                                                                                   |

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

**The event list is live, September 2026** — `GET /events`
(`eventEndpoints.directory()`, `limit=100`) via `useSWR`, mapped through
`utils/toDisplayEvent.ts` into `EventCardEvent`. Replaces the twelve-event
fixture that used to live in `constants/eventDirectory.ts`, now deleted (see
below) — `DetailedEvent.tsx` stopped reading it too, in the same September 2026
pass.

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
(title, organizer, summary, city, country, platform, mode), a live result count
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
`GET /events` has no server-side `search` param the way `GET /organizations`
does, so search, the Upcoming/Past split and the type filter all run client-side
over the one fetched page.

Gone with that rewrite: the inert "Filters" button (it never had a handler), the
`<EventSlider />` carousel and its `FeaturedEventCard`/`FeaturedEventImage`
slides (all hardcoded, nothing else imported them - files deleted), the `<hr>`,
the unused `swiper/css` imports, and the `Loading` fallback that could never
render.

The "Create an event" action is available only to authenticated organization
accounts and navigates to `/organization/events/new`. After successful creation,
the new event opens at `/events/:uid` and the public directory and host event
caches are revalidated.

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

### `CreateEvent.tsx` — retired legacy component, formerly mounted from `/events`

This component is no longer imported by a routed page. Structurally
near-identical to `ProfileUpdate.tsx`/`ProfileCompletion.tsx` (same
`credentials = { description, name, coverImage, address: {...} }` shape, same
dropzone markup, same `createevent_*` BEM class convention).

**Wrong endpoint (already known):** `validateForm()` calls
`updateUserProfile({ credentials })` — `PATCH /user/update`, the
**profile**-update endpoint — not an event-creation endpoint. Submitting this
form patches the logged-in user's own profile with whatever was typed into the
"event" fields; it does not create an event.

**Severe, previously-undocumented finding: the Save/Submit button can never be
enabled, because four of the six address fields it requires are permanently
unreachable through the UI.** Walk through every input in the form and which
state key it actually reads/writes via `handleChange(field)`:

| Field label              | Placeholder text shown                                                     | Reads/writes `credentials.address.` |
| ------------------------ | -------------------------------------------------------------------------- | ----------------------------------- |
| Contact Number           | "Contact Number for your event"                                            | `line1`                             |
| Contact Email            | "Email Id for your event"                                                  | `line2`                             |
| Address Line 1           | "Social Link for your event" (copy-paste leftover placeholder, wrong copy) | `line1`                             |
| Address Line 2           | "Email Id for your event" (also copy-pasted, wrong copy)                   | `line2`                             |
| City                     | "Social Link for your event" (wrong copy)                                  | `line1`                             |
| State/Province           | "Email Id for your event" (wrong copy)                                     | `line2`                             |
| Country of establishment | "Social Link for your event" (wrong copy)                                  | `line1`                             |
| Pincode/Zipcode          | "Email Id for your event" (wrong copy)                                     | `line2`                             |

**Eight visually distinct inputs share only two real state slots
(`address.line1` and `address.line2`)**, each overwriting whatever was typed
into any other input bound to the same key — e.g. typing a pincode overwrites
whatever was typed as the city, which overwrote whatever was typed as "Address
Line 1," which overwrote the contact number. Meanwhile,
`credentials.address.city`, `.state`, `.country`, and `.pincode` **exist in the
initial state object but no `<input>` in this component ever writes to them** —
they stay `""` forever. The Save button's `disabled` condition checks exactly
those four keys
(`!credentials?.address?.city || !credentials?.address?.state || !credentials?.address?.country || !credentials?.address?.pincode`,
alongside `line1`/`line2`) — **since those four keys can never become non-empty,
the button is permanently disabled, for every user, regardless of what they
type.** This form is not just "wired to the wrong endpoint" — it is currently
impossible to submit at all through normal interaction. This component remains
retired and is not part of either live creation path.

**Event mode picker:** a plans-style radio UI (`.plan.basic-plan` = Online,
`.plan.complete-plan` = Offline) sets `credentials.eventMode` via `onClick` on
the wrapping `<div>` rather than the actual `<input type="radio">`'s own
`onChange` — the radio inputs are visually present but not the actual event
source; only the first (`Online`) has `checked` hardcoded, so the radio UI
doesn't even visually reflect `eventMode` after a click (clicking "Offline"
changes `credentials.eventMode` but the "Online" radio stays visually checked,
since neither `checked` prop is bound to state).

### `CreateEvents.tsx` — the shared live implementation

Routed at `/organization/events/new` for signed-in organization accounts with a
live public profile.

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

**Cover image:** image uploads are limited to 5 MB and converted to a base64
data URL by `convertToBase64(file)`. The form starts without a placeholder asset
and shows an intentional preview placeholder until the organizer chooses an
image.

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
   hyphens. Offline events require city, state, country, and address; online
   events require a platform and an absolute HTTP or HTTPS meeting URL.
3. Name length must be 10–80 characters, description length must be 20–200
   characters, and the combined end date/time must follow the combined start
   date/time.
4. Returns the field-error object for display and submission.

**`submitCallback(event, onSuccess, errors)`:**

- If the supplied error object is empty, calls `CreateEvent()`
  (`KarmaCircleApi.ts`, `POST /events/create`). It combines each selected date
  with its selected clock time before sending `startTime` and `endTime`, and
  sends date-only `startDate` and `endDate` values.
- On `response.status === 201`, it shows a success toast, runs the success
  callback to open event detail, and revalidates `eventEndpoints.directory()`
  plus the current organization's `eventEndpoints.byHost()` key.
- On failure, it shows the API error message when available, otherwise a generic
  retry message.
- If `errors` is non-empty: a single generic toast, "Please fill all the
  required fields" — no per-field detail in the toast (per-field detail is shown
  inline via `errors.name`/`errors.uid`/etc. in the form itself).

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

## `components/HostedEvents.tsx` — literally empty

Confirmed via direct read: the file is **0 bytes**, no export at all. Any
`import HostedEvents from "..."` would resolve to `undefined` as the default
export — rendering `<HostedEvents />` would throw (`Element type is invalid`).
Its sibling stylesheet, `HosedEvents.scss` (note the filename itself is missing
the "t" in "Hosted" — `Hosed`, not `Hosted`), is also not imported by anything,
including the empty component file, so it's doubly dead. Given the name, this
was likely intended to show a logged-in organization's own list of hosted events
(a natural companion to `Dashboard.tsx`) — if asked to build that feature, this
is the file to fill in, but there's no existing logic here to preserve; it's a
truly blank slate, not a stub with a signature to match.

## `services/Events.ts` — `getEvents()`, correct, never called

Identical shape to `organizations/services/Organizations.ts`'s
`getOrganizations()` — same `apiConnector`-based Layer B call pattern, same
throw-on-non-200 behavior (see [organizations/SPEC.md](../organizations/SPEC.md)
for the full explanation of this calling convention, which is the opposite of
`KarmaCircleApi.ts`'s catch-and-return-response pattern).
`organizationEndpoints.all` → `eventEndpoints.all` is the only substantive
difference. Even the leftover comment above the function
(`// get organizations`) is a copy-paste artifact from `Organizations.ts` —
cosmetic, but a good signal of how directly one file was cloned from the other.

## `utils/convertToBase64.ts`

`convertToBase64(file)` wraps `FileReader.readAsDataURL` in a promise and
rejects if the result cannot be read. The page validates the selected image and
handles upload errors inline before updating form state.

## `utils/getFormattedDate.ts`

Pure function, `getFormattedDate(dateString) → "1st January"`-style string
(day + ordinal suffix + full month name, no year). Correctly handles the
11th–13th "th" exception. No timezone handling — relies on
`new Date(dateString)`'s local-timezone interpretation, whatever that resolves
to in the visitor's browser. Only consumer is `EventsMarqueeCards.tsx` (itself
unused) — so this function currently has no live call path either.

## Data flow summary — live event reads and creation

```
Events.tsx render
   ▼
GET /events via eventEndpoints.directory() and SWR
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

## Types

`types/index.ts` re-exports the feature interfaces and types. `ApiEvent` models
the API event response, `EventCardEvent` is the directory card view model, and
`DisplayEvent` plus `EventDetailContent` provide the detail-page view model.
`Events.tsx` maps `ApiEvent` records with `toDisplayEvent()` and passes the
resulting `EventCardEvent` to `EventCard`. `CreateEventCredentials` describes
the retired broken form, while `EventFormState`, `EventFormErrors`, and
`UseEventResult` describe the shared live form and its hook.

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

- **Retired legacy form limitation:** `CreateEvent.tsx`'s Save button can never
  be enabled because four required address fields are permanently unreachable
  through its UI.
- **Eight `CreateEvent.tsx` inputs share only two real state slots**
  (`address.line1`/`line2`), several with copy-pasted/wrong placeholder text —
  new finding.
- `CreateEvent.tsx` calls the profile-update endpoint instead of an
  event-creation endpoint — already in `known-issues.md`.
- `CreateEvent.tsx`'s event-mode radio UI doesn't visually reflect the actual
  selected mode after a click — new finding.
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
- `HostedEvents.tsx` is a 0-byte file; importing it throws — already in
  `known-issues.md`. Its `.scss` sibling has a typo'd filename (`Hosed` not
  `Hosted`) — new finding.
- `convertToBase64.ts`'s `converter` can hang forever on a falsy file (currently
  unreachable via the guarded call site) — new finding.
- `getEvents()` is fully correct and unused — already in `known-issues.md`.

## If you're asked to...

- **"Add event creation" / "fix the create event button"** → both `/events` and
  `/organization/events` now mount `CreateEvents.tsx` + `useEvent.ts`, which
  submit to `POST /events/create`. Keep the retired `CreateEvent.tsx`
  profile-editor copy disconnected. The backend schema accepts the basic fields
  plus `inviteOnly`; detail-page fields
  (`about`/`agenda`/`cost`/`fundraiser`/etc.) are still not creatable through
  the endpoint and require a future API change.
- **"Review the Events page SEO label"** → `Events.tsx` currently uses
  `type="Events"`; verify the route and title branch before changing it.
- **"Build a 'my hosted events' view for the dashboard"** → `HostedEvents.tsx`
  is the intended file (currently empty) — there's no existing logic to
  preserve, treat it as new work.
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
