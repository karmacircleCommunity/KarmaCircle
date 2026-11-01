# State Management

Three separate mechanisms hold state in this app, each for a different purpose.
Redux `user.isLoggedIn` is the frontend's authentication-state source of truth.
The backend cookie is validated at startup and by authenticated API calls; frontend code does not read the `Token` cookie.

## 1. Redux (the logged-in user's profile)

- Store: [apps/web/src/app/store/store.ts](../../apps/web/src/app/store/store.ts).
  A single root reducer (`combineReducers({ user: userReducer })`) wrapped in `redux-persist`'s `persistReducer` (key `"root"`, storage = `localStorage`, `version: 1`, no migrations configured).
  `serializableCheck` is disabled in the middleware.
- Slice: [apps/web/src/app/store/slices/userSlice.ts](../../apps/web/src/app/store/slices/userSlice.ts).
  State shape starts as `{ isLoggedIn: false }` and grows dynamically — `updateUserData` merges (`{ ...state, ...action.payload }`) whatever the backend returns for the user object (name, email, userType, description, address, config, etc.) directly into the top level of `state.user`.
  There is no fixed schema; every consumer reads optional fields defensively with `?.`.
- Actions: `updateUserData(payload)` merges fields in; `toggleUserLogin()` flips `isLoggedIn`; `resetUserData()` resets to the initial `{ isLoggedIn: false }` (used on logout).
- Selectors: `selectIsLoggedIn(state)` → `state.user.isLoggedIn`, `selectUser(state)` → `state.user`.
  Some components use these selectors, others do `useSelector((state) => state.user)` or `useSelector((state) => state.user.isLoggedIn)` directly — both work, prefer the selectors in new code.

**Where it's written:**
- [useAuth.ts](../../apps/web/src/features/authentication/hooks/useAuth.ts) — on successful sign-in/sign-up, dispatches `updateUserData({ ...response.data.user, isLoggedIn: true })`.
- [Home.tsx](../../apps/web/src/features/landing-home/pages/Home.tsx) — after a Google OAuth redirect completes, dispatches `updateUserData(...)` then `toggleUserLogin()` (two separate dispatches, not one).
- [Navbar.tsx](../../apps/web/src/components/Navbar.tsx) — on logout, dispatch `resetUserData()`.

## 2. Zustand (`useAuthStore`)

[apps/web/src/app/store/useAuth.ts](../../apps/web/src/app/store/useAuth.ts) is a single Zustand store holding exactly one field: `isLoading` (boolean) and its setter `toggleLoading(loading)`.
It exists purely to drive button spinners/disabled states in older or unrouted form flows — [useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts), [AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx), and the unrouted [UserProfile.tsx](../../apps/web/src/features/onboarding-profile/pages/UserProfile.tsx).
Despite the name, it has nothing to do with authentication state itself — only with in-flight loading UI.

There is no Zustand store for user/session data; all of that goes through Redux.

## 3. Cookies (`js-cookie`)

The frontend reads the OAuth kickoff flag and, in one event-directory UI condition, the `Token` cookie.
The API also uses `Token` for server-side authentication; it is not a reliable frontend session check because the Google OAuth cookie is httpOnly.
Cookies actually read in the frontend:

| Cookie | Read in | Purpose |
|---|---|---|
| `Token` | `Events.tsx` | Combined with Redux login state and organization account type to show the create-event control |
| `OAuthLoginInitiated` | `Home.tsx` | Set by the backend/redirect flow before bouncing back from Google OAuth; its presence triggers `successCallback()` |

The unrouted `UserProfile.tsx` prototype reads its owner identity from Redux; it does not read a cookie.

`Navbar.tsx` clears local storage and dispatches `resetUserData()` on logout.
The deleted sparse profile page no longer writes or clears a completion-bypass cookie.

## Authentication checks across routed UI

`Navbar.tsx`, `DonotRenderWhenLoggedIn.tsx`, and `RequireSignIn.tsx` use Redux's `selectIsLoggedIn` for frontend state.
`Events.tsx` additionally checks `Cookies.get("Token")` before showing its organization-only create-event control.
That cookie check can differ between email/password and Google OAuth because the Google OAuth token cookie is httpOnly.
Backend routes remain responsible for enforcing authorization regardless of whether a frontend control is shown.

Follow [AGENTS.md](../../AGENTS.md)'s current rule when adding a new auth-gated control; this section records the implementation as it exists today.

## Session validity after rehydration

Persisted `isLoggedIn` remembers login; it does not prove the server cookie remains valid.
`SessionBootstrap` verifies remembered login through `GET /user/profile` before mounting the app.
A 401 from startup verification, a later shared-fetcher read, or `updateUserProfile()` resets the existing user slice through `clearRejectedSession()`.
Network and 5xx errors do not clear login.
The `Token` cookie is not used to determine persisted login state; authenticated API requests send it to the backend.
