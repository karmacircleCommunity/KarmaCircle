# Authentication

Covers sign in, sign up, Google OAuth, logout, and the route guard that keeps logged-in users off the auth page.
For where the resulting session state is stored, see [state-management.md](./state-management.md).

## One unified flow, two entry routes

There is a single page, [apps/web/src/features/authentication/pages/Auth.tsx](../../apps/web/src/features/authentication/pages/Auth.tsx), that handles both signing in and signing up.
It is lazy-loaded and mounted at both `/auth/signin` and `/auth/signup` in [routesConfig.tsx](../../apps/web/src/app/routes/routesConfig.tsx), wrapped in `DonotRenderWhenLoggedIn` (see below).
Both routes are kept only so existing links/bookmarks to either still work — which route a visitor arrives on has no effect on the flow itself, since the page always starts at the same first step.

The flow has three steps, tracked as local state (`step: "email" | "signin" | "signup"`), not three separate pages:

1. **`"email"`** — the only step every visitor sees first, regardless of which route they landed on. Choose "Individual" or "Organization" (`userType`, one shared tab control — defaults to "Individual"), enter an email, and press Continue.
2. Continue calls `CheckEmailExists(email)` (`MilanApi.ts`, `GET /auth/check-email`, no auth). If the backend reports the email already has an account, the flow advances to **`"signin"`**; otherwise it advances to **`"signup"`**. If the check itself fails or is unreachable, the flow fails open to `"signup"` — a genuine duplicate is still caught by the signup submit's own 409 (see `useAuth.ts` below).
3. **`"signin"`** shows the email, already filled in and disabled (not editable — a Back button returns to `"email"` to change it), plus a password field and a "Sign In" button.
4. **`"signup"`** shows the same disabled, pre-filled email, plus a name field (labeled "Full name" or "Organization name" depending on the step-1 tab choice) and a password field with a live strength meter, and a "Sign Up" button.

Neither of steps 2/3 renders a "Don't have an account? Sign up" / "Already have an account? Log in" link — the point of checking the email first is that the visitor never has to make that choice themselves.
A duplicate the live check missed (e.g. a race with another signup for the same email) can still come back from the final signup submit as a 409; `useAuth.ts` maps that onto `errors.email`, and the page reacts by stepping back to `"email"` so the error has somewhere to render.

## The `useAuth` hook

[apps/web/src/features/authentication/hooks/useAuth.ts](../../apps/web/src/features/authentication/hooks/useAuth.ts) is the single entry point `Auth.tsx` calls for the final submit on both the `"signin"` and `"signup"` steps: `useAuth("signin")` or `useAuth("signup")`, selected by whichever step the flow is currently on.
It returns `{ authenticateUser, loading }`.

`authenticateUser(credentials, setErrors)` does, in order:
1. Bails out (no-op) if `checkInternetConnection()` reports offline.
2. Validates `credentials.email` via `validateEmail()` (`features/authentication/utils/validateEmail.ts` — a thin wrapper around `emailRegex` from `static/Constants.ts`). On failure, sets a field-level error via `setErrors` and returns.
3. Validates `credentials.password`, differently per `authType`:
   - **Sign-in:** only checks the field is non-empty (`"Password is required"` on failure). Actual credential correctness is left entirely to the backend's `LoginUser` response.
   - **Sign-up:** checks `credentials.password` against `passwordRegex` (`static/Constants.ts` — 8+ chars, at least one digit, one lowercase, one uppercase letter; exported so `Auth.tsx`'s live strength meter can read the same rule).
   Either way, this client check happens before any network call is made.
4. Sets `loading = true`, then calls `LoginUser(credentials)` or `RegisterUser({ ...credentials, userType: credentials.userType.value })` from `MilanApi.ts`. `userType` is only unwrapped from its `{value, label}` shape for sign-up.
5. On `response.status` 200/201: shows a success toast, dispatches `updateUserData({ ...response.data.user, isLoggedIn: true })` to Redux, then after a fixed 1000ms `setTimeout`, navigates to `/` and clears `loading`.
6. Otherwise: shows an error toast with `response?.data?.message` and clears `loading`. On sign-up specifically, if that message is exactly the backend's `409 USER_ALREADY_EXISTS` text, also sets `errors.email` to it — see "the `"signup"` step reverting to `"email"`" above.

`Auth.tsx` disables the current step's submit `<Button>` while `loading` is true or while any required field for that step is empty, and shows a `ClipLoader` spinner via the shared `Button` component's `isLoading` prop.

## The `"email"` step's live duplicate check

Validates `credentials.email` via the same shared `validateEmail()` (`features/authentication/utils/validateEmail.ts`), then — if the format passes — calls `CheckEmailExists(email)` before deciding which of `"signin"`/`"signup"` to advance to. The Continue button is disabled whenever `credentials.email` is empty **or** fails `validateEmail()` — a malformed but non-empty address (e.g. `tamal@semen333`, no TLD) can't even be clicked through — and shows a loading state while the check-email call is in flight.

## The `"signup"` step

Before calling `authenticateUser`, the form trims `credentials.name` and validates it against `nameRegex` (`static/Constants.ts` — letters and single spaces only, no digits or punctuation); on failure it sets `errors.name` and does not call `authenticateUser` at all. The name input also strips any non-letter/space character out of every keystroke (and pasted text) as it's typed. The actual pass/fail gate on the password is still `useAuth.ts`'s `passwordRegex` check — `Auth.tsx` additionally renders a live strength meter (`getPasswordStrength`, same file) under the password field: "Weak" (doesn't yet meet `passwordRegex`'s 8-char/upper/lower/digit minimum), "Medium" (meets it), or "Strong" (meets it, 12+ chars, and has a symbol) — a UX hint layered on top of the one real rule, not a second gate.

## Field-level validation display

Neither this page nor `useAuth.ts` uses [useValidation.ts](../../apps/web/src/features/authentication/hooks/useValidation.ts) — that hook is a much more thorough validator (see below) that's actually wired into [useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts), a hook nothing currently calls (see [known-issues.md](./known-issues.md)).
`Auth.tsx` instead just renders whatever `errors.email`/`errors.password` the checks inside `useAuth.authenticateUser` set (plus `errors.name`, set locally by the `"signup"` step's own check above), directly under each input as a `<p>`.

## `useValidation.ts` and `useFormLogic.ts` (currently unused)

[apps/web/src/features/authentication/hooks/useValidation.ts](../../apps/web/src/features/authentication/hooks/useValidation.ts) is a much richer form validator supporting both an "individual" signup shape and a "club" signup shape (name/tagline/description length bounds, slug format rules, address/pincode checks, website URL format).
It returns an array of `{ error, message, field }` objects, or `{ error: false, message: "" }` if clean.
[apps/web/src/features/authentication/hooks/useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts) wraps a generic submit handler around this validator, driven by the Zustand `isLoading` flag, and exports two ready-made initial-state shapes: `individualInitialFormState` and `clubInitialFormState`.
Together these look like the intended, more complete signup flow (with club-specific fields like `tagLine`) — but `Auth.tsx` does not use either of them today.
Treat this pair as the design to converge toward if you're asked to build out full club-signup fields, not as dead code to delete without checking with the team first.

## Google OAuth

`handleGoogle()`, rendered only on the `"email"` step (it's a parallel entry point, not something layered onto the password/name steps), calls `GoogleAuth()` (`MilanApi.ts`, `GET /auth/google`) and full-page-redirects (`window.location.href = response`) to the URL the backend returns.
The backend is expected to redirect back to the frontend after auth and set an `OAuthLoginInitiated` cookie; [Home.tsx](../../apps/web/src/features/landing-home/pages/Home.tsx) checks for that cookie on mount and, if present, calls `successCallback()` (`GET /auth/login/success`) to fetch the now-authenticated user and dispatch `updateUserData(...)` + `toggleUserLogin()` into Redux.
This means a Google sign-in only "completes" on the frontend if the user lands back on `/` — landing anywhere else after the OAuth redirect would skip this step.

## Logout

`Logout()` (`MilanApi.ts`, `GET /auth/logout`) is called from three places with three slightly different cleanup sequences: `Navbar.tsx`, `Profile.tsx`, and `UserProfile.tsx`.
All three dispatch `resetUserData()` on success; `Navbar.tsx` additionally calls `localStorage.clear()`, `Profile.tsx` additionally calls `Cookies.remove("skipProfileCompletion")`, and `UserProfile.tsx` does neither extra step but does toggle the Zustand `isLoading` flag around the call.
There is no shared `useLogout()` hook — consider extracting one if you need to touch this again, so the cleanup steps stay consistent.

## Route guard: `DonotRenderWhenLoggedIn`

[apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx](../../apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx) is a HOC (`DonotRenderWhenLoggedIn(Component)`) applied to `Auth` for both `/auth/signin` and `/auth/signup` in `routesConfig.tsx`.
It redirects to `/` (`<Navigate to="/" />`) if both `Cookies.get("Token")` and the Redux `isLoggedIn` selector are truthy; otherwise it renders the wrapped component.
It does not protect any other route — there is currently no equivalent "require login" guard for e.g. `/dashboard`, which is reachable by URL regardless of auth state.

## Small auth-adjacent utilities

- [PasswordToggle.ts](../../apps/web/src/features/authentication/utils/PasswordToggle.ts) exports `passwordToggle`/`confirmPasswordToggle`, simple `"password" ↔ "text"` togglers for an input's `type`. Not currently used by `Auth.tsx` — it inlines its own `showPassword` state and swaps `FaEye`/`FaEyeSlash` icons directly instead.
- [RenderErrorMessage.tsx](../../apps/web/src/features/authentication/components/RenderErrorMessage.tsx) exports `renderErrorMessage(fieldName, formState)`, meant to render all `formState.errors` matching a given field (the shape `useValidation.ts` produces). Only meaningful once a page adopts `useValidation`/`useFormLogic`; not used by `Auth.tsx`.
- [AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) is a reusable "Sign In ⇄ Sign Up" submit button + toggle link that infers which mode it's in from `window.location.pathname`. Not currently rendered by `Auth.tsx` (it builds its own submit button inline, and doesn't need a mode-toggle link at all now that the flow decides the mode itself) — it appears to be an earlier version of the same UI.

## Types

This entire folder is TypeScript. See [authentication/SPEC.md](../../apps/web/src/features/authentication/SPEC.md#types) for the full breakdown — the feature's own `AuthType`/`Credentials`/`SignupFormState` types, and the shared `UserType`/`AuthTypeOption` in `apps/web/src/types/user.ts`.
