import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as eventController from "./event.controller";
import { createEventSchema, listEventsQuerySchema } from "./event.validation";

const router = Router();

/**
 * @openapi
 * /events:
 *   get:
 *     summary: Get an event by uid, or list events (paginated, optionally by host)
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: uid
 *         schema: { type: string }
 *       - in: query
 *         name: host
 *         description: A host's userName — returns only that host's own events
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "A single event (if uid/slug is set), or { data, pagination } otherwise" }
 *       404: { description: Not found }
 */
router.get(
  "/",
  validate(listEventsQuerySchema, "query"),
  asyncHandler(eventController.listEvents),
);

/**
 * @openapi
 * /events/create:
 *   post:
 *     summary: Create a new event, hosted by the authenticated user
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uid, name, description, coverImage, mode, startTime, endTime, startDate, endDate]
 *             properties:
 *               uid: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               coverImage: { type: string }
 *               mode: { type: string, enum: [Online, Offline] }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               city: { type: string }
 *               state: { type: string }
 *               country: { type: string }
 *               address: { type: string }
 *               mapIframe: { type: string }
 *     responses:
 *       201: { description: Event created }
 *       400: { description: Validation failed }
 *       401: { description: Unauthorized }
 *       409: { description: uid already exists }
 */
router.post(
  "/create",
  requireAuth,
  validate(createEventSchema),
  asyncHandler<AuthenticatedRequest>(eventController.createEvent),
);

export default router;
