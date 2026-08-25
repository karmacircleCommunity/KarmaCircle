# Donate, Shop & Trending — Feature Spec

Colocated, implementation-level companion to [docs/specs/donate-shop-trending.md](../../../docs/specs/donate-shop-trending.md).
Three unrelated low-priority areas sharing one folder because none of them is a finished feature; treat `Donate.tsx` and `PaymentGateway.ts` as needing real rework if touched, and `Shop.tsx`/`Trending.tsx` as intentionally, harmlessly unfinished.

## What this feature is responsible for

A donation flow (broken, unroutable), the Razorpay checkout integration that donation flow was meant to use (partially broken in a way not previously documented — see below), and two deliberate "coming soon" placeholder pages.

## Why it's shaped this way

`Shop.tsx`/`Trending.tsx` are genuinely, deliberately incomplete — no feature was ever built, and that's fine, they're not broken code, just not-yet-written product surface. `Donate.tsx` is different: it's *stale* code from before a component reorganization (it imports paths that no longer exist), left in the tree without a route pointing to it, so it currently causes no runtime harm but would break the build the moment anyone wires it into `routesConfig.tsx` without first fixing it.

## File manifest

| File | Role | Live? |
|---|---|---|
| `pages/Donate.tsx` | Donation page — pick an organization, pay via Razorpay | ❌ not routed, **and would fail to build if it were** (broken imports) |
| `pages/Donate.css` | Styles for the above | ✅ imports fine on its own, just unused in practice |
| `pages/Shop.tsx` | `/shop` — "coming soon" placeholder | ✅ routed, intentionally unfinished |
| `pages/Trending.tsx` | `/trending` — "coming soon" placeholder | ✅ routed, intentionally unfinished |
| `services/PaymentGateway.ts` | `displayRazorpay(money)` — Razorpay checkout | ❌ not imported by any component (only reachable from the broken `Donate.tsx`), **and has its own undocumented bug even if wired up** |

## `pages/Donate.tsx` — broken imports, not routed, would fail to build if reached

**No entry in `routesConfig.tsx`** — confirmed, `/donate` does not exist as a route.
This alone means the file's other problems are currently harmless — nothing imports this module at build time via the route table, so bundlers that only walk reachable import graphs from entry points won't necessarily choke on it (verify this holds for this repo's specific Vite/Rollup config before relying on it for anything more than "it hasn't broken CI yet").

**Two imports point at paths that don't resolve:**
```js
import SingleOrganizationEvent from "../../components/Cards/SingleOrganizationEvent/SingleOrganizationEvent";
import Loading from "../../components/Loading";
```
`components/Cards/SingleOrganizationEvent/` doesn't exist in the current tree.
`../../components/Loading` is off by one directory level — from `pages/Donate.tsx` it resolves to `src/features/components/Loading`, not `src/components/Loading.tsx`, where the real component now lives (also exported from the shared barrel `@components`).
**The moment this file is imported by anything reachable — adding a route, or importing it from another component for any reason — the build fails immediately** with a module-not-found error.

**Additional issues beyond the two broken imports (not previously documented at this level of detail):**

- **`useEffect(() => { loadScript(...) })` has no dependency array.** Every re-render of this component (not just the initial mount) appends a brand-new `<script src="https://checkout.razorpay.com/v1/checkout.js">` tag to `document.body` and lets it load again — with no dependency array, this runs after **every** render, unconditionally. If this component is ever fixed and rendered for any length of time with re-renders happening (state changes, parent re-renders, etc.), this would inject an unbounded, ever-growing number of duplicate `<script>` tags into the DOM. This needs an empty `[]` dependency array (or a one-time module-level check for whether the script's already loaded) as part of any real fix, not just the import paths.
- **`document.title = "KarmaCircle | Donate the needy"` is set imperatively at the top of the component body**, then a `<Helmet><title>KarmaCircle | Donations</title></Helmet>` block is rendered further down with a *different* title string. These two mechanisms conflict — `react-helmet-async` manages `document.title` reactively once mounted, so the imperative assignment is likely immediately superseded by the `<Helmet>` version at runtime, making the top-of-component line dead/misleading code; every other page in the app uses `<Helmet>` exclusively (or, per [layout-navigation.md](../../../docs/specs/layout-navigation.md), `ComponentHelmet`) — remove the imperative line if you're fixing this file, to match the rest of the codebase's convention.
- **Login gate redirects to a route that doesn't exist:** `if (!Cookies.get("isLoggedIn")) { toast.error(...); navigate("/user/login"); }` — there is no `/user/login` route in `routesConfig.tsx` (the real sign-in route is `/auth/signin`); even setting aside that `Cookies.get("isLoggedIn")` is a cookie nothing else in the app ever sets (see [state-management.md](../../../docs/specs/state-management.md) — the rest of the app uses the `Token` cookie + Redux `isLoggedIn`, "pattern 2"), the redirect target itself is also wrong and would land on the 404 page.
- **Uses raw `react-toastify`'s `toast.error(...)` directly**, not the app's `showErrorToast`/`showSuccessToast` wrapper from `src/utils/Toasts.ts` — bypasses the offline-suppression behavior every other toast call site in the app gets for free (see [api-integration.md](../../../docs/specs/api-integration.md#toast-conventions)).
- **`GetAllOrganizations()` response is stored directly as `organizationData`** (`const response = await GetAllOrganizations(); setOrganizationData(response);`) without checking `response.status` first — `GetAllOrganizations()` (`MilanApi.ts`) follows the catch-and-return-`error.response` pattern, so on a failed request `organizationData` would become an Axios *error response* object (with `.status`, `.data`, etc.) rather than an array, and the later `organizationData.map(...)` call would throw (`.map` is not a function on a non-array object) rather than showing any error state.

**If asked to "fix the donate page,"** treat this as a near-full rewrite — fix the two broken imports, add a route, fix the `useEffect` dependency array, remove the imperative `document.title`, align the login gate with the rest of the app's `Token`-cookie + Redux pattern (and point it at `/auth/signin`), switch to `showErrorToast`, and add a response-status check before setting `organizationData` — not a small patch. Confirm scope before starting, per the existing guidance in `docs/specs/donate-shop-trending.md`; this spec adds several more items to that scope than were previously catalogued.

## `services/PaymentGateway.ts` — `displayRazorpay(money)`

The one part of the donate flow that's structurally self-contained — it doesn't depend on `Donate.tsx`'s broken imports at all, and could be tested/fixed independently.

**Previously-undocumented bug: the response-data access is inconsistent, and would break the Razorpay checkout even with everything else fixed.**
```js
const data = await Axios.post(`${API}/payment/razorpay`, { amount: money });
// data is the FULL Axios response object here — data.data is the actual backend payload

const options = {
  currency: data.currency,      // ❌ should be data.data.currency — Axios responses nest the payload under .data
  amount: data.data.amount,     // ✅ correctly reads the nested payload
  order_id: data.id,            // ❌ should be data.data.id
  ...
};
```
`data` is the raw Axios response (`{ data, status, headers, ... }`), not the backend's JSON payload directly — `amount: data.data.amount` gets this right, but `currency: data.currency` and `order_id: data.id` read directly off the Axios envelope instead of `data.data`, so **both would evaluate to `undefined`** regardless of what the backend actually returns.
Razorpay's checkout widget requires a valid `order_id` to open a real payment session — an `undefined` `order_id` would very likely cause Razorpay's own client-side SDK to reject or misbehave when `paymentObject.open()` is called, independent of anything else being fixed in `Donate.tsx`.
**This is a real, currently-untested bug** (untested because nothing reachable in the live app calls `displayRazorpay` at all) — fix `data.currency` → `data.data.currency` and `data.id` → `data.data.id` as part of any work that wires this function back in.

**Hardcoded `prefill` block** (already documented in `docs/specs/donate-shop-trending.md`): `name: "Tamal Das"`, `email: "tamalcodes@gmail.com"`, `contact: "8240415709"` — the app author's own real contact details, not the logged-in user's. Replace with real user data (from Redux — see [state-management.md](../../../docs/specs/state-management.md)) before this ships to real donors; leaving this as-is would prefill every donor's checkout with someone else's contact info.

**Success handler** only shows a thank-you toast (`toast("🌈 Thankyou for the help.", {...})`, again raw `react-toastify`, not the app's wrapper) — it doesn't confirm the payment with the backend or update any client-side order/donation record. Presumably the backend confirms payment via Razorpay webhooks server-side, but there's nothing in this repo to verify that assumption; don't assume the donation is recorded just because this handler fired.

**Not imported by any component today** — the Razorpay checkout script itself is loaded separately, by `Donate.tsx`'s own broken `loadScript` call, not by this file; if `Donate.tsx` is rewritten, decide whether script-loading responsibility should move into this file instead (arguably a better home for it, since it's specifically needed for what this file does).

## `pages/Shop.tsx` and `pages/Trending.tsx` — intentional, working placeholders

Both are thin, correctly-working wrappers around the shared [`ComingSoon`](../../components/ComingSoon.tsx) component: `<Navbar />` + `<ComingSoon launchitem="..." />`.
`Shop.tsx` passes `` `shop's page.` `` (note the trailing period, which `ComingSoon`'s own copy presumably incorporates into a sentence), `Trending.tsx` passes `"Trending section"` (no trailing period — a minor inconsistency between the two call sites' string formatting, cosmetic only).
Both are correctly routed (`/shop`, `/trending`) in `routesConfig.tsx`.
**Unlike `Donate.tsx`, there is nothing broken here** — these two files are exactly as finished as they're meant to be today.
If asked to "build the shop" or "build trending," this is genuinely new feature work with no existing scaffolding to build from in this folder (contrast with `organizations`/`events`, where a real fetcher already exists and just needs wiring) — don't go looking for a half-built shop/trending implementation elsewhere in the repo; there isn't one.

## Data flow summary — Donate, if it were fixed and wired up

```
Donate.tsx mount
   ▼
GetAllOrganizations()   [MilanApi.ts, GET /organizations]  →  organizationData
   ▼
organizationData.map(organization => <SingleOrganizationEvent organization={organization} />)   ⚠ SingleOrganizationEvent no longer exists — needs rebuilding, not just an import-path fix
   │
   └─ "Donate" click on an organization (hypothetical — not present in current file at all; there's no per-organization donate button/amount-input visible in the current JSX)
          ▼
      displayRazorpay(money)   [PaymentGateway.ts]
          ▼
      POST /payment/razorpay { amount }   →  ⚠ order_id/currency bug above must be fixed first
          ▼
      window.Razorpay(options).open()
          ▼
      success → toast only, no backend confirmation from the frontend
```
Note the fetch-organizations-then-donate flow doesn't even have a visible "choose an amount and pay" UI element in the current `Donate.tsx` JSX — the file fetches organizations and would render `SingleOrganizationEvent` per organization, but there's no code in this file that calls `displayRazorpay` at all; that call must live inside the (currently missing) `SingleOrganizationEvent` component. Rebuilding `SingleOrganizationEvent` is therefore not optional set-dressing — it's where the actual "donate to this organization" interaction and the `displayRazorpay` call are expected to live.

## Types

This folder is TypeScript (`.ts`/`.tsx`) as of the dashboard/donate-shop-trending conversion pass — see [authentication/SPEC.md](../authentication/SPEC.md#types) for the general pattern.
`types/index.ts` holds `RazorpayCheckoutOptions` plus a `declare global` augmentation of `Window` for `window.Razorpay` (Razorpay ships no npm types — its SDK is loaded at runtime via `<script>`, not installed as a package).
`Donate.tsx`'s two broken imports (`SingleOrganizationEvent`, `Loading`) are still broken — they're suppressed with documented `@ts-expect-error` comments rather than fixed, matching this file's existing "near-full rewrite, confirm scope first" status; `organizationData` is typed `any[]` rather than a guessed `Organization[]`, since `GetAllOrganizations()`'s real response shape has never been exercised by this dead code path. `PaymentGateway.ts`'s `currency`/`order_id` bug (reading `data.x` instead of `data.data.x`) is likewise still present, suppressed the same way — see "Known issues" below for both.

## Known issues specific to this feature (superset of known-issues.md's entries, plus new findings)

- Broken imports (`SingleOrganizationEvent`, `Loading`), no route, `isLoggedIn` cookie gate that can never pass — already in `known-issues.md`.
- **`loadScript`'s `useEffect` has no dependency array — re-injects the Razorpay script on every render.** New finding.
- **Conflicting title-setting** (imperative `document.title` + a differently-worded `<Helmet>` title). New finding.
- **Login-gate redirects to `/user/login`, a route that doesn't exist** (should be `/auth/signin`). New finding.
- **Uses raw `toast.error`/`toast(...)` instead of the app's `showErrorToast`/`showSuccessToast` wrappers**, in both `Donate.tsx` and `PaymentGateway.ts`. New finding.
- **`GetAllOrganizations()`'s response is used without a status check**, so a failed fetch would crash `organizationData.map(...)` rather than showing an error state. New finding.
- **`PaymentGateway.ts`'s `currency`/`order_id` read off the wrong object level (`data.x` instead of `data.data.x`)** — would break the actual Razorpay checkout even after every other bug is fixed. New finding, likely the single most important bug in this feature if donations are ever prioritized.
- Hardcoded `prefill` contact details (the app author's own) — already in `known-issues.md`.
- No client-side payment confirmation after a successful Razorpay handler fires — already in `known-issues.md`.
- `SingleOrganizationEvent`, the component that would actually trigger `displayRazorpay`, doesn't exist anywhere in the current tree and would need to be built, not just relocated. New finding/clarification.

## If you're asked to...

- **"Fix the donate page"** → full rework, not a patch; see the itemized list under `pages/Donate.tsx` above. Confirm scope first — this touches routing, a missing component (`SingleOrganizationEvent`), login-state consistency, and the payment integration's own bug.
- **"Fix the Razorpay integration" specifically** → start with `data.currency`/`data.id` → `data.data.currency`/`data.data.id` in `PaymentGateway.ts`; this is the highest-value, most self-contained fix in this feature and is currently untested because nothing calls this function.
- **"Build the shop/trending page"** → genuinely new work, no existing scaffolding beyond the current `ComingSoon` placeholder; `ComingSoon`'s implementation lives in `src/components/ComingSoon.tsx`, outside this feature.
