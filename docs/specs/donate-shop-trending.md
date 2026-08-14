# Donate, Shop & Trending

Three low-priority/incomplete areas grouped together because none of them represent a finished feature today.

## Donate (currently unroutable)

[src/features/donate-shop-trending/pages/Donate.tsx](../../src/features/donate-shop-trending/pages/Donate.tsx) exists but **has no entry in `routesConfig.tsx`** — it cannot be reached by navigating the live app.
It also imports two components that no longer exist in the current file tree: `../../components/Cards/SingleClubEvent/SingleClubEvent` and `../../components/Loading` (the real `Loading` component now lives at `src/components/loading/Loading.jsx`, exported from the shared barrel).
**Importing this file today will fail the build** — it is stale code from before a component reorganization, not a working feature.
It fetches clubs via `GetAllClubs()` (`MilanApi.js`, `GET /clubs`), loads the Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`) via a hand-rolled `loadScript` helper, and gates access on `Cookies.get("isLoggedIn")` — a cookie that, per [state-management.md](./state-management.md), is not set anywhere else in the current codebase (the rest of the app uses the `Token` cookie + Redux `isLoggedIn`), so this gate can never pass today even if the imports were fixed.

If asked to "fix the donate page," treat this as a near-full rewrite (fix imports, register a route, align the login-gate check with the rest of the app) rather than a small patch — confirm scope before starting.

## `PaymentGateway.ts` (Razorpay integration — the working piece)

[src/features/donate-shop-trending/services/PaymentGateway.ts](../../src/features/donate-shop-trending/services/PaymentGateway.ts) exports `displayRazorpay(money)`, the one part of the donate flow that is self-contained and functional in isolation: it `POST`s to `/payment/razorpay` with `{ amount: money }`, then opens Razorpay's checkout widget (`window.Razorpay`) configured with `VITE_RAZORPAY_KEY_ID`.
Its `prefill` block hardcodes the app author's own name/email/phone (`Tamal Das`, `tamalcodes@gmail.com`, a phone number) rather than the logged-in user's details — replace this with real user data before this ships to real donors.
Its success `handler` only shows a thank-you toast; it doesn't confirm the payment with the backend or update any order/donation record client-side (that's presumably handled server-side via Razorpay webhooks, but there's nothing in this repo to verify that).
Not currently imported by any component (since `Donate.tsx` can't build) — the Razorpay checkout script itself is loaded separately, by `Donate.tsx`'s own `loadScript` call, not by this file.

## Shop and Trending — intentional placeholders

[src/features/donate-shop-trending/pages/Shop.tsx](../../src/features/donate-shop-trending/pages/Shop.tsx) (routed `/shop`) and [src/features/donate-shop-trending/pages/Trending.tsx](../../src/features/donate-shop-trending/pages/Trending.tsx) (routed `/trending`) are both thin wrappers around the shared `<ComingSoon />` component — see [src/components/comingSoon/ComingSoon.jsx](../../src/components/comingSoon/ComingSoon.jsx).
`ComingSoon` takes a `launchitem` string (e.g. `"shop's page."`, `"Trending section"`) and renders a static illustration, a heading, and a "Sign up to get notified" CTA linking to `/auth/signup`.
These two pages are deliberately unfinished — unlike Donate, there is no broken/dead code here to fix, just no feature built yet.

## Types

This entire folder is TypeScript, including `Donate.tsx` — its two broken imports and `PaymentGateway.ts`'s known `data.x`/`data.data.x` bug are preserved behind documented `@ts-expect-error` suppressions rather than fixed. See [donate-shop-trending/SPEC.md](../../src/features/donate-shop-trending/SPEC.md#types) for details.
