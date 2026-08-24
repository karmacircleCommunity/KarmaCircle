import crypto from "crypto";
import Razorpay from "razorpay";
import { STATUS_CODE } from "../../constants/http-status";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error-handler";

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
