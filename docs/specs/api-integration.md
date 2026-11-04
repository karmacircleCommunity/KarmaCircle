# API Integration Layer

All backend calls target one base URL, `import.meta.env.VITE_API_URL`, with no trailing-slash normalization — endpoint builders assume `VITE_API_URL` has no trailing slash.
There is no backend code in `apps/web`; the backend lives at [apps/api](../../apps/api) in this same repo, and is the source of truth for actual request/response payload shapes.
Everything below documents how the *frontend* calls it, not what the backend guarantees.

## Two parallel call layers

This is the single most important thing to know before adding a new API call: there are two different, uncoordinated ways calls are made.

### Layer A — `apps/web/src/services/KarmaCircleApi.ts` (the one almost everything uses)

Plain `axios` calls (imported directly as `Axios`, not through `ApiConnector`).
Each function catches errors and returns `error.response` (or `error` itself in a couple of functions) instead of throwing — callers must check `response?.status` rather than using `try/catch`.
Functions exported: `LoginUser`, `RegisterUser`, `CheckEmailExists`, `ForgotPassword`, `ResetPassword`, `GetAllOrganizations`, `UpdateMyOrganization`, `CreateSponsorshipOrder`, `VerifySponsorshipPayment`, `ReportProblem`, `completeProfileApiCall`, `updateUserProfile`, `GoogleAuth`, `successCallback`, `Logout`, `CreateEvent`, `JoinEvent`, and `fetchDashboard`.
Authenticated POST/PATCH calls pass `{ withCredentials: true }` so the backend's session/auth cookie is sent.
Public reads and flows such as email availability, password reset, organization directory, and sponsorship calls do not require that cookie.

### Layer B — feature-level `services/` fetchers (legacy read-only organization/event helpers)

Goes through [ApiConnector.ts](../../apps/web/src/services/ApiConnector.ts), a thin wrapper around a separate `axios.create({})` instance (`axiosInstance`), exposing `apiConnector(method, url, bodyData, headers, params)`.
Its two helper functions are `getOrganizations()` in [Organizations.ts](../../apps/web/src/features/organizations/services/Organizations.ts) and `getEvents()` in [Events.ts](../../apps/web/src/features/events/services/Events.ts), but neither is called by a page today.
The routed organization and event directories use SWR with `Fetcher.ts` and the live API instead of hardcoded demo arrays.
See [known-issues.md](./known-issues.md) for other integration gaps.
`ApiConnector`'s dead status-600 check (`if (response.status === 400) console.error("Logout triggered due to status 600 response")`) is unreachable — `response.status === 400` never equals `600`, and axios throws (doesn't return) on 4xx/5xx by default anyway, so this branch is unreachable through the normal success path.

**When adding a new call, follow Layer A's pattern** (`KarmaCircleApi.ts` + direct `axios`) unless you're specifically building on top of the existing `getOrganizations`/`getEvents` read helpers.

## Endpoint registry — `apps/web/src/services/ApiEndpoints.ts`

All endpoint URL strings/builders live here, grouped by domain, and are imported by both layers above.

```js
userEndpoints:  details(userName), profile, update, report, completeProfile, updateProfile
organizationEndpoints:  all, details(userName), createEvent, dashboard, mine, taxonomy, follow(handle), profileView(handle), byHandle(handle), directory({...})
eventEndpoints: all, create, mine(), byHost(handle), byUid(uid), join(uid), registration(uid), directory(limit)
paymentEndpoints: razorpay, sponsorshipOrder(handle), sponsorshipVerify(handle)
authEndpoints:  signin, signup, checkEmail, forgotPassword, resetPassword, googleLogin, googleLoginSuccess, logout
```

This list was itself out of date before the September 2026 pass that added `paymentEndpoints` — `organizationEndpoints.mine`/`taxonomy`/`byHandle`/`directory` and `eventEndpoints.byHost` had already shipped (August 2026, organizations.md) without this file being updated alongside them. Corrected here rather than left compounding; the SWR call-site table below is narrower on purpose (see its own intro) and wasn't re-audited beyond adding the one new sponsorship-flow entry.

`userEndpoints.update` and `userEndpoints.updateProfile` both exist and point to different URLs (`/user/update/profile` vs `/user/update`); check the current call sites before choosing one.
The old `Profile.tsx` page was deleted, and `UserProfile.tsx` is not registered in `routesConfig.tsx`; do not infer a live profile route from legacy endpoint builders.

## SWR usage (data fetching in components)

`useSWR(key, fetcher, options)` is the dominant pattern for GET requests inside components.
Two fetcher functions exist:
- [apps/web/src/utils/Fetcher.ts](../../apps/web/src/utils/Fetcher.ts) — `axios.get(url, { withCredentials: true }).then(res => res.data)`. Used almost everywhere.
- [apps/web/src/utils/fetchers/PatchFetcher.ts](../../apps/web/src/utils/fetchers/PatchFetcher.ts) — same shape but issues a PATCH. Not currently imported by any component (dead file) — SWR mutations in this app instead call the relevant `KarmaCircleApi.ts` function directly and then call `mutate()`.

Current routed SWR call sites (including `useSWRInfinite`):
| Component | Key | Purpose |
|---|---|---|
| `Organizations.tsx` | `organizationEndpoints.directory()` and taxonomy endpoint | Loads the public organization directory and filter taxonomy |
| `OrganizationProfile.tsx` | `organizationEndpoints.byHandle()`, `organizationEndpoints.follow()`, and `eventEndpoints.byHost()` | Loads a public organization profile, authenticated follow state, and hosted events |
| `OrganizationSetup.tsx` and `useMyOrganization.ts` | `organizationEndpoints.mine` and taxonomy endpoint | Loads the signed-in organization's editable record and setup taxonomy |
| `Dashboard.tsx` | `organizationEndpoints.dashboard` | Loads the owner-only organization workspace and its dashboard data |
| `Events.tsx` | `eventEndpoints.directory()` | Loads and filters the public event directory |
| `DetailedEvent.tsx` | `eventEndpoints.byUid()` and `eventEndpoints.registration()` | Loads public event details and, for a signed-in visitor, saved registration state |
| `YourEvents.tsx` | `eventEndpoints.byHost()` | Loads the signed-in organization's hosted events |
| `MyEvents.tsx` | `eventEndpoints.mine()` via `useSWRInfinite` | Loads the signed-in individual's paginated attendee registrations |
| `ProfileSetup.tsx` | `userEndpoints.profile` | Loads the signed-in individual's saved profile answers |

`CreateEvents.tsx` is rendered from both `/events` and `/organization/events` for organization accounts.
After `POST /events/create` succeeds, `useEvent.ts` revalidates the public directory key and the current organization's hosted-events key.

The organization dashboard includes sample markers for local demo records.
Sample contribution amounts are displayed separately and never included in verified raised totals.

## Status codes and messages

[apps/web/src/statics/Constants.ts](../../apps/web/src/statics/Constants.ts) exports `STATUSCODE` (a full HTTP status-code map) and `STATUSMESSAGE` (a set of canned backend message strings).
`STATUSCODE.OK` is used in a handful of places (`useProfileCompletion.ts`, `ProfileUpdate.tsx`, `CreateEvent.tsx`) to check `data.status === STATUSCODE.OK`; most other call sites just compare raw numbers (`response?.status === 201 || response?.status === 200`) inline instead of using the constant — prefer `STATUSCODE` in new code for consistency.
`STATUSMESSAGE` values don't appear to be read anywhere in the frontend; toasts display whatever message string the backend response includes (`response?.data?.message`), so this constant is effectively documentation of expected backend messages rather than live code.

## Toast conventions

All user-facing success/error feedback for API calls goes through [showSuccessToast / showErrorToast](../../apps/web/src/utils/Toasts.ts) (react-toastify), which both no-op (return early) if `checkInternetConnection()` reports the browser is offline.
Follow this pattern for any new API-triggered feedback rather than calling `toast.success`/`toast.error` directly.
`showWarningToast`/`showInfoToast` exist alongside them for a needs-attention-but-not-failed case; no current API call site uses either yet.
All four are visually themed through `styles/index.css`'s `--toastify-*` overrides, not per-call styling - see [ui-kit.md](./ui-kit.md#toast) and the live samples at [brand.karmacircle.org](https://brand.karmacircle.org).

## Session rejection handling

`Fetcher.ts` and `updateUserProfile()` call `clearRejectedSession()` on failure.
Only a 401 for the current Redux user snapshot resets the session; other failures still reach the caller.
`restoreSession()` uses the existing `GET /user/profile` contract to validate persisted login before app startup.
No backend route or payload changed.
