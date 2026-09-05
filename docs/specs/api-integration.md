# API Integration Layer

All backend calls target one base URL, `import.meta.env.VITE_API_URL`, with no trailing-slash normalization — endpoint builders assume `VITE_API_URL` has no trailing slash.
There is no backend code in `apps/web`; the backend lives at [apps/api](../../apps/api) in this same repo, and is the source of truth for actual request/response payload shapes.
Everything below documents how the *frontend* calls it, not what the backend guarantees.

## Two parallel call layers

This is the single most important thing to know before adding a new API call: there are two different, uncoordinated ways calls are made.

### Layer A — `apps/web/src/services/KarmaCircleApi.ts` (the one almost everything uses)

Plain `axios` calls (imported directly as `Axios`, not through `ApiConnector`).
Each function catches errors and returns `error.response` (or `error` itself in a couple of functions) instead of throwing — callers must check `response?.status` rather than using `try/catch`.
Functions exported: `LoginUser`, `RegisterUser`, `GetAllOrganizations`, `ReportProblem`, `completeProfileApiCall`, `updateUserProfile`, `GoogleAuth`, `successCallback`, `Logout`, `CreateEvent`, `fetchDashboard`.
Most POST/PATCH calls pass `{ withCredentials: true }` so the backend's session/auth cookie is sent; a few reads (`GetAllOrganizations`) don't.

### Layer B — feature-level `services/` fetchers (only used for read-only organization/event listing helpers)

Goes through [ApiConnector.ts](../../apps/web/src/services/ApiConnector.ts), a thin wrapper around a separate `axios.create({})` instance (`axiosInstance`), exposing `apiConnector(method, url, bodyData, headers, params)`.
Only two consumers exist: `getOrganizations()` in [Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) and `getEvents()` in [Events.ts](../../apps/web/src/features/events/services/Events.ts) — and neither of those two functions is actually called anywhere in the app; `Organizations.tsx` and `Events.tsx` (the pages) both currently render hardcoded demo arrays instead.
See [known-issues.md](./known-issues.md).
`ApiConnector`'s dead status-600 check (`if (response.status === 400) console.error("Logout triggered due to status 600 response")`) is unreachable — `response.status === 400` never equals `600`, and axios throws (doesn't return) on 4xx/5xx by default anyway, so this branch is unreachable through the normal success path.

**When adding a new call, follow Layer A's pattern** (`KarmaCircleApi.ts` + direct `axios`) unless you're specifically building on top of the existing `getOrganizations`/`getEvents` read helpers.

## Endpoint registry — `apps/web/src/services/ApiEndpoints.ts`

All endpoint URL strings/builders live here, grouped by domain, and are imported by both layers above.

```js
userEndpoints:  details(userName), profile, update, report, completeProfile, updateProfile
organizationEndpoints:  all, details(userName), createEvent, dashboard
eventEndpoints: all, create
authEndpoints:  signin, signup, googleLogin, googleLoginSuccess, logout
```

Note `userEndpoints.update` and `userEndpoints.updateProfile` both exist and point to different URLs (`/user/update/profile` vs `/user/update`) — only `updateProfile` is actually referenced (`ProfileUpdate.tsx`/`useValidation`-adjacent flows).
`organizationEndpoints.details(userName)` is queried with `?userName=` but is used for both individual users and organizations (see [onboarding-profile.md](./onboarding-profile.md) — `Profile.tsx` calls `organizationEndpoints.details` even on the `/user/:userName` route).

## SWR usage (data fetching in components)

`useSWR(key, fetcher, options)` is the dominant pattern for GET requests inside components.
Two fetcher functions exist:
- [apps/web/src/utils/Fetcher.ts](../../apps/web/src/utils/Fetcher.ts) — `axios.get(url, { withCredentials: true }).then(res => res.data)`. Used almost everywhere.
- [apps/web/src/utils/fetchers/PatchFetcher.ts](../../apps/web/src/utils/fetchers/PatchFetcher.ts) — same shape but issues a PATCH. Not currently imported by any component (dead file) — SWR mutations in this app instead call the relevant `KarmaCircleApi.ts` function directly and then call `mutate()`.

SWR call sites:
| Component | Key | Purpose |
|---|---|---|
| `Dashboard.tsx` | `userEndpoints.profile` | Loads the logged-in organization/org's own profile; `onSuccess` re-syncs Redux |
| `Profile.tsx` | `organizationEndpoints.details(userName)` | Loads a profile by username for `/user/:userName` (`/organization/:userName` moved to `features/organizations` in August 2026 and fetches nothing yet) |
| `UserProfile.tsx` | `userEndpoints.details(slug)` | Loads a public profile by slug (a second, mostly-unused profile page — see [onboarding-profile.md](./onboarding-profile.md)) |

`useEvent.ts`'s `submitCallback` calls `mutate(eventEndpoints.all)` from `useSWRConfig()` after a successful event creation, to invalidate any cached `eventEndpoints.all` SWR key — but no component currently fetches `eventEndpoints.all` via SWR, so this revalidation currently has no listener.

## Status codes and messages

[apps/web/src/statics/Constants.ts](../../apps/web/src/statics/Constants.ts) exports `STATUSCODE` (a full HTTP status-code map) and `STATUSMESSAGE` (a set of canned backend message strings).
`STATUSCODE.OK` is used in a handful of places (`useProfileCompletion.ts`, `ProfileUpdate.tsx`, `CreateEvent.tsx`) to check `data.status === STATUSCODE.OK`; most other call sites just compare raw numbers (`response?.status === 201 || response?.status === 200`) inline instead of using the constant — prefer `STATUSCODE` in new code for consistency.
`STATUSMESSAGE` values don't appear to be read anywhere in the frontend; toasts display whatever message string the backend response includes (`response?.data?.message`), so this constant is effectively documentation of expected backend messages rather than live code.

## Toast conventions

All user-facing success/error feedback for API calls goes through [showSuccessToast / showErrorToast](../../apps/web/src/utils/Toasts.ts) (react-toastify), which both no-op (return early) if `checkInternetConnection()` reports the browser is offline.
Follow this pattern for any new API-triggered feedback rather than calling `toast.success`/`toast.error` directly.
`showWarningToast`/`showInfoToast` exist alongside them for a needs-attention-but-not-failed case; no current API call site uses either yet.
All four are visually themed through `styles/index.css`'s `--toastify-*` overrides, not per-call styling - see [ui-kit.md](./ui-kit.md#toast) and the live samples at [brand.karmacircle.org](https://brand.karmacircle.org).
