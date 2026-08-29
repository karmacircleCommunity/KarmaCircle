# Organizations

The organizations directory (`/organizations`), the public organization profile it links to (`/organization/:userName`), and the owner-only setup page that decides whether either shows anything (`/organization/setup`).

**All three are live** as of the organization model landing (August 2026).
The backend now keeps organizations in their own collection with a draft/live status, and serves only complete profiles publicly — see [apps/api/docs/specs/organizations.md](../../apps/api/docs/specs/organizations.md), which is the source of truth for the shapes below.

## The flow this feature implements

1. Someone signs up with account type "Organization" (`Auth.tsx`). The backend creates the login **and** a draft organization record owned by it.
2. `useAuth` sends a new organization to `/organization/setup` rather than the home page — a draft has nothing to see anywhere else.
3. That page **opens on an intro that asks**, rather than on the form. Setting the profile up is optional: "Maybe later" leaves for the home page with nothing half-filled, and the account can come back at any time (the dashboard carries a reminder while the organization is still in draft).
4. Saying yes starts a two-step wizard. Each step saves on its own, so stopping halfway keeps whatever was answered.
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
| `hooks/useOrganizationSetup.ts` | The record, the taxonomy, the form state, the stage, and the per-step save |
| `constants/organizationSetup.ts` | The steps **as data**, plus `REQUIRED_LABELS` and the domain cap |
| `utils/organizationSetupForm.ts` | Pure form helpers — seeding, per-step payloads, dirty checks, outstanding counts |
| `components/setup/SetupLayout.tsx` | The shell and the progress rail, rendered from the step list |
| `components/setup/SetupIntro.tsx`, `AboutStep.tsx`, `ReachStep.tsx`, `SetupField.tsx` | The screens themselves |

**Adding a third step is an entry in `SETUP_STEPS` plus a component.** The progress rail, the mobile progress bar, the URL handling, the per-step save and the intro's step preview all read that list; none of them count to two.

### It is optional, and it is escapable

The previous version of this page dropped a brand-new organization into a long required form with no way out but the browser's back button.
Now:

- **The intro asks first.** `SetupIntro.tsx` shows what will be asked, says plainly that a draft is invisible until it's done, and offers "Maybe later" as an equally reachable answer.
- **Every step has an exit.** "Save and finish later" saves the step on screen and then leaves for `/`; "Back" walks back through the steps to the intro.
- **There are two ways back in, always visible.** The navbar's account dropdown grows a **"Finish setting up"** entry while the organization is a draft ([layout-navigation.md](./layout-navigation.md)), and `components/OrganizationSetupGate.tsx` stands in front of every page that only means something once the profile is live — `/dashboard` and `/organization/events` today. Instead of a dashboard of empty placeholders, a draft account gets told which step it stopped on and handed a link that resumes there.
- **"Resume" means resume.** `resumeSetupPath(missingFields)` returns the first step that still has a required field missing, so both entry points land on `?step=reach` if only step two is outstanding — not back at the beginning.
- **Both read the record through one hook.** `hooks/useMyOrganization.ts` fetches `GET /organizations/me` only for a signed-in organization (it is a 403 for anyone else) and SWR dedupes the key, so the navbar and the gate on the same page share one request.

The gate replaced a modal. `onboarding-profile/components/ProfileCompletion.tsx` — the old "We're almost done" org-completion form — was mounted over the dashboard whenever `config.hasCompletedProfile === false`, duplicated this flow against a different endpoint, and had its close handler wired to a prop the dashboard never passed, so it could not be dismissed. `Dashboard.tsx` no longer mounts it; see [known-issues.md](./known-issues.md).

### Two steps, saved separately

- **Step one, "about"** — name, description, kind of organization, causes. Required: `description`, `tag`, `domains`.
- **Step two, "reach"** — city/state/country, team size, website, contact details, funding. Required: `teamSize`, `city`, `country`.

`SETUP_STEPS[].requiredFields` across both steps must stay equal to the backend's `REQUIRED_FIELDS`; that list is what actually publishes the organization, this one only decides where each item is asked for.
`SETUP_REQUIRED_FIELDS` is the flattened version, so a mismatch is visible in one place.

Behaviours worth keeping if this is rewritten again:

- **A save sends only its own step's fields** (`toStepPayload`). Step two's blank inputs can't wipe step one's answers, and a validation failure in a field the user hasn't reached yet can't block the step they're on.
- **A partial save is allowed.** Only fields with content are sent, so an optional field left blank is "untouched", not "cleared" — sending `website: ""` to a URL-validated field is the difference between a save and a 400. `domains` is the one exception: it is always sent, because deselecting every chip is a real edit that an empty-means-untouched rule would drop.
- **A website typed without a scheme is normalized** to `https://…` rather than being rejected by the backend's `.url()`.
- **The chips stop at five**, which is the backend's cap on `domains` — a sixth chip that looks selectable and then 400s is worse than one that can't be pressed.
- **The form seeds from the record once, keyed on `handle`**, not on the whole object, so a background SWR revalidation cannot overwrite what the user is mid-way through typing. The response to each save is written into the SWR cache with `revalidate: false` for the same reason.
- **An untouched step doesn't hit the network.** `saved` (a ref of what the server last acknowledged) is what Continue compares against.
- **The stage lives in the URL** (`?step=about`), so browser Back works, a refresh doesn't restart the flow, and a live organization returning to edit skips the intro and lands on step one.

The tag select and the cause chips are populated from `GET /organizations/taxonomy`, never from a hardcoded list — a chip the API would reject is a chip that looks broken.
The progress rail ticks as the user types (read off the form), while the draft/live badge and the "still needed before you can go live" notice come from the server's own `missingFields`; the two reconcile on every save, and the server stays the only thing that decides publication.

Everything a visitor sees is here except the things nobody in the organization may set: the verified badge and the counted stats. `fundsRaised` is typed in, and is labelled "stated" wherever it renders, on this page and on the profile.

The whole journey is covered end to end by `cypress/e2e/organizationSetup.spec.js` — sign up, skip, come back, save each step, go live — and narrated for a recording in `cypress/walkthrough/organizationJourney.spec.js`.

## Sample data: `constants/organizationDirectory.ts` — no longer rendered

[apps/web/src/features/organizations/constants/organizationDirectory.ts](../../apps/web/src/features/organizations/constants/organizationDirectory.ts) is the single source of content for both pages in this feature.
It holds twelve `DirectoryOrganization` records — different causes, countries, sizes, and a mix of verified/unverified — plus `ORGANIZATION_ACCENTS` (the decorative gradient palette the profile monogram is tinted by), `CAUSES` (the filter taxonomy), `findOrganization(userName)`, and `formatCount()`.

**Nothing reads its records any more.** `ORGANIZATION_ACCENTS`, `CAUSES` (still used by `Events.tsx`) and `formatCount()` are all still live exports; `organizationDirectory` itself and `findOrganization()` are not called by any page since both went live. The file is kept as the reference shape for a future seed script rather than deleted — see [known-issues.md](./known-issues.md).
This replaced (August 2026) the twenty identical `"God Father Org"` objects that used to be declared inline in `Organizations.tsx`, which rendered as twenty visually identical cards.
The real data-fetching function, `getOrganizations()` in [apps/web/src/features/organizations/services/Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) (`GET /organizations` via `organizationEndpoints.all`), still exists and is still never called.
When asked to make this live, swap `organizationDirectory` for a `useSWR` call (or `getOrganizations()`) and keep the filtering in `Organizations.tsx`, which is deliberately pure client-side work over whatever array it is handed — see [api-integration.md](./api-integration.md).
Both pages state on screen that the content is a preview rather than implying a live feed, the same convention `DrivesRail.tsx` follows on the landing page.

The record shape is deliberately the shape a real organization record would have: `tagLine`, `cause`, `city`/`country`, `founded`, `verified`, `followers`/`drives`/`volunteers`, `focusAreas`, `about` (paragraphs), `stats`, `activeDrives`, `milestones`, `website`, `contactEmail`, `address`.

## `Organizations.tsx` — the directory

[apps/web/src/features/organizations/pages/Organizations.tsx](../../apps/web/src/features/organizations/pages/Organizations.tsx).
Renders `<ComponentHelmet type="Organizations" />` (SEO title/meta — see [layout-navigation.md](./layout-navigation.md)), `<Navbar />`, a page heading, the search + filter row, the results grid, and `<Footer />`.

**Both the search term and the cause chip are sent to the backend** (`organizationEndpoints.directory({ search, domain })`), not applied to an already-fetched page — the directory is paginated, so filtering in the browser would silently hide matches on page two. `keepPreviousData` is what stops the grid flashing empty on every keystroke.

The chips are the backend's domain taxonomy. The empty state now distinguishes "nothing matches that filter" from "no organization has finished setting up yet".

**Search and filters actually work now.**
The previous version had an input with no `onChange` and a "Filters" button with no `onClick`.
Today:
- a search field filtering on name, tagline, cause, city and country, so "kolkata" or "water" both find something;
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

The Follow button is local `useState` and deliberately so: there is no follow/subscribe endpoint in `MilanApi.ts`/`ApiEndpoints.ts`, and a control that acknowledges a press beats one that looks live and does nothing (which is what `Profile.tsx`'s Subscribe/Sponsor pair does).
It is a plain `<button>` rather than the shared `Button` because it has two visually distinct states, and a `variant` class plus a state-dependent `className` would be two equal-specificity utilities fighting over the same properties with no reliable winner.
The page is scoped by `useSectionReveal`.

## Types

Every file in this feature is TypeScript.
`types/` is split by declaration kind per [CLAUDE.md](../../CLAUDE.md): `interfaces.ts` and `types.ts` (`Cause`, `CauseFilter`), re-exported from `index.ts`.

The interface that matters now is **`DisplayOrganization`** — everything the card and the profile actually render, fed by either the fixture or a mapped API record. `ApiOrganization`/`ApiOrganizationList`/`MyOrganization`/`OrganizationTaxonomy` mirror the backend's `toPublic()`/`toPrivate()` and taxonomy responses and must be changed together with them. `DirectoryOrganization` is now only the fixture's shape (it guarantees a real cover photo and a `Cause` from the closed union, which a live record does not).
`UserType` is shared with `authentication` — see [organizations/SPEC.md](../../apps/web/src/features/organizations/SPEC.md#types).
