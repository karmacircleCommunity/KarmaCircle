# Authentication — Feature Spec

Colocated, implementation-level companion to [docs/specs/authentication.md](../../../docs/specs/authentication.md).
That file is the short cross-feature summary meant to be read alongside the other features; this file is the deep reference meant to be read by an AI agent that is about to edit code inside `src/features/authentication/`.
Read [docs/specs/state-management.md](../../../docs/specs/state-management.md) and [docs/specs/api-integration.md](../../../docs/specs/api-integration.md) first if you haven't — this feature is the primary writer of Redux user state and a primary caller of the auth endpoints described there.
Read [docs/specs/known-issues.md](../../../docs/specs/known-issues.md) too; several items below are duplicated from it on purpose so this file is self-contained.

## What this feature is responsible for

Everything involved in turning an anonymous visitor into a session with a `Token` cookie and a populated Redux `user` slice: the unified sign-in/sign-up form, Google OAuth kickoff, the client-side field validation that runs before either path's network call, and the route guard that keeps an already-authenticated visitor off `/auth/signin` and `/auth/signup`.
Logout is **not** owned by this feature — there is no `useLogout` hook or logout button here.
`Logout()` (the API call) lives in `src/services/MilanApi.ts` and is invoked from three other features (`components/Navbar.tsx`, `features/onboarding-profile/pages/Profile.tsx`, `features/onboarding-profile/pages/UserProfile.tsx`) with three slightly different cleanup sequences — see [state-management.md](../../../docs/specs/state-management.md).
If you're asked to fix or centralize logout, you'll be working outside this folder.

## Why it's shaped this way

The backend ([apps/api](../../../../../apps/api), this repo's other app) is the actual source of truth for whether credentials are valid; client-side validation here exists purely to reduce round-trips for obviously-bad input (empty fields, malformed email, weak password) and to give inline field-level feedback rather than a single toast.

As of the unified-auth-flow change (August 2026), there is exactly **one** live auth page, `pages/Auth.tsx`, instead of separate `SignIn.tsx`/`SignUp.tsx` pages — see "One unified flow, two entry routes" in [docs/specs/authentication.md](../../../docs/specs/authentication.md) for the product rationale (the visitor shouldn't have to know or say up front whether they already have an account; the app checks their email and routes them itself).
The codebase still carries two competing *validation* designs — a minimal one wired into `Auth.tsx` (`useAuth.ts`) and a much fuller one that never got wired in (`useValidation.ts` + `useFormLogic.ts`, see below) — which is the most important thing to understand before touching this folder beyond the page itself: **there are two parallel, non-interoperating auth-validation systems here, and only one of them runs in production.**
Do not assume both are exercised by any given change.

## File manifest

| File | Role | Actually used by a live page? |
|---|---|---|
| `pages/Auth.tsx` | The single unified sign-in/sign-up flow — three steps (`"email"` → `"signin"` or `"signup"`) driven by local `step` state, not three separate routes/pages | ✅ yes — routed at both `/auth/signin` and `/auth/signup` |
| `hooks/useAuth.ts` | The validator + submit handler `Auth.tsx` calls for the final `"signin"`/`"signup"` step submit | ✅ yes |
| `hooks/useValidation.ts` | Fuller, unused validator (individual + club shapes) | ❌ no |
| `hooks/useFormLogic.ts` | Unused generic submit-handler hook built on `useValidation.ts`; also the only place `individualInitialFormState`/`clubInitialFormState` are defined | ❌ no |
| `utils/validateEmail.ts` | The single email-format check (`validateEmail(email)`) shared by `Auth.tsx` and `useAuth.ts` — wraps `emailRegex` from `static/Constants.ts` | ✅ yes |
| `components/DonotRenderWhenLoggedIn.tsx` | Route-guard HOC wrapping `Auth` (both routes) in `routesConfig.tsx` | ✅ yes |
| `components/AuthLayout.tsx` | Shared page shell for `Auth.tsx` — the left brand/value-prop panel, the `--auth-accent` CSS vars, and the cream right-panel frame. `Auth.tsx` passes whichever step's form is current as `children`. Its root `<div>` also carries an `auth-page` class, which `styles/index.css` uses to scope the autofill-background override below. | ✅ yes |
| `components/AuthButton.tsx` | Unused alternate submit-button + "switch mode" component | ❌ no |
| `components/RenderErrorMessage.tsx` | Unused helper for rendering `useValidation`-shaped error arrays | ❌ no (only meaningful once `useValidation` is wired in) |
| `utils/PasswordToggle.ts` | Unused `password ⇄ text` input-type togglers | ❌ no (`Auth.tsx` inlines its own toggle logic instead) |
| `types/index.ts` | `AuthType` enum, `Credentials`/`AuthErrors`/`ValidationError`/`SignupFormState` interfaces, etc. — see "Types" below | ✅ yes — imported by every other file in this folder |

Five of the nine non-type files in this folder (`useValidation.ts`, `useFormLogic.ts`, `AuthButton.tsx`, `RenderErrorMessage.tsx`, `PasswordToggle.ts`) are not imported by anything that runs in the live app.
Per [known-issues.md](../../../docs/specs/known-issues.md), treat these as **the design to converge toward**, not dead code to delete on sight, if you're ever asked to build out the fuller club-signup flow (tagline, description, address, slug/username, iframe) — that flow doesn't exist in the live page at all today, and this scaffolding is the closest thing to a spec for it.

## Types

This folder is fully TypeScript (`.ts`/`.tsx`) as of the auth+clubs conversion pass — see `tsconfig.json` at the repo root.
`types/index.ts` holds everything specific to this feature: the `AuthType` enum (`SignIn`/`SignUp`, passed into `useAuth`), `Auth.tsx`'s `Credentials`/`AuthErrors` shapes, and the unused system's `ValidationError`/`ValidationResult`/`ValidatableCredentials`/`IndividualFormState`/`ClubFormState`/`SignupFormState` shapes.
`UserType` (the `"individual" | "club"` enum) and `AuthTypeOption` (the react-select option shape) live in `src/types/user.ts` instead, since `clubs` needs `UserType` too.
This feature's shared dependencies are all typed directly now, following the app shell and shared-layer conversion passes (see `docs/specs/architecture.md#typescript`): `src/statics/Constants.ts` (`authTypeOptions` types as `AuthTypeOption[]`), `src/utils/Toasts.ts`/`CheckInternetConnection.ts`, `src/services/MilanApi.ts`, the shared `Button` component, and the Redux `userSlice.ts`/Zustand `useAuth.ts` store.

## `pages/Auth.tsx`

Default export, function component, no props (rendered directly by the router — mounted at both `/auth/signin` and `/auth/signup`, see `docs/specs/authentication.md`).

**Local state:**
- `step` — `"email" | "signin" | "signup"`. Drives which of the three form bodies renders; starts at `"email"` regardless of which route mounted the page.
- `credentials` — `{ name: "", email: "", password: "", userType: authTypeOptions[0] }`. Defaults to **"Individual"** (`authTypeOptions[0]`) — a deliberate change from the old `SignUp.tsx`, which defaulted to "Organization" (`authTypeOptions[1]`) and had an open question in this file about whether that was intentional; "Individual" is the more common case and there's no product reason on record to default the other way.
- `errors` — `{}`, keyed by field name (`email`, `password`, `name`), populated by `useAuth`'s `authenticateUser` and (on the `"signup"` step) the local name-format check.
- `showPassword` — boolean, toggles the password `<input>`'s `type` between `"password"`/`"text"` and swaps the `FaEye`/`FaEyeSlash` icon. Shared across the `"signin"`/`"signup"` steps' password fields (only one is ever mounted at a time, so one boolean is enough).
- `checkingEmail` — boolean, drives the `"email"` step's Continue button loading state while `CheckEmailExists` is in flight. Kept separate from `useAuth`'s own `loading`, which only covers the final `"signin"`/`"signup"` submit.

**The `useAuth` call:** `const authType = step === "signup" ? AuthType.SignUp : AuthType.SignIn; const { authenticateUser, loading } = useAuth(authType);` — called unconditionally on every render (same hook, same position), just with an argument that changes as `step` changes. This is what makes `useAuth`'s branching (password-strength gate vs. plain non-empty check, `LoginUser` vs. `RegisterUser`) automatically follow whichever step the flow is on, without the page needing two separate hook instances.

**Step `"email"`:** heading "Welcome to NgoWorld"; a `role="tablist"` pair (Individual/Organization, `setUserType`) identical in markup to the old `SignUp.tsx` step 1's tabs; an email input; a Continue button (`disabled={!credentials.email || !isEmailFormatValid || checkingEmail}`, `isLoading={checkingEmail}`); an "or" divider; a "Continue with Google" button (`handleGoogle`, passes `credentials.userType?.value` the same way the old `SignUp.tsx` did). Google is rendered **only** on this step — it's a parallel entry point, not something that belongs layered onto a password or name field the visitor is already committed to.

Submitting this step (`handleContinue`) runs, in order: `validateEmail()` (sets `errors.email` and stops on failure) → `CheckEmailExists(credentials.email)` (`MilanApi.ts`) with `checkingEmail` toggling around it → if `response.status === STATUSCODE.OK && response.data?.exists`, `setStep("signin")`; otherwise (including a failed/unreachable check — fails open, same reasoning the old `SignUp.tsx` step 1 used) `setStep("signup")`.

**Step `"signin"`:** a Back button (`← Back`, `handleBack`) above the heading; heading "Enter your password"; the email input, `value={credentials.email}`, `disabled`; a password input (`autoComplete="current-password"`) with the show/hide eye icon and the same inert "Forgot password?" text the old `SignIn.tsx` had (no forgot-password route exists yet); a "Sign In" button (`disabled={loading || !credentials.password}`). No "Sign up instead" link — landing here already means the app determined this email has an account, so there's nothing to choose.

**Step `"signup"`:** same Back button; heading swaps on `isIndividual` ("What's your name?" / "What's your organization called?"), which reads `credentials.userType` set back on the `"email"` step; the disabled, pre-filled email input; a name input (letters/spaces-only sanitization on every keystroke, same as old `SignUp.tsx` step 2); a password input with the live strength meter (`getPasswordStrength`, same file); a "Sign Up" button (`disabled={loading || !credentials.password || !credentials.name}`). No "Log in instead" link for the same reason as above.

**`handleBack()`:** `setStep("email")`, clears `credentials.password` (so a half-typed password from a previous attempt doesn't linger if the visitor comes back through a different step), clears `errors`. Deliberately does **not** clear `credentials.email`/`credentials.name`/`credentials.userType` — the point of Back is to let someone correct their email without losing anything else they'd already entered.

**The step-revert effect:** `useEffect(() => { if (step === "signup" && errors.email) setStep("email"); }, [step, errors.email])` — same purpose as the old `SignUp.tsx`'s identical effect: if the final signup submit comes back with a 409 the live check missed, the email field isn't on screen on the `"signup"` step, so step back to where it is.

**Disabled-field styling:** the shared `inputClasses` constant now carries `disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500` so the locked-in email input on `"signin"`/`"signup"` reads as visibly non-interactive without a second, parallel class string to keep in sync.

## `hooks/useAuth.ts` — the live validator + submit handler

```js
export function useAuth(authType) // authType: "signin" | "signup"
  → { authenticateUser(credentials, setErrors), loading }
```

Unchanged by the unified-flow change except for who calls it and how `authType` is chosen — see "The `useAuth` call" above. `authenticateUser` still runs, **in this exact order, each step short-circuiting the rest on failure**:

1. **Connectivity check.** `checkInternetConnection()` (`src/utils/CheckInternetConnection.ts`) — if `navigator.onLine === false`, **the function itself fires a raw `toast.error("Please check your internet connection")` directly** (not via `showErrorToast`) and returns `false`; `authenticateUser` then returns immediately with no field-level `errors` set.
2. **Email format.** `validateEmail(credentials.email)` (`utils/validateEmail.ts`), wrapping `emailRegex` from `src/statics/Constants.ts`. On failure: `setErrors(prev => ({...prev, email: emailError}))`, then return — no network call is made. (By the time `authenticateUser` runs from either `"signin"`/`"signup"` step, the email step has already validated format and existence once, so this branch is mostly a defensive re-check rather than something a normal user hits.)
3. **Password.** Branches on `authType`:
   - `authType === "signin"`: only checks `credentials.password` is non-empty, setting `errors.password = "Password is required"` on failure.
   - `authType === "signup"`: checks `credentials.password` against `passwordRegex` from `static/Constants.ts` — `` /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/ ``, requiring 8+ characters, at least one digit, one lowercase, one uppercase letter. On failure: `setErrors`, field `password`, then return.
   Either branch short-circuits before any network call on failure.
4. **Sets `loading = true`**, then calls exactly one of:
   - `LoginUser(credentials)` (`MilanApi.ts`, `POST /auth/signin`, `withCredentials: true`) when `authType === "signin"`.
   - `RegisterUser({ ...credentials, userType: credentials.userType.value })` (`MilanApi.ts`, `POST /auth/signup`, `withCredentials: true`) when `authType === "signup"` — `userType` is unwrapped from its `react-select` `{value, label}` shape into a bare string **only here**.
5. **On `response.status === 200 || 201`:** `showSuccessToast(response?.data?.message)`, then `dispatch(updateUserData({ ...response.data.user, isLoggedIn: true }))`. Then, after a **fixed 1000ms `setTimeout`**, `navigate("/")` and `setLoading(false)`.
6. **Otherwise:** `showErrorToast(response?.data?.message)`, `setLoading(false)`. Maps a Zod-shaped `response.data.errors` array's `email`/`password` entries onto `setErrors`, and on `authType === "signup"` specifically, maps an exact `USER_ALREADY_EXISTS` message onto `errors.email` too (this is what triggers `Auth.tsx`'s step-revert effect above).

`useAuth` does not distinguish "email already exists" from "wrong password" from "server error" at the hook level — whatever `response?.data?.message` the backend sent is shown verbatim in the toast; there's no client-side mapping to friendlier copy.

## `hooks/useValidation.ts` + `hooks/useFormLogic.ts` — the unused, fuller system

These two files are not imported by `Auth.tsx` today, but they are the more complete design and are worth understanding in full if you're ever asked to build out real club-signup fields (tagline, description, address, slug, iframe) that the live page doesn't currently collect at all.

**`useValidation(credentials, userSignup, clubSignup)`** — a plain function (not a hook despite the `use` prefix; called directly, not via the Hooks runtime) that returns either `[]`-shaped array of `{ error: true, message, field }` objects, or `{ error: false, message: "" }` if nothing failed. Always validates `email` (stricter regex than `useAuth.ts`'s: `` /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ `` — properly escaped dot, 2+ char TLD) and `password` (present + 6+ chars — looser than `useAuth.ts`'s 8-char/mixed-case/digit rule) and, if `confirmPassword` is present, that it matches `password`. If `userSignup` is true: validates `firstName`/`lastName` (letters only, 3–30 chars). If `clubSignup` is true: validates `name` (letters+spaces, 3–30), `tagLine` (20–220 chars), `description` (100–1000 chars), and requires `iframe` to be present (no format check beyond truthiness). If either signup flag is true: also validates `website` (optional, but must match a URL regex if provided), `slug` (required, must not start/end with `/`, must be `[a-zA-Z0-9-]` only, 3–30 chars), `city`/`state`/`country` (required, presence only), `address` (20–200 chars), `pincode` (required, must stringify to length 5 or 6).

**`useFormLogic(initialState, submitCallback, redirectPath, isSignup, userType)`** — a hook wrapping generic form state (`formState`, `handleChange`, `handleSubmit`) around the validator above, driven by the Zustand `isLoading` flag (`useAuthStore`, shared with `AuthButton.tsx`) rather than local `useState` loading. `handleSubmit` calls `useValidation` with `userType === "individual"` ⇒ `(formState, true, false)` or otherwise `(formState, false, true)`. On validation success it awaits `submitCallback(formState)` and handles the response the same 200/201-success shape as `useAuth.ts`, but with a **2000ms** timeout before navigating and does **not** dispatch anything to Redux itself.

Also exports `individualInitialFormState` and `clubInitialFormState` — these are the two form shapes `useValidation` expects, and are the best available reference for "what fields does a complete club/individual signup need" since no live UI collects them all today.

## `components/DonotRenderWhenLoggedIn.tsx` — the route guard

A higher-order component: `DonotRenderWhenLoggedIn(Component) → WrappedComponent`.
Applied once to `Auth` in [routesConfig.tsx](../../../src/app/routes/routesConfig.tsx), and that one wrapped component is mounted at both `/auth/signup` and `/auth/signin`.
Guard condition: `Cookies.get("Token") && useSelector(selectIsLoggedIn)` — **both** must be truthy to redirect (`<Navigate to="/" />`); either one alone renders the wrapped page normally.
This is "pattern 2" of the three "is the user logged in" checks cataloged in [state-management.md](../../../docs/specs/state-management.md).
This HOC protects exactly these two routes; there is no equivalent "require login" guard anywhere in the app.

## `components/AuthButton.tsx` — unused

A self-contained submit button + "switch mode" link, meant to replace bespoke inline markup.
Reads `window.location.pathname.includes("signup")` to decide which copy/link to show — a pattern that only worked when sign-in and sign-up were two separate routes/pages with different markup; it has no obvious equivalent now that `Auth.tsx` decides sign-in vs. sign-up from a live email check rather than from the URL.
**Pre-existing bug, still latent:** the "switch mode" link navigates to `navigate("/auth/login")` — there is no `/auth/login` route (the real routes are `/auth/signin` and `/auth/signup`). Since this component is not currently rendered anywhere, the bug is latent; fix it (and reconsider whether "switch mode" is even a meaningful concept for this component to offer anymore) before wiring it into a page.

## `components/RenderErrorMessage.tsx` — unused

`renderErrorMessage(fieldName, formState)` renders every entry in `formState.errors` (the `useValidation.ts`-shaped array) whose `.field` matches `fieldName`, wrapped in `.authpage_error-div` / `.authpage_error-message`.
Only meaningful paired with `useFormLogic`'s `formState.errors` array shape — `Auth.tsx`'s `errors` object (`{ email: "...", password: "...", name: "..." }`, one string per field) is a different shape and is rendered with plain `<p>{errors.email}</p>` inline instead.

## `utils/PasswordToggle.ts` — unused

`passwordToggle(passwordType, setPasswordType)` / `confirmPasswordToggle(...)` are generic `"password" ⇄ "text"` flippers meant to be paired with a `useState` pair per input.
`Auth.tsx` instead inlines its own `showPassword` boolean and swaps `FaEye`/`FaEyeSlash` directly rather than calling these.
If you add a confirm-password field, prefer wiring these in over writing a third copy of the same toggle logic.

## Data flow summary

```
Auth.tsx step "email"
        │  Continue → handleContinue()
        │    1. validateEmail() → setErrors + stop on fail
        │    2. CheckEmailExists(email)  [MilanApi.ts]
        ▼
   exists? ──yes──► step "signin" (email locked in, password only)
        │
        no / check failed (fail open)
        ▼
   step "signup" (email locked in, name + password)
        │
        ▼  onSubmit (either step)
useAuth(authType).authenticateUser(credentials, setErrors)
        │  1. connectivity check → silent no-op if offline
        │  2. validateEmail() (defensive re-check)
        │  3. password: signin → non-empty check only | signup → passwordRegex (Constants.ts)
        │                → setErrors + return on fail, either way
        ▼
LoginUser(credentials) / RegisterUser({...credentials, userType: userType.value})   [MilanApi.ts]
        │  POST /auth/signin or /auth/signup, withCredentials: true
        ▼
response.status 200/201 ──► showSuccessToast → dispatch(updateUserData({...user, isLoggedIn:true}))
                              → setTimeout 1000ms → navigate("/")
        │
        └── else ──► showErrorToast(response?.data?.message)
                       └── signup 409 USER_ALREADY_EXISTS → errors.email → step reverts to "email"
```

Google OAuth is a separate, parallel path that bypasses `useAuth.ts` entirely, reachable only from the `"email"` step:

```
Auth.tsx step "email"  handleGoogle()
        ▼
GoogleAuth(userType)  [MilanApi.ts, GET /auth/google]  →  window.location.href = <backend-provided URL>
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

## Field metadata: `autoComplete`, `name`, and the required-field asterisk

Every editable `<input>` on `Auth.tsx` carries an explicit `name` and `autoComplete` token, chosen per-field rather than left blank or set to `"off"` (`"off"` is unreliable — Chromium-family browsers largely ignore it on a form they've decided looks like a login):

- Step `"email"`: email → `name="email"` `autoComplete="email"`.
- Step `"signin"`: (disabled) email → `name="email"` `autoComplete="username"`; password → `name="password"` `autoComplete="current-password"`.
- Step `"signup"`: (disabled) email → `name="email"` `autoComplete="email"`; name → `name="name"` `autoComplete={isIndividual ? "name" : "organization"}`; password → `name="new-password"` `autoComplete="new-password"`.

This exists to fix a real bug: without these, browsers/password managers (observed in Brave) would treat an unlabeled text field sitting directly above a password field as a login username and pop up saved email/password suggestions on it, including on the "Organization name" field. Tagging the password field `new-password` and the name field `name`/`organization` is what signals "this is a signup, not a login" and suppresses that.

The disabled email inputs on the `"signin"`/`"signup"` steps intentionally **don't** get the `RequiredMark` asterisk — the field is already answered and isn't being input right now, so a "required" cue there would be noise, not a cue.
Each editable field still has a small local `RequiredMark` component (`<span className="ml-0.5 align-top text-xs text-red-500" aria-hidden="true">*</span>`) rendered after its label — a presentational cue only, not wired to HTML's own `required` attribute; the actual required/format gating is still whatever `errors` + the current step's submit button `disabled` expression already do.

`styles/index.css` also has a `.auth-page input:-webkit-autofill` rule (scoped via `AuthLayout.tsx`'s root `auth-page` class) that forces an autofilled input back to the same white background/ink text color as a normal input — without it, Chromium browsers repaint an autofilled field with a forced light-blue/yellow fill the instant autofill runs.

## Known issues specific to this feature (superset of known-issues.md's auth entries)

- **Two validation systems, only one live** (see above) — don't assume a fix to `useValidation.ts` affects real sign-in/sign-up behavior; it doesn't, today.
- **`useAuth.ts`'s email check still re-runs on the final `"signin"`/`"signup"` submit** (not just at the `"email"` step) — mostly a defensive re-check by the time a real user reaches it, since the `"email"` step has already validated format once.
- **Offline feedback is generic, not field-specific** — step 1 of `authenticateUser` shows a connectivity toast (via `checkInternetConnection()`) but never a field-level `email`/`password` error.
- **`AuthButton.tsx` links to a nonexistent `/auth/login` route** (should be `/auth/signin`), and its `window.location.pathname`-based mode inference has no clean equivalent under the unified flow — fix both before wiring this component into a page.
- **No server-side format check on `name`** — `signupSchema` (`apps/api`) only validates `email`/`password` and `.passthrough()`-accepts everything else, so `nameRegex` is a client-only gate; a direct API call (curl, a future non-web client) can still write a name containing digits/punctuation. Low risk today since `name` isn't used anywhere security-sensitive, but worth knowing if that changes.

## If you're asked to...

- **"Fix a sign-in/sign-up bug users are hitting"** → almost certainly `hooks/useAuth.ts` or `pages/Auth.tsx`; `useValidation.ts`/`useFormLogic.ts` are not in the live path.
- **"Add a club-specific signup field" (tagline, description, address, etc.)** → the live `Auth.tsx` collects none of these today. Converge on `useValidation.ts` + `useFormLogic.ts` + `clubInitialFormState` as the target design rather than inventing new field-handling from scratch; you'll need to actually wire `useFormLogic` into `Auth.tsx`'s `"signup"` step (or a new step) to make it live.
- **"Standardize the password show/hide toggle"** → adopt `utils/PasswordToggle.ts` instead of leaving `Auth.tsx` with its own inline copy.
- **"Make the Google button match the shared Button style"** → `Auth.tsx` currently uses a raw `<button className="btn authpage_oauth">`, not the shared `Button` component; ui-kit.md's shared `Button` supports an `onClickfunction` prop pattern to follow if you convert it.
- **"Centralize logout"** → out of scope for this folder; see `docs/specs/state-management.md` and the three call sites listed there.
