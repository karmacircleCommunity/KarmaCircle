# Authentication

Covers sign in, sign up, Google OAuth, logout, and the route guard that keeps logged-in users off the auth pages.
For where the resulting session state is stored, see [state-management.md](./state-management.md).

## Pages

- [apps/web/src/features/authentication/pages/SignIn.tsx](../../apps/web/src/features/authentication/pages/SignIn.tsx) — email + password form.
- [apps/web/src/features/authentication/pages/SignUp.tsx](../../apps/web/src/features/authentication/pages/SignUp.tsx) — a two-step form: step 1 picks "Individual" vs "Organization" (`userType`, one shared tab control at every breakpoint — the old pair of a `react-select` dropdown and a separate `.status-switch` checkbox toggle described below no longer exists) and collects `email`; step 2 collects `name`/`password`. See "Step 1: email + live duplicate check" and "Step 2: name + password" below for what runs before either step can advance.
- Both pages share the same Tailwind utility classes (matching visual layout, no shared stylesheet — the `.status-switch` toggle's pseudo-element/`content: attr(...)` styling lives as hand-written global CSS in `apps/web/src/styles/index.css` since Tailwind's scanner can't reach it) and mount `<Navbar />` at the top but no `<Footer />`.
- Both are lazy-loaded in [routesConfig.tsx](../../apps/web/src/app/routes/routesConfig.tsx) and wrapped in `DonotRenderWhenLoggedIn` (see below).

## The `useAuth` hook

[apps/web/src/features/authentication/hooks/useAuth.ts](../../apps/web/src/features/authentication/hooks/useAuth.ts) is the single entry point both pages call: `useAuth("signin")` or `useAuth("signup")`.
It returns `{ authenticateUser, loading }`.

`authenticateUser(credentials, setErrors)` does, in order:
1. Bails out (no-op) if `checkInternetConnection()` reports offline.
2. Validates `credentials.email` via `validateEmail()` (`features/authentication/utils/validateEmail.ts` — a thin wrapper around `emailRegex` from `static/Constants.ts`, and the single place every email check in this feature goes through: `SignIn`, `SignUp`'s step 1, and this hook). On failure, sets a field-level error via `setErrors` and returns — **this also runs on sign-in**, not just sign-up.
3. Validates `credentials.password` against `passwordRegex` (`static/Constants.ts` — 8+ chars, at least one digit, one lowercase, one uppercase letter; exported so `SignUp.tsx`'s live strength meter can read the same rule, see below). Same behavior: applies on sign-in too, so an existing user whose password predates this rule (or simply doesn't match the pattern for a `signin` typo) will get a client-side "password" error even though the backend would have rejected it anyway. This client check happens before any network call is made.
4. Sets `loading = true`, then calls `LoginUser(credentials)` or `RegisterUser({ ...credentials, userType: credentials.userType.value })` from `MilanApi.ts`. Note `userType` is only unwrapped from its `react-select` `{value, label}` shape for sign-up.
5. On `response.status` 200/201: shows a success toast, dispatches `updateUserData({ ...response.data.user, isLoggedIn: true })` to Redux, then after a fixed 1000ms `setTimeout`, navigates to `/` and clears `loading`.
6. Otherwise: shows an error toast with `response?.data?.message` and clears `loading`. On sign-up specifically, if that message is exactly the backend's `409 USER_ALREADY_EXISTS` text, also sets `errors.email` to it (see `SignUp`'s step 1 below) so the form has somewhere to show it inline, as a fallback for the case where the live check-email call (below) didn't already catch the duplicate.

Both `SignIn` and `SignUp` disable their submit `<Button>` while `loading` is true or while any required field is empty, and show a `ClipLoader` spinner via the shared `Button` component's `isLoading` prop.

## `SignUp`'s two-step flow

**Step 1 (email + account type):** validates `credentials.email` via the same shared `validateEmail()` (`features/authentication/utils/validateEmail.ts`) `SignIn.tsx`/`useAuth.ts` use, then — if the format passes — calls `CheckEmailExists(email)` (`MilanApi.ts`, `GET /auth/check-email`, no auth) before advancing to step 2. The "Continue" button is disabled whenever `credentials.email` is empty **or** fails `validateEmail()` — a malformed but non-empty address (e.g. `tamal@semen333`, no TLD) can't even be clicked through, not just rejected after the fact — and shows a loading state while the check-email call is in flight. If the backend reports `{ exists: true }`, the form stays on step 1, sets `errors.email` to the same `USER_ALREADY_EXISTS` copy the backend's signup 409 uses, and renders a "Log in instead" link to `/auth/signin` next to it. If the check-email call fails or is unreachable, the form fails open and advances to step 2 anyway — a genuine duplicate is still caught by `signup`'s own 409 at final submit (see `useAuth.ts` step 6 above), so a flaky check shouldn't be the thing blocking signup.

`SignIn.tsx` applies the same `validateEmail()` check to its own submit button's disabled state (in addition to `useAuth.ts`'s existing submit-time check), for the identical reason: a non-empty, obviously-malformed email shouldn't leave "Sign In" clickable.

**Step 2 (name + password):** before calling `authenticateUser`, the form trims `credentials.name` and validates it against `nameRegex` (`static/Constants.ts` — letters and single spaces only, no digits or punctuation); on failure it sets `errors.name` and does not call `authenticateUser` at all. The name input also strips any non-letter/space character out of every keystroke (and pasted text) as it's typed, so invalid characters never actually appear in the field rather than only being rejected on submit. The actual pass/fail gate on the password is still `useAuth.ts`'s `passwordRegex` check (see above) — `SignUp.tsx` additionally renders a live strength meter (`getPasswordStrength`, same file) under the password field as the user types: "Weak" (doesn't yet meet `passwordRegex`'s 8-char/upper/lower/digit minimum), "Medium" (meets it), or "Strong" (meets it, 12+ chars, and has a symbol) — a UX hint layered on top of the one real rule, not a second gate.

## Field-level validation display

Neither page uses [useValidation.ts](../../apps/web/src/features/authentication/hooks/useValidation.ts) — that hook is a much more thorough validator (see below) that's actually wired into [useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts), a hook that no page currently calls (see [known-issues.md](./known-issues.md)).
`SignIn`/`SignUp` instead just render whatever `errors.email`/`errors.password` the checks inside `useAuth.authenticateUser` set (plus `errors.name`, set locally by `SignUp`'s own step-2 check above — `useAuth.ts` never touches `name`), directly under each input as a `<p>`.

## `useValidation.ts` and `useFormLogic.ts` (currently unused by any page)

[apps/web/src/features/authentication/hooks/useValidation.ts](../../apps/web/src/features/authentication/hooks/useValidation.ts) is a much richer form validator supporting both an "individual" signup shape and a "club" signup shape (name/tagline/description length bounds, slug format rules, address/pincode checks, website URL format).
It returns an array of `{ error, message, field }` objects, or `{ error: false, message: "" }` if clean.
[apps/web/src/features/authentication/hooks/useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts) wraps a generic submit handler around this validator, driven by the Zustand `isLoading` flag, and exports two ready-made initial-state shapes: `individualInitialFormState` and `clubInitialFormState`.
Together these look like the intended, more complete signup flow (with club-specific fields like `tagLine`) — but `SignUp.tsx` does not use either of them today.
Treat this pair as the design to converge toward if you're asked to build out full club-signup fields, not as dead code to delete without checking with the team first.

## Google OAuth

`handleGoogle()` on both auth pages calls `GoogleAuth()` (`MilanApi.ts`, `GET /auth/google`) and full-page-redirects (`window.location.href = response`) to the URL the backend returns.
The backend is expected to redirect back to the frontend after auth and set an `OAuthLoginInitiated` cookie; [Home.tsx](../../apps/web/src/features/landing-home/pages/Home.tsx) checks for that cookie on mount and, if present, calls `successCallback()` (`GET /auth/login/success`) to fetch the now-authenticated user and dispatch `updateUserData(...)` + `toggleUserLogin()` into Redux.
This means a Google sign-in only "completes" on the frontend if the user lands back on `/` — landing anywhere else after the OAuth redirect would skip this step.

## Logout

`Logout()` (`MilanApi.ts`, `GET /auth/logout`) is called from three places with three slightly different cleanup sequences: `Navbar.tsx`, `Profile.tsx`, and `UserProfile.tsx`.
All three dispatch `resetUserData()` on success; `Navbar.tsx` additionally calls `localStorage.clear()`, `Profile.tsx` additionally calls `Cookies.remove("skipProfileCompletion")`, and `UserProfile.tsx` does neither extra step but does toggle the Zustand `isLoading` flag around the call.
There is no shared `useLogout()` hook — consider extracting one if you need to touch this again, so the cleanup steps stay consistent.

## Route guard: `DonotRenderWhenLoggedIn`

[apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx](../../apps/web/src/features/authentication/components/DonotRenderWhenLoggedIn.tsx) is a HOC (`DonotRenderWhenLoggedIn(Component)`) applied to `SignIn` and `SignUp` in `routesConfig.tsx`.
It redirects to `/` (`<Navigate to="/" />`) if both `Cookies.get("Token")` and the Redux `isLoggedIn` selector are truthy; otherwise it renders the wrapped component.
It does not protect any other route — there is currently no equivalent "require login" guard for e.g. `/dashboard`, which is reachable by URL regardless of auth state (pages that need a logged-in user instead fetch data scoped to the session cookie and render whatever comes back, including nothing).

## Small auth-adjacent utilities

- [PasswordToggle.ts](../../apps/web/src/features/authentication/utils/PasswordToggle.ts) exports `passwordToggle`/`confirmPasswordToggle`, simple `"password" ↔ "text"` togglers for an input's `type`. Not currently used by `SignIn`/`SignUp` — those pages inline their own `showPassword` state and swap `FaEye`/`FaEyeSlash` icons directly instead.
- [RenderErrorMessage.tsx](../../apps/web/src/features/authentication/components/RenderErrorMessage.tsx) exports `renderErrorMessage(fieldName, formState)`, meant to render all `formState.errors` matching a given field (the shape `useValidation.ts` produces). Only meaningful once a page adopts `useValidation`/`useFormLogic`; not used by the current `SignIn`/`SignUp`.
- [AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx) is a reusable "Sign In ⇄ Sign Up" submit button + toggle link that infers which mode it's in from `window.location.pathname`. Not currently rendered by `SignIn.tsx`/`SignUp.tsx` (they build their own submit button and toggle link inline) — it appears to be an earlier version of the same UI.

## Types

This entire folder is TypeScript. See [authentication/SPEC.md](../../apps/web/src/features/authentication/SPEC.md#types) for the full breakdown — the feature's own `AuthType`/`Credentials`/`SignupFormState` types, the shared `UserType`/`AuthTypeOption` in `apps/web/src/types/user.ts`, and the sibling `.d.ts` files (`Constants.d.ts`, `Toasts.d.ts`, `Button.d.ts`) added to type a few untouched JS dependencies at the boundary.
