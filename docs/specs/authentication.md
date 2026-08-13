# Authentication

Covers sign in, sign up, Google OAuth, logout, and the route guard that keeps logged-in users off the auth pages.
For where the resulting session state is stored, see [state-management.md](./state-management.md).

## Pages

- [src/features/authentication/pages/SignIn.jsx](../../src/features/authentication/pages/SignIn.jsx) — email + password form.
- [src/features/authentication/pages/SignUp.jsx](../../src/features/authentication/pages/SignUp.jsx) — name + email + password form, plus an "Individual" vs "Organization" (`userType`) toggle built with `react-select` (desktop label: "Account Type" dropdown) and a separate custom checkbox-styled toggle (the `.status-switch` div) on the right-hand panel — two different UI controls that both flip the same `userType` state, shown at different breakpoints.
- Both pages share `./index.scss` and mount `<Navbar />` at the top but no `<Footer />`.
- Both are lazy-loaded in [routesConfig.jsx](../../src/app/routes/routesConfig.jsx) and wrapped in `DonotRenderWhenLoggedIn` (see below).

## The `useAuth` hook

[src/features/authentication/hooks/useAuth.js](../../src/features/authentication/hooks/useAuth.js) is the single entry point both pages call: `useAuth("signin")` or `useAuth("signup")`.
It returns `{ authenticateUser, loading }`.

`authenticateUser(credentials, setErrors)` does, in order:
1. Bails out (no-op) if `checkInternetConnection()` reports offline.
2. Validates `credentials.email` against `emailRegex` from `static/Constants.js`. On failure, sets a field-level error via `setErrors` and returns — **this also runs on sign-in**, not just sign-up.
3. Validates `credentials.password` against an inline regex requiring 8+ chars, at least one digit, one lowercase, one uppercase letter. Same behavior: applies on sign-in too, so an existing user whose password predates this rule (or simply doesn't match the pattern for a `signin` typo) will get a client-side "password" error even though the backend would have rejected it anyway. This client check happens before any network call is made.
4. Sets `loading = true`, then calls `LoginUser(credentials)` or `RegisterUser({ ...credentials, userType: credentials.userType.value })` from `MilanApi.js`. Note `userType` is only unwrapped from its `react-select` `{value, label}` shape for sign-up.
5. On `response.status` 200/201: shows a success toast, dispatches `updateUserData({ ...response.data.user, isLoggedIn: true })` to Redux, then after a fixed 1000ms `setTimeout`, navigates to `/` and clears `loading`.
6. Otherwise: shows an error toast with `response?.data?.message` and clears `loading`.

Both `SignIn` and `SignUp` disable their submit `<Button>` while `loading` is true or while any required field is empty, and show a `ClipLoader` spinner via the shared `Button` component's `isLoading` prop.

## Field-level validation display

Neither page uses [useValidation.js](../../src/features/authentication/hooks/useValidation.js) — that hook is a much more thorough validator (see below) that's actually wired into [useFormLogic.js](../../src/features/authentication/hooks/useFormLogic.js), a hook that no page currently calls (see [known-issues.md](./known-issues.md)).
`SignIn`/`SignUp` instead just render whatever `errors.email`/`errors.password` the two checks inside `useAuth.authenticateUser` set, directly under each input as a `<p>`.

## `useValidation.js` and `useFormLogic.js` (currently unused by any page)

[src/features/authentication/hooks/useValidation.js](../../src/features/authentication/hooks/useValidation.js) is a much richer form validator supporting both an "individual" signup shape and a "club" signup shape (name/tagline/description length bounds, slug format rules, address/pincode checks, website URL format).
It returns an array of `{ error, message, field }` objects, or `{ error: false, message: "" }` if clean.
[src/features/authentication/hooks/useFormLogic.js](../../src/features/authentication/hooks/useFormLogic.js) wraps a generic submit handler around this validator, driven by the Zustand `isLoading` flag, and exports two ready-made initial-state shapes: `individualInitialFormState` and `clubInitialFormState`.
Together these look like the intended, more complete signup flow (with club-specific fields like `tagLine`) — but `SignUp.jsx` does not use either of them today.
Treat this pair as the design to converge toward if you're asked to build out full club-signup fields, not as dead code to delete without checking with the team first.

## Google OAuth

`handleGoogle()` on both auth pages calls `GoogleAuth()` (`MilanApi.js`, `GET /auth/google`) and full-page-redirects (`window.location.href = response`) to the URL the backend returns.
The backend is expected to redirect back to the frontend after auth and set an `OAuthLoginInitiated` cookie; [Home.jsx](../../src/features/landing-home/pages/Home.jsx) checks for that cookie on mount and, if present, calls `successCallback()` (`GET /auth/login/success`) to fetch the now-authenticated user and dispatch `updateUserData(...)` + `toggleUserLogin()` into Redux.
This means a Google sign-in only "completes" on the frontend if the user lands back on `/` — landing anywhere else after the OAuth redirect would skip this step.

## Logout

`Logout()` (`MilanApi.js`, `GET /auth/logout`) is called from three places with three slightly different cleanup sequences: `Navbar.jsx`, `Profile.jsx`, and `UserProfile.jsx`.
All three dispatch `resetUserData()` on success; `Navbar.jsx` additionally calls `localStorage.clear()`, `Profile.jsx` additionally calls `Cookies.remove("skipProfileCompletion")`, and `UserProfile.jsx` does neither extra step but does toggle the Zustand `isLoading` flag around the call.
There is no shared `useLogout()` hook — consider extracting one if you need to touch this again, so the cleanup steps stay consistent.

## Route guard: `DonotRenderWhenLoggedIn`

[src/features/authentication/components/DonotRenderWhenLoggedIn.jsx](../../src/features/authentication/components/DonotRenderWhenLoggedIn.jsx) is a HOC (`DonotRenderWhenLoggedIn(Component)`) applied to `SignIn` and `SignUp` in `routesConfig.jsx`.
It redirects to `/` (`<Navigate to="/" />`) if both `Cookies.get("Token")` and the Redux `isLoggedIn` selector are truthy; otherwise it renders the wrapped component.
It does not protect any other route — there is currently no equivalent "require login" guard for e.g. `/dashboard`, which is reachable by URL regardless of auth state (pages that need a logged-in user instead fetch data scoped to the session cookie and render whatever comes back, including nothing).

## Small auth-adjacent utilities

- [PasswordToggle.js](../../src/features/authentication/utils/PasswordToggle.js) exports `passwordToggle`/`confirmPasswordToggle`, simple `"password" ↔ "text"` togglers for an input's `type`. Not currently used by `SignIn`/`SignUp` — those pages inline their own `showPassword` state and swap `FaEye`/`FaEyeSlash` icons directly instead.
- [RenderErrorMessage.jsx](../../src/features/authentication/components/RenderErrorMessage.jsx) exports `renderErrorMessage(fieldName, formState)`, meant to render all `formState.errors` matching a given field (the shape `useValidation.js` produces). Only meaningful once a page adopts `useValidation`/`useFormLogic`; not used by the current `SignIn`/`SignUp`.
- [AuthButton.jsx](../../src/features/authentication/components/AuthButton.jsx) is a reusable "Sign In ⇄ Sign Up" submit button + toggle link that infers which mode it's in from `window.location.pathname`. Not currently rendered by `SignIn.jsx`/`SignUp.jsx` (they build their own submit button and toggle link inline) — it appears to be an earlier version of the same UI.
