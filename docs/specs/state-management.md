# State Management

Three separate mechanisms hold state in this app, each for a different purpose.
There is no single source of truth for "is the user logged in" — that fact is checked three different ways depending on the file (see the "isLoggedIn checks" section below), which is worth knowing before you touch auth-gated UI.

## 1. Redux (the logged-in user's profile)

- Store: [src/app/store/store.ts](../../src/app/store/store.ts).
  A single root reducer (`combineReducers({ user: userReducer })`) wrapped in `redux-persist`'s `persistReducer` (key `"root"`, storage = `localStorage`, `version: 1`, no migrations configured).
  `serializableCheck` is disabled in the middleware.
- Slice: [src/app/store/slices/userSlice.ts](../../src/app/store/slices/userSlice.ts).
  State shape starts as `{ isLoggedIn: false }` and grows dynamically — `updateUserData` merges (`{ ...state, ...action.payload }`) whatever the backend returns for the user object (name, email, userType, description, address, config, etc.) directly into the top level of `state.user`.
  There is no fixed schema; every consumer reads optional fields defensively with `?.`.
- Actions: `updateUserData(payload)` merges fields in; `toggleUserLogin()` flips `isLoggedIn`; `resetUserData()` resets to the initial `{ isLoggedIn: false }` (used on logout).
- Selectors: `selectIsLoggedIn(state)` → `state.user.isLoggedIn`, `selectUser(state)` → `state.user`.
  Some components use these selectors, others do `useSelector((state) => state.user)` or `useSelector((state) => state.user.isLoggedIn)` directly — both work, prefer the selectors in new code.

**Where it's written:**
- [useAuth.ts](../../src/features/authentication/hooks/useAuth.ts) — on successful sign-in/sign-up, dispatches `updateUserData({ ...response.data.user, isLoggedIn: true })`.
- [Home.tsx](../../src/features/landing-home/pages/Home.tsx) — after a Google OAuth redirect completes, dispatches `updateUserData(...)` then `toggleUserLogin()` (two separate dispatches, not one).
- [Profile.tsx](../../src/features/onboarding-profile/pages/Profile.tsx) and [Navbar.tsx](../../src/components/navbar/Navbar.tsx) — on logout, dispatch `resetUserData()`.
- [Dashboard.tsx](../../src/features/dashboard/pages/Dashboard.tsx) — on every SWR fetch of `userEndpoints.profile`, re-dispatches `updateUserData(data?.user)` in the `onSuccess` callback, keeping Redux in sync with the latest server copy.

## 2. Zustand (`useAuthStore`)

[src/app/store/useAuth.ts](../../src/app/store/useAuth.ts) is a single Zustand store holding exactly one field: `isLoading` (boolean) and its setter `toggleLoading(loading)`.
It exists purely to drive button spinners/disabled states for form submissions that live outside the `useAuth` hook's own local `loading` state — e.g. [useFormLogic.ts](../../src/features/authentication/hooks/useFormLogic.ts), [AuthButton.tsx](../../src/features/authentication/components/AuthButton.tsx), [UserProfile.tsx](../../src/features/onboarding-profile/pages/UserProfile.tsx).
Despite the name, it has nothing to do with authentication state itself — only with in-flight loading UI.

There is no Zustand store for user/session data; all of that goes through Redux.

## 3. Cookies (`js-cookie`)

A `Token` cookie and other flags are read directly with `Cookies.get(...)` in several places, presumably set by the backend as an httpOnly-adjacent or client-visible cookie on login (cookie-setting itself happens server-side; the frontend never calls `Cookies.set` for `Token`).
Cookies actually read in the frontend:

| Cookie | Read in | Purpose |
|---|---|---|
| `Token` | `Navbar.tsx`, `DonotRenderWhenLoggedIn.tsx` | Presence used as a login signal, combined with the Redux `isLoggedIn` flag |
| `skipProfileCompletion` | `Profile.tsx` | If set, suppresses the profile-completion modal even if fields are missing |
| `userName` | `UserProfile.tsx` | Compared against the route's `:slug` param to decide if the viewer owns the profile |
| `isLoggedIn` | `Donate.tsx` | Gate for the (currently unrouted) donate page — see [donate-shop-trending.md](./donate-shop-trending.md) |
| `OAuthLoginInitiated` | `Home.tsx` | Set presumably by the backend/redirect flow before bouncing back from Google OAuth; its presence triggers `successCallback()` |

`Cookies.remove("skipProfileCompletion")` and `localStorage.clear()` are both called on logout (in `Profile.tsx` and `Navbar.tsx` respectively) alongside `resetUserData()` — three different mechanisms cleaned up in three different places, not one central "logout" utility.

## "Is the user logged in?" — three different checks in the wild

1. `useSelector(selectIsLoggedIn)` — Redux only (used by `DonotRenderWhenLoggedIn`, `Landing.tsx`).
2. `Cookies.get("Token") && isLoggedIn` — cookie presence *and* Redux flag together (used by `Navbar.tsx`, `DonotRenderWhenLoggedIn`).
3. `Cookies.get("isLoggedIn")` — a *different* cookie name, unrelated to the `Token` cookie above (used only by the orphaned `Donate.tsx`).

When adding new auth-gated UI, match whichever pattern the surrounding file already uses rather than introducing a fourth variant, and prefer pattern 2 (cookie + Redux) since that's what `Navbar` and the route guard use.
