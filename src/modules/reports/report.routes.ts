import { Router } from "express";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as reportController from "./report.controller";
import { createReportSchema } from "./report.validation";

const router = Router();

/**
 * @openapi
 * /user/report:
 *   post:
 *     summary: Report a problem (rate-limited to one per email every 2 hours)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, reportmessage]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               reportmessage: { type: string }
 *     responses:
 *       200: { description: Report submitted }
 *       429: { description: Already reported recently }
 */
router.post("/report", validate(createReportSchema), asyncHandler(reportController.createReport));

export default router;
