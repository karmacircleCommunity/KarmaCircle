# Events

Covers the events directory page, the (two, redundant) event-creation modals, and the various event card/slider components.

## `Events.tsx` — routed at `/events`

[apps/web/src/features/events/pages/Events.tsx](../../apps/web/src/features/events/pages/Events.tsx).
Renders `<ComponentHelmet type="Events" />` (fixed August 2026 — previously passed `"Organizations"`, a copy-paste leftover that showed the Organizations SEO copy instead of the `"Events"` branch `ComponentHelmet` already had; see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a page heading, the shared `DirectoryToolbar` (search, cause filters, live result count, primary button), a grid of `<EventCard />` with an empty state, and `<Footer />`.

**Deliberately the same page as `/organizations`** — same heading block, the same shared [`DirectoryToolbar`](../../apps/web/src/components/DirectoryToolbar.tsx) over the same `CAUSES` taxonomy, same grid and empty state. The two directories list the same kind of thing for the same visitor. The previous version (a search box and a "Filters" button with no handlers at all, above a hand-rolled carousel of hardcoded featured cards) had them looking like two different products; the carousel, its `FeaturedEventCard`/`FeaturedEventImage` slides and `Slider.css` were deleted with it, since nothing else imported them.

**The event list is sample content, not live data** — twelve distinct events in [constants/eventDirectory.ts](../../apps/web/src/features/events/constants/eventDirectory.ts), one per organization in `organizationDirectory.ts` (`organizerUserName` is that organization's real `userName`, so the card's organizer link resolves), each with its own cover photo in `apps/web/src/assets/pictures/events/` (800x450 CC0 placeholders standing in for what an organizer would upload). Two are Online with a `platform`, the rest carry a city/country. `startsAt` is a real ISO timestamp formatted at render by `formatEventDate`/`formatEventBadge`, not a pre-formatted string.

It replaced 20 identical fake objects that were **shaped like user/organization records, not events** (`{ _id, userType, userName, name, email, password, cart, __v }`, copy-pasted from `Organizations.tsx`) — invisible on screen only because `EventCard` read no props at all. `getEvents()` in [apps/web/src/features/events/services/Events.ts](../../apps/web/src/features/events/services/Events.ts) (`GET /events` via `eventEndpoints.all`) is still the un-called real fetch; wiring it up is a `useSWR` swap plus a mapping function into `DirectoryEvent`.

The "Create An Event" button opens `CreateEvent` from [apps/web/src/features/events/components/CreateEvent.tsx](../../apps/web/src/features/events/components/CreateEvent.tsx).

## Two different "create event" components (pick carefully)

There are **two separate, differently-implemented "create an event" modals** in this codebase, and they are used in different places:

### `CreateEvent` (shared, used by `Events.tsx`)
[apps/web/src/features/events/components/CreateEvent.tsx](../../apps/web/src/features/events/components/CreateEvent.tsx).
A generic dropzone-based form (cover image preview, name, description with a 500-char counter, contact number/email, an "Online"/"Offline" radio-style mode picker, and address line1/line2/city/state/country/pincode inputs) — structurally identical to `ProfileUpdate.tsx`/`ProfileCompletion.tsx`, reusing the same CSS class naming convention (`createevent_*`).
Its `validateForm()` calls **`updateUserProfile(...)`** (`PATCH /user/update`), not an event-creation endpoint — this form does not actually create an event; it patches the user's own profile with whatever was typed into the "event" fields.
This looks like `ProfileUpdate.tsx` was duplicated as a starting point for event creation and the API call was never swapped out.
Several address-block inputs bind to the wrong `credentials.address.*` keys (e.g. the "City"/"State" row and the "Address Line 1/2" row both read/write `line1`/`line2` instead of `city`/`state` — copy-paste from the row above them).
Treat this component as **not functional** for its stated purpose; if asked to fix event creation from `/events`, the more complete implementation to build from is `CreateEvents` (below), not this one.

### `CreateEvents` (private, used by the events dashboard flow)
[apps/web/src/features/events/components/CreateEvents.tsx](../../apps/web/src/features/events/components/CreateEvents.tsx).
A much more complete, MUI-based form: event name, MUI `DatePicker`/`TimePicker` (via `dayjs`) for start/end date+time, an event-mode `<Select>` (Online/Offline), a unique event ID (`uid`) field, description, a cover-image upload converted to base64 via [convertToBase64.ts](../../apps/web/src/features/events/utils/convertToBase64.ts), and mode-dependent accordion sections: Offline shows city/state/address/country (`<Select>` populated from [static/CountryList.ts](../../apps/web/src/statics/CountryList.ts))/map-iframe fields; Online shows a platform `<Select>` (populated from [static/OnlinePlatform.ts](../../apps/web/src/statics/OnlinePlatform.ts): Zoom/Google Meet/Microsoft Teams/etc., each with an icon) and a platform-link field.
Validation and submission go through the [useEvent](../../apps/web/src/features/events/hooks/useEvent.ts) hook (see below), which does call the real `CreateEvent` API function (`MilanApi.ts`, `POST /events/create`).
This component is not currently rendered from anywhere reachable in the app — it lives under `features/events/components/` but no page imports it.

**If asked to "add event creation," clarify which of these two the request means** — they are unrelated implementations that happen to share a similar name.

## `useEvent` hook

[apps/web/src/features/events/hooks/useEvent.ts](../../apps/web/src/features/events/hooks/useEvent.ts) — pairs with `CreateEvents` (the MUI one, not `CreateEvent`).
`validateEvent()` checks all required fields are present (name, uid, description, coverImage, mode, start/end date+time, plus mode-specific fields), then separately checks `name` length (10–80), `description` length (20–200), and that `endDate >= startDate` / `endTime >= startTime`.
Note: the length/date-order checks run unconditionally, even if the earlier required-field checks already populated `errors` for a different reason, and even when `data.name`/`data.description` are empty strings (`"".length < 10` is true, so this still works, just via `.length` on an empty string rather than an explicit early return).
`submitCallback(event, setshowCreateModal)` only proceeds if `Object.keys(errors).length === 0` — but `errors` here is a variable captured once from the hook's own module scope, populated by the *previous* call to `validateEvent()`, not necessarily the errors from validating the `event` object being submitted right now; call `validateEvent()` immediately before `submitCallback` (as `CreateEvents.tsx`'s `handleSubmit` does) to keep them in sync.
On success (`response.status === 201`): success toast, closes the modal, and calls SWR's `mutate(eventEndpoints.all)` to invalidate the events list cache (see [api-integration.md](./api-integration.md) for why nothing currently listens to that key).

## Event display components

- [EventsMarqueeCards.tsx](../../apps/web/src/features/events/components/EventsMarqueeCards.tsx) — takes an `event` prop, renders cover image, name, and either a location (Offline) or a platform icon+name (Online), plus a formatted start date/time (via [getFormattedDate.ts](../../apps/web/src/features/events/utils/getFormattedDate.ts)). Responsive text truncation at `window.innerWidth <= 500`. Not currently rendered by any page — looks intended for a "recent events" marquee (there's a commented-out `<Marquee>` block in `Profile.tsx` that would have used something like this).
- [EventCard.tsx](../../apps/web/src/features/events/components/EventCard.tsx) — the card in the `Events.tsx` grid, rendering entirely from its `event` prop. The same card as `OrganizationCard` and the landing page's drives rail — 16:9 cover, cause label on a scrim, one-line title, two-line summary on a fixed box — plus a date badge on the cover and a "N going / N spots left" rule at the bottom (`Full` when there are none, since a zero reads as a data bug). The badge carries the day ("12 SEP") and the meta row carries only weekday and time ("Sat · 9:00 pm"), so the two don't print the same date twice as they did until August 2026; the meta block also holds its own `mb-4`, because `mt-auto` on the bottom rule resolves to zero on a card whose copy fills the box and the rule then sat directly on the location line. **The whole card links to `/events/:id`**, via a stretched overlay on the title link (`after:absolute after:inset-0`) rather than an `<a>` around everything — one accessible name for the destination, with the organizer link (which points somewhere else entirely) still clickable on top of it via `relative z-1`. Carries `data-reveal`; `Events.tsx` scopes `useSectionReveal` to the grid so cards fade in on scroll and re-reveal when a filter changes. See [ui-kit.md](./ui-kit.md#motion).
  Until August 2026 it accepted no props at all and hardcoded every field, so all twenty cards were byte-for-byte identical.

**Net effect:** nothing rendered under `/events` reflects real backend data — the cards are now distinct, event-shaped fixture records rather than twenty copies of one hardcoded placeholder, but they are still fixtures, even though the data-fetching (`getEvents`) and creation (`useEvent` + `CreateEvents`) pieces needed to make it real already exist and mostly work.

## `DetailedEvent.tsx` — routed at `/events/:eventId`

[apps/web/src/features/events/pages/DetailedEvent.tsx](../../apps/web/src/features/events/pages/DetailedEvent.tsx).
The page an `EventCard` opens. Until August 2026 it was a one-line placeholder (`<div>DetailedEvent</div>`) with no route at all, which is why the grid's cards had nowhere to link and did nothing when clicked.

`:eventId` is `DirectoryEvent.id`. The page does two lookups — `findEvent` (card-level record, `constants/eventDirectory.ts`) and `findEventDetail` (everything this page adds, `constants/eventDetails.ts`) — and renders a not-found state, in the same shape as `OrganizationProfile.tsx`'s, if either misses.

**Content, top to bottom:** `EventHero` (the same cover photo as the card, so arriving reads as that card opening; title, organizer link, then when / how long / where), then a two-column body — main column: About, a four-cell fact strip (`EventFacts`), the run sheet (`EventAgenda`), venue-or-joining (`EventLocationPanel`), and what to bring; sidebar: the join panel (`EventJoinPanel`) and, only where the event raises money, `EventFundraiserPanel`.
On a phone the sidebar renders *first* (`order-1`/`order-2`, one control and one piece of state — not a second copy), because "can I go, and what does it cost" outranks the reading on a narrow screen.

**Cost is a first-class fact and free is the default.** `EventDetail.cost` is *omitted* for a free event rather than set to zero — almost every event here is a nonprofit drive — so the free case says "Free to attend / Nonprofit event. Nothing to pay, ever." in words. One fixture event (`morning-movement-class`) is priced, nominally and per term, purely so the paid branch is exercised.

**Nothing on this page writes anywhere.** There is no single-event endpoint, and no attend/RSVP or payment endpoint either (see [api-integration.md](./api-integration.md)):
- Join is local component state. The counts move with it (`going + 1`, one spot fewer, "You are going"), and the panel says in words that it is saved on the device only and the organizer has not been told. That is deliberate — a control that looks live and silently does nothing is the worse failure, and is what `Profile.tsx`'s Subscribe/Sponsor pair does.
- Contribute toasts "contributions open here soon".
- Share uses `navigator.share` where it exists and the clipboard otherwise; a dismissed share sheet (`AbortError`) is not treated as an error.
- The venue's map is a plain Google Maps *search link*, not an embed — an iframe would mean a third-party script and a cookie banner for one address.

**Both fixtures, again.** Swapping the two lookups for a `useSWR` call should not move any markup.

## `HostedEvents` (empty stub)

- [apps/web/src/features/events/components/HostedEvents.tsx](../../apps/web/src/features/events/components/HostedEvents.tsx) — file exists but is **completely empty** (0 bytes); importing it would fail.

## Types

This entire folder is TypeScript. See [events/SPEC.md](../../apps/web/src/features/events/SPEC.md#types) for the full breakdown, including which pre-existing bugs (the `EventCard` prop mismatch, `CreateEvent`'s stray `htmlFor` on a `div`) now surface as suppressed compile errors.
