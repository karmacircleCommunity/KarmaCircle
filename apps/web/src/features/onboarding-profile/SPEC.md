# Onboarding & Profile — Feature Spec

Colocated, implementation-level companion to [docs/specs/onboarding-profile.md](../../../docs/specs/onboarding-profile.md).
Read that file first for the short cross-feature summary; this file goes deeper, file by file, for an AI agent about to edit code in `src/features/onboarding-profile/`.
Read [docs/specs/state-management.md](../../../docs/specs/state-management.md) (Redux `user` slice shape) and [docs/specs/api-integration.md](../../../docs/specs/api-integration.md) (the `PATCH` endpoints this feature calls) before making changes here.

## What this feature is responsible for

Individual accounts edit their own bio and address through `/user/setup`.
The navbar opens this flow directly on desktop and mobile.
The sparse public/account profile page was removed at the user's request.
Organization account editing retains the dashboard's `ProfileUpdate` modal; public organization setup belongs to the organizations feature.
`ProfileCompletion` and `UserProfile` remain legacy, inactive implementations and are not substitutes for the kept editor.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/UserProfile.tsx` | A second, more visually developed public profile page | ❌ not routed anywhere |
| `pages/ProfileSetup.tsx` | **New, October 2026.** Individual-user edit flow, routed at `/user/setup` | ✅ yes |
| `hooks/useProfileSetup.ts` | **New.** Record fetch, form state, question position, transitions, save — for `ProfileSetup.tsx` | ✅ yes |
| `constants/profileSetup.ts` | **New.** `PROFILE_SETUP_QUESTIONS`, `FIELD_SPECS`, `FIELD_CY` for the setup flow | ✅ yes |
| `utils/profileSetupForm.ts` | **New.** Seeding (`toProfileSetupForm`) and the full-form save payload (`toProfileSetupPayload`) | ✅ yes |
| `components/setup/ProfileSetupQuestion.tsx`, `ProfileSetupLocationFields.tsx`, `ProfileSetupIntro.tsx` | **New.** The setup flow's own question/location/intro screens — forks of organizations' equivalents, not a shared/parameterized version (see organizations.md) | ✅ yes |
| `utils/googlePlaces.ts`, `hooks/useAddressAutocomplete.ts` | **New, same day.** Google Places (New) autocomplete for the address question's `line1` field — see "Address-line autocomplete" below | ✅ yes, when `VITE_GOOGLE_MAPS_API_KEY` is set; plain input otherwise |
| `components/ProfileCompletion.tsx` | Modal: first-time profile completion (organization-shaped; unreachable from anywhere today) | ❌ unreachable |
| `components/ProfileUpdate.tsx` | Modal: profile editing — **organization accounts only as of October 2026** (`Dashboard.tsx`, and `Profile.tsx` when `user?.userType === "organization"`); individual accounts now use `ProfileSetup.tsx` instead | ✅ yes, organizations only |
| `hooks/useProfileCompletion.ts` | Local form state + validation + submit for `ProfileCompletion` | ✅ yes (feeds an unreachable component) |
| `constants/ProfileElements.ts` | Declarative field metadata (label/placeholder/min length/error message) for a hypothetical generic field renderer | ❌ not imported anywhere |
| `constants/index.ts` | Barrel re-exporting `ProfileElements` | ❌ (only consumer would be `ProfileElements` itself, unused) |
| `utils/getProfileFields.ts` | `getProfileFields(info)` — computes missing/editable field lists, for a hypothetical generic renderer | ❌ not imported anywhere |

## Removed sparse profile page

`pages/Profile.tsx` and `/user/:userName` were deleted on 26 October 2026.
Desktop/mobile Edit profile links now open `/user/setup` directly.
Old handle URLs reach the normal not-found screen; `UserProfile` remains unrouted.
The automatic completion nudge, `utils/checkMissingFields.ts`, its types, and completion-bypass cookie writes were removed.
Save, Close, and Maybe later return Home; cancellation discards unsaved changes.

## `pages/UserProfile.tsx` — not routed, work-in-progress

**No entry exists for this component in `routesConfig.tsx`** — it is unreachable through normal navigation.
Confirm with whoever's asking before investing effort here; treat it as an alternate design still being finished, not a page you can assume anyone will see.

**Data source:** `useSWR(userEndpoints.details(params.slug), fetcher)` — this is the endpoint `Profile.tsx` does *not* use (`GET /user?userName=...`), so if this page is ever wired up, it would be exercising a currently-untested-in-production code path on the frontend.

**"Own profile" check:** `currentUser?.userName === params.slug`, reading the signed-in user from Redux (`selectUser`).
This previously read a `userName` cookie, which could never be `true`: the API set that cookie only on the Google OAuth path, scoped to the API's own host, so page JavaScript on the frontend origin could not read it.
The "Edit Profile"/"Logout" buttons were therefore permanently unreachable, even for the profile's own owner.
The API no longer sets readable identity cookies at all (see [apps/api auth.md](../../../../../apps/api/docs/specs/auth.md)), so Redux is now the only source for this.

**Placeholder content mixed with real data (not previously documented) — this page is further from finished than the existing docs suggest:**
- `userdetails_about` renders a hardcoded Lorem Ipsum paragraph with `{userdetails?.about}` **concatenated directly onto the end of it** — `"Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam nihil repellat quam eum facilis eaque soluta magnam aut minima provident dolores illo cum eos molestias, nemo praesentium{userdetails?.about}"` — so even with real data flowing in, the placeholder text is still shown, immediately followed by (not replaced by) the real `about` field.
- `userdetails_address` similarly renders the hardcoded string `"Kolkata, West Bengal, India"` immediately followed by `{userdetails?.city} {userdetails?.state} {userdetails?.country}` — same pattern, placeholder text never removed even once real data exists.
- The pronoun line under the user's name is hardcoded `<p>(He/Him)</p>` for every profile, regardless of who's being viewed — a real content bug if this page ever ships, not just a data-wiring gap; this needs an actual pronoun field (or removal) before this page could be considered functional, independent of any of the wiring issues above.
- The "Events Attending" section remains a `Swiper` carousel of **6–8 hardcoded slides**, all identical content ("ISB Alumni Social Impact SIG Initiative"), not derived from any prop or fetch. It stays on this unrouted legacy page; attendees use the real `/events/mine` page from the signed-in Profile menu (see [events/SPEC.md](../events/SPEC.md)).

**If asked to finish this page:** fixing the cookie check alone is not sufficient — the Lorem Ipsum/hardcoded-address/hardcoded-pronoun issues above need addressing too. The live attendee event list is implemented separately; do not route this legacy page just to expose it.

## `hooks/useProfileCompletion.ts`

Owns all local state for the `ProfileCompletion` modal.

**State shape:** `credentials = { description: "", coverImage: "", address: { line1, line2, city, state, country, pincode } }` (all strings, all initially empty) and `errors = {}`.

**`handleChange(field)`** returns an event handler; `field === "description"` writes to the top-level key, anything else writes into `credentials.address[field]`. **Mutates `credentials` in place before calling `setCredentials`** (`const updatedCredentials = { ...credentials }; updatedCredentials.address[field] = ...` — the `address` sub-object itself is not spread, so this is a shallow-copy-of-outer/mutate-inner pattern). This works today because React's `setState` still triggers a re-render regardless, but it means `credentials.address` is the *same object reference* across renders until something else replaces it wholesale (e.g. `handleResetFields`/`handleSetDefaultValues`) — relevant if you ever add `useMemo`/`useCallback` deps on `credentials.address` expecting referential-equality-implies-no-change.

**`handleSetDefaultValues(profileData)`** — pre-fills the form from an existing profile (called by `Dashboard.tsx` before opening this modal for editing — see below). **Has a stray `console.log("🚀 ~ handleSetDefaultValues ~ profileData:", profileData)`** — not previously cataloged in `known-issues.md`; remove it if you're in this file for another reason, same as the `Navbar.tsx`/`Dashboard.tsx` console.logs already documented there.

**`validateForm(updatedCredentials)`** (async):
1. Builds `newErrors`: `description` required (presence only here — the 100–500 char length check is separate, below); all six `address` subfields required (presence, `.trim() === ""` check); `description.length > 500` → "cannot be more than 500 characters"; `description.length < 100` → "cannot be less than 100 characters" (these two length checks are **not mutually exclusive in code** — both run unconditionally, but in practice only one can match a given string length, so only one message ends up on `newErrors.description`, overwriting the other's *key* — not a real bug since they can't both fire, just note that a description of length exactly 500 or 100 is accepted, i.e. bounds are inclusive at 100 and exclusive at >500); `address.pincode` must be `!isNaN(...)` if present.
2. `setErrors(newErrors)`.
3. **Regardless of whether `newErrors` is empty**, calls `completeProfileApiCall({ credentials: { ...updatedCredentials, config: { hasCompletedProfile: true } } })` (`KarmaCircleApi.ts`, `PATCH /user/complete`) — this is the validation-doesn't-block-submission bug cataloged in [known-issues.md](../../../docs/specs/known-issues.md). **Note the payload always sets `config.hasCompletedProfile: true`, unconditionally** — even if required fields are still blank (bypassable since the UI's `disabled` gate is defense-in-depth here, not the request body's own logic), a request that reaches this line marks the profile "complete" server-side regardless of what `newErrors` contains.
4. If `data.status === STATUSCODE.OK` (`200`): `showSuccessToast`, then **returns with no further action** — critically, **this success path does not call `setShowEditModal(false)` or `refreshProfileData()`**, because this hook has no access to those (they're props passed to the component, not to the hook). Only the header "Save" button (see below) closes the modal on success.
5. If `data` is falsy or lacks `.status` (e.g. a network failure where `completeProfileApiCall` caught and returned `error.response`, which is `undefined` for a connectivity error) — **`data.status` on line 4 throws a `TypeError: Cannot read properties of undefined`** before this function can return anything. Not previously documented; this is a real crash path (uncaught, and there's no error boundary anywhere in the app — see [error-handling/SPEC.md](../error-handling/SPEC.md)) if `completeProfileApiCall` is ever hit while fully offline having passed the `checkInternetConnection()` gate elsewhere (this modal itself has no such gate before submitting).
6. Otherwise (a real HTTP error response, e.g. 400): falls through past the `if`, and `return Object.keys(newErrors).length === 0` — the function's return value only reflects client-side validation, not whether the API call itself succeeded, for any non-200/network-error case.

**`clearError(field)`** — destructures the given key out of `errors` via `{ [field]: ignored, ...rest }` and keeps the rest; `ignored` triggers `no-unused-vars` (the file has `/* eslint-disable no-unused-vars */` at the top of `ProfileCompletion.tsx`, but this hook file itself doesn't — check lint output if you touch this). Not currently called from `ProfileCompletion.tsx` at all — dead export.

## `components/ProfileCompletion.tsx`

**Props:** `setShowEditModal` (closes the modal), `refreshProfileData` (an SWR `mutate` function from the parent — used to force a refetch after a successful save).

**Two Save buttons, two different behaviors — this is the most important thing to know about this component:**

| Button | Location | Handler | On success |
|---|---|---|---|
| Header "Save" | `.profilecompletion_header_top` | Inline `onClickfunction` — calls `completeProfileApiCall({ credentials })` **directly**, bypassing `validateForm` entirely (no client-side validation runs at all on this path) | `showSuccessToast`, `setShowEditModal(false)`, `refreshProfileData()` — **closes the modal** |
| Form "Submit" | Bottom of the form, `type="submit"` | The `<form onSubmit>` calls `validateForm(credentials)` from the hook | `showSuccessToast` only (per the hook's own logic above) — **modal stays open**, no refetch triggered |

Both buttons share the exact same `disabled` condition (all of `description` + six address fields non-empty).
Clicking the **header** button skips client-side length/format validation (100–500 char description, numeric pincode) entirely — it only checks the same presence-based `disabled` gate the button itself uses.
Clicking the **form's own submit** button runs full validation (still non-blocking per the known-issues.md bug) but then doesn't close the modal or refresh data on success, so a user who submits via the bottom button will see a success toast but the modal will appear to just sit there — they'd need to click the header Save (or close manually) to see the update reflected.
**If you're asked to fix "the profile completion form doesn't close after saving," this is why — consolidate onto one code path, most likely by having the header button call `validateForm` too, or by adding the missing `setShowEditModal(false)`/`refreshProfileData()` calls to the hook's success branch (which would require passing them into the hook).**

**File uploads (cover image):** `handleFileChange` creates a local-only preview via `URL.createObjectURL(file)` and stores it in `uploadedImage` — **the file itself is never attached to `credentials` or sent in the API call**. `completeProfileApiCall`'s payload includes `credentials.coverImage` (still `""`, the hook's initial value — never updated by `handleFileChange`) — so a cover image selected in this modal is visually previewed but silently discarded on submit. There is only a cover-image dropzone here, no profile-picture dropzone (contrast with `ProfileUpdate.tsx`, below, which has both).

**Field coverage:** description (textarea, live `x/500` counter) + address line1/line2/city/state/country/pincode. No `name` field — this modal cannot rename the organization; that's `ProfileUpdate.tsx`-only.

**Known minor bug:** the "State/Province" `<input>` has `name="stat e"` (a stray space) — harmless in practice since the controlled-input value/`onChange` wiring doesn't use the `name` attribute at all (it's driven by the `handleChange("state")` closure), but worth fixing if you're touching this input's markup, and a good example of why `name` attributes on these forms shouldn't be trusted as documentation of the underlying field key.

## `components/ProfileUpdate.tsx`

**Props:** `setOpenModal`, `refreshProfileData`, `profileData` (pre-fills the form — unlike `ProfileCompletion`, which needs a separate `handleSetDefaultValues` call from the parent).

**Local state, defined in the component itself** (no shared hook — this is a fully separate, parallel implementation of the same shape as `useProfileCompletion.ts`, not a reuse of it): `credentials = { description, name, coverImage: "", address: {...} }` pre-filled from `profileData`, `errors`, `uploadedImage`, `uploadedProfilePicture`.

**Single Save button** (header only, no duplicate at the bottom — the `<form>` here has no submit button of its own, just the input fields): `onClickfunction={(e) => { e.preventDefault(); validateForm(); }}`.

**`validateForm()`** (async, defined locally, not imported): required-field check for `description`+`name` (top-level) and all six address fields; `description.length > 500` / `< 100` messages (same bounds as `useProfileCompletion`); `pincode` numeric check. `setErrors(newErrors)`, then — **fixed, October 2026** — returns `false` before calling `updateUserProfile` if `newErrors` is non-empty, so the length/format checks actually block the `PATCH` now, not just the `disabled` gate. (`updateUserProfile` hits `KarmaCircleApi.ts`'s `PATCH /user/update`, **not** `/user/complete` — this modal does not touch `config.hasCompletedProfile` at all.) On `data.status === STATUSCODE.OK`: toast, `refreshProfileData()`, `setOpenModal(false)` — **this success path does close the modal**, unlike `ProfileCompletion`'s form-submit path, because there's only one button/one code path here. Same crash risk as `useProfileCompletion.validateForm` if `data` is `undefined` from a network failure (`data.status` throws) — that part is unchanged.

**File uploads:** both a cover-image dropzone and a **profile-picture dropzone** (`dropzone_pfp`) — `ProfileCompletion.tsx` only has the cover-image one. Same caveat: both are preview-only via `URL.createObjectURL`; neither file is attached to the `PATCH` payload, so uploads here are visually previewed and silently discarded exactly like in `ProfileCompletion`.

**Field coverage:** `name` (Organization Name) + description + address — the `name` field is the one thing this modal can edit that `ProfileCompletion` cannot.

**Same `name="stat e"` typo** on the State input, independently present in this file (not shared markup — this component duplicates the JSX rather than importing a shared field component).

**Rendered from:** the organization dashboard only.

## Profile editing reachability

| Entry | Surface | Endpoint |
|---|---|---|
| Individual navbar Edit profile | `/user/setup` | `PATCH /user/update` |
| Organization dashboard Edit Profile | `ProfileUpdate` | `PATCH /user/update` |

The sparse profile page is deleted; `UserProfile` remains unrouted.
The legacy completion component does not gain a new mount site.

## `pages/ProfileSetup.tsx` and the setup flow — individual accounts, `/user/setup`

**New, October 2026.** The individual-account equivalent of organizations' `/organization/setup` (`OrganizationSetup.tsx` — see [organizations/SPEC.md](../organizations/SPEC.md) and [organizations.md](../../../../docs/specs/organizations.md#the-setup-flow--organizationsetup)): a Typeform-style, one-question-at-a-time flow reached directly from Edit profile in individual desktop/mobile navigation.

**Why a new page rather than reusing `ProfileUpdate`:** the person using this app looked at `/user/tamalcodes` and called the modal's UI "not our standard," full of organization concepts (an "Upload cover image" dropzone, an "Edit profile" modal titled around organization fields) that don't belong on an individual profile, and asked for the organization setup flow's components reused for individuals instead. This is that request.

**Shared vs. forked, and why:** `SetupLayout`, `SetupAside` (+ `setupAsideQuotes.ts`), `SetupFieldLabel`, `SetupLocateButton`, and the `useLocateCity` hook moved out of `features/organizations/` into `apps/web/src/components/setup/` and `apps/web/src/hooks/` respectively, specifically so this flow could render from the *same* components rather than a copy — nothing about their behavior changed. `SetupQuestion`/`SetupLocationFields` did **not** move or generalize: they're typed against `OrganizationSetupForm` and hardcode question kinds (`choice`/`chips`/`list`/`toggle`) this flow never needs, so `components/setup/ProfileSetupQuestion.tsx` and `ProfileSetupLocationFields.tsx` are small forks instead — only `textarea` and `group` kinds, no taxonomy.

**Scope — two fields, three questions:** `description` (a bio) and `address` (`line1`/`line2`/`city`/`state`/`country`/`pincode`) are the only fields this flow touches, because they're the only ones `PATCH /user/update` persists for a profile (`user.validation.ts`'s `updateProfileSchema` — `name`/`coverImage` are out of scope here, deliberately: this is an edit-your-details flow, not a rename/avatar flow). `constants/profileSetup.ts`'s `PROFILE_SETUP_QUESTIONS` is three questions, not grouped into multiple steps the way organizations' flow is — a bio question (`textarea`), a city/state question (`group`, with the same `Combobox`-suggested location UX and "use my location" shortcut organizations get), and a remaining-address-fields question (`group`).

**Nothing is required.** An individual account has no backend publish/draft gate the way an organization does (`REQUIRED_FIELDS` is organization-only; `missingRequiredFields()` has no individual equivalent), so `ProfileSetupQuestion` has no required-field asterisks, `ProfileSetup.tsx`'s Continue button is never blocked, and there's no `invalidFields`/`outstandingFields`/`validateSetupField` machinery at all — the whole "Continue refused, focus the offending field" apparatus in `OrganizationSetup.tsx` doesn't exist here because nothing in this flow can be answered wrong or left undone.

**One save boundary, not several.** `useProfileSetup.ts` is flatter than `useOrganizationSetup.ts` on purpose: three questions don't justify a multi-step abstraction, so there's a single `stage: "intro" | "about"` and a `questionIndex` rather than a step list, and the one save happens on the last question's Continue.

**The save always sends the complete form, never just one step's dirty fields** (`utils/profileSetupForm.ts`'s `toProfileSetupPayload`) — the opposite convention from organizations' `toStepPayload`, and deliberately so. `toStepPayload` treats a blank optional field as "untouched" because organizations' record is built up across several separate step-saves; this flow has exactly one form, always fully seeded from `GET /user/profile` before anything is edited (`useProfileSetup`'s seed `useEffect`, keyed on `user?.userName`), so a blank field here genuinely means "leave this empty," and sending it as such is correct. This matters because the backend's `address` update is one `$set` on the whole subdocument (`user.service.ts`'s `updateProfile`) — a partial send in the org-flow style would silently wipe whatever an omitted field held before.

**Data source:** `useSWR(userEndpoints.profile, fetcher)` → `GET /user/profile` (`requireAuth`), returning `{ user: sanitize(user) }` — the same endpoint `Dashboard.tsx` already reads, wrapped the same way (`profileData?.user`). On save, `updateUserProfile({ credentials: toProfileSetupPayload(form) })` (`KarmaCircleApi.ts`, `PATCH /user/update`) — the response carries only `{ message }`, not the updated record (unlike organizations' `UpdateMyOrganization`, which returns `{ organization }`), so `useProfileSetup`'s `save()` calls `mutate()` to revalidate rather than writing the response directly into the SWR cache.

**Exit:** the corner × and Maybe later discard unsaved edits without saving, revalidating, or showing a success toast.
Save and cancellation return Home with history replacement.
Both exits replace the setup history entry with Home.
The deleted automatic nudge no longer needs a completion-bypass cookie.
Intermediate Continue and Back keep edits locally; only the final Save changes persists them.
The intro explains this save boundary and warns that closing discards changes.
The final Save changes stays on the question when saving fails; a 401 clears the session and redirects to sign-in.
See [the current flowchart](../../../../../docs/specs/user-flows.md#individual-profile-setup-and-editing) and [the audit gaps](../../../../../docs/specs/known-issues.md#individual-profile-setup---flow-audit-26-october-2026).

## Address-line autocomplete (`utils/googlePlaces.ts`, `hooks/useAddressAutocomplete.ts`)

**New, October 2026, same day as the flow itself.** The person using this app compared the address question to the location question next to it and asked for the same kind of auto-population — Google Places (New) backs the "Address line 1" field in `ProfileSetupQuestion.tsx`'s `group` branch, reusing the existing `Combobox` component (the same one `ProfileSetupLocationFields`/organizations' `SetupLocationFields` already use for city/state) rather than rendering Google's own autocomplete widget, so the suggestion list stays visually consistent with the rest of the app instead of looking like a second product.

**Deliberately the programmatic API, not the `PlaceAutocompleteElement` web component.** Google's current recommendation for new integrations is the new widget, but it renders its own shadow-DOM UI with Google's own styling — feeding its suggestions into this app's own `Combobox` instead keeps one visual language. `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (text in, predictions out) and `PlacePrediction.toPlace().fetchFields()` (prediction in, full place out) are what `useAddressAutocomplete.ts` calls — see that file's header comment for exactly which Google docs/samples this was checked against. **This could not be verified against a live key** — the person building this hadn't gotten a Google Cloud API key yet as of this pass (see `known-issues.md`'s "needs live verification" entry) — so treat the exact field/method names as "checked against current docs, not run," not "confirmed working," until someone adds a real `VITE_GOOGLE_MAPS_API_KEY` and clicks through it.

**Why the legacy `google.maps.places.Autocomplete` widget wasn't used:** it's closed to API keys created after March 2025 (confirmed via web search during this pass — Google's own migration docs), so a fresh KarmaCircle key would never have been able to use it anyway.

**Script loading:** `utils/googlePlaces.ts`'s `loadGooglePlaces()` is the same module-level-cached-promise pattern as `useRazorpayCheckout.ts`'s `loadCheckoutScript` — one `<script>` tag for the whole app session, every caller after the first awaits the same promise. `loading=async` on the script URL plus `google.maps.importLibrary("places")` once it loads is the combination both of Google's fetched-and-read current code samples use for the new `AutocompleteSuggestion`/`Place` classes.

**Graceful when unconfigured.** `isAddressAutocompleteConfigured()` (reads `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) gates whether `ProfileSetupQuestion` even renders the `Combobox` branch for `line1` — no key, no Google-specific code path at all, just the plain text input this replaced. A configured-but-failing lookup (network error, bad key, etc.) degrades the same way mid-use: `useAddressAutocomplete.search()`'s `catch` just empties the suggestion list for that keystroke rather than surfacing an error, so a flaky connection costs the autocomplete, not the field.

**Session tokens, for billing.** Google bills Autocomplete + the following Place Details call as one unit only when they share a session token (`AutocompleteSessionToken`) — `useAddressAutocomplete.ts` creates one on the first search after a reset, reuses it across every keystroke, and drops it right after a successful `fetchFields` so the *next* address lookup starts its own fresh session rather than silently billing against a finished one. Searches are also debounced 300ms (`DEBOUNCE_MS`), unlike Google's own sample code (which fires on every keystroke) — this is a cost-conscious deviation from the sample, not a correctness one.

**Field mapping** (`addressComponentsToFields`): `street_number` + `route` → `line1`; `subpremise` (an apartment/unit, when Google has one) → `line2`, rather than being dropped; `locality`, falling back to `sublocality_level_1` for addresses Google tags that way instead (seen in some Indian address data); `administrative_area_level_1` → `state`; `country` → `country`; `postal_code` → `pincode`. Picking a suggestion fills all six fields via `ProfileSetupQuestion`'s `addressAutocomplete`'s `onFill` — including `city`/`state`, which live on the *previous* question screen, not this one; that's intentional, matching "pick one thing, several fields update" the same way the location question's own city pick already fills state.

**Types:** Google ships none for this (loaded via `<script>`, not an npm package) — `onboarding-profile/types/interfaces.ts` has a minimal hand-written `declare global { interface Window { google?: ... } }`, the same convention `donate-shop-trending/types/interfaces.ts` already uses for `window.Razorpay`. Deliberately narrow: only the members these two files actually call, not the full Places API (New) surface.

## `constants/ProfileElements.ts` + `constants/index.ts` — unused scaffolding

`ProfileElements` is an array of 10 field descriptors (`name`, `firstName`, `lastName`, `tagLine`, `description`, `city`, `state`, `address`, `country`, `pincode`), each with `id`/`label`/`placeholder`/`minimumLength`/`errorMessage`/`type`.
Not imported by `ProfileCompletion.tsx` or `ProfileUpdate.tsx` — both hardcode their own JSX per field instead.
**Its `minimumLength` values don't agree with what's actually validated elsewhere** — e.g. `firstName`/`lastName` here say `minimumLength: 5`, while `hooks/useValidation.ts` (in the authentication feature, also unused) says 3–30 characters; `description` here says `minimumLength: 100` with no upper bound listed, while both live validators (`useProfileCompletion.ts`, `ProfileUpdate.tsx`) enforce 100–500. If you build a generic field-renderer around this file, reconcile these numbers against the live validators first rather than trusting this file's numbers in isolation.
`constants/index.ts` is a one-line barrel (`export { default as ProfileElements } from "./ProfileElements"`) — its only plausible purpose is enabling `import { ProfileElements } from "@features/onboarding-profile/constants"` shorthand, but nothing uses that import path either.

## `utils/getProfileFields.ts`

Default export `getProfileFields(info)`, wrapping two module-private (not separately exported) helpers:
- `getMissingElements(info)` — for `userType === "organization"` only, returns which of `brandingFields` (`["tagLine", "description"]`, from `statics/Constants.ts`) are `undefined` on `info`. Returns `[]` unconditionally for non-organization users (note: unlike `checkMissingFields.ts`, this function does **not** check `addressFields` at all — it's narrower in scope, branding-only).
- `getEditableFields(info)` — returns `[...mandatoryFields, ...brandingFields, ...addressFields]` for organizations, or `[...mandatoryFields, ...addressFields]` for individuals (`mandatoryFields = ["name", "username"]`, `addressFields = ["city","state","address","country","pincode"]`, both from `statics/Constants.ts`).

`getProfileFields(info)` itself picks between the two: if `userType === "organization"` **and** `tagLine` is falsy/empty, returns `getMissingElements(info)` (i.e. "what's still missing"); otherwise returns `getEditableFields(info)` (i.e. "everything this user type can edit").
**Correction to the centralized docs/specs/onboarding-profile.md**, which describes `getMissingElements`/`getEditableFields` as though they're independently importable — they are not exported from this file at all; only the `getProfileFields` default export is reachable from outside.
Not imported by any component today, same status as `ProfileElements.ts` — both look like scaffolding for a single future generic/dynamic profile-form component that was never built.

## Data flow summary

Individual desktop/mobile navbar Edit profile -> `/user/setup` -> load `GET /user/profile` -> seed full form.
Continue/Back change questions without saving.
Final Save changes sends the complete form to `PATCH /user/update`, revalidates the profile cache, shows success, and returns Home.
Close and Maybe later discard unsaved edits and return Home without a save request.
Organization account editing remains on the dashboard; public organization setup uses its own feature.
Legacy `ProfileCompletion` and `UserProfile` remain inactive.

## Known issues specific to this feature (superset of known-issues.md's entries, plus new findings from this review)

- **New, October 2026: `/user/setup` (`ProfileSetup.tsx`) and its shared/forked components.** See the dedicated section above for the full breakdown — the short version: the generic parts of organization setup's shell moved to shared locations (`@components/setup/`, `@hooks/useLocateCity`), the question-rendering parts were forked (not generalized), and the new flow covers exactly two fields with nothing required.
- **New, same day: Google Places address-line autocomplete, not yet verified against a live key.** See "Address-line autocomplete" above — the integration code is written and typechecked against Google's current documented API shape, but nobody has plugged in a real `VITE_GOOGLE_MAPS_API_KEY` and clicked through it. Flag this if asked to touch the area, and update this note once someone has.
- **Found in passing, same day:** `apps/web/.env.example`'s `VITE_GEOAPIFY_API_KEY` is dead — no reference anywhere in either app. Likely a leftover from before `organizations.md`'s documented "chosen [the bundled list] over a geocoding API deliberately" decision.
- **`ProfileUpdate.tsx`'s `handleResetFields` drops the `name` field** — copy-pasted from `useProfileCompletion.ts`'s version, whose credentials shape never had `name` to begin with; closing and reopening the modal after a reset shows a blank Organization Name. New finding, surfaced by converting this file to strict TypeScript.
- **`UserProfile.tsx`'s Logout button passes a plain `onClick`** the shared `Button` component silently discards (`Button.tsx` spreads `...props` and then explicitly overwrites `onClick` with its own `onClickfunction`, which is `undefined` here) — this button has never actually worked. New finding, also surfaced by strict typing; low-priority since this page isn't routed.
- Two profile-edit modals with different endpoints, different field coverage, and inconsistent reachability from the two "view profile" surfaces (table above).
- `ProfileCompletion`'s two Save buttons take genuinely different code paths — only one of them closes the modal / refreshes data on success (see above; not previously documented at this precision).
- **Fixed, October 2026, for `ProfileUpdate.validateForm` only:** it now returns `false` before the `PATCH` call when `newErrors` is non-empty. `useProfileCompletion.validateForm` (used only by the unreachable `ProfileCompletion`) still fires its `PATCH` request regardless of validation errors — [known-issues.md](../../../docs/specs/known-issues.md), but the UI's `disabled` gate does cover the "required field empty" case there too.
- Both validators will **throw an uncaught `TypeError`** if the API call fails with no HTTP response at all (pure network failure) — `data.status` on `undefined`. New finding, not previously documented.
- `handleSetDefaultValues` has a stray `console.log`. New finding.
- Both address forms have a `name="stat e"` typo on the State input (harmless, cosmetic-only). New finding.
- `UserProfile.tsx` mixes Lorem Ipsum and other hardcoded placeholder text directly with real fetched data (concatenated, not replaced) and hardcodes `(He/Him)` for every profile — new findings, and reason to treat "finish `UserProfile.tsx`" as a larger scope than just "add a route."
- `ProfileElements.ts`'s field-length metadata disagrees with the actual live validators.

## Types

This folder is TypeScript (`.ts`/`.tsx`) as of this conversion pass — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern.
`types/index.ts` holds `Address`, `ProfileCompletionCredentials`/`ProfileCompletionErrors`/`ProfileCompletionProps`, `ProfileUpdateProfileData`/`ProfileUpdateProps`, `ProfileFieldsInfo`, `ProfileFieldElement`, `UserProfileDetails`, `LogoutResponse` (asserted at each `Logout()` call site, since `KarmaCircleApi.ts`'s own catch block returns the caught error as-is), and, **added October 2026** for the setup flow: `MyProfile` (`GET /user/profile`'s `{ user }` shape), `ProfileSetupForm`/`ProfileSetupField`, `ProfileSetupFieldSpec`, `ProfileSetupQuestion`, and `ProfileSetupStepStatus` (satisfies the shared `SetupStepStatus` in `@/types/setup` structurally — not an explicit `extends`, matching how organizations' own `OrganizationSetupStepStatus` also isn't changed to extend it). Same day, also added: `GoogleAddressComponent`/`GoogleAutocompleteSessionToken`/`GooglePlace`/`GooglePlacePrediction`/`GooglePlacesLibrary` plus a `declare global { interface Window { google?: ... } }` block for the address-autocomplete integration — same "hand-written minimal ambient types for a script-tag-loaded third party" pattern `donate-shop-trending/types/interfaces.ts` already uses for `window.Razorpay`.
Three pre-existing bugs now surface as real compile errors under strict typing and are left in place behind documented `@ts-expect-error` suppressions rather than fixed, consistent with this pass's types-only scope — the `ProfileUpdate.tsx` reset bug and the `UserProfile.tsx` Logout-button bug listed above, plus `Dashboard.tsx`'s `ProfileCompletion` prop mismatch (see [dashboard/SPEC.md](../dashboard/SPEC.md#types), already documented before this pass).
Converting `Profile.tsx` is also what surfaced the "Edit profile button does nothing" finding above — not a type error exactly, but writing accurate JSDoc-style comments while typing this file forced actually tracing whether `showProfileModal` was read anywhere, which the previous prose-only spec had gotten wrong.

## If you're asked to...

- **"Fix the edit profile modal"** → ask which one: `Dashboard.tsx`'s `ProfileCompletion` path (only reachable when the profile is incomplete, hits `/user/complete`, currently crashes on its header Save button — see dashboard/SPEC.md), the `ProfileUpdate` path (hits `/user/update`, works correctly, rendered from the organization dashboard only), or the individual-account `/user/setup` flow (`ProfileSetup.tsx` — not a modal at all).
- **"Make profile completion actually block on validation errors"** → `ProfileUpdate.validateForm` already does this (fixed October 2026, `if (Object.keys(newErrors).length > 0) return false;` before the `updateUserProfile` call). `useProfileCompletion.validateForm` (feeding the still-unreachable `ProfileCompletion`) still needs the same guard before its `completeProfileApiCall` call if asked to fix it too. `ProfileSetup.tsx`'s flow has no validation to block on in the first place — nothing in it is required or format-checked.
- **"Add a field to the individual profile-setup flow"** → an entry in `constants/profileSetup.ts`'s `PROFILE_SETUP_QUESTIONS` (plus a `FIELD_SPECS` row if it's part of a `group` question), same shape as organizations' `SETUP_STEPS` but flat (no step grouping). Check first whether `PATCH /user/update`'s `updateProfileSchema` (`apps/api/src/modules/users/user.validation.ts`) actually persists the field you want to add — this flow was scoped to exactly what that endpoint accepts (`description`, `address`); `name`/`coverImage` are accepted by the endpoint but were deliberately left out of this flow's three questions, so adding either is a real scope decision, not a one-line addition — ask first.
- **"Finish `UserProfile.tsx`"** → register a route, fix the `userName` cookie check (use authenticated Redux identity), and remove/replace the Lorem-Ipsum and hardcoded-address/pronoun text — treat as a multi-part task, confirm scope first.
- **"Build a generic profile-field form"** → `ProfileElements.ts` + `getProfileFields.ts` are the closest existing scaffolding; reconcile their validation numbers against the live `useProfileCompletion.ts`/`ProfileUpdate.tsx` bounds before using them as-is. Neither was used for `ProfileSetup.tsx` — that flow's two fields didn't need a generic renderer.

## Profile setup access and loading errors

`routesConfig.tsx` wraps `/user/setup` in `RequireSignIn`.
Signed-out visits, including sessions cleared after a 401, redirect to `/auth/signin` with history replacement.
`SessionBootstrap` verifies persisted login before navbar and route guards mount.
Other profile-loading failures display a load error and Try again action (`useProfileSetup.retry()` calls SWR `mutate()`).
The generic "Sign in to edit your profile" message no longer mislabels server or connection errors.

Close leaves without saving, including from loading/error screens.
Session E2E tests cover expired save, server-error retry, cancellation without saving, and entry-URL return navigation.

## Current navigation after removal

Historical references above to `Profile.tsx` describe removed behavior, not active entry points.
`ProfileUpdate` now mounts from the organization dashboard only.
The individual editor keeps its API payload and welcome/questions; successful save and cancellation return Home.
