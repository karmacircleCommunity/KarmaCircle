import { Router } from "express";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as paymentController from "./payment.controller";
import { createOrderSchema } from "./payment.validation";

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

export default router;
