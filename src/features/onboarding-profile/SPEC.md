# Onboarding & Profile — Feature Spec

Colocated, implementation-level companion to [docs/specs/onboarding-profile.md](../../../docs/specs/onboarding-profile.md).
Read that file first for the short cross-feature summary; this file goes deeper, file by file, for an AI agent about to edit code in `src/features/onboarding-profile/`.
Read [docs/specs/state-management.md](../../../docs/specs/state-management.md) (Redux `user` slice shape) and [docs/specs/api-integration.md](../../../docs/specs/api-integration.md) (the `PATCH` endpoints this feature calls) before making changes here.

## What this feature is responsible for

Two related jobs that share components and a similar data shape but are triggered differently:

1. **Getting a club/org account's profile from "just signed up" to "publicly presentable."** A club account is created with only `email`/`password`/`name`/`userType` (see [authentication/SPEC.md](../authentication/SPEC.md)) — no description, no address. This feature is what collects the rest.
2. **Showing and editing a profile once it exists** — both the owner's "edit my profile" flow and a visitor's "view someone else's profile" flow, for both individual users and club/org accounts.

## Why it's shaped this way — the core thing to understand first

This folder contains **two pairs of near-duplicate components**, one pair for "complete a fresh profile" and one pair for "view a profile," and in both cases the duplication happened because a second implementation was built without replacing the first.
Concretely:

- `ProfileCompletion` (completion, triggered automatically) and `ProfileUpdate` (editing, triggered by an explicit "Edit Profile" button) are ~80% identical JSX and validation logic, hitting two different `PATCH` endpoints.
- `Profile.tsx` (routed, live) and `UserProfile.tsx` (built, but never registered in `routesConfig.tsx`) are two different "view a profile" pages with different data sources and different "is this my own profile" checks.

None of this is presented here as something to silently fix — see "If you're asked to..." at the bottom for how to handle a request that touches this ambiguity.
Always confirm which of the two components/pages a request means, per the project's `CLAUDE.md` "when two implementations exist, ask" rule.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Profile.tsx` | Public profile view/edit-trigger, routed at `/user/:userName` and `/club/:userName` | ✅ yes |
| `pages/UserProfile.tsx` | A second, more visually developed public profile page | ❌ not routed anywhere |
| `components/ProfileCompletion.tsx` | Modal: first-time profile completion (also, confusingly, reused for edits triggered from `Profile.tsx`) | ✅ yes |
| `components/ProfileUpdate.tsx` | Modal: profile editing, triggered from `Dashboard.tsx` | ✅ yes |
| `hooks/useProfileCompletion.ts` | Local form state + validation + submit for `ProfileCompletion` | ✅ yes |
| `constants/ProfileElements.ts` | Declarative field metadata (label/placeholder/min length/error message) for a hypothetical generic field renderer | ❌ not imported anywhere |
| `constants/index.ts` | Barrel re-exporting `ProfileElements` | ❌ (only consumer would be `ProfileElements` itself, unused) |
| `utils/checkMissingFields.ts` | `checkMissingFields(user)` — one of two different "does this profile need completing" checks | ✅ yes (used by `Profile.tsx`) |
| `utils/getProfileFields.ts` | `getProfileFields(info)` — computes missing/editable field lists, for a hypothetical generic renderer | ❌ not imported anywhere |

## `pages/Profile.tsx` — the live public profile page

Routed at both `/user/:userName` and `/club/:userName` (see `routesConfig.tsx`) — **the same component handles both individual and club profiles**, branching on `details?.userType === "club"` inside the JSX rather than being two separate route components.

**Data source:** `useSWR(clubEndpoints.details(params.userName), fetcher)` — note this always calls the **club** endpoint (`GET /clubs?userName=...`) even when rendering an individual user's profile via `/user/:userName`. This works today because the backend's `/clubs` endpoint apparently also resolves individual-user records by `userName` (unverified from this repo — the backend repo is the source of truth), but it means there is no `userEndpoints.details`-based fetch anywhere in this component despite that endpoint existing in `ApiEndpoints.js` specifically for users.

**Local state:**
- `showProfileModal` — despite the name, **this is never read anywhere in this file's JSX to render anything.** `Profile.tsx` does not import `ProfileCompletion` (or `ProfileUpdate`) at all. This corrects an earlier version of this spec, which claimed `showProfileModal` controlled whether `ProfileCompletion` was rendered from this page — it doesn't; `ProfileCompletion` is only ever rendered from `Dashboard.tsx` (see [dashboard/SPEC.md](../dashboard/SPEC.md#types)). Converting this file to TypeScript is what surfaced this: nothing about the type system forced a fix, it's just that writing this file's actual behavior down accurately (required to type it) made the discrepancy impossible to miss.
- `editProfile` — set to `true` by `toggleProfileModal()` but **never read anywhere** in this file; dead state, same as `showProfileModal` above. `void editProfile;` marks it as intentionally unused in the `.tsx` version.

**`trueUser = user?.userName === params.userName`** — `user` here is the *entire* Redux `user` slice (`useSelector((state) => state.user)`), not a selector; comparing `user.userName` (the logged-in viewer's own username) against the route param decides whether this is "my own profile."
This is the "own profile" check used by the *live* page — contrast with `UserProfile.tsx`'s cookie-based check below, which can never succeed.

**Profile-completion trigger (on mount, `useEffect` with empty deps — runs once):**
```js
if (!Cookies.get("skipProfileCompletion") && checkMissingFields(user) && trueUser) {
  setShowProfileModal(true);
}
```
All three conditions must hold: no opt-out cookie, `checkMissingFields(user)` (checking the **Redux** `user` object — the *viewer's* own session data, not the fetched `details` for the profile being displayed) returns `true`, and you're viewing your own profile.
Because this depends on `user` from Redux rather than the freshly-fetched `details`, if Redux hasn't been populated yet on this specific page load (e.g. a hard refresh before any `updateUserData` dispatch has re-synced it), `checkMissingFields(undefined)` still returns `true` (every check is `=== undefined`), so the modal can show even for a profile that's actually complete server-side, until Redux catches up.

**`toggleProfileModal()`** — flips `showProfileModal` and sets `editProfile = true` (neither has any downstream effect, see above). Wired to the "Edit profile" button, shown only when `trueUser`.
**Clicking "Edit profile" here currently does nothing visible** — it updates two pieces of state that nothing reads. Editing a profile is only reachable via `Dashboard.tsx`'s "Edit Profile" button today (which opens `ProfileUpdate`), not from either public profile page.
See "Two profile-edit modals" below for the full picture.

**Duplicated CTA block (known bug, still present):** the `.profile_header_ctadiv` block — Edit-profile/Logout for `trueUser`, or static non-functional Subscribe/Sponsor buttons otherwise — is rendered **twice in a row**, once inside `.profile_header_details` (lines ~91–151) and again immediately after as a sibling of `.profile_header` (lines ~155–215), byte-for-byte identical JSX both times.
This is a copy-paste leftover, not an intentional two-row layout; if you're editing this component for another reason, collapsing it to one instance is a safe, self-contained cleanup.

**`handleLogout()`** — calls `Logout()` (`MilanApi.js`), and on `status === 200`: success toast, then after a **1500ms** `setTimeout`, `navigate("/")`, `dispatch(resetUserData())`, `Cookies.remove("skipProfileCompletion")` — this is one of three differently-sequenced logout call sites in the app; see [state-management.md](../../../docs/specs/state-management.md).

**Map iframe:** rendered only when `details?.userType === "club"`. `src={user?.iframe || <hardcoded Kolkata Google Maps embed URL>}` — reads `user?.iframe`, i.e. the **viewer's own** Redux state, not `details?.iframe` (the fetched data for the profile actually being viewed). Unless you are viewing your own club profile, this will never show that club's real map — either the viewer's own `iframe` value (if they happen to have one, from an unrelated club) or the hardcoded Kolkata fallback. Fix, if asked, is to change `user?.iframe` → `details?.iframe`.

**Commented-out code:** a `profile_events` block (a `Marquee` of `EventsCard`) is present but commented out — matches the "recent events" concept `EventsMarqueeCards.tsx` in the events feature seems designed for; see [events/SPEC.md](../events/SPEC.md).

## `pages/UserProfile.tsx` — not routed, work-in-progress

**No entry exists for this component in `routesConfig.tsx`** — it is unreachable through normal navigation.
Confirm with whoever's asking before investing effort here; treat it as an alternate design still being finished, not a page you can assume anyone will see.

**Data source:** `useSWR(userEndpoints.details(params.slug), fetcher)` — this is the endpoint `Profile.tsx` does *not* use (`GET /user?userName=...`), so if this page is ever wired up, it would be exercising a currently-untested-in-production code path on the frontend.

**"Own profile" check:** `Cookies.get("userName") === params.slug` — the `userName` cookie is **never set anywhere else in this codebase** (confirmed via full-repo read — no `Cookies.set("userName", ...)` call exists), so this branch can never evaluate `true` today; the "Edit Profile"/"Logout" buttons are permanently unreachable and every visitor sees the "Drop me a mail" button instead, even the profile's own owner.

**Placeholder content mixed with real data (not previously documented) — this page is further from finished than the existing docs suggest:**
- `userdetails_about` renders a hardcoded Lorem Ipsum paragraph with `{userdetails?.about}` **concatenated directly onto the end of it** — `"Lorem ipsum dolor sit amet consectetur adipisicing elit. Veniam nihil repellat quam eum facilis eaque soluta magnam aut minima provident dolores illo cum eos molestias, nemo praesentium{userdetails?.about}"` — so even with real data flowing in, the placeholder text is still shown, immediately followed by (not replaced by) the real `about` field.
- `userdetails_address` similarly renders the hardcoded string `"Kolkata, West Bengal, India"` immediately followed by `{userdetails?.city} {userdetails?.state} {userdetails?.country}` — same pattern, placeholder text never removed even once real data exists.
- The pronoun line under the user's name is hardcoded `<p>(He/Him)</p>` for every profile, regardless of who's being viewed — a real content bug if this page ever ships, not just a data-wiring gap; this needs an actual pronoun field (or removal) before this page could be considered functional, independent of any of the wiring issues above.
- The "Events Attending" section is a `Swiper` carousel of **6–8 hardcoded slides**, all identical content ("ISB Alumni Social Impact SIG Initiative"), not derived from any prop or fetch — same pattern as the events feature's static cards (see [events/SPEC.md](../events/SPEC.md)).

**If asked to finish this page:** fixing the cookie check alone is not sufficient — the Lorem Ipsum/hardcoded-address/hardcoded-pronoun issues above need addressing too, and you'd need to add a route in `routesConfig.tsx`. Scope this as a real feature-completion task, not a one-line fix.

## Profile-completion trigger comparison (two different signals, not unified)

| Entry point | Condition | Source |
|---|---|---|
| `Profile.tsx` (this feature) | `!Cookies.get("skipProfileCompletion") && checkMissingFields(user) && trueUser` | `checkMissingFields.ts` (this feature), reading **Redux** `user` |
| `Dashboard.tsx` (dashboard feature) | `profileData?.user?.config?.hasCompletedProfile === false` | The **freshly-fetched SWR** `profileData`, a single explicit boolean flag set server-side |

A profile could satisfy one condition and not the other — e.g. a profile with `hasCompletedProfile: true` set server-side but still missing a field `checkMissingFields` checks would show the modal on `/user/:userName` but not on `/dashboard`, or vice versa.
There is no single canonical "is this profile complete" check in the frontend; if you're asked to fix this inconsistency, the more trustworthy signal is `config.hasCompletedProfile` (explicit, server-authoritative) — `checkMissingFields` is a client-side heuristic that can drift from it.

## `hooks/useProfileCompletion.ts`

Owns all local state for the `ProfileCompletion` modal.

**State shape:** `credentials = { description: "", coverImage: "", address: { line1, line2, city, state, country, pincode } }` (all strings, all initially empty) and `errors = {}`.

**`handleChange(field)`** returns an event handler; `field === "description"` writes to the top-level key, anything else writes into `credentials.address[field]`. **Mutates `credentials` in place before calling `setCredentials`** (`const updatedCredentials = { ...credentials }; updatedCredentials.address[field] = ...` — the `address` sub-object itself is not spread, so this is a shallow-copy-of-outer/mutate-inner pattern). This works today because React's `setState` still triggers a re-render regardless, but it means `credentials.address` is the *same object reference* across renders until something else replaces it wholesale (e.g. `handleResetFields`/`handleSetDefaultValues`) — relevant if you ever add `useMemo`/`useCallback` deps on `credentials.address` expecting referential-equality-implies-no-change.

**`handleSetDefaultValues(profileData)`** — pre-fills the form from an existing profile (called by `Dashboard.tsx` before opening this modal for editing — see below). **Has a stray `console.log("🚀 ~ handleSetDefaultValues ~ profileData:", profileData)`** — not previously cataloged in `known-issues.md`; remove it if you're in this file for another reason, same as the `Navbar.jsx`/`Dashboard.tsx` console.logs already documented there.

**`validateForm(updatedCredentials)`** (async):
1. Builds `newErrors`: `description` required (presence only here — the 100–500 char length check is separate, below); all six `address` subfields required (presence, `.trim() === ""` check); `description.length > 500` → "cannot be more than 500 characters"; `description.length < 100` → "cannot be less than 100 characters" (these two length checks are **not mutually exclusive in code** — both run unconditionally, but in practice only one can match a given string length, so only one message ends up on `newErrors.description`, overwriting the other's *key* — not a real bug since they can't both fire, just note that a description of length exactly 500 or 100 is accepted, i.e. bounds are inclusive at 100 and exclusive at >500); `address.pincode` must be `!isNaN(...)` if present.
2. `setErrors(newErrors)`.
3. **Regardless of whether `newErrors` is empty**, calls `completeProfileApiCall({ credentials: { ...updatedCredentials, config: { hasCompletedProfile: true } } })` (`MilanApi.js`, `PATCH /user/complete`) — this is the validation-doesn't-block-submission bug cataloged in [known-issues.md](../../../docs/specs/known-issues.md). **Note the payload always sets `config.hasCompletedProfile: true`, unconditionally** — even if required fields are still blank (bypassable since the UI's `disabled` gate is defense-in-depth here, not the request body's own logic), a request that reaches this line marks the profile "complete" server-side regardless of what `newErrors` contains.
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

**`validateForm()`** (async, defined locally, not imported): required-field check for `description`+`name` (top-level) and all six address fields; `description.length > 500` / `< 100` messages (same bounds as `useProfileCompletion`); `pincode` numeric check. `setErrors(newErrors)`, then — **same non-blocking bug** — calls `updateUserProfile({ credentials })` (`MilanApi.js`, `PATCH /user/update`, **not** `/user/complete` — this modal does not touch `config.hasCompletedProfile` at all) regardless of `newErrors`. On `data.status === STATUSCODE.OK`: toast, `refreshProfileData()`, `setOpenModal(false)` — **this success path does close the modal**, unlike `ProfileCompletion`'s form-submit path, because there's only one button/one code path here. Same crash risk as `useProfileCompletion.validateForm` if `data` is `undefined` from a network failure (`data.status` throws).

**File uploads:** both a cover-image dropzone and a **profile-picture dropzone** (`dropzone_pfp`) — `ProfileCompletion.tsx` only has the cover-image one. Same caveat: both are preview-only via `URL.createObjectURL`; neither file is attached to the `PATCH` payload, so uploads here are visually previewed and silently discarded exactly like in `ProfileCompletion`.

**Field coverage:** `name` (Organization Name) + description + address — the `name` field is the one thing this modal can edit that `ProfileCompletion` cannot.

**Same `name="stat e"` typo** on the State input, independently present in this file (not shared markup — this component duplicates the JSX rather than importing a shared field component).

**Rendered from:** `Dashboard.tsx`, when `openModal === true` (opened by the dashboard's "Edit Profile" button, which first calls `handleSetDefaultValues(profileData?.user)` — wait, that's `useProfileCompletion`'s function, called from `Dashboard.tsx` even though `Dashboard.tsx` renders `ProfileUpdate`, not `ProfileCompletion` — **worth double-checking if you touch `Dashboard.tsx`**, since `ProfileUpdate` pre-fills from its own `profileData` prop directly and doesn't consume anything `handleSetDefaultValues` would have set; that call may be a leftover from when `Dashboard.tsx` used to open `ProfileCompletion` instead, or dead code — see [dashboard/SPEC.md](../dashboard/SPEC.md) for the exact call site (which also documents a separate, more serious prop-mismatch bug on `ProfileCompletion` itself).

## Two profile-edit modals — reachability matrix

**Corrected from an earlier version of this doc**, which had `Profile.tsx`'s "Edit profile" button opening `ProfileCompletion` — it doesn't; see above. The real picture:

| Entry point | Opens | Endpoint hit | Can edit `name`? |
|---|---|---|---|
| `Profile.tsx`'s "Edit profile" button (`/user/:userName`, `/club/:userName`) | Nothing — dead click, see above | — | — |
| `Dashboard.tsx`'s "Edit Profile" button (`/dashboard`), when the fetched profile is complete (`hasCompletedProfile !== false`) | `ProfileUpdate` only | `PATCH /user/update` | ✅ yes |
| `Dashboard.tsx`, when the fetched profile is incomplete (`hasCompletedProfile === false`) *and* "Edit Profile" is clicked | **Both** `ProfileCompletion` and `ProfileUpdate` mount simultaneously (see [dashboard/SPEC.md](../dashboard/SPEC.md#known-issues-specific-to-this-feature)) | `PATCH /user/update`, and `PATCH /user/complete` if the `ProfileCompletion` instance is submitted | `ProfileUpdate`: ✅, `ProfileCompletion`: ❌ |

`ProfileCompletion` is currently unreachable from anywhere except the incomplete-profile case on `/dashboard` above; there is no path to it from `/user/:userName` or `/club/:userName`.
If a request asks to "let users rename their organization from their profile page," the live building blocks are `Dashboard.tsx`'s `ProfileUpdate` flow (which already supports renaming) — wiring an equivalent edit entry point into `Profile.tsx` is new work, not a rename of an existing broken path, since `Profile.tsx` doesn't currently reach either modal.

## `constants/ProfileElements.ts` + `constants/index.ts` — unused scaffolding

`ProfileElements` is an array of 10 field descriptors (`name`, `firstName`, `lastName`, `tagLine`, `description`, `city`, `state`, `address`, `country`, `pincode`), each with `id`/`label`/`placeholder`/`minimumLength`/`errorMessage`/`type`.
Not imported by `ProfileCompletion.tsx` or `ProfileUpdate.tsx` — both hardcode their own JSX per field instead.
**Its `minimumLength` values don't agree with what's actually validated elsewhere** — e.g. `firstName`/`lastName` here say `minimumLength: 5`, while `hooks/useValidation.ts` (in the authentication feature, also unused) says 3–30 characters; `description` here says `minimumLength: 100` with no upper bound listed, while both live validators (`useProfileCompletion.ts`, `ProfileUpdate.tsx`) enforce 100–500. If you build a generic field-renderer around this file, reconcile these numbers against the live validators first rather than trusting this file's numbers in isolation.
`constants/index.ts` is a one-line barrel (`export { default as ProfileElements } from "./ProfileElements"`) — its only plausible purpose is enabling `import { ProfileElements } from "@features/onboarding-profile/constants"` shorthand, but nothing uses that import path either.

## `utils/checkMissingFields.ts`

`checkMissingFields(info)` — a plain boolean predicate, **not a hook** despite living next to hook-like files.
Returns `true` (needs completion) if any of `city`/`state`/`address`/`country`/`pincode` is `=== undefined` on `info`, **or**, additionally for `userType === "club"`, if `tagLine` or `description` is `=== undefined`.
Uses strict `=== undefined` — an empty string `""` (as opposed to a genuinely absent key) does **not** count as missing by this function, which matters if a backend response ever sends `city: ""` instead of omitting the key entirely; this function would then report the profile as complete when it visually isn't.
Called only from `Profile.tsx`, against the Redux `user` object (see the "Profile-completion trigger comparison" table above).

## `utils/getProfileFields.ts`

Default export `getProfileFields(info)`, wrapping two module-private (not separately exported) helpers:
- `getMissingElements(info)` — for `userType === "club"` only, returns which of `brandingFields` (`["tagLine", "description"]`, from `statics/Constants.js`) are `undefined` on `info`. Returns `[]` unconditionally for non-club users (note: unlike `checkMissingFields.ts`, this function does **not** check `addressFields` at all — it's narrower in scope, branding-only).
- `getEditableFields(info)` — returns `[...mandatoryFields, ...brandingFields, ...addressFields]` for clubs, or `[...mandatoryFields, ...addressFields]` for individuals (`mandatoryFields = ["name", "username"]`, `addressFields = ["city","state","address","country","pincode"]`, both from `statics/Constants.js`).

`getProfileFields(info)` itself picks between the two: if `userType === "club"` **and** `tagLine` is falsy/empty, returns `getMissingElements(info)` (i.e. "what's still missing"); otherwise returns `getEditableFields(info)` (i.e. "everything this user type can edit").
**Correction to the centralized docs/specs/onboarding-profile.md**, which describes `getMissingElements`/`getEditableFields` as though they're independently importable — they are not exported from this file at all; only the `getProfileFields` default export is reachable from outside.
Not imported by any component today, same status as `ProfileElements.ts` — both look like scaffolding for a single future generic/dynamic profile-form component that was never built.

## Data flow summary — completion path (the live one)

`ProfileCompletion` only actually mounts via `Dashboard.tsx` today (see "Two profile-edit modals" above) — `Profile.tsx`'s `setShowProfileModal(true)` triggers nothing:

```
Dashboard.tsx mount → useSWR(userEndpoints.profile)
   │  profileData?.user?.config?.hasCompletedProfile === false
   ▼
renders <ProfileCompletion edit={openModal} setOpenModal={setOpenModal} refreshProfileData={refreshProfileData} />
   │  ⚠ prop-name mismatch — the component's real props are
   │    setShowEditModal/refreshProfileData, not edit/setOpenModal;
   │    setShowEditModal is undefined inside it (see dashboard/SPEC.md)
   │
   ├─ header "Save" click ──► completeProfileApiCall(credentials)  [no client validation]
   │                            └─ success ─► toast, setShowEditModal(false) [throws — undefined], refreshProfileData()
   │
   └─ form "Submit" click ──► useProfileCompletion.validateForm(credentials)
                                 │  builds newErrors (non-blocking), setErrors
                                 ▼
                              completeProfileApiCall({...credentials, config:{hasCompletedProfile:true}})
                                 └─ success ─► toast only (modal stays open, no refetch)
```

Separately, `Profile.tsx` mounts, runs its own `checkMissingFields`-based check, and calls `setShowProfileModal(true)` — but since nothing in `Profile.tsx` reads `showProfileModal`, this branch is currently a complete no-op with no observable effect on the page.

## Data flow summary — update path (the live one)

```
Dashboard.tsx "Edit Profile" click
   │  handleSetDefaultValues(profileData?.user)   [useProfileCompletion's fn — likely dead in this context, see above]
   ▼
setOpenModal(true)  →  renders <ProfileUpdate setOpenModal refreshProfileData profileData />
   │  (own local state, pre-filled from profileData prop directly)
   ▼
Save click ──► validateForm()  [local, non-blocking bug]
                  ▼
               updateUserProfile({credentials})   [PATCH /user/update]
                  └─ success ─► toast, refreshProfileData(), setOpenModal(false)
```

## Known issues specific to this feature (superset of known-issues.md's entries, plus new findings from this review)

- **`Profile.tsx`'s "Edit profile" button does nothing** — `showProfileModal`/`editProfile` are set but never read to render anything. New finding (corrects the earlier claim that this button opened `ProfileCompletion`).
- **`ProfileUpdate.tsx`'s `handleResetFields` drops the `name` field** — copy-pasted from `useProfileCompletion.ts`'s version, whose credentials shape never had `name` to begin with; closing and reopening the modal after a reset shows a blank Organization Name. New finding, surfaced by converting this file to strict TypeScript.
- **`UserProfile.tsx`'s Logout button passes a plain `onClick`** the shared `Button` component silently discards (`Button.jsx` spreads `...props` and then explicitly overwrites `onClick` with its own `onClickfunction`, which is `undefined` here) — this button has never actually worked. New finding, also surfaced by strict typing; low-priority since this page isn't routed.
- Two profile-edit modals with different endpoints, different field coverage, and inconsistent reachability from the two "view profile" surfaces (table above).
- `ProfileCompletion`'s two Save buttons take genuinely different code paths — only one of them closes the modal / refreshes data on success (see above; not previously documented at this precision).
- `useProfileCompletion.validateForm` and `ProfileUpdate.validateForm` both fire their `PATCH` request regardless of validation errors — [known-issues.md](../../../docs/specs/known-issues.md), but the UI's `disabled` gate does cover the "required field empty" case.
- Both validators will **throw an uncaught `TypeError`** if the API call fails with no HTTP response at all (pure network failure) — `data.status` on `undefined`. New finding, not previously documented.
- `handleSetDefaultValues` has a stray `console.log`. New finding.
- Both address forms have a `name="stat e"` typo on the State input (harmless, cosmetic-only). New finding.
- `checkMissingFields` vs. `config.hasCompletedProfile` disagree on what "complete" means and read from different data sources (Redux vs. fresh SWR fetch).
- `Profile.tsx`'s duplicated CTA block and `user?.iframe`-instead-of-`details?.iframe` bug — both already in `known-issues.md`.
- `UserProfile.tsx` mixes Lorem Ipsum and other hardcoded placeholder text directly with real fetched data (concatenated, not replaced) and hardcodes `(He/Him)` for every profile — new findings, and reason to treat "finish `UserProfile.tsx`" as a larger scope than just "add a route."
- `ProfileElements.ts`'s field-length metadata disagrees with the actual live validators.

## Types

This folder is TypeScript (`.ts`/`.tsx`) as of this conversion pass — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern.
`types/index.ts` holds `Address`, `ProfileCompletionCredentials`/`ProfileCompletionErrors`/`ProfileCompletionProps`, `ProfileUpdateProfileData`/`ProfileUpdateProps`, `CheckableProfileInfo`, `ProfileFieldsInfo`, `ProfileFieldElement`, `ProfileDetails`, `UserProfileDetails`, and `LogoutResponse` (asserted at each `Logout()` call site, since `MilanApi.js`'s own catch block returns the caught error as-is).
Three pre-existing bugs now surface as real compile errors under strict typing and are left in place behind documented `@ts-expect-error` suppressions rather than fixed, consistent with this pass's types-only scope — the `ProfileUpdate.tsx` reset bug and the `UserProfile.tsx` Logout-button bug listed above, plus `Dashboard.tsx`'s `ProfileCompletion` prop mismatch (see [dashboard/SPEC.md](../dashboard/SPEC.md#types), already documented before this pass).
Converting `Profile.tsx` is also what surfaced the "Edit profile button does nothing" finding above — not a type error exactly, but writing accurate JSDoc-style comments while typing this file forced actually tracing whether `showProfileModal` was read anywhere, which the previous prose-only spec had gotten wrong.

## If you're asked to...

- **"Fix the edit profile modal"** → ask which one: `Dashboard.tsx`'s `ProfileCompletion` path (only reachable when the profile is incomplete, hits `/user/complete`, currently crashes on its header Save button — see dashboard/SPEC.md) or `Dashboard.tsx`'s `ProfileUpdate` path (hits `/user/update`, works correctly). `Profile.tsx` doesn't reach either today.
- **"Make profile completion actually block on validation errors"** → add an `if (Object.keys(newErrors).length > 0) return false;` guard before the `completeProfileApiCall`/`updateUserProfile` call in whichever of `useProfileCompletion.validateForm` / `ProfileUpdate.validateForm` you're asked to fix — do both if asked to fix "the" bug, since it's duplicated independently in each.
- **"Let users edit their profile from `/user/:userName`, not just `/dashboard`"** → this is new wiring, not a redirect of an existing broken path — `Profile.tsx` has no working edit entry point today. Decide whether to mount `ProfileUpdate` (gains `name` editing) or `ProfileCompletion` (matches the "completion" semantics, no `name` field) from `Profile.tsx`'s "Edit profile" button — a design decision, ask if unspecified.
- **"Finish `UserProfile.tsx`"** → register a route, fix the `userName` cookie check (probably replace with the same Redux-based `trueUser` pattern `Profile.tsx` uses), and remove/replace the Lorem-Ipsum and hardcoded-address/pronoun text — treat as a multi-part task, confirm scope first.
- **"Build a generic profile-field form"** → `ProfileElements.ts` + `getProfileFields.ts` are the closest existing scaffolding; reconcile their validation numbers against the live `useProfileCompletion.ts`/`ProfileUpdate.tsx` bounds before using them as-is.
