import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as eventController from "./event.controller";
import {
  createEventSchema,
  eventUidParamsSchema,
  listEventsQuerySchema,
  myEventsQuerySchema,
} from "./event.validation";

const router = Router();

/**
 * @openapi
 * /events/mine:
 *   get:
 *     summary: List events the authenticated attendee joined
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [upcoming, past], default: upcoming }
 *     responses:
 *       200: { description: "{ data, pagination }" }
 *       401: { description: Unauthorized }
 */
router.get(
  "/mine",
  requireAuth,
  validate(myEventsQuerySchema, "query"),
  asyncHandler<AuthenticatedRequest>(eventController.listMyEvents),
);

/**
 * @openapi
 * /events:
 *   get:
 *     summary: Get an event by uid, or list events (filtered, paginated)
 *     description: >
 *       Without `uid`, returns one page of events sorted by `startTime` and
 *       then `_id`, so a page never repeats or skips an event. The order is
 *       soonest first, except `period=past` and a `host` list with no
 *       `period`, which are most recent first (so a host with more events
 *       than one page holds keeps its newest and upcoming ones).
 *       `pagination.total` counts every event that matches the filters.
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
 *         name: search
 *         description: Case-insensitive text match on the event name, city and host name
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: period
 *         description: Only events starting from now on (upcoming) or before now (past). Omit for both.
 *         schema: { type: string, enum: [upcoming, past] }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [Online, Offline] }
 *       - in: query
 *         name: inviteOnly
 *         description: "true for invite-only events, false for events open to everyone"
 *         schema: { type: string, enum: ["true", "false"] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "A single event (if uid/slug is set), or { data, pagination } otherwise" }
 *       400: { description: Invalid query }
 *       404: { description: Not found }
 */
router.get(
  "/",
  validate(listEventsQuerySchema, "query"),
  asyncHandler(eventController.listEvents),
);

/**
 * @openapi
 * /events/{uid}/join:
 *   post:
 *     summary: Join an upcoming public event and email the attendee a confirmation
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Event joined; confirmation email is sent only in production and reported in emailSent }
 *       200: { description: Already joined }
 *       401: { description: Unauthorized }
 *       403: { description: Event is invite-only }
 *       404: { description: Event not found }
 *       409: { description: Event has already started }
 */
router.post(
  "/:uid/join",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.joinEvent),
);

/**
 * @openapi
 * /events/{uid}/registration:
 *   get:
 *     summary: Check whether the authenticated attendee joined an event
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ joined: boolean }" }
 *       401: { description: Unauthorized }
 *       404: { description: Event not found }
 */
router.get(
  "/:uid/registration",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.getRegistrationStatus),
);

/**
 * @openapi
 * /events/create:
 *   post:
 *     summary: Create a new event, hosted by the authenticated organization
 *     description: >
 *       The start time must be in the future and the end time must be after
 *       the start time. An Offline event needs city, state, country and
 *       address. An Online event needs platform and platformLink, and the
 *       link must start with http:// or https://. A uid that is already taken
 *       (including by a request that races this one) answers 409.
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
 *               uid:
 *                 type: string
 *                 description: >
 *                   The event page address. Lowercase letters and numbers
 *                   joined by single hyphens. These words are reserved and
 *                   rejected: mine, new, create, edit, admin, api.
 *                 pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *               name: { type: string, minLength: 10, maxLength: 80 }
 *               description: { type: string, minLength: 20, maxLength: 200 }
 *               coverImage:
 *                 type: string
 *                 description: >
 *                   Either an https link (up to 2048 characters) or a base64
 *                   data URL of a PNG, JPEG, WebP or GIF image
 *                   (data:image/png;base64,...) that decodes to 5 MB or less.
 *                   http links, SVG and other data types are rejected.
 *               mode: { type: string, enum: [Online, Offline] }
 *               startTime: { type: string, format: date-time, description: Must be in the future }
 *               endTime: { type: string, format: date-time, description: Must be after startTime }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               inviteOnly: { type: boolean, description: "Label only for now: joining an invite-only event is refused with 403" }
 *               city: { type: string, maxLength: 100, description: Required when mode is Offline }
 *               state: { type: string, maxLength: 100, description: Required when mode is Offline }
 *               country: { type: string, maxLength: 100, description: Required when mode is Offline }
 *               address: { type: string, maxLength: 200, description: Required when mode is Offline }
 *               mapIframe: { type: string }
 *               platform: { type: string, maxLength: 60, description: Required when mode is Online }
 *               platformLink: { type: string, maxLength: 2048, description: Required when mode is Online, must start with http:// or https:// }
 *     responses:
 *       201: { description: Event created }
 *       400: { description: "Validation failed: a length, pattern, reserved uid, cover image, date rule or mode-specific required field above" }
 *       401: { description: Unauthorized }
 *       403: { description: The authenticated account is not an organization }
 *       409: { description: uid already exists }
 */
router.post(
  "/create",
  requireAuth,
  validate(createEventSchema),
  asyncHandler<AuthenticatedRequest>(eventController.createEvent),
);

export default router;
