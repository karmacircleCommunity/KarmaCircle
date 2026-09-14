import mongoose, { Document, Schema } from "mongoose";

/**
 * A record of one Razorpay order created for an organization's
 * "Support"/sponsorship flow — what resolves the long-standing known
 * issue that this API minted Razorpay orders without ever persisting them
 * (see docs/specs/known-issues.md). Nothing about a generic donation
 * exists here yet; this is scoped to the one payment flow this app
 * actually has today, an organization's own sponsorship button.
 */
export const ORDER_STATUS = {
  Created: "created",
  Paid: "paid",
  Failed: "failed",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export interface IOrder extends Document {
  organizationHandle: string;
  /** Paise, matching the amount Razorpay itself was given. */
  amountPaise: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  supporterName?: string;
  supporterEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    organizationHandle: { type: String, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 100 },
    currency: { type: String, required: true, default: "INR" },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.Created,
      index: true,
    },
    supporterName: { type: String, trim: true },
    supporterEmail: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
