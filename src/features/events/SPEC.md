# Events — Feature Spec

Colocated, implementation-level companion to [docs/specs/events.md](../../../docs/specs/events.md).
This is the most duplicated-and-broken feature in the codebase — two separate "create event" implementations, one of which cannot ever be submitted (see below, a new finding beyond what the centralized spec documents) — so read this one carefully before touching anything under `components/`.

## What this feature is responsible for

The `/events` directory page, event display (cards, a slider), and event creation.
Nothing rendered under `/events` today reflects real backend data — every visible card, count, and image is a hardcoded placeholder — even though the fetch and creation pieces needed to make it real mostly already exist.

## Why it's shaped this way

Two unrelated event-creation UIs were built at different times and never reconciled: `CreateEvent.tsx` was evidently built by copy-pasting `ProfileUpdate.jsx`/`ProfileCompletion.jsx` (same class-naming convention, same dropzone markup, same `credentials`/`address` state shape) as a starting point, and its API call was never swapped from the profile-update endpoint to an event-creation endpoint — so structurally it's a profile-editing form wearing event-creation labels. `CreateEvents.tsx` (plural) is a separate, purpose-built MUI form that does call the real event-creation endpoint correctly. Only one of the two is reachable from the live `/events` page.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Events.tsx` | The `/events` page | ✅ routed, renders **hardcoded data** |
| `pages/DetailedEvent.tsx` | One-line stub (`<div>DetailedEvent</div>`) | ❌ not routed |
| `components/CreateEvent.tsx` | "Create event" modal opened from `Events.tsx` | ✅ reachable, but **non-functional** (see below) |
| `components/CreateEvents.tsx` | The other, MUI-based, actually-correct "create event" modal | ❌ not rendered from any page |
| `hooks/useEvent.ts` | Validator + submit handler paired with `CreateEvents` | ✅ used by `CreateEvents` only |
| `components/EventCard.tsx` | Card rendered in the `/events` grid | ✅ rendered, but **ignores all data** |
| `components/EventSlider.tsx` | Featured-events carousel above the grid | ✅ rendered, fully static |
| `components/FeaturedEventCard.tsx` / `FeaturedEventImage.tsx` | Slides inside `EventSlider` | ✅ rendered, fully static |
| `components/EventsMarqueeCards.tsx` | Data-driven event card (correctly reads an `event` prop) | ❌ not rendered anywhere |
| `components/HostedEvents.tsx` | **Completely empty file (0 bytes)** | ❌ importing this throws — no default export |
| `components/HosedEvents.scss` | Orphaned stylesheet — note the filename typo ("Hosed" not "Hosted"); not imported by anything, including the (empty) `HostedEvents.tsx` | ❌ dead file |
| `services/Events.ts` | `getEvents()` — the real fetcher | ❌ defined, never called |
| `utils/convertToBase64.ts` | File→base64 helper used by `CreateEvents.tsx`'s cover-image upload | ✅ used by `CreateEvents` only |
| `utils/getFormattedDate.ts` | Ordinal-suffix date formatter (`"1st January"`) | ✅ used by `EventsMarqueeCards` only (itself unused) |

## `pages/Events.tsx`

**`ComponentHelmet type="Clubs"`** — passes the wrong `type` string (should be `"Events"` — `ComponentHelmet` has a dedicated `"Events"` branch it never reaches here); see [layout-navigation.md](../../../docs/specs/layout-navigation.md). Likely a copy-paste leftover from `Clubs.tsx`.

**The `events` array is hardcoded and, worse, shaped like the wrong kind of record:**
```js
const events = Array.from({ length: 20 }, () => ({
  _id: "673ac2814c6e89e58af8ca11",
  userType: "club", userName: "tamalcodes", name: "God Father Org",
  email: "tamalcodes@gmail.com", password: "$2a$10$90vC9McfHXpXpLlzUOFeuulorPR9dIQ2ns37uIP5sX5ehyO5C.Mmm",
  cart: [], __v: 0,
}));
```
This is **the exact same fixture object as `Clubs.tsx`'s hardcoded `clubs` array** (a user/club record — `_id`, `userType`, `userName`, `name`, `email`, `password`, `cart`, `__v`), not shaped like an event at all (no `startDate`, `mode`, `coverImage`, etc. — compare to what `EventsMarqueeCards.tsx` or `useEvent.ts`'s `event` state actually expect). This mismatch is currently invisible in the UI only because `EventCard` (below) doesn't read its `event` prop at all — if `EventCard` were ever fixed to use real event fields, this hardcoded array would need to be replaced with actually-event-shaped data, not just "made dynamic."

**Chrome:** search input + "Filters" button (both inert, no handlers, same as `Clubs.tsx`), a "Create An Event" button (`onClickfunction={() => setShowCreateModal(true)}`, correctly using the shared `Button` component), `<EventSlider />`, an `<hr>`, the event grid, then `{showCreateModal && <CreateEvent setShowCreateModal={setShowCreateModal} />}`.

**The `Loading` fallback is dead code** for the same reason as `Clubs.tsx` — `events` is always a populated 20-item array.

## Two different "create event" components — the central thing to get right

### `CreateEvent.tsx` — reachable from `/events`, but cannot ever be submitted

Opened by `Events.tsx`'s "Create An Event" button.
Structurally near-identical to `ProfileUpdate.jsx`/`ProfileCompletion.jsx` (same `credentials = { description, name, coverImage, address: {...} }` shape, same dropzone markup, same `createevent_*` BEM class convention).

**Wrong endpoint (already known):** `validateForm()` calls `updateUserProfile({ credentials })` — `PATCH /user/update`, the **profile**-update endpoint — not an event-creation endpoint. Submitting this form patches the logged-in user's own profile with whatever was typed into the "event" fields; it does not create an event.

**Severe, previously-undocumented finding: the Save/Submit button can never be enabled, because four of the six address fields it requires are permanently unreachable through the UI.**
Walk through every input in the form and which state key it actually reads/writes via `handleChange(field)`:

| Field label | Placeholder text shown | Reads/writes `credentials.address.` |
|---|---|---|
| Contact Number | "Contact Number for your event" | `line1` |
| Contact Email | "Email Id for your event" | `line2` |
| Address Line 1 | "Social Link for your event" (copy-paste leftover placeholder, wrong copy) | `line1` |
| Address Line 2 | "Email Id for your event" (also copy-pasted, wrong copy) | `line2` |
| City | "Social Link for your event" (wrong copy) | `line1` |
| State/Province | "Email Id for your event" (wrong copy) | `line2` |
| Country of establishment | "Social Link for your event" (wrong copy) | `line1` |
| Pincode/Zipcode | "Email Id for your event" (wrong copy) | `line2` |

**Eight visually distinct inputs share only two real state slots (`address.line1` and `address.line2`)**, each overwriting whatever was typed into any other input bound to the same key — e.g. typing a pincode overwrites whatever was typed as the city, which overwrote whatever was typed as "Address Line 1," which overwrote the contact number.
Meanwhile, `credentials.address.city`, `.state`, `.country`, and `.pincode` **exist in the initial state object but no `<input>` in this component ever writes to them** — they stay `""` forever.
The Save button's `disabled` condition checks exactly those four keys (`!credentials?.address?.city || !credentials?.address?.state || !credentials?.address?.country || !credentials?.address?.pincode`, alongside `line1`/`line2`) — **since those four keys can never become non-empty, the button is permanently disabled, for every user, regardless of what they type.**
This form is not just "wired to the wrong endpoint" — it is currently impossible to submit at all through normal interaction.
**If asked to fix event creation from `/events`, treat `CreateEvents.tsx` (below) as the implementation to build from, not this one** — per the existing guidance in `docs/specs/events.md`, and now doubly true given this form can't even be submitted to test the wrong-endpoint bug in the first place.

**Event mode picker:** a plans-style radio UI (`.plan.basic-plan` = Online, `.plan.complete-plan` = Offline) sets `credentials.eventMode` via `onClick` on the wrapping `<div>` rather than the actual `<input type="radio">`'s own `onChange` — the radio inputs are visually present but not the actual event source; only the first (`Online`) has `checked` hardcoded, so the radio UI doesn't even visually reflect `eventMode` after a click (clicking "Offline" changes `credentials.eventMode` but the "Online" radio stays visually checked, since neither `checked` prop is bound to state).

### `CreateEvents.tsx` — the correct implementation, not rendered anywhere

Not imported by `Events.tsx` or any other page — no reachable entry point today.

**Local state, `event`:**
```js
{
  name: "", startDate: dayjs(), endDate: dayjs(),
  startTime: dayjs("2022-04-17T15:30"), endTime: dayjs("2022-04-17T15:30"),
  mode: "Offline", uid: "", description: "",
  city: "", state: "", address: "", country: "India", mapIframe: "",
  coverImage: "<hardcoded Pexels placeholder URL>",
  platform: "Zoom Meeting", platformLink: "",
}
```
Note `startTime`/`endTime` default to a fixed hardcoded date-time (`2022-04-17T15:30`) — only the *time* portion is meaningful (MUI's `TimePicker` extracts just the time), but if this component's date-handling is ever touched, be aware the year/month/day on these two fields is stale and never used for anything except being a syntactically valid `dayjs` object.

**Cover image:** `handleCreateBase64` (wrapped in `useCallback`) calls `convertToBase64(e)` (this feature's own util, see below) and stores the result directly in `event.coverImage` as a base64 data URI — **unlike the profile/`CreateEvent.tsx` dropzones, this one actually attaches the uploaded file to the data that gets submitted**, rather than only previewing it.

**Mode-dependent fields (MUI `Accordion`):** `mode === "Offline"` shows city/state/address (plain text inputs) + a country `<Select>` populated from [`src/statics/CountryList.js`](../../../src/statics/CountryList.js) + a `mapIframe` text input (a raw iframe *string*, not validated as one, no live preview). `mode === "Online"` shows a platform `<Select>` populated from [`src/statics/OnlinePlatform.js`](../../../src/statics/OnlinePlatform.js) (Zoom/Google Meet/Microsoft Teams/etc., each entry with an `icon` rendered inline in the `<MenuItem>`) + a `platformLink` text input.

**Submit:** `handleSubmit()` calls `seterrors(validateEvent())` then, in the same synchronous call, `submitCallback(event, setshowCreateModal)` — see `useEvent.ts` below for why calling both in this exact order, from the same render, matters.

## `hooks/useEvent.ts` — pairs with `CreateEvents` only

```js
export function useEvent(event) → { validateEvent, submitCallback }
```

**Called once per render** of `CreateEvents.tsx` (it's invoked directly in the component body, not memoized), receiving that render's current `event` state.
Each call creates a **fresh, closure-local `errors = {}`** object — this is the key mechanic to understand: `validateEvent` and `submitCallback`, from the *same* `useEvent(event)` call, close over the *same* `errors` object reference, so `validateEvent()` mutating `errors` is visible to `submitCallback` **only if both are called from that same render's closures, synchronously, before the component re-renders and `useEvent` is invoked again with a new empty `errors`.**
`CreateEvents.tsx`'s `handleSubmit` does exactly this — `seterrors(validateEvent()); submitCallback(event, setshowCreateModal);`, both calls using this render's `validateEvent`/`submitCallback` — so it works today, but only because of this precise call ordering, not because of any explicit synchronization. **If `handleSubmit` is ever refactored to `await` something (e.g. an async pre-check) between the two calls, or if `submitCallback` is invoked from a different render's closure (e.g. via a `setTimeout` capturing a stale reference), `submitCallback` would validate against a stale or empty `errors` object instead of the one just computed** — this is a real footgun for anyone modifying this form, not a hypothetical one, since the whole mechanism relies on same-tick closure identity rather than a `useRef`/passed-argument.

**`validateEvent()`:**
1. `const { uid, ...data } = event;` — `uid` is checked separately from the rest of `data`.
2. Required-field pass: `name`, `uid`, `description`, `coverImage`, `mode`, `startDate`, `endDate`, `startTime`, `endTime` — plus, nested inside the *same* `if` block, either (`mode === "Offline"`) `city`/`state`/`country`/`address`/`mapIframe`, or (else) `platformLink`. **This nested mode-specific check only runs if at least one of the top-level required fields was already missing** — i.e. `validateEvent` does not independently check mode-specific fields when all top-level fields are present; if `name`/`uid`/`description`/etc. are all filled in but `mapIframe` (for an Offline event) is empty, this block is skipped entirely and no error is set for the missing `mapIframe` — a real validation gap: **an Offline event can pass validation with no address/mapIframe if every other required field happens to be filled**, and an Online event can similarly pass with no `platformLink`.
3. **Unconditional length/order checks, run regardless of step 2's outcome:** `name.length` must be 10–80, `description.length` must be 20–200, `endDate >= startDate`, `endTime >= startTime`. These run even if `data.name`/`data.description` are empty strings (`"".length` is `0`, which fails the `< 10`/`< 20` bound — so an empty required field still produces a length-related error message rather than (or in addition to) the presence-based one from step 2 — the messages can end up slightly misleading, e.g. "Name should be between 10 and 80 characters" for a name that's simply blank, rather than "Name is required"). Would throw a `TypeError` if `data.name`/`data.description` were ever literally `undefined` rather than `""` — not reachable today since `CreateEvents.tsx`'s initial state always supplies strings, but worth knowing if this hook is ever reused with a different initial shape.
4. Returns the `errors` object (not a boolean, not throwing) — callers must inspect `Object.keys(errors).length`.

**`submitCallback(event, setshowCreateModal)`:**
- If the closure's `errors` is empty (see the same-render caveat above): calls `CreateEvent(event)` (`MilanApi.js`, `POST /events/create`, **the real event-creation endpoint** — contrast with `CreateEvent.tsx`'s wrong-endpoint bug above; naming collision alert: the *hook's* `CreateEvent` import from `MilanApi.js` and the *component* `CreateEvent.tsx` are unrelated same-named things). On `response.status === 201`: success toast, `setshowCreateModal(false)`, and `mutate(eventEndpoints.all)` via `useSWRConfig()` — invalidates any cached SWR entry for `eventEndpoints.all`. **Per [api-integration.md](../../../docs/specs/api-integration.md), no component currently fetches `eventEndpoints.all` via SWR (`Events.tsx` uses a hardcoded array instead), so this revalidation call currently has no listener** — it's correct/harmless, just currently inert, and would start doing useful work the moment `Events.tsx` is wired up to a real SWR fetch of that key.
- On any other status: `showErrorToast(response.response.data.message)` — note the doubled `.response.response` — this only works if `CreateEvent()` (the `MilanApi.js` function) returned a raw Axios error object with `.response.data.message` rather than the `error.response` shape `MilanApi.js`'s other functions typically return; check `CreateEvent`'s own catch block in `MilanApi.js` before assuming this path is exercised correctly (it returns the caught `error` object as-is, not `error.response`, unlike most other `MilanApi.js` functions — so `response` here actually holds the full Axios error, and `response.response.data.message` is consistent with that, if unusual compared to sibling functions).
- If `errors` is non-empty: a single generic toast, "Please fill all the required fields" — no per-field detail in the toast (per-field detail is shown inline via `errors.name`/`errors.uid`/etc. in the form itself).

## Event display components — none read real data except one unused component

- **`EventCard.tsx`** — **declares no parameters at all** (`const EventCard = () => {...}`), so `Events.tsx`'s `event={event}` prop is not even destructured, let alone used. Every visible field ("Food Marathon, 2025", "GodLike Club", the description paragraph, three identical GitHub avatar images, "+300 Participated") is hardcoded JSX, byte-for-byte identical across all 20 rendered cards.
- **`FeaturedEventCard.tsx`** — same hardcoded content as `EventCard.tsx` (near-identical JSX, different class prefix `featured_eventcard_*`), also takes no props. Its CTA is "Register Now" — a plain `<button>` with no `onClick`.
- **`FeaturedEventImage.tsx`** — a static "Featured" tag + a single hardcoded Devfolio-hosted image URL, no props.
- **`EventSlider.tsx`** — builds a fixed 10-item `slides` array (alternating `FeaturedEventImage`/`FeaturedEventCard`, ids 1–10, all rendering identical static content per above), pairs them two-per-slide (`slides.length / 2` = 5 slides), and auto-advances `index` via `setInterval(..., 3000)` with CSS `transform: translateX(-${index*100}%)`. No Swiper/carousel library despite `swiper` CSS being imported at the page level for other components — this is a hand-rolled carousel. No pause-on-hover, no manual nav controls, no accessibility affordances (no `aria-live`, no keyboard control).
- **`EventsMarqueeCards.tsx`** — **the one component in this feature that actually reads and correctly uses an `event` prop**: cover image, name, either a location (`CiLocationOn` + `event.address`, when `mode === "Offline"`) or a platform icon+name (`mode !== "Offline"`, icon URL chosen via a nested ternary keyed on `event.platform` — falls back to a generic "other" icon for any platform not literally `"Zoom Meeting"`/`"Google Meet"`/`"Microsoft Teams"`), and a formatted start date/time via `getFormattedDate(event?.startDate)` + `event?.startTime` rendered with responsive truncation (`window.innerWidth <= 500` shows an abbreviated date). **Not rendered by any page.** Given `Profile.jsx` (onboarding-profile feature) has a commented-out `Marquee` block referencing an `EventsCard`, this component looks like the intended content for that commented-out section — see [onboarding-profile/SPEC.md](../onboarding-profile/SPEC.md).

## `components/HostedEvents.tsx` — literally empty

Confirmed via direct read: the file is **0 bytes**, no export at all.
Any `import HostedEvents from "..."` would resolve to `undefined` as the default export — rendering `<HostedEvents />` would throw (`Element type is invalid`).
Its sibling stylesheet, `HosedEvents.scss` (note the filename itself is missing the "t" in "Hosted" — `Hosed`, not `Hosted`), is also not imported by anything, including the empty component file, so it's doubly dead.
Given the name, this was likely intended to show a logged-in club's own list of hosted events (a natural companion to `Dashboard.tsx`) — if asked to build that feature, this is the file to fill in, but there's no existing logic here to preserve; it's a truly blank slate, not a stub with a signature to match.

## `services/Events.ts` — `getEvents()`, correct, never called

Identical shape to `clubs/services/Clubs.js`'s `getClubs()` — same `apiConnector`-based Layer B call pattern, same throw-on-non-200 behavior (see [clubs/SPEC.md](../clubs/SPEC.md) for the full explanation of this calling convention, which is the opposite of `MilanApi.js`'s catch-and-return-response pattern).
`clubEndpoints.all` → `eventEndpoints.all` is the only substantive difference.
Even the leftover comment above the function (`// get clubs`) is a copy-paste artifact from `Clubs.ts` — cosmetic, but a good signal of how directly one file was cloned from the other.

## `utils/convertToBase64.ts`

`converter(file)` wraps `FileReader.readAsDataURL` in a promise.
**Latent bug, not previously documented:** if `file` is falsy, it calls `alert("Please select an image")` but **never calls `resolve()` or `reject()`** — the returned promise would hang forever (an unresolvable, unrejectable promise) rather than surfacing the "no file" case to its caller.
Not reachable today because the only call site, `convertToBase64(e)`, already guards `if (!e.target.files || e.target.files.length === 0) return;` before ever calling `converter` — so `file` is always truthy by the time `converter` runs.
If this util is ever reused elsewhere without that same guard, this hang becomes reachable — worth fixing (`reject(new Error("No file selected"))` instead of `alert`+silent hang) if you're touching this file for another reason.
Two commented-out lines at the bottom of `convertToBase64` (`// setevent(...)`, `// e.target.value = ""`) are vestigial — that state-update responsibility moved to the caller (`CreateEvents.tsx`'s `handleCreateBase64`) at some point, and the dead comments were never cleaned up.

## `utils/getFormattedDate.ts`

Pure function, `getFormattedDate(dateString) → "1st January"`-style string (day + ordinal suffix + full month name, no year).
Correctly handles the 11th–13th "th" exception.
No timezone handling — relies on `new Date(dateString)`'s local-timezone interpretation, whatever that resolves to in the visitor's browser.
Only consumer is `EventsMarqueeCards.tsx` (itself unused) — so this function currently has no live call path either.

## Data flow summary — `/events` today (hardcoded) vs. `CreateEvents` (correct, unreached)

```
Events.tsx render
   ▼
events = 20x identical hardcoded user/club-shaped object   (no network call)
   ▼
events.map(event => <EventCard event={event} />)   ← EventCard takes no params, event is discarded
```

```
CreateEvents.tsx (not rendered anywhere) — the correct creation path
   ▼
local `event` state (name/dates/mode/uid/description/coverImage/mode-specific fields)
   ▼
handleSubmit() → seterrors(validateEvent()); submitCallback(event, setshowCreateModal);
                    (same render's useEvent(event) closures — order-dependent, see above)
   ▼
CreateEvent(event)   [MilanApi.js, POST /events/create]
   ▼
201 ──► toast, close modal, mutate(eventEndpoints.all)   (currently has no SWR listener)
```

## Types

This folder is TypeScript (`.ts`/`.tsx`) as of this conversion pass — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern this repo follows.
`types/index.ts` holds `CreateEventCredentials` (the broken `CreateEvent.tsx`'s profile-shaped state), `EventFormState`/`EventFormErrors`/`UseEventResult` (the correct `CreateEvents.tsx`+`useEvent.ts` pair), and `EventRecord` (the loose shape `EventsMarqueeCards.tsx` and a real event record are expected to have).
Two pre-existing issues documented above now surface as real compile errors, both left in place behind documented `@ts-expect-error` suppressions rather than fixed, consistent with this pass's types-only scope:
- **`EventCard.tsx` ignores its `event` prop entirely** — its call site in `Events.tsx` suppresses the resulting excess-property error rather than `EventCard` being given a prop type it doesn't actually read.
- **`CreateEvent.tsx`'s `htmlFor` attributes on `<div>` elements** (the event-mode picker) aren't valid on a `div` — harmless pre-existing markup, suppressed rather than removed.

`Events.tsx`'s hardcoded `events` array is now explicitly typed as `Club[]` (imported from `@features/clubs/types`) rather than a home-grown `EventRecord[]`, to make the "this is club-shaped, not event-shaped" mismatch the type checker's problem too, not just a documentation note.
`useEvent.ts`'s `submitCallback` asserts `CreateEvent()`'s (from `MilanApi.js`) return type at the call site, since that function's own catch block returns the caught error as-is rather than `error.response` — its real inferred type collapses to include `unknown`. `HostedEvents.tsx` stays a genuinely empty (0-byte) file, matching `HostedEvents.jsx` — there was nothing to add types to.

## Known issues specific to this feature (superset of known-issues.md's events entries, plus new findings)

- **`CreateEvent.tsx`'s Save button can never be enabled** — four required address fields are permanently unreachable through the UI (new finding, more severe than the "wrong endpoint" bug already documented).
- **Eight `CreateEvent.tsx` inputs share only two real state slots** (`address.line1`/`line2`), several with copy-pasted/wrong placeholder text — new finding.
- `CreateEvent.tsx` calls the profile-update endpoint instead of an event-creation endpoint — already in `known-issues.md`.
- `CreateEvent.tsx`'s event-mode radio UI doesn't visually reflect the actual selected mode after a click — new finding.
- `validateEvent()`'s mode-specific field checks (address/mapIframe or platformLink) only run if a top-level required field is also missing, letting an event with all top-level fields but no address/platform link pass validation — new finding, refines the existing known-issues.md entry about this hook.
- `submitCallback`'s reliance on same-render closure identity between `validateEvent()` and `submitCallback()` — already flagged in `known-issues.md`, precise mechanism explained above.
- `EventCard`, `FeaturedEventCard`, `FeaturedEventImage` all ignore their (or any) props entirely — already in `known-issues.md`.
- `Events.tsx` passes `type="Clubs"` to `ComponentHelmet` — already in `known-issues.md`.
- `HostedEvents.tsx` is a 0-byte file; importing it throws — already in `known-issues.md`. Its `.scss` sibling has a typo'd filename (`Hosed` not `Hosted`) — new finding.
- `convertToBase64.ts`'s `converter` can hang forever on a falsy file (currently unreachable via the guarded call site) — new finding.
- `getEvents()` is fully correct and unused — already in `known-issues.md`.

## If you're asked to...

- **"Add event creation" / "fix the create event button"** → clarify which surface: `/events`'s button opens the non-functional `CreateEvent.tsx`. The correct implementation to build from is `CreateEvents.tsx` + `useEvent.ts`, which isn't wired into any page — the fix is very likely swapping `Events.tsx`'s import from `CreateEvent` to `CreateEvents` (checking prop-name compatibility — `CreateEvent` takes `setShowCreateModal`, `CreateEvents` takes `setshowCreateModal`, different casing) rather than patching the broken component in place.
- **"Make the events page live"** → same shape as the clubs-page fix: wire `useSWR(eventEndpoints.all, getEvents)` into `Events.tsx` in place of the hardcoded array, then fix `EventCard.tsx` to actually accept and render its `event` prop (it currently has no parameter to even destructure from).
- **"Fix the copy-paste SEO bug on the events page"** → change `<ComponentHelmet type="Clubs" />` to `type="Events"` in `Events.tsx`.
- **"Build a 'my hosted events' view for the dashboard"** → `HostedEvents.tsx` is the intended file (currently empty) — there's no existing logic to preserve, treat it as new work.
- **"Show a real event's location/platform info somewhere"** → `EventsMarqueeCards.tsx` already does this correctly and just needs a page to render it from; the commented-out `Marquee` block in `onboarding-profile/pages/Profile.jsx` is the most likely intended destination.
