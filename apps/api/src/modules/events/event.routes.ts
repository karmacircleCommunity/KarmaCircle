import { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as eventController from "./event.controller";
import {
  attendeeParamsSchema,
  attendeesQuerySchema,
  checkInBodySchema,
  createEventSchema,
  eventUidParamsSchema,
  listEventsQuerySchema,
  myEventsQuerySchema,
  updateEventSchema,
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
 *       409: { description: Event has already started, was cancelled, or is full }
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
 * /events/{uid}/attendees:
 *   get:
 *     summary: The attendee list for an event the authenticated organization hosts
 *     description: >
 *       One page of registrations, oldest first, with each person's name, email,
 *       registration time and check-in state, plus overall totals. Host only; the
 *       public never sees attendee identities.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         description: Case-insensitive literal match on the name or email
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "{ event, data, pagination, summary: { registered, checkedIn } }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 */
router.get(
  "/:uid/attendees",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  validate(attendeesQuerySchema, "query"),
  asyncHandler<AuthenticatedRequest>(eventController.listAttendees),
);

/**
 * @openapi
 * /events/{uid}/attendees/export:
 *   get:
 *     summary: Download the attendee list as CSV
 *     description: Host only. Every registration, with cells that a spreadsheet could run as a formula neutralized.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: text/csv }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 */
router.get(
  "/:uid/attendees/export",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.exportAttendees),
);

/**
 * @openapi
 * /events/{uid}/attendees/{registrationId}:
 *   patch:
 *     summary: Check an attendee in, or undo it
 *     description: Host only. Checking in someone already checked in keeps the original time. A cancelled event answers 409.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [checkedIn]
 *             properties:
 *               checkedIn: { type: boolean }
 *     responses:
 *       200: { description: "{ attendee }" }
 *       400: { description: Invalid registration id or body }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event or registration not found }
 *       409: { description: The event was cancelled }
 */
router.patch(
  "/:uid/attendees/:registrationId",
  requireAuth,
  validate(attendeeParamsSchema, "params"),
  validate(checkInBodySchema),
  asyncHandler<AuthenticatedRequest>(eventController.checkInAttendee),
);

/**
 * @openapi
 * /events/{uid}/registration:
 *   delete:
 *     summary: Leave an event the authenticated attendee joined
 *     description: >
 *       Removes the caller's registration and gives the spot back. Allowed until
 *       the event starts, including for a cancelled event.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message, joined: false }" }
 *       401: { description: Unauthorized }
 *       404: { description: Event not found, or the caller was not registered }
 *       409: { description: The event has already started }
 */
router.delete(
  "/:uid/registration",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.leaveEvent),
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
 *               capacity: { type: integer, minimum: 1, maximum: 100000, description: "Most people who can join. Omit for no limit" }
 *               about: { type: array, maxItems: 20, items: { type: string, maxLength: 2000 }, description: "Long-form paragraphs for About this event" }
 *               contactEmail: { type: string, format: email, maxLength: 254 }
 *               cost: { type: object, description: "Absent means free; amount must be above zero", properties: { amount: { type: number, exclusiveMinimum: 0, maximum: 10000000 }, currency: { type: string, description: "3-letter code, upper-cased", example: INR }, note: { type: string, maxLength: 200 } } }
 *               bringAlong: { type: array, maxItems: 20, items: { type: string, maxLength: 100 } }
 *               languages: { type: array, maxItems: 10, items: { type: string, maxLength: 40 } }
 *               minimumAge: { type: integer, minimum: 1, maximum: 120 }
 *               agenda: { type: array, maxItems: 30, items: { type: object, required: [time, title], properties: { time: { type: string, maxLength: 30 }, title: { type: string, maxLength: 100 }, detail: { type: string, maxLength: 200 } } } }
 *               gettingThere: { type: string, maxLength: 500, description: Offline events only }
 *               linkDelivery: { type: string, maxLength: 300, description: Online events only }
 *               joinRequirements: { type: string, maxLength: 300, description: Online events only }
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

/**
 * @openapi
 * /events/{uid}:
 *   patch:
 *     summary: Edit an event the authenticated organization hosts
 *     description: >
 *       Send any subset of the create fields except `uid` (the page address
 *       never changes; sending it is a 400). The stored event merged with the
 *       body must still pass the create rules. A start time that is left alone
 *       may already be in the past, but a new start time must be in the future.
 *       Switching the mode drops the other mode's fields. A cancelled event or
 *       one that has already ended answers 409.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 10, maxLength: 80 }
 *               description: { type: string, minLength: 20, maxLength: 200 }
 *               coverImage: { type: string, description: Same rules as create. Omit to keep the current cover }
 *               mode: { type: string, enum: [Online, Offline] }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               inviteOnly: { type: boolean }
 *               capacity: { type: integer, minimum: 1, maximum: 100000, nullable: true, description: "A number sets the limit (not below the people already registered, else 409); null removes it" }
 *               details: { description: "The detail fields below are also accepted. On edit, null removes cost, minimumAge, contactEmail, gettingThere, linkDelivery and joinRequirements, and [] clears a list" }
 *               about: { type: array, maxItems: 20, items: { type: string, maxLength: 2000 }, description: "Long-form paragraphs for About this event" }
 *               contactEmail: { type: string, format: email, maxLength: 254 }
 *               cost: { type: object, description: "Absent means free; amount must be above zero", properties: { amount: { type: number, exclusiveMinimum: 0, maximum: 10000000 }, currency: { type: string, description: "3-letter code, upper-cased", example: INR }, note: { type: string, maxLength: 200 } } }
 *               bringAlong: { type: array, maxItems: 20, items: { type: string, maxLength: 100 } }
 *               languages: { type: array, maxItems: 10, items: { type: string, maxLength: 40 } }
 *               minimumAge: { type: integer, minimum: 1, maximum: 120 }
 *               agenda: { type: array, maxItems: 30, items: { type: object, required: [time, title], properties: { time: { type: string, maxLength: 30 }, title: { type: string, maxLength: 100 }, detail: { type: string, maxLength: 200 } } } }
 *               gettingThere: { type: string, maxLength: 500, description: Offline events only }
 *               linkDelivery: { type: string, maxLength: 300, description: Online events only }
 *               joinRequirements: { type: string, maxLength: 300, description: Online events only }
 *               city: { type: string, maxLength: 100 }
 *               state: { type: string, maxLength: 100 }
 *               country: { type: string, maxLength: 100 }
 *               address: { type: string, maxLength: 200 }
 *               mapIframe: { type: string }
 *               platform: { type: string, maxLength: 60 }
 *               platformLink: { type: string, maxLength: 2048 }
 *     responses:
 *       200: { description: "{ message: Event Updated, event }" }
 *       400: { description: Validation failed, or an unknown key such as uid }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: The event is cancelled or has already ended }
 */
router.patch(
  "/:uid",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  validate(updateEventSchema),
  asyncHandler<AuthenticatedRequest>(eventController.updateEvent),
);

/**
 * @openapi
 * /events/{uid}/cancel:
 *   post:
 *     summary: Cancel an event the authenticated organization hosts
 *     description: >
 *       Sets the event's status to cancelled. The event stays public with a
 *       cancelled badge, new joins are refused with 409, and existing
 *       registrations are kept. There is no reinstate and no delete.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message: Event Cancelled, event }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: Already cancelled, or the event has already ended }
 */
router.post(
  "/:uid/cancel",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.cancelEvent),
);

export default router;
