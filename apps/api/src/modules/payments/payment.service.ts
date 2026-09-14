import crypto from "crypto";
import Razorpay from "razorpay";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error-handler";
import { Organization } from "../organizations/organization.model";
import { findLiveByHandle } from "../organizations/organization.service";
import { ORDER_STATUS, Order } from "./order.model";

const CURRENCY = "INR";
const PAYMENT_CAPTURE = 1;

// Constructed lazily, not at module load — RAZORPAY_KEY_ID/SECRET are
// optional in env.ts (Razorpay isn't set up yet), and the `razorpay`
// package itself throws synchronously in its constructor if key_id is
// missing. Building the client eagerly at import time would crash the
// whole API on boot rather than just this one route on first use.
let razorpay: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(
      STATUS_CODE.SERVICE_UNAVAILABLE,
      "Payments are not configured yet.",
    );
  }

  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpay;
}

export async function createOrder(amountInRupees: number) {
  const options = {
    amount: amountInRupees * 100,
    currency: CURRENCY,
    receipt: crypto.randomUUID(),
    payment_capture: PAYMENT_CAPTURE,
  };

  const order = await getRazorpayClient().orders.create(options);

  return {
    id: order.id,
    currency: order.currency,
    amount: order.amount,
  };
}

/**
 * Creates a Razorpay order for one organization's "Support" button, and
 * persists it — unlike `createOrder` above (the pre-existing, still-used
 * generic route), which mints an order Razorpay knows about but this API
 * never writes down anywhere. That gap was a standing known issue: no
 * `Order`/`Payment` model meant no way to build an order history, and no
 * server-side record connecting an order to anything. This is the first
 * payment flow in the app that fixes it, scoped to sponsorship only.
 */
export async function createSponsorshipOrder(
  handle: string,
  amountInRupees: number,
  supporter?: { name?: string; email?: string },
) {
  const organization = await findLiveByHandle(handle);

  if (!organization) {
    throw new AppError(
      STATUS_CODE.NOT_FOUND,
      STATUS_MESSAGE.ORGANIZATION_NOT_FOUND,
    );
  }

  if (!organization.sponsorship?.enabled) {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.SPONSORSHIP_NOT_ENABLED,
    );
  }

  const amountPaise = Math.round(amountInRupees * 100);
  // Assigned to a variable first, then passed, matching `createOrder`
  // above: passed as an inline object literal, TypeScript resolves this
  // call against the SDK's `(params, callback)` overload instead of the
  // single-argument one and reports the whole thing as `Promise<...> &
  // void` — a quirk of this particular overload pair, not a real type
  // error either way.
  const options = {
    amount: amountPaise,
    currency: CURRENCY,
    receipt: crypto.randomUUID(),
    payment_capture: PAYMENT_CAPTURE,
  };
  const razorpayOrder = await getRazorpayClient().orders.create(options);

  await Order.create({
    organizationHandle: organization.handle,
    amountPaise,
    currency: CURRENCY,
    razorpayOrderId: razorpayOrder.id,
    supporterName: supporter?.name,
    supporterEmail: supporter?.email,
  });

  return {
    id: razorpayOrder.id,
    currency: razorpayOrder.currency,
    amount: razorpayOrder.amount,
    organizationName: organization.name,
  };
}

/**
 * Verifies the three fields Razorpay Checkout's `handler` callback hands
 * back on success, the way Razorpay's own docs describe: an HMAC-SHA256
 * of `"{order_id}|{payment_id}"`, keyed with the account's key secret,
 * must equal the signature Razorpay sent. This is the only step that
 * turns "the browser said it worked" into a payment this API actually
 * trusts — a client can claim anything over the wire, but cannot forge
 * this signature without the secret.
 *
 * On a match, the matching `Order` (looked up by `razorpayOrderId`, the
 * one value that can't be spoofed usefully since it's what the signature
 * itself covers) flips to `paid` and the organization's counted total
 * grows by exactly this order's amount — done here, atomically, and
 * nowhere else, so `raisedViaPlatformPaise` can never move without a
 * verified signature behind it. Re-verifying an already-paid order is a
 * no-op rather than double-crediting it.
 */
export async function verifySponsorshipPayment(
  handle: string,
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) {
  const order = await Order.findOne({
    razorpayOrderId: input.razorpay_order_id,
    organizationHandle: handle,
  });

  if (!order) {
    throw new AppError(
      STATUS_CODE.NOT_FOUND,
      STATUS_MESSAGE.PAYMENT_ORDER_NOT_FOUND,
    );
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET ?? "")
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest("hex");

  const signaturesMatch =
    expectedSignature.length === input.razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(input.razorpay_signature),
    );

  if (!signaturesMatch) {
    order.status = ORDER_STATUS.Failed;
    await order.save();
    throw new AppError(
      STATUS_CODE.BAD_REQUEST,
      STATUS_MESSAGE.PAYMENT_VERIFICATION_FAILED,
    );
  }

  if (order.status !== ORDER_STATUS.Paid) {
    order.status = ORDER_STATUS.Paid;
    order.razorpayPaymentId = input.razorpay_payment_id;
    await order.save();

    await Organization.updateOne(
      { handle: order.organizationHandle },
      { $inc: { raisedViaPlatformPaise: order.amountPaise } },
    );
  }

  const organization = await Organization.findOne({
    handle: order.organizationHandle,
  });

  return {
    status: order.status,
    raisedViaPlatform: Math.floor(
      (organization?.raisedViaPlatformPaise ?? 0) / 100,
    ),
  };
}
