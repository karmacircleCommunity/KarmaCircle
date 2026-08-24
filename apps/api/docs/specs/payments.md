# Payments Module

[src/modules/payments/](../../src/modules/payments/) — the smallest module with real external-side-effect logic: create a Razorpay order. Owns no model; Razorpay itself is the system of record for order state. See the frontend's `donate-shop-trending.md`/`SPEC.md` for how the client actually uses the order this returns (the Razorpay checkout widget, invoked client-side with the `id` this endpoint returns).

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

Response: `200 { id, currency, amount }` — a deliberately narrowed subset of Razorpay's full order object (the SDK's response has more fields; only these three are passed through). **This route creates a Razorpay order but writes nothing to this API's own database** — there's no `Order`/`Payment` model, no record linking a Razorpay order id back to a user, product, or event. Order/payment history, if it exists at all, lives only in the Razorpay dashboard, not queryable through this API. If a "my past donations/orders" feature is ever requested, it needs a new model and a way to record this endpoint's calls (or a Razorpay webhook handler, which also doesn't exist here) — there is currently no server-side trail connecting a payment to the user who made it.

No webhook endpoint exists to receive Razorpay's own payment-confirmation callbacks — this API has no way of knowing, server-side, whether an order it created was ever actually paid. Whatever confirms payment success today happens entirely client-side (the frontend's Razorpay checkout widget's success callback), which is not a security-safe way to gate anything server-side (a client could report success without having paid) — treat this as informational unless asked to fix it; the current scope of this module is genuinely just "mint an order id for the frontend's checkout widget to use."

## Configuration is optional, not launch-blocking

`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (`env.ts`) are optional, not required — deployments that haven't set up Razorpay yet still boot normally. `paymentService`'s Razorpay client is constructed lazily on first use rather than at module load; if the keys aren't set, `POST /payment/razorpay` responds `503` (`AppError`, "Payments are not configured yet.") instead of the whole API crashing on startup. Every other route is unaffected either way.

## What's known-broken here

Not a bug given the module's narrow scope, but worth surfacing: no persisted order/payment records, no webhook, no currency beyond INR. See [known-issues.md](./known-issues.md#payments).
