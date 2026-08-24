# State Management

Three separate mechanisms hold state in this app, each for a different purpose.
There is still no single source of truth for "is the user logged in" enforced across the codebase, but `Navbar.tsx` and `DonotRenderWhenLoggedIn.tsx` were fixed (August 2026) to check Redux's `isLoggedIn` alone — see the "isLoggedIn checks" section below for why, and for the one remaining outlier (`Donate.tsx`).

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
- [Profile.tsx](../../apps/web/src/features/onboarding-profile/pages/Profile.tsx) and [Navbar.tsx](../../apps/web/src/components/Navbar.tsx) — on logout, dispatch `resetUserData()`.
- [Dashboard.tsx](../../apps/web/src/features/dashboard/pages/Dashboard.tsx) — on every SWR fetch of `userEndpoints.profile`, re-dispatches `updateUserData(data?.user)` in the `onSuccess` callback, keeping Redux in sync with the latest server copy.

## 2. Zustand (`useAuthStore`)

[apps/web/src/app/store/useAuth.ts](../../apps/web/src/app/store/useAuth.ts) is a single Zustand store holding exactly one field: `isLoading` (boolean) and its setter `toggleLoading(loading)`.
It exists purely to drive button spinners/disabled states for form submissions that live outside the `useAuth` hook's own local `loading` state — e.g. [useFormLogic.ts](../../apps/web/src/features/authentication/hooks/useFormLogic.ts), [AuthButton.tsx](../../apps/web/src/features/authentication/components/AuthButton.tsx), [UserProfile.tsx](../../apps/web/src/features/onboarding-profile/pages/UserProfile.tsx).
Despite the name, it has nothing to do with authentication state itself — only with in-flight loading UI.

There is no Zustand store for user/session data; all of that goes through Redux.

## 3. Cookies (`js-cookie`)

Some non-auth flags are read directly with `Cookies.get(...)`; `Token` itself is no longer read client-side (see below).
Cookies actually read in the frontend:

| Cookie | Read in | Purpose |
|---|---|---|
| `skipProfileCompletion` | `Profile.tsx` | If set, suppresses the profile-completion modal even if fields are missing |
| `userName` | `UserProfile.tsx` | Compared against the route's `:slug` param to decide if the viewer owns the profile |
| `isLoggedIn` | `Donate.tsx` | Gate for the (currently unrouted) donate page — see [donate-shop-trending.md](./donate-shop-trending.md) |
| `OAuthLoginInitiated` | `Home.tsx` | Set by the backend/redirect flow before bouncing back from Google OAuth; its presence triggers `successCallback()` |

`Cookies.remove("skipProfileCompletion")` and `localStorage.clear()` are both called on logout (in `Profile.tsx` and `Navbar.tsx` respectively) alongside `resetUserData()` — three different mechanisms cleaned up in three different places, not one central "logout" utility.

## "Is the user logged in?" — one real check, one stale outlier

`Navbar.tsx` and `DonotRenderWhenLoggedIn.tsx` previously gated on `Cookies.get("Token") && isLoggedIn`.
That's a bug fixed August 2026: the `Token` cookie the *Google OAuth* flow sets (`issueOAuthSession` in `apps/api/src/modules/auth/auth.controller.ts`) is `httpOnly`, so it is never visible to `Cookies.get` — the condition could never be true for a Google-authenticated session, even though the backend session and the Redux `isLoggedIn` flag were both correct.
(The email/password flow's `Token` cookie is *not* httpOnly, which is why this bug only showed up for Google sign-in — the navbar staying on "Sign Up" after a successful login.)
Both files now check `useSelector(selectIsLoggedIn)` alone, matching the pattern `Landing.tsx` already used.

The one remaining outlier is `Cookies.get("isLoggedIn")` in the orphaned, unrouted `Donate.tsx` — a *different* cookie name from the `Token` cookie discussed above, not currently worth chasing since that page isn't reachable (see [donate-shop-trending.md](./donate-shop-trending.md)).

When adding new auth-gated UI, use `useSelector(selectIsLoggedIn)` — it's the only mechanism that's actually correct for both the email/password and Google OAuth login paths.
