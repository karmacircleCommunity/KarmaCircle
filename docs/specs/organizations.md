# Organizations

The organizations directory (`/organizations`), the public organization profile it links to (`/organization/:userName`), and the owner-only setup page that decides whether either shows anything (`/organization/setup`).

**All three are live** as of the organization model landing (August 2026).
The backend now keeps organizations in their own collection with a draft/live status, and serves only complete profiles publicly — see [apps/api/docs/specs/organizations.md](../../apps/api/docs/specs/organizations.md), which is the source of truth for the shapes below.

## The flow this feature implements

1. Someone signs up with account type "Organization" (`Auth.tsx`). The backend creates the login **and** a draft organization record owned by it.
2. `useAuth` sends a new organization to `/organization/setup` rather than the home page — a draft has nothing to see anywhere else.
3. That page **opens on an intro**, rather than on the form. The intro's job is to get setup started now — the primary button does that, and the copy is about what a published profile does (turning up in the directory and in searches). Setup is not technically mandatory, so a de-emphasised "Maybe later" text link still leaves for the home page with nothing half-filled, and the account can come back at any time (the dashboard carries a reminder while the organization is still in draft) — but the screen no longer frames leaving as an equal option.
4. Saying yes starts a Typeform-style flow: one question per screen, eight of them, grouped into two steps. Each step saves on its own, so stopping halfway keeps whatever was answered.
5. Until the required fields are filled, the organization is absent from `/organizations` and its own public profile 404s.
6. The save that completes the required list publishes it. The directory and the profile light up in the same moment, and the owner is handed straight to their new public profile.

The required list lives on the backend (`REQUIRED_FIELDS`) and reaches the page as `missingFields`, so the checklist can never disagree with the rule that actually gates publication.

## The setup flow — `/organization/setup`

Routed at `/organization/setup` (declared above `/organization/:userName`, though React Router already ranks a static segment above a dynamic one).
It is a focused flow, not a page inside the app chrome: no navbar, no footer, and the same split shell as the auth pages (see [ui-kit.md](./ui-kit.md#splitpanellayout)) — a dark brand panel on the left, the form on the right.

Six files, each with one job:

| File | Job |
|---|---|
| `pages/OrganizationSetup.tsx` | Which screen to render, and what each button does |
| `hooks/useOrganizationSetup.ts` | The record, the taxonomy, the form state, the position in the flow, the transitions, and the per-step save |
| `constants/organizationSetup.ts` | The steps **and their questions, as data**, plus `FIELD_SPECS`, `REQUIRED_LABELS` and the domain cap |
| `utils/organizationSetupForm.ts` | Pure form helpers — seeding, per-step payloads, dirty checks, outstanding counts, the resume path |
| `components/setup/SetupLayout.tsx` | The shell: the left-panel quote + atmosphere, and the flow-wide progress bar (denominator read from the step list) |
| `components/setup/SetupAside.tsx`, `constants/setupAsideQuotes.ts` | The left panel — one real quote, re-picked at random per page load, same on the intro and every question |
| `components/setup/SetupQuestion.tsx`, `SetupIntro.tsx` | One question rendered by kind, and the intro's right-hand panel (welcome + step preview + CTA) |

**Adding a question is an entry in `SETUP_STEPS`** (plus, at most, a `FIELD_SPECS` row for a grouped field). The progress bar's denominator, the URL, the save boundary and the intro's step preview all read that list; none of them count to two steps or eight questions.

### It leads with setup, and it is still escapable

The previous version of this page dropped a brand-new organization into a long required form with no way out but the browser's back button.
The correction to that was once "make leaving as easy as staying"; the intro over-rotated on it, mirroring the step list and the save/leave reassurance on both panels so the loudest thing on the screen was permission to leave.
The pass after that over-corrected the other way — the left panel became a second information column (headline, paragraph, three-item checklist, footnote) that mirrored the right in density.
It then went too sparse — a two-line statement alone read as unfinished, and the intro and the question screens had two different left panels, which made the flow feel like two designs.
Now:

- **The intro leads with the payoff, not the exit.** `SetupIntro.tsx` (the right panel) is the whole task: the two steps that are coming, the timing line, and the primary "Set up my profile" button. The "Draft — not visible yet" badge above it carries the consequence. It is vertically centred (`align="center"`) in a `max-w-md` column, so the panel reads as considered rather than crammed at the top.
- **The left panel is the same on every screen of the flow** — intro and all eight questions — so the two stages read as one. `SetupAside.tsx` renders one real, publicly-attributed quote on giving or collective action (`constants/setupAsideQuotes.ts`): an oversized brand quotation mark set behind the line as a watermark, the line itself (`leading-relaxed`), then a monogram + name + role, generously spaced. A fresh quote is picked on every page load and held in state so it doesn't reshuffle mid-flow. Behind it, wired as `SplitPanelLayout`'s `asideDecor`, a slow brand aura and an orbit motif (a brand dot circling a faint ring) anchored off the panel's bottom-left corner, clear of the copy — both `motion-safe:` decorative loops (see [ui-kit.md](./ui-kit.md#motion)). These are **not testimonials**: no portrait (a monogram stands in), and the framing is "a thought to sit with", because this codebase does not manufacture social proof it doesn't have (see [authentication.md](./authentication.md)).
- **Wayfinding moved to the right, and there is only one of it.** The old left-hand step rail is gone. The right panel's progress bar is the whole story: the step title on the left, "N of 8" on the right. `SetupAside` carries no counter at all — an earlier pass gave it a "Step 1 of 2 · 6 details left" line that sat next to the right panel's "2 of 8" and just made the two disagree (two scales, two phrasings, for one position in one flow).
- **The left panel does not move between screens.** It is always vertically centred (`SplitPanelLayout` centres the aside regardless of `align`), so the quote sits in the same place on the intro and on every question. `align` still switches the *right* panel between `center` (intro, a short centred card) and `start` (questions, a top-aligned form that scrolls) — but that no longer drags the aside up and down with it, which is what made the intro→step-1 hand-off read as the page coming apart.
- **"Maybe later" still exists, quietly.** Setup is not technically mandatory and the flow resumes from the navbar, so the link stays (`data-cy="setup-later"`) — but as a small, centred `text-caption` text link under the CTA, not a second button beside it. The "leaving now is fine, here's how to get back" paragraph is gone.
- **Every step has an exit.** A close (×) in the top-right corner saves the step on screen and then leaves for `/`; "Back" walks back through the steps to the intro. This is the genuine mid-flow safety valve; it was never the thing that was over-emphasised. It was a full "Save and finish later" in the same visual weight as the flow's own actions, which put the way *out* at the volume of the way forward - the behaviour is unchanged (it still saves, and still says so in a toast), but the control now only has to mean "leave", and its `title`/`aria-label` still read "Save and finish later" for anyone who hovers or is on a screen reader.
- **There are two ways back in, always visible.** The navbar's account dropdown grows a **"Finish setting up"** entry while the organization is a draft ([layout-navigation.md](./layout-navigation.md)), and `components/OrganizationSetupGate.tsx` stands in front of every page that only means something once the profile is live — `/dashboard` and `/organization/events` today. Instead of a dashboard of empty placeholders, a draft account gets told which step it stopped on and handed a link that resumes there.
- **"Resume" means resume.** `resumeSetupPath(missingFields)` returns the first step that still has a required field missing, so both entry points land on `?step=reach` if only step two is outstanding — not back at the beginning.
- **Both read the record through one hook.** `hooks/useMyOrganization.ts` fetches `GET /organizations/me` only for a signed-in organization (it is a 403 for anyone else) and SWR dedupes the key, so the navbar and the gate on the same page share one request.

The gate replaced a modal. `onboarding-profile/components/ProfileCompletion.tsx` — the old "We're almost done" org-completion form — was mounted over the dashboard whenever `config.hasCompletedProfile === false`, duplicated this flow against a different endpoint, and had its close handler wired to a prop the dashboard never passed, so it could not be dismissed. `Dashboard.tsx` no longer mounts it; see [known-issues.md](./known-issues.md).

### One question at a time, saved once per step

The flow is a Typeform, not a form: each screen asks one thing in a sentence, and the answer is the biggest thing on it. What it replaced put thirteen labelled fields on a single scrolling page, which is what turned a two-minute task into paperwork.

Question and step are two different granularities on purpose — **a question is how much someone is asked to think about at once; a step is how much is worth a round trip.** Four questions in, one PATCH.

- **Step one, "about"** — name, what you do, kind of organization, causes. Required: `description`, `tag`, `domains`.
- **Step two, "reach"** — team size, where you are, how to reach you, funding. Required: `teamSize`, `city`.

Some screens ask for more than one field, and that is deliberate: city/state is one thought, and two consecutive screens for it reads as an interrogation. A question declares its own `fields`, so grouping is a data decision, not a component one.

#### "Where are you based?" suggests, and can answer itself

The one grouped question whose answers come from a known set.
Both fields are still plain text and anything typed is accepted, but the city field offers matches as you type, and picking one fills the state too - the state is a fact about the city, not a second question.
Typing a state first only reorders the city matches, which is how "Rajpur" resolves to the right one of the six places called that.
Beside the headline - in the right half of that row, which was otherwise empty - sits a single "Use my location", which asks the browser for a fix and turns it into the same two values.
It is an outline pill borrowing the shape the flow already uses for its tag and cause options, so it reads as a control rather than as leftover text, and stays outline-only so it never competes with Continue.
It has moved twice. The first version was a bare label with a hairline icon floating in the empty space under the City field, which looked like a rendering accident; the second was this pill, still stacked under the two fields, which put an optional aid *below* the answer it helps with and directly in the path between the fields and Continue.
Above the fields it is offered before the typing starts rather than after it.

**The shortcut disappears once there is a city.** It is answering a question nobody is asking any more, and leaving it there is what made the screen feel stacked. It comes back if the field is emptied, and it stays through a press that is still running or that just failed - the two moments where the next thing wanted is this button again.
What the press has to say still lands under the fields, in caption grey: a full sentence needs room the headline row doesn't have, and the note is about the two values that just changed.
[`useLocateCity`](../../apps/web/src/features/organizations/hooks/useLocateCity.ts) is what lets those two halves sit on opposite sides of the fields - the page owns the state, [`SetupLocateButton`](../../apps/web/src/features/organizations/components/setup/SetupLocateButton.tsx) renders the trigger in the headline row and [`SetupLocationFields`](../../apps/web/src/features/organizations/components/setup/SetupLocationFields.tsx) renders the result.
The label dropped "current" along the way: sharing a row with a 32px headline makes every word cost a wrap, and there was no other location on offer.

**Locating is tried three times, in two different ways, and every way it can fail says something different.**
A desktop browser freshly granted permission often answers the first cheap request with "position unavailable" while its provider is still cold and succeeds on a second, more patient one, so a failure that is not a permission refusal is retried once with `enableHighAccuracy` and a longer timeout.
A refusal is never retried - asking again for what was just declined is how a site gets its prompts blocked outright.

**When the device still won't answer, the connection is asked instead.**
`unavailable` is not always a state the user can get out of.
Some browsers hold a granted permission and return "position unavailable" indefinitely - the operating system's Location Services are off for that browser, or the browser ships without the network-location backend Chrome has - and no amount of pressing Allow or walking the System Settings path changes it.
That was the state this shipped in on Brave for macOS with Location Services already switched on for it, and it made the button a permanent dead end for anyone whose browser is in it.
So `unsupported`, `insecure`, `unavailable` and `timeout` now fall back to a keyless IP lookup (`ipwho.is`, then `get.geojs.io` if the first is rate-limited or down), whose coordinates go through the same local nearest-city match.
Typically about 150ms, and the result is labelled as what it is - *"Your device wouldn't say, so this is from your connection: Kolkata, West Bengal. Change it if that's not right."* - because an IP guess is the right town on a home line and the wrong country behind a VPN, and it should be offered as a guess so it gets corrected.
`LocateSource` (`"device"` / `"network"`) is what carries that distinction up to the screen.
`denied` deliberately does **not** fall back: answering an explicit refusal by finding another way is worse than failing.
Neither does `no-match` - a device fix is authoritative about being nowhere near anything listed.
If both providers fail too, the device's own failure is what gets reported, since it is the more actionable of the two.

The six outcomes (`LocateFailure`) exist because the remedies are in six different places, and the important pair is `denied` versus `unavailable`: they feel identical from the outside and are fixed in two different settings screens.
`denied` is this site's browser permission; `unavailable` is now the much narrower case of the browser being allowed to ask, coming back empty, *and* the connection not being placeable either.
The copy for that case names the actual path through System Settings, because someone who has just pressed Allow and been told "couldn't work out where you are" will otherwise press Allow again - which is exactly what happened the first time this shipped.
The raw `GeolocationPositionError` code and message go to `console.warn`, since that is the only way a bug report can say which of the two it was.

It runs entirely off a list that ships with the app - [`@statics/IndiaCities`](../../apps/web/src/statics/IndiaCities.ts) and [`@statics/IndiaStates`](../../apps/web/src/statics/IndiaStates.ts), 4,198 towns and all 36 states and union territories, searched by [`@utils/locationSuggest`](../../apps/web/src/utils/locationSuggest.ts) and rendered by the shared [`Combobox`](./ui-kit.md#combobox).
That was chosen over a geocoding API deliberately.
There is no key to rotate, no per-keystroke quota, nothing to be slow or down, suggestions work offline, and the coordinates behind "use my current location" are matched against the bundled list in the browser rather than posted to somebody else's server - a location shared to fill in a form field should not also become a request to a third party.
The one request that ever leaves is the IP fallback above, and it is the inverse of that: it carries no body and no identifier and asks where the connection is, rather than telling anyone where the user is.
The cost is one 47KB (gzipped) chunk, dynamically imported when [`SetupLocationFields`](../../apps/web/src/features/organizations/components/setup/SetupLocationFields.tsx) mounts, so it is never in the initial bundle and is already loaded by the first keystroke.

Two ranking details are load-bearing, and both exist because the obvious version was wrong on the obvious input:

- **Matches are ordered by population inside each match tier.** Ranked by name length instead, "kol" answers Kolar, Kollam and Kolaras before Kolkata - every one a real place, none of them what almost anybody typing those three letters means. Population is a tie-break *within* a tier and never across one, so a village is still found as soon as enough of its name is typed to out-tier the city. It is used for ordering only and never displayed.
- **"Use my location" offsets distance by a reach that grows with population.** Every city in the list is a single coordinate, which is a fiction for anywhere large: strict nearest-point wins answer "Dam Dam" to someone standing in Salt Lake and "Andheri" to someone in Mumbai. The reach is about 2km for a place too small to measure and caps at 30km for a metro, so a named suburb still wins when the fix is genuinely in it. A coordinate more than 150km from anything listed is refused outright rather than dressed up as a confident answer, which is also what happens to anyone outside India.

The list is **generated, not hand-maintained** - city, state and coordinates from the open countries-states-cities database, population joined on from GeoNames' `cities5000`.
Refresh it by re-running that join; a row patched by hand is one the next regeneration silently drops.
It is India-only because the product is, and the shape (a state list plus rows pointing into it) takes a second country without changing the search code.


`SETUP_STEPS[].requiredFields` across both steps must stay equal to the backend's `REQUIRED_FIELDS`; that list is what actually publishes the organization, this one only decides where each item is asked for. `SETUP_REQUIRED_FIELDS` is the flattened version, so a mismatch is visible in one place. `name` is the one exception — it is required to save but is deliberately excluded from the step's `requiredFields`, because signup always fills it and it can never be what blocks publication.

**The motion is the point, and it is directional.** Moving forward, the answered question leaves upward and the next arrives from below; going back, both reverse — a single pair of animations would make "Back" look like another step forward. Four tokens (`--animate-question-in`/`-out`/`-in-back`/`-out-back`, [ui-kit.md](./ui-kit.md#motion)) carry it, applied through `motion-safe:`, and the hook skips its exit delay entirely under `prefers-reduced-motion` rather than animating a shorter version of the same thing. `EXIT_MS` in the hook must stay in step with the CSS duration: shorter and the exit is cut off, longer and the flow sits on an empty screen. `busy` drops any advance requested mid-transition, so a double-press can't skip a question.

**The paragraph answer is the one field that is a box, not an underline.** An underline only works when the text sits on it; a textarea aligns its text to the top, so a tall one draws its rule an inch below the words and they read as floating. It grows with what is typed between a floor and a ceiling (`AREA_MIN_PX`/`AREA_MAX_PX` in `SetupQuestion.tsx`) with `resize-none` — the first version was `resize-y` with no ceiling, so it could be dragged to any height at all and started mostly empty regardless of the answer. The box is also where a writing extension (Grammarly and friends) expects to put its own button: in the corner of a bordered field rather than loose over a gap. Nothing disables those extensions — this is the one field on which someone might genuinely want one.

**Three things the keyboard does**, because a one-question screen leaves it idle otherwise: Enter continues (the screen is a `<form>`, so this is native, and a textarea keeps Enter for newlines); letter keys pick options on choice screens, which is why every option carries an A/B/C badge; and the first input of each question is focused on arrival — except on touch, where it would throw the keyboard up over the question being asked.

Behaviours worth keeping if this is rewritten again:

- **A save sends only its own step's fields** (`toStepPayload`). Step two's blank inputs can't wipe step one's answers, and a validation failure in a field the user hasn't reached yet can't block the step they're on.
- **A partial save is allowed.** Only fields with content are sent, so an optional field left blank is "untouched", not "cleared" — sending `website: ""` to a URL-validated field is the difference between a save and a 400. `domains` is the one exception: it is always sent, because deselecting every chip is a real edit that an empty-means-untouched rule would drop.
- **A required question cannot be walked past, but the flow can be left at any time.** These are not the same freedom, and the distinction is the whole design: "Save and finish later" (and "Maybe later" on the intro) writes whatever is filled in and goes, while Continue refuses to move off a required question that is blank. An answer skipped mid-flow is one nobody would ever be prompted for again — the organization would sit in draft with no idea which screen it was on. The refusal focuses the offending field and turns the note under it red; it does not disable the button, so pressing it always explains itself rather than going dead.
- **Required fields carry a red asterisk.** On a single-field question the headline *is* the label, so the marker goes on the headline; grouped questions carry one per field. Same marker as the auth flow's `RequiredMark`.
- **A website typed without a scheme is normalized** to `https://…` rather than being rejected by the backend's `.url()`.
- **A suggestion list never steals the Enter key.** The city and state fields sit inside the `<form>` whose Enter submits and advances the flow, so `Combobox` calls `preventDefault()` on Enter while its list is open - one press choosing a city and also skipping to the next question is one press doing two things, only one of which was asked for.
- **The choices stop at five** on the causes question, which is the backend's cap on `domains` — a sixth option that looks selectable and then 400s is worse than one that can't be pressed.
- **The form seeds from the record once, keyed on `handle`**, not on the whole object, so a background SWR revalidation cannot overwrite what the user is mid-way through typing. The response to each save is written into the SWR cache with `revalidate: false` for the same reason.
- **An untouched step doesn't hit the network.** `saved` (a ref of what the server last acknowledged) is what the boundary compares against.
- **Position lives in the URL** (`?step=about&q=2`), so browser Back works, a refresh doesn't restart the flow, and a live organization returning to edit skips the intro and lands on the first question. `q` is 1-based because it is human-facing, and clamped rather than trusted — a hand-typed `?q=99` lands on the last question, not a blank screen.
- **The answer field is focused as each question arrives** (`SetupQuestion`'s mount effect, keyed on `question.id`) — one thing on screen, nothing to do but answer it, so a click into the field would be a step with no meaning. Skipped when `(pointer: coarse)` matches, where it would raise the keyboard over the question. The `focus()` is `preventScroll` inside a `requestAnimationFrame` so it doesn't fight the `question-in` slide. Choice/chips screens have no text field and focus nothing (letter keys A/B/C… act instead).

The tag select and the cause chips are populated from `GET /organizations/taxonomy`, never from a hardcoded list — a chip the API would reject is a chip that looks broken.
The progress bar ticks as the user types (read off the form), while the draft/live badge and the "still needed before you can go live" notice come from the server's own `missingFields`; the two reconcile on every save, and the server stays the only thing that decides publication.

Everything a visitor sees is here except the things nobody in the organization may set: the verified badge and the counted stats. `fundsRaised` is typed in, and is labelled "stated" wherever it renders, on this page and on the profile.

The whole journey is covered end to end by `cypress/e2e/organizationSetup.spec.js` — sign up, skip, come back, save each step, go live — and narrated for a recording in `cypress/walkthrough/organizationJourney.spec.js`.

## Sample data: `constants/organizationDirectory.ts` — no longer rendered

[apps/web/src/features/organizations/constants/organizationDirectory.ts](../../apps/web/src/features/organizations/constants/organizationDirectory.ts) is the single source of content for both pages in this feature.
It holds twelve `DirectoryOrganization` records — different causes, cities, sizes, and a mix of verified/unverified — plus `ORGANIZATION_ACCENTS` (the decorative gradient palette the profile monogram is tinted by), `CAUSES` (the filter taxonomy), `findOrganization(userName)`, and `formatCount()`.

**Nothing reads its records any more.** `ORGANIZATION_ACCENTS`, `CAUSES` (still used by `Events.tsx`) and `formatCount()` are all still live exports; `organizationDirectory` itself and `findOrganization()` are not called by any page since both went live. The file is kept as the reference shape for a future seed script rather than deleted — see [known-issues.md](./known-issues.md).
This replaced (August 2026) the twenty identical `"God Father Org"` objects that used to be declared inline in `Organizations.tsx`, which rendered as twenty visually identical cards.
The real data-fetching function, `getOrganizations()` in [apps/web/src/features/organizations/services/Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) (`GET /organizations` via `organizationEndpoints.all`), still exists and is still never called.
When asked to make this live, swap `organizationDirectory` for a `useSWR` call (or `getOrganizations()`) and keep the filtering in `Organizations.tsx`, which is deliberately pure client-side work over whatever array it is handed — see [api-integration.md](./api-integration.md).
Both pages state on screen that the content is a preview rather than implying a live feed, the same convention `DrivesRail.tsx` follows on the landing page.

The record shape is deliberately the shape a real organization record would have: `tagLine`, `cause`, `city`, `founded`, `verified`, `followers`/`drives`/`volunteers`, `focusAreas`, `about` (paragraphs), `stats`, `activeDrives`, `milestones`, `website`, `contactEmail`, `address`.

## `Organizations.tsx` — the directory

[apps/web/src/features/organizations/pages/Organizations.tsx](../../apps/web/src/features/organizations/pages/Organizations.tsx).
Renders `<ComponentHelmet type="Organizations" />` (SEO title/meta — see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a page heading, the search + filter row, the results grid, and `<Footer />`.

**Both the search term and the cause chip are sent to the backend** (`organizationEndpoints.directory({ search, domain })`), not applied to an already-fetched page — the directory is paginated, so filtering in the browser would silently hide matches on page two. `keepPreviousData` is what stops the grid flashing empty on every keystroke.

The chips are the backend's domain taxonomy. The empty state now distinguishes "nothing matches that filter" from "no organization has finished setting up yet".

**Search and filters actually work now.**
The previous version had an input with no `onChange` and a "Filters" button with no `onClick`.
Today:
- a search field filtering on name, tagline, cause and city, so "kolkata" or "water" both find something;
- a row of cause filters generated from `CAUSES` (plus an `"All"` pseudo-option), horizontally scrollable below `sm` so eight of them don't wrap into four rows above the fold;
- an `aria-live` result count, and a "nothing matches / reset filters" empty state — reachable now that the filters are real, unlike the old `Loading` fallback, which could never trigger.

That chrome is no longer written here: the field, the filter row, the count and the slot for the page's one primary button all live in the shared [`DirectoryToolbar`](../../apps/web/src/components/DirectoryToolbar.tsx), rendered by both this page and `/events` (see [ui-kit.md](./ui-kit.md#directorytoolbar)).
The filtering state and the `useMemo` over the directory array stay in the page.

The "Your dashboard" button still navigates to `/dashboard`.
The grid is `1 / 2 / 3` columns (`sm` / `xl`) inside a `max-w-7xl` centered container with `px-9` mobile padding, matching the app's responsive standard in [CLAUDE.md](../../CLAUDE.md).
It is scoped by `useSectionReveal` (`@hooks`) with `[results.length, cause]` as dependencies, so cards revealed by a filter change animate in rather than staying at the hook's starting opacity.

## `OrganizationCard`

[apps/web/src/features/organizations/components/OrganizationCard.tsx](../../apps/web/src/features/organizations/components/OrganizationCard.tsx).
Renders entirely from its `organization` prop — nothing on it is hardcoded any more.

- **The same card as the landing page's drives rail** (see [landing-home.md](./landing-home.md#drivesrailtsx)): a 16:9 cover photo with the cause as a small uppercase label over a bottom scrim, then a one-line name (`truncate`), a two-line tagline (`line-clamp-2` on a `min-h-11` box), the meta line and the stat rule. Both surfaces show the same kind of record, so they are deliberately not two card designs.
- **An organization that has uploaded a cover gets it; one that hasn't gets an accent band with its monogram**, tinted by an accent derived from its handle (`utils/toDisplayOrganization.ts`) so the same record is the same colour on the card and on its profile, on every machine. There is no upload endpoint yet, so today that fallback is what a real record actually renders. The old per-record photos in `apps/web/src/assets/pictures/organizations/` are still what the (now unrendered) fixture points at. This replaced a per-organization gradient band plus a monogram badge, which existed only because the app used to ship a single shared banner (`organizationbanner.jpg`) that the pre-August-2026 card put on all twenty records. The rule that produced that workaround still stands: whatever replaces the fixture must give each organization its own image rather than reusing one banner. `ORGANIZATION_ACCENTS` survives, but now only tints the monogram on the profile header.
- **No monogram on the card.** Over a photo it read as clutter, and overlapping it across the cover/body seam clipped the initials. It stays on the profile header, where a profile picture belongs.
- **The whole card is one `<Link>`** to `/organization/{userName}` — a card-sized target instead of the old 32px arrow button, and no nested interactive elements. The corner arrow is `aria-hidden` decoration that animates on `group-hover`.
- The three-up stat row (`Followers` / `Drives` / `Volunteers`) is pushed to the card's bottom edge with `mt-auto`, so the rules line up across a row of cards even before the tagline's fixed two-line box is accounted for.
- Carries `data-reveal` (see the grid above) and the standardised card hover — lift + brand-token glow. See [ui-kit.md](./ui-kit.md#card-components).

Not exported from the shared barrel (`apps/web/src/components/index.ts`) — only imported by `Organizations.tsx`.

## `OrganizationProfile.tsx` — the public profile

[apps/web/src/features/organizations/pages/OrganizationProfile.tsx](../../apps/web/src/features/organizations/pages/OrganizationProfile.tsx), routed at `/organization/:userName` (August 2026).

It fetches `GET /organizations/{handle}` and maps the response through `utils/toDisplayOrganization.ts`. **Sections with nothing behind them do not render**: a newly published organization has no drives and no milestones, and inventing placeholders for them would be the same lie the fixture used to tell. The "About us" heading becomes "What we work on" when the description is a single paragraph, because that paragraph is already the header tagline and printing it twice on one screen read as a bug.

**This route used to render `Profile.tsx`** — the account page shared with `/user/:userName`, which for a visitor who isn't the organization rendered a stock external logo and two dead buttons on an otherwise empty screen.
`Profile.tsx` is unchanged and still owns `/user/:userName`; see [onboarding-profile.md](./onboarding-profile.md).
If a request is about "the organization page", check which of the two is meant — the public directory profile (this file) or the signed-in account view (`Profile.tsx`).

Structure:
- **Header card** — the same cover photo as the card the visitor clicked (so arriving reads as the card opening), under a bottom scrim that keeps the corner calm enough for the white-bordered badge that overlaps it, an overlapping monogram (still tinted by `accent`), name + verified badge, tagline, a location/founded/volunteers meta row, a Follow toggle and a website link, and a four-up stat strip.
  - **The monogram's row is `relative`, and that is load-bearing.** The cover above it is a positioned element, so a statically-positioned monogram paints *underneath* the photo it is meant to overlap no matter how large its negative margin — which is exactly what happened when the cover became a real `<img>` (direct feedback: "the text has gone under the cover picture").
  - **Verified is the badge alone** (`MdVerified`, brand ink, sized to the name), the convention every social profile uses, not the uppercase "VERIFIED" pill it replaced. `OrganizationCard` uses the same icon so the two surfaces agree.
  - **There is no "Preview profile" chip.** It read as "you are previewing your own profile" on a page that is always someone else's (direct feedback). Its actual job — disclosing that the record is a fixture — is now unstated on screen; see [known-issues.md](./known-issues.md).
- **Main column** — "About us" paragraphs + focus-area chips; "Drives running now" (each with a progress bar, raised-of-goal, supporters and days left, the same vocabulary as `DrivesRail`'s cards); "Track record", a milestone timeline using the same rail-and-bead treatment as `HowItWorks`' playbook.
- **Sidebar** — a dark `bg-surface-dark` "Back <org>" card (the app's one dark-surface treatment, matching `OpenSource`/`Footer`) whose CTA scrolls to the drives list, and a contact card (address, email, community counts). `lg:sticky` from `lg` up only.
- **Not-found state** — an unknown `:userName` renders a dedicated panel with a link back to the directory instead of a blank page.

The Follow button is local `useState` and deliberately so: there is no follow/subscribe endpoint in `KarmaCircleApi.ts`/`ApiEndpoints.ts`, and a control that acknowledges a press beats one that looks live and does nothing (which is what `Profile.tsx`'s Subscribe/Sponsor pair does).
It is a plain `<button>` rather than the shared `Button` because it has two visually distinct states, and a `variant` class plus a state-dependent `className` would be two equal-specificity utilities fighting over the same properties with no reliable winner.
The page is scoped by `useSectionReveal`.

## Types

Every file in this feature is TypeScript.
`types/` is split by declaration kind per [CLAUDE.md](../../CLAUDE.md): `interfaces.ts` and `types.ts` (`Cause`, `CauseFilter`), re-exported from `index.ts`.

The interface that matters now is **`DisplayOrganization`** — everything the card and the profile actually render, fed by either the fixture or a mapped API record. `ApiOrganization`/`ApiOrganizationList`/`MyOrganization`/`OrganizationTaxonomy` mirror the backend's `toPublic()`/`toPrivate()` and taxonomy responses and must be changed together with them. `DirectoryOrganization` is now only the fixture's shape (it guarantees a real cover photo and a `Cause` from the closed union, which a live record does not).
`UserType` is shared with `authentication` — see [organizations/SPEC.md](../../apps/web/src/features/organizations/SPEC.md#types).
