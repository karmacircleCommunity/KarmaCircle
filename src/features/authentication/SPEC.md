# Authentication — Feature Spec

Colocated, implementation-level companion to [docs/specs/authentication.md](../../../docs/specs/authentication.md).
That file is the short cross-feature summary meant to be read alongside the other features; this file is the deep reference meant to be read by an AI agent that is about to edit code inside `src/features/authentication/`.
Read [docs/specs/state-management.md](../../../docs/specs/state-management.md) and [docs/specs/api-integration.md](../../../docs/specs/api-integration.md) first if you haven't — this feature is the primary writer of Redux user state and a primary caller of the auth endpoints described there.
Read [docs/specs/known-issues.md](../../../docs/specs/known-issues.md) too; several items below are duplicated from it on purpose so this file is self-contained.

## What this feature is responsible for

Everything involved in turning an anonymous visitor into a session with a `Token` cookie and a populated Redux `user` slice: the sign-in form, the sign-up form, Google OAuth kickoff, the client-side field validation that runs before either form's network call, and the route guard that keeps an already-authenticated visitor off `/auth/signin` and `/auth/signup`.
Logout is **not** owned by this feature — there is no `useLogout` hook or logout button here.
`Logout()` (the API call) lives in `src/services/MilanApi.ts` and is invoked from three other features (`components/navbar/Navbar.tsx`, `features/onboarding-profile/pages/Profile.tsx`, `features/onboarding-profile/pages/UserProfile.tsx`) with three slightly different cleanup sequences — see [state-management.md](../../../docs/specs/state-management.md).
If you're asked to fix or centralize logout, you'll be working outside this folder.

## Why it's shaped this way

The backend (a separate repo, [NgoWorld-Backend](https://github.com/ngoworldcommunity/NGOWorld-Backend)) is the actual source of truth for whether credentials are valid; client-side validation here exists purely to reduce round-trips for obviously-bad input (empty fields, malformed email, weak password) and to give inline field-level feedback rather than a single toast.
The codebase evolved two competing designs for that validation — a minimal one wired into the live pages (`useAuth.ts`) and a much fuller one that never got wired in (`useValidation.ts` + `useFormLogic.ts`, see below) — which is the most important thing to understand before touching this folder: **there are two parallel, non-interoperating auth-form systems here, and only one of them runs in production.**
Do not assume both are exercised by any given change.

## File manifest

| File | Role | Actually used by a live page? |
|---|---|---|
| `pages/SignIn.tsx` | Sign-in form UI | ✅ yes — routed |
| `pages/SignUp.tsx` | Sign-up form UI | ✅ yes — routed |
| `pages/index.scss` | Shared styles for both pages (plain SCSS, BEM-ish `auth_*`/`signup_*` classes) | ✅ yes |
| `hooks/useAuth.ts` | The validator + submit handler both live pages actually call | ✅ yes |
| `hooks/useValidation.ts` | Fuller, unused validator (individual + club shapes) | ❌ no |
| `hooks/useFormLogic.ts` | Unused generic submit-handler hook built on `useValidation.ts`; also the only place `individualInitialFormState`/`clubInitialFormState` are defined | ❌ no |
| `components/DonotRenderWhenLoggedIn.tsx` | Route-guard HOC wrapping `SignIn`/`SignUp` in `routesConfig.tsx` | ✅ yes |
| `components/AuthButton.tsx` | Unused alternate submit-button + "switch mode" component | ❌ no |
| `components/RenderErrorMessage.tsx` | Unused helper for rendering `useValidation`-shaped error arrays | ❌ no (only meaningful once `useValidation` is wired in) |
| `utils/PasswordToggle.ts` | Unused `password ⇄ text` input-type togglers | ❌ no (pages inline their own toggle logic instead) |
| `types/index.ts` | `AuthType` enum, `Credentials`/`AuthErrors`/`ValidationError`/`SignupFormState` interfaces, etc. — see "Types" below | ✅ yes — imported by every other file in this folder |

Five of the ten non-type files in this folder (`useValidation.ts`, `useFormLogic.ts`, `AuthButton.tsx`, `RenderErrorMessage.tsx`, `PasswordToggle.ts`) are not imported by anything that runs in the live app.
Per [known-issues.md](../../../docs/specs/known-issues.md), treat these as **the design to converge toward**, not dead code to delete on sight, if you're ever asked to build out the fuller club-signup flow (tagline, description, address, slug/username, iframe) — that flow doesn't exist in the live pages at all today, and this scaffolding is the closest thing to a spec for it.

## Types

This folder is fully TypeScript (`.ts`/`.tsx`) as of the auth+clubs conversion pass — see `tsconfig.json` at the repo root.
`types/index.ts` holds everything specific to this feature: the `AuthType` enum (`SignIn`/`SignUp`, passed into `useAuth`), the live pages' `Credentials`/`AuthErrors` shapes, and the unused system's `ValidationError`/`ValidationResult`/`ValidatableCredentials`/`IndividualFormState`/`ClubFormState`/`SignupFormState` shapes.
`UserType` (the `"individual" | "club"` enum) and `AuthTypeOption` (the react-select option shape) live in `src/types/user.ts` instead, since `clubs` needs `UserType` too.
This feature's shared dependencies are all typed directly now, following the app shell and shared-layer conversion passes (see `docs/specs/architecture.md#typescript`): `src/statics/Constants.ts` (`authTypeOptions` types as `AuthTypeOption[]`), `src/utils/Toasts.ts`/`CheckInternetConnection.ts`, `src/services/MilanApi.ts`, the shared `Button` component, and the Redux `userSlice.ts`/Zustand `useAuth.ts` store. The old sibling-`.d.ts`-bridge pattern this section used to describe (`Constants.d.ts`, `Toasts.d.ts`, `Button.d.ts`) no longer applies — those bridge files were deleted once their real counterparts got typed.

## `pages/SignIn.tsx`

Default export, function component, no props (rendered directly by the router).

**Local state:**
- `credentials` — `{ name: "", email: "", password: "" }`. Note `name` is initialized but never read or written anywhere else in this file; it's dead state, presumably copy-pasted from `SignUp.tsx`.
- `errors` — `{}`, keyed by field name (`email`, `password`), populated only by `useAuth`'s `authenticateUser`.
- `showPassword` — boolean, toggles the password `<input>`'s `type` between `"password"`/`"text"` and swaps the `FaEye`/`FaEyeSlash` icon. Implemented inline with `useState`, **not** via `utils/PasswordToggle.ts`.

**Render structure:** `<Helmet>` (page title "NgoWorld | Login", meta description, `canonical` pinned to `/` — arguably should be `/auth/signin`) → `<Navbar />` → a two-column `.signup_container` (form on the left, a static banner image `authbanner.png` on the right) → `<form onSubmit>` that calls `e.preventDefault()` then `authenticateUser(credentials, setErrors)`.

**Submit button:** the shared `Button` component (`@components`), `isLoading={loading}` from `useAuth`, `disabled={loading || !credentials.email || !credentials.password}` — this is the only client-side gate other than what `useAuth` itself checks; there is no `minLength`/pattern validation on the raw `<input>` elements themselves.

**Google button:** a plain `<button>` (not the shared `Button` component) calling `handleGoogle`, which awaits `GoogleAuth()` (`MilanApi.ts`, `GET /auth/google`) and does a **full-page redirect** — `window.location.href = response` — to whatever URL the backend returns. This is not a SPA navigation; it leaves the React app entirely. See "Google OAuth flow" below.

**Bottom link:** `<Link to="/auth/signup">Sign Up to NgoWorld</Link>` — a real, correct route.

## `pages/SignUp.tsx`

Structurally the sibling of `SignIn.tsx`, with two additions:

**Local state:** `credentials` starts as `{ name: "", email: "", password: "", userType: authTypeOptions[1] }` — `authTypeOptions` from `src/statics/Constants.ts` is `[{value:"individual",label:"Individual"}, {value:"club",label:"Organization"}]`, so the form **defaults to "Organization"** (`authTypeOptions[1]`), not "Individual".

**Two different UI controls for the same `userType` state**, shown at different breakpoints via CSS (both exist in the DOM at all times; there is no JS-level breakpoint check choosing between them):
1. A `react-select` `<Select>` (`auth_element_mobileOnly` — despite the class name, this is the desktop-oriented "Account Type" dropdown per the surrounding CSS) — `onChange` sets `userType: e` (the full `{value, label}` option object) and **also clears `email`, `password`, `name`** back to `""`.
2. A hand-rolled checkbox-styled toggle (`.status-switch`, `data-unchecked="Organization" data-checked="Individual"`) in the right-hand panel — its `onClick` flips `userType` between `authTypeOptions[0]`/`[1]` based on the *current* value, clears the same three fields, **and additionally clears `errors`** (`setErrors({})`) — the `<Select>` path does not clear `errors`.

Both controls mutate the same `credentials.userType`, so if a consumer somehow drives both (e.g. a future CSS change that shows both at once), the second one clicked wins with no conflict — but the `errors`-clearing asymmetry means a validation error left over from before a mode switch can persist on screen if the user only touches the `<Select>`, not the checkbox toggle.

**Label/placeholder swap:** the name field's label/placeholder read `credentials.userType.value === "individual" ? "Full Name"/"John Doe" : "Organization Name"/"Save Tigers"` — purely cosmetic, does not change which field is actually submitted (`name` either way).

**Submit gate:** `disabled={loading || !credentials.email || !credentials.password || !credentials.name}` — one more required field than `SignIn.tsx` (adds `name`).

**On submit:** same pattern as `SignIn.tsx` — `authenticateUser(credentials, setErrors)` from `useAuth("signup")`.

## `hooks/useAuth.ts` — the live validator + submit handler

```js
export function useAuth(authType) // authType: "signin" | "signup"
  → { authenticateUser(credentials, setErrors), loading }
```

`authenticateUser` runs, **in this exact order, each step short-circuiting the rest on failure**:

1. **Connectivity check.** `checkInternetConnection()` (`src/utils/CheckInternetConnection.ts`) — if `navigator.onLine === false`, **the function itself fires a raw `toast.error("Please check your internet connection")` directly** (not via `showErrorToast` — it calls `react-toastify`'s `toast.error` itself) and returns `false`; `authenticateUser` then returns immediately with no field-level `errors` set. So the user does see feedback — a generic connectivity toast — just not anything mentioning email/password, and no field gets an inline error message. Correction to an earlier draft of this doc, which claimed no feedback at all; the important nuance is that **every caller of `checkInternetConnection()` gets this toast for free when offline**, including `showSuccessToast`/`showErrorToast` themselves (they call `checkInternetConnection()` first and return early without adding a second toast of their own) — see [api-integration.md](../../../docs/specs/api-integration.md#toast-conventions).
2. **Email format.** `emailRegex.test(credentials.email)` using the regex from `src/statics/Constants.ts`: `` /^[a-zA-Z0-9._:$!%-]+@[a-zA-Z0-9.-]+.[a-zA-Z]$/ ``. This regex is looser than it looks — the `.` immediately before the final `[a-zA-Z]` is an **unescaped dot** (matches any character, not literally `.`), and the character class after it requires **exactly one** trailing letter, not 2+. In practice this means malformed strings like `a@bXc` pass, while some legitimately-shaped emails could be rejected depending on TLD length assumptions. **This is the regex actually enforced on real sign-in and sign-up traffic** — coordinate with whoever owns the backend's own email validation before tightening it, since users who signed up under the loose rule may have addresses that would fail a stricter one. On failure: `setErrors(prev => ({...prev, email: "Please enter a valid email address"}))`, then return — no network call is made.
3. **Password strength.** Inline regex (not from `Constants.ts`): `` /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/ `` — requires 8+ characters, at least one digit, one lowercase, one uppercase letter. **This check runs identically on sign-in**, not just sign-up. An existing account whose password predates this rule (or a user who simply mistypes) gets a client-side "password" field error and the request never reaches the backend, even though the backend might have accepted or correctly rejected the actual credentials. On failure: same `setErrors` pattern, field `password`, then return.
4. **Sets `loading = true`**, then calls exactly one of:
   - `LoginUser(credentials)` (`MilanApi.ts`, `POST /auth/signin`, `withCredentials: true`) when `authType === "signin"`.
   - `RegisterUser({ ...credentials, userType: credentials.userType.value })` (`MilanApi.ts`, `POST /auth/signup`, `withCredentials: true`) when `authType === "signup"` — note `userType` is unwrapped from its `react-select` `{value, label}` shape into a bare string **only here**; if you ever add a second `authType`-driven consumer that doesn't come through `SignUp.tsx`'s `<Select>`/`.status-switch` state shape, this line will throw (`credentials.userType.value` on a plain string would be `undefined`, so `userType` becomes `undefined` in the payload rather than throwing — silent data loss, not a crash).
5. **On `response.status === 200 || 201`:** `showSuccessToast(response?.data?.message)`, then `dispatch(updateUserData({ ...response.data.user, isLoggedIn: true }))` — this is the point where the Redux `user` slice is first populated for the session; see [state-management.md](../../../docs/specs/state-management.md) for the slice's dynamic, schema-less shape. Then, after a **fixed 1000ms `setTimeout`** (not tied to the toast's own duration — just an arbitrary pause so the user sees the success toast before the page navigates away), `navigate("/")` and `setLoading(false)`.
6. **Otherwise:** `showErrorToast(response?.data?.message)`, `setLoading(false)`. Note this branch is also reached if `LoginUser`/`RegisterUser` themselves failed with a network error, since both of those functions catch and return `error.response` rather than throwing — see [api-integration.md](../../../docs/specs/api-integration.md#layer-a--srcservicesmilanapijs-the-one-almost-everything-uses). If the network is down entirely (no `error.response`, e.g. DNS failure), `response` is `undefined` and `response?.data?.message` is `undefined` — `showErrorToast(undefined)` — check what `showErrorToast` does with an undefined message before assuming users see something meaningful in this case.

`useAuth` does not distinguish "email already exists" from "wrong password" from "server error" at the hook level — whatever `response?.data?.message` the backend sent is shown verbatim in the toast; there's no client-side mapping to friendlier copy.

## `hooks/useValidation.ts` + `hooks/useFormLogic.ts` — the unused, fuller system

These two files are not imported by `SignIn.tsx` or `SignUp.tsx` today, but they are the more complete design and are worth understanding in full if you're ever asked to build out real club-signup fields (tagline, description, address, slug, iframe) that the live pages don't currently collect at all.

**`useValidation(credentials, userSignup, clubSignup)`** — a plain function (not a hook despite the `use` prefix; called directly, not via the Hooks runtime) that returns either `[]`-shaped array of `{ error: true, message, field }` objects, or `{ error: false, message: "" }` if nothing failed. Always validates `email` (stricter regex than `useAuth.ts`'s: `` /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ `` — properly escaped dot, 2+ char TLD) and `password` (present + 6+ chars — looser than `useAuth.ts`'s 8-char/mixed-case/digit rule) and, if `confirmPassword` is present, that it matches `password`. If `userSignup` is true: validates `firstName`/`lastName` (letters only, 3–30 chars). If `clubSignup` is true: validates `name` (letters+spaces, 3–30), `tagLine` (20–220 chars), `description` (100–1000 chars), and requires `iframe` to be present (no format check beyond truthiness). If either signup flag is true: also validates `website` (optional, but must match a URL regex if provided), `slug` (required, must not start/end with `/`, must be `[a-zA-Z0-9-]` only, 3–30 chars — this is clearly meant to become the public profile username), `city`/`state`/`country` (required, presence only), `address` (20–200 chars), `pincode` (required, must stringify to length 5 or 6).

**`useFormLogic(initialState, submitCallback, redirectPath, isSignup, userType)`** — a hook wrapping generic form state (`formState`, `handleChange`, `handleSubmit`) around the validator above, driven by the Zustand `isLoading` flag (`useAuthStore`, shared with `AuthButton.tsx`) rather than local `useState` loading. `handleSubmit` calls `useValidation` with `userType === "individual"` ⇒ `(formState, true, false)` or otherwise `(formState, false, true)` — i.e. it always validates as either full individual-signup or full club-signup, never as a plain sign-in; there's no `authType === "signin"` short path like `useAuth.ts` has, meaning this hook was seemingly designed for the richer signup flow specifically. On validation success it awaits `submitCallback(formState)` (the actual API call is left to the caller — this hook doesn't call `MilanApi.ts` directly) and handles the response's `status` the same 200/201-success shape as `useAuth.ts`, but with a **2000ms** timeout before navigating (vs. `useAuth.ts`'s 1000ms) and does **not** dispatch anything to Redux itself — a real consumer of this hook would need to handle the Redux dispatch inside its own `submitCallback`.

Also exports `individualInitialFormState` and `clubInitialFormState` — these are the two form shapes `useValidation` expects, and are the best available reference for "what fields does a complete club/individual signup need" since no live UI collects them all today.

## `components/DonotRenderWhenLoggedIn.tsx` — the route guard

A higher-order component: `DonotRenderWhenLoggedIn(Component) → WrappedComponent`.
Applied to `SignIn` and `SignUp` in [routesConfig.tsx](../../../src/app/routes/routesConfig.tsx) (both lazy-loaded: `lazy(() => import(...))`).
Guard condition: `Cookies.get("Token") && useSelector(selectIsLoggedIn)` — **both** must be truthy to redirect (`<Navigate to="/" />`); either one alone renders the wrapped page normally.
This is "pattern 2" of the three "is the user logged in" checks cataloged in [state-management.md](../../../docs/specs/state-management.md) — match it if you add a similar guard elsewhere, rather than introducing a fourth variant.
This HOC protects exactly two routes; there is no equivalent "require login" guard anywhere in the app (e.g. nothing stops an anonymous visitor from loading `/dashboard` by URL).

## `components/AuthButton.tsx` — unused

A self-contained submit button + "switch mode" link, meant to replace the bespoke markup `SignIn.tsx`/`SignUp.tsx` build inline (their own `<Button>` + `signup_or` + Google button + `auth_forgot_section` block).
Reads `window.location.pathname.includes("signup")` to decide which copy/link to show — a pattern that only works if it's rendered from exactly `/auth/signin` or `/auth/signup`.
**Newly observed bug, not previously documented:** the "switch mode" link navigates to `navigate("/auth/login")` — there is no `/auth/login` route (the real routes are `/auth/signin` and `/auth/signup`, confirmed in `routesConfig.tsx`); clicking it would land on the 404 page.
Since this component is not currently rendered anywhere, the bug is latent — fix it before wiring this component into a page.

## `components/RenderErrorMessage.tsx` — unused

`renderErrorMessage(fieldName, formState)` renders every entry in `formState.errors` (the `useValidation.ts`-shaped array) whose `.field` matches `fieldName`, wrapped in `.authpage_error-div` / `.authpage_error-message`.
Only meaningful paired with `useFormLogic`'s `formState.errors` array shape — the live pages' `errors` object (`{ email: "...", password: "..." }`, one string per field) is a different shape and is rendered with plain `<p>{errors.email}</p>` inline instead.

## `utils/PasswordToggle.ts` — unused

`passwordToggle(passwordType, setPasswordType)` / `confirmPasswordToggle(...)` are generic `"password" ⇄ "text"` flippers meant to be paired with a `useState` pair per input.
Both live pages instead inline their own `showPassword` boolean and swap `FaEye`/`FaEyeSlash` directly rather than calling these.
If you add a confirm-password field to either live page, prefer wiring these in over writing a third copy of the same toggle logic.

## Data flow summary

```
SignIn.tsx / SignUp.tsx (local `credentials`/`errors` state)
        │  onSubmit
        ▼
useAuth(authType).authenticateUser(credentials, setErrors)
        │  1. connectivity check → silent no-op if offline
        │  2. emailRegex (Constants.ts) → setErrors + return on fail
        │  3. inline password regex → setErrors + return on fail
        ▼
LoginUser(credentials) / RegisterUser({...credentials, userType: userType.value})   [MilanApi.ts]
        │  POST /auth/signin or /auth/signup, withCredentials: true
        ▼
response.status 200/201 ──► showSuccessToast → dispatch(updateUserData({...user, isLoggedIn:true}))
                              → setTimeout 1000ms → navigate("/")
        │
        └── else ──► showErrorToast(response?.data?.message)
```

Google OAuth is a separate, parallel path that bypasses `useAuth.ts` entirely:

```
SignIn.tsx / SignUp.tsx  handleGoogle()
        ▼
GoogleAuth()  [MilanApi.ts, GET /auth/google]  →  window.location.href = <backend-provided URL>
        │   (full page navigation — leaves the React app)
        ▼
[user authenticates with Google on the backend's redirect target]
        ▼
backend redirects back to the frontend and sets an `OAuthLoginInitiated` cookie
        ▼
Home.tsx (features/landing-home) checks that cookie on mount
        │  if present: successCallback()  [MilanApi.ts, GET /auth/login/success]
        ▼
dispatch(updateUserData(...)) + dispatch(toggleUserLogin())   ← two separate dispatches, done in Home.tsx, not here
```

Because completion of Google OAuth is handled by `Home.tsx` (a different feature) rather than anything in this folder, **a Google sign-in only "completes" on the frontend if the user's redirect lands back on `/`** — this feature has no way to finish the OAuth handshake on its own. See [landing-home/SPEC.md](../landing-home/SPEC.md) for the other half of this flow.

## Known issues specific to this feature (superset of known-issues.md's auth entries)

- **Two validation systems, only one live** (see above) — don't assume a fix to `useValidation.ts` affects real sign-in/sign-up behavior; it doesn't, today.
- **`useAuth.ts`'s email/password checks re-run on sign-in**, not just sign-up, and can block a legitimate login attempt with stale-relative-to-current-rules credentials before any network call happens.
- **Offline feedback is generic, not field-specific** — step 1 of `authenticateUser` shows a connectivity toast (via `checkInternetConnection()`) but never a field-level `email`/`password` error, unlike steps 2–3.
- **`AuthButton.tsx` links to a nonexistent `/auth/login` route** (should be `/auth/signin`) — latent since the component is unused; fix before wiring it up.
- **`SignIn.tsx`'s dead `name` field** in local state, unused.
- **`SignUp.tsx`'s two `userType` toggle controls clear `errors` inconsistently** (checkbox toggle does, `<Select>` doesn't).
- **`SignUp.tsx` defaults to `userType: "club"`** (`authTypeOptions[1]`, labeled "Organization") rather than "Individual" — confirm this is intentional product behavior before treating it as a bug.
- The email regex actually enforced on live traffic (`Constants.ts`'s `emailRegex`) is looser/buggier than `useValidation.ts`'s unused one — see [known-issues.md](../../../docs/specs/known-issues.md) for the exact character-class bug.

## If you're asked to...

- **"Fix a sign-in/sign-up bug users are hitting"** → almost certainly `hooks/useAuth.ts` or the two page components; `useValidation.ts`/`useFormLogic.ts` are not in the live path.
- **"Add a club-specific signup field" (tagline, description, address, etc.)** → the live `SignUp.tsx` collects none of these today. Converge on `useValidation.ts` + `useFormLogic.ts` + `clubInitialFormState` as the target design rather than inventing new field-handling from scratch; you'll need to actually wire `useFormLogic` into `SignUp.tsx` (or a new club-signup page) to make it live.
- **"Standardize the password show/hide toggle"** → adopt `utils/PasswordToggle.ts` in both pages instead of leaving each page with its own inline copy.
- **"Make the Google button match the shared Button style"** → both pages currently use a raw `<button className="btn authpage_oauth">`, not the shared `Button` component; ui-kit.md's shared `Button` supports an `onClickfunction` prop pattern to follow if you convert it.
- **"Centralize logout"** → out of scope for this folder; see `docs/specs/state-management.md` and the three call sites listed there.
