import { Router } from "express";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as paymentController from "./payment.controller";
import {
  createOrderSchema,
  createSponsorshipOrderSchema,
  organizationOrderParamSchema,
  verifySponsorshipPaymentSchema,
} from "./payment.validation";

const router = Router();

/**
 * @openapi
 * /payment/razorpay:
 *   post:
 *     summary: Create a Razorpay order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, description: "Amount in rupees" }
 *     responses:
 *       200: { description: Order created }
 */
router.post("/razorpay", validate(createOrderSchema), asyncHandler(paymentController.createOrder));

/**
 * @openapi
 * /payment/organizations/{handle}/order:
 *   post:
 *     summary: Create a Razorpay order to support a live, sponsorship-enabled organization
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: handle
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, description: "Amount in rupees" }
 *               supporterName: { type: string }
 *               supporterEmail: { type: string }
 *     responses:
 *       200: { description: Order created }
 *       403: { description: Organization has not turned sponsorship on }
 *       404: { description: Unknown or non-live organization }
 */
router.post(
  "/organizations/:handle/order",
  validate(organizationOrderParamSchema, "params"),
  validate(createSponsorshipOrderSchema),
  asyncHandler(paymentController.createSponsorshipOrder),
);

/**
 * @openapi
 * /payment/organizations/{handle}/verify:
 *   post:
 *     summary: Verify a completed Razorpay Checkout payment and credit the organization
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: handle
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id: { type: string }
 *               razorpay_payment_id: { type: string }
 *               razorpay_signature: { type: string }
 *     responses:
 *       200: { description: "{ status, raisedViaPlatform }" }
 *       400: { description: Signature did not match }
 *       404: { description: No matching order }
 */
router.post(
  "/organizations/:handle/verify",
  validate(organizationOrderParamSchema, "params"),
  validate(verifySponsorshipPaymentSchema),
  asyncHandler(paymentController.verifySponsorshipPayment),
);

export default router;
