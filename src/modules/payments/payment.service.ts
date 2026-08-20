import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

const CURRENCY = "INR";
const PAYMENT_CAPTURE = 1;

export async function createOrder(amountInRupees: number) {
  const options = {
    amount: amountInRupees * 100,
    currency: CURRENCY,
    receipt: crypto.randomUUID(),
    payment_capture: PAYMENT_CAPTURE,
  };

  const order = await razorpay.orders.create(options);

  return {
    id: order.id,
    currency: order.currency,
    amount: order.amount,
  };
}
