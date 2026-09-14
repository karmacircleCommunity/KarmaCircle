import { z } from "zod";
import { organizationHandleParamSchema } from "../organizations/organization.validation";

export const createOrderSchema = z.object({
  amount: z.number().positive(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Reused as-is: a Razorpay order amount is a rupee figure either way. */
export const organizationOrderParamSchema = organizationHandleParamSchema;

export const createSponsorshipOrderSchema = z.object({
  amount: z.number().positive().max(1000000),
  supporterName: z.string().trim().max(120).optional(),
  supporterEmail: z.string().trim().email().optional(),
});

/**
 * Exactly the three fields Razorpay's Checkout `handler` callback hands
 * back on success — see
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#step-5-verify-the-payment-signature.
 * All three are required: signature verification is meaningless with any
 * one of them missing.
 */
export const verifySponsorshipPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export type OrganizationOrderParam = z.infer<typeof organizationOrderParamSchema>;
export type CreateSponsorshipOrderInput = z.infer<typeof createSponsorshipOrderSchema>;
export type VerifySponsorshipPaymentInput = z.infer<typeof verifySponsorshipPaymentSchema>;
