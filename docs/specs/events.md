# Events

Covers the events directory page, the (two, redundant) event-creation modals, and the various event card/slider components.

## `Events.tsx` — routed at `/events`

[apps/web/src/features/events/pages/Events.tsx](../../apps/web/src/features/events/pages/Events.tsx).
Renders `<ComponentHelmet type="Events" />` (fixed August 2026 — previously passed `"Organizations"`, a copy-paste leftover that showed the Organizations SEO copy instead of the `"Events"` branch `ComponentHelmet` already had; see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a page heading, the shared `DirectoryToolbar` (search, an Upcoming/Past filter, live result count, primary button), day-grouped sections of `<EventCard />` with an empty state, and `<Footer />`.

**Live data, September 2026.** `GET /events` (`eventEndpoints.directory()`, a generous `limit=100` — the route has no server-side search filter to send, see below) via `useSWR`, mapped through [utils/toDisplayEvent.ts](../../apps/web/src/features/events/utils/toDisplayEvent.ts) into the looser `EventCardEvent` shape `EventCard` actually needs. Replaces the twelve-event fixture that used to live in `constants/eventDirectory.ts` — that file, its `constants/eventDetails.ts` companion, and their placeholder cover photos are deleted outright, not just unused, now that `DetailedEvent.tsx` is live too (see that page's section below).

Two real, deliberate differences from `/organizations`' directory, both because an event has a date and an organization doesn't:
- **The filter chips are Upcoming/Past, not a cause taxonomy.** A live `Event` has no cause field at all ([event.model.ts](../../apps/api/src/modules/events/event.model.ts)) — inventing one the way the old fixture did would be exactly the kind of fabricated-but-unlabelled data this rewrite exists to remove. "What's happening soon" is also just the more useful question for an events page to answer than a cause split ever was.
- **Results are grouped into same-day sections** ([utils/groupEventsByDay.ts](../../apps/web/src/features/events/utils/groupEventsByDay.ts) — "Today"/"Tomorrow"/"Yesterday", else a full weekday+date), not one flat grid. With only a handful of real events today (four in the seed data), a flat 3-column grid reads as mostly empty space; a dated list reads as intentional. Sort direction flips with the filter: soonest-first for Upcoming, most-recent-first for Past.

`GET /events` (`listEventsQuerySchema`, apps/api) only knows `uid`/`slug`/`host`/pagination — no `search` or domain param the way `GET /organizations` has — so both the text search and the Upcoming/Past split run client-side over the one fetched page, not sent to the backend. Acceptable at today's scale; would need a real backend filter (or real pagination-aware fetching) if the directory grows past what one `limit=100` page holds.

**`EventCard` now handles a live record's real gaps rather than a fixture that had none:** no cover photo → an accent-gradient block with a calendar mark (same derivation as `OrganizationCard`'s no-cover fallback); no `organizerHandle` (an individual host, per `event.model.ts`) → the organizer name renders as plain text instead of a link; no capacity data → the "N going / spots left" rule at the bottom is omitted entirely rather than showing invented numbers (see [known-issues.md](./known-issues.md#events--rsvp-and-attendee-capacity-future-scope-deliberately-not-built) — real capacity tracking is future scope, not built).

**September 2026:** two badge pills — "Govt" (`event.isGovernmentSponsored`) and "Invite only" (`event.inviteOnly`) — render top-right on the cover, in the slot `OrganizationCard`'s "Featured" pill uses, when the underlying `Event` document carries either flag. The meta row's vertical spacing was also loosened and its date/time line's icon changed from a repeated `FiCalendar` to `FiClock`, so the date badge and the time line read as two distinct facts rather than the same one twice.

The "Create An Event" button opens `CreateEvent` from [apps/web/src/features/events/components/CreateEvent.tsx](../../apps/web/src/features/events/components/CreateEvent.tsx) — unchanged, still the non-functional one (see below).

## `YourEvents.tsx` — the organization's own events

[apps/web/src/features/events/pages/YourEvents.tsx](../../apps/web/src/features/events/pages/YourEvents.tsx), routed at `/organization/events` (August 2026).
This is where the navbar's "Your events" points; it used to point at `/event/create`, a path no route has ever matched, so the menu item was a 404 for every organization that clicked it.

Two things make it different from the `/events` directory above it:

- **It is behind `OrganizationSetupGate`** ([organizations.md](./organizations.md#the-setup-flow--organizationsetup)) — a draft organization is told what is still missing and handed a link that resumes setup, rather than shown an events page it cannot yet use.
- **It renders live records, not the fixture.** It fetches `GET /events?host={handle}`, a filter added to the API in the same change, so filtering happens server-side and nothing is hidden on page two.

It deliberately does **not** use `EventCard`: the card needs a cover photo, a cause and a capacity, and a live event record (`ApiEvent`, mirroring the API's `IEvent`) has none of the three. Plain rows are what the data actually supports. When those fields exist on a real event, this page and the directory can converge on the card.

Event creation is still broken (see below), so in practice this page shows its empty state — which is honest, rather than a fixture pretending otherwise.

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
Validation and submission go through the [useEvent](../../apps/web/src/features/events/hooks/useEvent.ts) hook (see below), which does call the real `CreateEvent` API function (`KarmaCircleApi.ts`, `POST /events/create`).
This component is not currently rendered from anywhere reachable in the app — it lives under `features/events/components/` but no page imports it.

**If asked to "add event creation," clarify which of these two the request means** — they are unrelated implementations that happen to share a similar name.

## `useEvent` hook

[apps/web/src/features/events/hooks/useEvent.ts](../../apps/web/src/features/events/hooks/useEvent.ts) — pairs with `CreateEvents` (the MUI one, not `CreateEvent`).
`validateEvent()` checks all required fields are present (name, uid, description, coverImage, mode, start/end date+time, plus mode-specific fields), then separately checks `name` length (10–80), `description` length (20–200), and that `endDate >= startDate` / `endTime >= startTime`.
Note: the length/date-order checks run unconditionally, even if the earlier required-field checks already populated `errors` for a different reason, and even when `data.name`/`data.description` are empty strings (`"".length < 10` is true, so this still works, just via `.length` on an empty string rather than an explicit early return).
`submitCallback(event, setshowCreateModal)` only proceeds if `Object.keys(errors).length === 0` — but `errors` here is a variable captured once from the hook's own module scope, populated by the *previous* call to `validateEvent()`, not necessarily the errors from validating the `event` object being submitted right now; call `validateEvent()` immediately before `submitCallback` (as `CreateEvents.tsx`'s `handleSubmit` does) to keep them in sync.
On success (`response.status === 201`): success toast, closes the modal, and calls SWR's `mutate(eventEndpoints.all)` to invalidate the events list cache. Still effectively inert as of September 2026, though for a new reason: `Events.tsx` now fetches `eventEndpoints.directory()` (`${API}/events?limit=100`), a different literal string/cache key than `eventEndpoints.all` (`${API}/events`) — SWR keys match exactly, so this `mutate` call wouldn't invalidate the directory's cache even if this creation flow were reachable (it isn't — `CreateEvents.tsx`, the component this hook pairs with, still isn't rendered from any page). Worth fixing in the same change that finally wires event creation up.

## Event display components

- [EventsMarqueeCards.tsx](../../apps/web/src/features/events/components/EventsMarqueeCards.tsx) — takes an `event` prop, renders cover image, name, and either a location (Offline) or a platform icon+name (Online), plus a formatted start date/time (via [getFormattedDate.ts](../../apps/web/src/features/events/utils/getFormattedDate.ts)). Responsive text truncation at `window.innerWidth <= 500`. Not currently rendered by any page — looks intended for a "recent events" marquee (there's a commented-out `<Marquee>` block in `Profile.tsx` that would have used something like this).
- [EventCard.tsx](../../apps/web/src/features/events/components/EventCard.tsx) — the card in the `Events.tsx` grid, typed against the looser `EventCardEvent` (`types/interfaces.ts`), not the fixture-complete `DirectoryEvent` — see the `Events.tsx` section above for why. The same card as `OrganizationCard` and the landing page's drives rail — 16:9 cover, cause label on a scrim, one-line title, two-line summary on a fixed box — plus a date badge on the cover. The badge carries the day ("12 SEP") and the meta row carries only weekday and time ("Sat · 9:00 pm"), so the two don't print the same date twice as they did until August 2026. **The whole card links to `/events/:id`**, via a stretched overlay on the title link (`after:absolute after:inset-0`) rather than an `<a>` around everything — one accessible name for the destination, with the organizer link (which points somewhere else entirely) still clickable on top of it via `relative z-1`. Carries `data-reveal`; `Events.tsx` scopes `useSectionReveal` to the grid so cards fade in on scroll and re-reveal when a filter changes. See [ui-kit.md](./ui-kit.md#motion).
  Until August 2026 it accepted no props at all and hardcoded every field, so all twenty cards were byte-for-byte identical. September 2026: the "N going / N spots left" rule described in earlier versions of this doc is gone for a live event (no capacity data to show — see the `Events.tsx` section above); it still renders for a fixture `DirectoryEvent` that has one, which today only means `DetailedEvent.tsx`'s own components (`EventFacts`, `EventJoinPanel`), not this card.

**Net effect:** the `/events` directory and the event detail page both now reflect real backend data end to end — the cards are real `GET /events` records with their real gaps handled rather than fixtures with invented capacity numbers, and nothing on either page claims a number that isn't real. Event creation (`useEvent` + `CreateEvents`) remains the one unwired-to-anything-reachable piece of this feature.

## `DetailedEvent.tsx` — routed at `/events/:eventId`

[apps/web/src/features/events/pages/DetailedEvent.tsx](../../apps/web/src/features/events/pages/DetailedEvent.tsx).
The page an `EventCard` opens. Until August 2026 it was a one-line placeholder (`<div>DetailedEvent</div>`) with no route at all; until September 2026 it was routed but read a twelve-event fixture that the live directory's cards had already stopped linking to, so every real event's card led here to a not-found state instead of a detail page.

**Live data, September 2026.** `:eventId` is a real event's `uid`. `useSWR<ApiEvent>(eventId ? eventEndpoints.byUid(eventId) : null, fetcher)` fetches `GET /events?uid={id}` — reusing the backend's existing single-event branch rather than adding a dedicated route — and `utils/toDisplayEventDetail.ts` maps the result onto the `{ event, detail }` shape this page renders, the same loading/not-found/view three-way branch `OrganizationProfile.tsx` already uses. The old fixture files (`constants/eventDirectory.ts`/`eventDetails.ts`) and their placeholder cover photos are deleted.

**`event.model.ts` grew the fields this page needs**, in the same change that wired the fetch: long-form `about`, a structured `agenda` (the run sheet), `bringAlong`, mode-specific `gettingThere`/`linkDelivery`/`joinRequirements`, an optional `cost`, an optional `fundraiser`, `languages`, `minimumAge`, `contactEmail` — plus two flags. `isGovernmentSponsored` is a trust badge, server/seed-set only (mirrors `Organization.verified` exactly — self-declaring it would be trivially fake-able), rendered by `EventHero` as a brand-tinted pill. `inviteOnly` is organizer-settable; when set, `EventJoinPanel` replaces the Join control with an honest "ask the organizer" state instead of a control that would look live and do nothing useful, and `EventFacts`'s "Who can come" cell reports it directly.

**Content, top to bottom:** `EventHero` (the same cover photo as the card, so arriving reads as that card opening; the two badge pills when set; title, organizer link, then when / how long / where), then a two-column body — main column: About (only if `about` is non-empty), a four-cell fact strip (`EventFacts`, degrading gracefully per-cell rather than disappearing), the run sheet (`EventAgenda`, only if `agenda` is non-empty), venue-or-joining (`EventLocationPanel`, which itself renders nothing if there's genuinely no address/platform to show), and what to bring (only if `bringAlong` is non-empty); sidebar: the join panel (`EventJoinPanel`) and, only where the event raises money, `EventFundraiserPanel`.
On a phone the sidebar renders *first* (`order-1`/`order-2`, one control and one piece of state — not a second copy), because "can I go, and what does it cost" outranks the reading on a narrow screen.

**Cost is a first-class fact and free is the default.** `cost` is *omitted* on the model for a free event rather than set to zero — almost every event here is a nonprofit drive — so the free case says "Free to attend / Nonprofit event. Nothing to pay, ever." in words.

**Attendee capacity is deliberately not tracked.** `going`/`spotsLeft` stay `undefined` on every live event — same "nothing invented" rule the directory card follows. `EventFacts`'s "Attendance" cell and `EventJoinPanel`'s Going/Spots-left row both render an honest "not tracked" state instead. See [known-issues.md](./known-issues.md#events--rsvp-and-attendee-capacity-future-scope-deliberately-not-built) for what real RSVP/capacity tracking would need — flagged as future scope, not scheduled.

**Nothing on this page writes anywhere.** There is no attend/RSVP or payment endpoint (see [api-integration.md](./api-integration.md)):
- Join is local component state, and only offered at all for an event that isn't invite-only. The counts move with it when capacity data exists (`going + 1`, one spot fewer, "You are going"), and the panel says in words that it is saved on the device only and the organizer has not been told. That is deliberate — a control that looks live and silently does nothing is the worse failure, and is what `Profile.tsx`'s Subscribe/Sponsor pair does.
- Contribute toasts "contributions open here soon".
- Share uses `navigator.share` where it exists and the clipboard otherwise; a dismissed share sheet (`AbortError`) is not treated as an error.
- The venue's map is a plain Google Maps *search link*, not an embed — an iframe would mean a third-party script and a cookie banner for one address.

## `HostedEvents` (empty stub)

- [apps/web/src/features/events/components/HostedEvents.tsx](../../apps/web/src/features/events/components/HostedEvents.tsx) — file exists but is **completely empty** (0 bytes); importing it would fail.

## Types

This entire folder is TypeScript. See [events/SPEC.md](../../apps/web/src/features/events/SPEC.md#types) for the full breakdown, including which pre-existing bugs (the `EventCard` prop mismatch, `CreateEvent`'s stray `htmlFor` on a `div`) now surface as suppressed compile errors.
