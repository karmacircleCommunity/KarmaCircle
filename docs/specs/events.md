# Events

Covers the events directory page, the (two, redundant) event-creation modals, and the various event card/slider components.

## `Events.tsx` — routed at `/events`

[src/features/events/pages/Events.tsx](../../src/features/events/pages/Events.tsx).
Renders `<ComponentHelmet type="Clubs" />` (note: passes `"Clubs"`, not `"Events"`, so it shows the Clubs SEO copy — likely a copy-paste bug; `ComponentHelmet` does have an `"Events"` branch, see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a search input + non-functional "Filters" button, a "Create An Event" button that opens the creation modal, `<EventSlider />` (featured events carousel), a grid of `<EventCard />`, and `<Footer />`.

**The event list is hardcoded**, same pattern as `Clubs.jsx`: 20 identical fake objects (which are actually shaped like *user/club* records, not event records — `{ _id, userType, userName, name, email, password, cart, __v }` — copy-pasted from the `Clubs.jsx` demo data and not updated).
`EventCard` doesn't even read the `event` prop it's passed (see below), so this mismatch is currently invisible.
The real fetcher, `getEvents()` in [src/features/events/services/Events.ts](../../src/features/events/services/Events.ts) (`GET /events` via `eventEndpoints.all`), exists but is never called here.

The "Create An Event" button opens `CreateEvent` from [src/features/events/components/CreateEvent.tsx](../../src/features/events/components/CreateEvent.tsx).

## Two different "create event" components (pick carefully)

There are **two separate, differently-implemented "create an event" modals** in this codebase, and they are used in different places:

### `CreateEvent` (shared, used by `Events.tsx`)
[src/features/events/components/CreateEvent.tsx](../../src/features/events/components/CreateEvent.tsx).
A generic dropzone-based form (cover image preview, name, description with a 500-char counter, contact number/email, an "Online"/"Offline" radio-style mode picker, and address line1/line2/city/state/country/pincode inputs) — structurally identical to `ProfileUpdate.jsx`/`ProfileCompletion.jsx`, reusing the same CSS class naming convention (`createevent_*`).
Its `validateForm()` calls **`updateUserProfile(...)`** (`PATCH /user/update`), not an event-creation endpoint — this form does not actually create an event; it patches the user's own profile with whatever was typed into the "event" fields.
This looks like `ProfileUpdate.jsx` was duplicated as a starting point for event creation and the API call was never swapped out.
Several address-block inputs bind to the wrong `credentials.address.*` keys (e.g. the "City"/"State" row and the "Address Line 1/2" row both read/write `line1`/`line2` instead of `city`/`state` — copy-paste from the row above them).
Treat this component as **not functional** for its stated purpose; if asked to fix event creation from `/events`, the more complete implementation to build from is `CreateEvents` (below), not this one.

### `CreateEvents` (private, used by the events dashboard flow)
[src/features/events/components/CreateEvents.tsx](../../src/features/events/components/CreateEvents.tsx).
A much more complete, MUI-based form: event name, MUI `DatePicker`/`TimePicker` (via `dayjs`) for start/end date+time, an event-mode `<Select>` (Online/Offline), a unique event ID (`uid`) field, description, a cover-image upload converted to base64 via [convertToBase64.ts](../../src/features/events/utils/convertToBase64.ts), and mode-dependent accordion sections: Offline shows city/state/address/country (`<Select>` populated from [static/CountryList.js](../../src/statics/CountryList.js))/map-iframe fields; Online shows a platform `<Select>` (populated from [static/OnlinePlatform.js](../../src/statics/OnlinePlatform.js): Zoom/Google Meet/Microsoft Teams/etc., each with an icon) and a platform-link field.
Validation and submission go through the [useEvent](../../src/features/events/hooks/useEvent.ts) hook (see below), which does call the real `CreateEvent` API function (`MilanApi.js`, `POST /events/create`).
This component is not currently rendered from anywhere reachable in the app — it lives under `features/events/components/` but no page imports it.

**If asked to "add event creation," clarify which of these two the request means** — they are unrelated implementations that happen to share a similar name.

## `useEvent` hook

[src/features/events/hooks/useEvent.ts](../../src/features/events/hooks/useEvent.ts) — pairs with `CreateEvents` (the MUI one, not `CreateEvent`).
`validateEvent()` checks all required fields are present (name, uid, description, coverImage, mode, start/end date+time, plus mode-specific fields), then separately checks `name` length (10–80), `description` length (20–200), and that `endDate >= startDate` / `endTime >= startTime`.
Note: the length/date-order checks run unconditionally, even if the earlier required-field checks already populated `errors` for a different reason, and even when `data.name`/`data.description` are empty strings (`"".length < 10` is true, so this still works, just via `.length` on an empty string rather than an explicit early return).
`submitCallback(event, setshowCreateModal)` only proceeds if `Object.keys(errors).length === 0` — but `errors` here is a variable captured once from the hook's own module scope, populated by the *previous* call to `validateEvent()`, not necessarily the errors from validating the `event` object being submitted right now; call `validateEvent()` immediately before `submitCallback` (as `CreateEvents.tsx`'s `handleSubmit` does) to keep them in sync.
On success (`response.status === 201`): success toast, closes the modal, and calls SWR's `mutate(eventEndpoints.all)` to invalidate the events list cache (see [api-integration.md](./api-integration.md) for why nothing currently listens to that key).

## Event display components

- [EventsMarqueeCards.tsx](../../src/features/events/components/EventsMarqueeCards.tsx) — takes an `event` prop, renders cover image, name, and either a location (Offline) or a platform icon+name (Online), plus a formatted start date/time (via [getFormattedDate.ts](../../src/features/events/utils/getFormattedDate.ts)). Responsive text truncation at `window.innerWidth <= 500`. Not currently rendered by any page — looks intended for a "recent events" marquee (there's a commented-out `<Marquee>` block in `Profile.jsx` that would have used something like this).
- [EventCard.tsx](../../src/features/events/components/EventCard.tsx) — the card rendered in the `Events.tsx` grid. **Does not use its data at all**: no props are accepted or destructured; every field (title "Food Marathon, 2025", club name, description, avatar images, "+300 Participated") is hardcoded JSX. `Events.tsx` passes `event={event}` to it, but the prop is ignored.
- [EventSlider.tsx](../../src/features/events/components/EventSlider.tsx) — a custom (non-Swiper) auto-advancing carousel over a hardcoded array alternating `FeaturedEventImage`/`FeaturedEventCard`, paired two-per-slide. Advances every 3s via `setInterval`.
- [FeaturedEventCard.tsx](../../src/features/events/components/FeaturedEventCard.tsx) / [FeaturedEventImage.tsx](../../src/features/events/components/FeaturedEventImage.tsx) — also fully static/hardcoded, no props.

**Net effect:** as of today, nothing rendered under `/events` reflects real backend data — every visible card, count, and image is a hardcoded placeholder, even though the data-fetching (`getEvents`) and creation (`useEvent` + `CreateEvents`) pieces needed to make it real already exist and mostly work.

## `HostedEvents` and `DetailedEvent` (empty stubs)

- [src/features/events/components/HostedEvents.tsx](../../src/features/events/components/HostedEvents.tsx) — file exists but is **completely empty** (0 bytes); importing it would fail.
- [src/features/events/pages/DetailedEvent.tsx](../../src/features/events/pages/DetailedEvent.tsx) — a one-line placeholder (`<div>DetailedEvent</div>`), not registered in `routesConfig.jsx` (no `/events/:id`-style route exists).

## Types

This entire folder is TypeScript. See [events/SPEC.md](../../src/features/events/SPEC.md#types) for the full breakdown, including which pre-existing bugs (the `EventCard` prop mismatch, `CreateEvent`'s stray `htmlFor` on a `div`) now surface as suppressed compile errors.
