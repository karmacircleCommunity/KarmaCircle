# Payments Module

[src/modules/payments/](../../src/modules/payments/) — Razorpay order creation, plus (September 2026) the platform's first *persisted* payment flow: an organization's own "Support" button. Razorpay itself is still the system of record for the payment's own lifecycle; this module now keeps its own record of what it asked Razorpay to do and whether that was ever actually verified.

## `POST /payment/razorpay`

No auth. `validate(createOrderSchema)` — `{ amount: number (positive) }`, in **rupees** (see below). `paymentController.createOrder` → `paymentService.createOrder(amount)`:

```ts
razorpay.orders.create({
  amount: amountInRupees * 100,   // Razorpay's API wants the smallest currency unit (paise for INR)
  currency: "INR",                 // hardcoded — no multi-currency support anywhere in this module
  receipt: crypto.randomUUID(),    // a fresh random receipt id per request, not tied to any order/product record in this DB
  payment_capture: 1,              // auto-capture on payment success, no manual-capture flow
})
```

Response: `200 { id, currency, amount }` — a deliberately narrowed subset of Razorpay's full order object. **Still writes nothing to this API's own database** — unlike the sponsorship flow below, this generic route has no caller today (`donate-shop-trending`'s `Donate.tsx` is unrouted and separately broken — see that feature's own spec) and was left as-is rather than retrofitted with persistence it has no consumer to exercise.

## The organization sponsorship flow — `Order` model, September 2026

An organization can turn on `sponsorship.enabled` (see [organizations.md](./organizations.md)), which puts a real "Support {name}" button on its public profile. This is the first payment flow in the app backed by a persisted record — see [order.model.ts](../../src/modules/payments/order.model.ts):

| Field | Notes |
|---|---|
| `organizationHandle` | Indexed. Which organization this order/payment is for. |
| `amountPaise` | The amount actually sent to Razorpay, in paise. |
| `currency` | `"INR"`, same hardcoded constant as the generic route. |
| `razorpayOrderId` | Unique. What ties this document to Razorpay's own order. |
| `razorpayPaymentId` | Set once verification succeeds. |
| `status` | `"created" \| "paid" \| "failed"`. |
| `supporterName` / `supporterEmail` | Optional, supplied by whoever is paying — no account is required to sponsor an organization. |

### `POST /payment/organizations/{handle}/order`

No auth — a supporter doesn't need a KarmaCircle account. `validate(organizationHandleParamSchema, "params")` + `validate(createSponsorshipOrderSchema)` (`{ amount, supporterName?, supporterEmail? }`). `paymentService.createSponsorshipOrder`:

1. `404` if the handle isn't a **live** organization (`findLiveByHandle` — the same lookup `GET /organizations/{handle}` uses, so a draft can't be sponsored any more than it can be viewed).
2. `403` (`SPONSORSHIP_NOT_ENABLED`) if the organization hasn't turned `sponsorship.enabled` on.
3. Otherwise creates the Razorpay order exactly like the generic route does, **and** persists an `Order` document with `status: "created"`.

Response: `200 { id, currency, amount, organizationName }`.

### `POST /payment/organizations/{handle}/verify`

No auth. `validate(verifySponsorshipPaymentSchema)` — the three fields Razorpay Checkout's own success `handler` callback hands back: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. `paymentService.verifySponsorshipPayment`:

1. Looks up the `Order` by `razorpayOrderId` **and** `organizationHandle` together — a signature that's valid for one organization's order can't be replayed against a different handle in the URL. `404` (`PAYMENT_ORDER_NOT_FOUND`) if nothing matches.
2. Recomputes the HMAC-SHA256 of `"{order_id}|{payment_id}"` keyed with `RAZORPAY_KEY_SECRET` — exactly Razorpay's own documented verification step — and compares it to the supplied signature with `crypto.timingSafeEqual`. A mismatch flips the order to `"failed"` and responds `400` (`PAYMENT_VERIFICATION_FAILED`).
3. On a match, and only if the order wasn't already `"paid"` (re-verifying an already-paid order is a no-op, not a double credit), flips it to `"paid"`, stores `razorpayPaymentId`, and increments `Organization.raisedViaPlatformPaise` by exactly this order's amount via `$inc` — the *only* place in the codebase that field is ever written.

Response: `200 { status, raisedViaPlatform }` (`raisedViaPlatform` in rupees, for the frontend to show immediately without a second fetch).

**This is a client-callback-verified flow, not a webhook-verified one** — the browser's own Checkout success handler is what calls `.../verify`. That is a real, secure verification step (the signature can't be forged without the key secret), but it has one known gap: if the browser is closed or loses connectivity between Razorpay confirming payment and this endpoint being called, the `Order` stays `"created"` forever even though the payment went through. No webhook endpoint (`RAZORPAY_WEBHOOK_SECRET`, Razorpay's `payment.captured` event) exists yet to catch that case — see [known-issues.md](./known-issues.md#payments).

## Configuration is optional, not launch-blocking

`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (`env.ts`) are optional, not required — deployments that haven't set up Razorpay yet still boot normally. `paymentService`'s Razorpay client is constructed lazily on first use rather than at module load; if the keys aren't set, both order-creation routes respond `503` (`AppError`, "Payments are not configured yet.") instead of the whole API crashing on startup. Every other route is unaffected either way.

Which payment **methods** a supporter sees (cards, UPI, netbanking, wallets, international cards) is a Razorpay dashboard/KYC setting on the merchant account, not something either route or the frontend's Checkout options restrict — see `RazorpayCheckoutOptions.method`'s own doc comment in `apps/web/src/features/donate-shop-trending/types/interfaces.ts`.

## What's known-broken here

- The generic `POST /payment/razorpay` route still has no persisted record and no live caller — informational, not a regression.
- No Razorpay webhook — see the client-callback-verification gap above.
- Currency is hardcoded to `"INR"` throughout, both routes.

See [known-issues.md](./known-issues.md#payments).
