import { Router } from "express";
import {
  AuthenticatedRequest,
  optionalAuth,
  requireAuth,
} from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as eventController from "./event.controller";
import { paginationQuerySchema } from "../../utils/pagination";
import {
  attendeeParamsSchema,
  attendeesQuerySchema,
  checkInBodySchema,
  createEventSchema,
  eventUidParamsSchema,
  inviteBodySchema,
  inviteParamsSchema,
  joinBodySchema,
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
 * /events/invitations:
 *   get:
 *     summary: Upcoming events the authenticated person was invited to
 *     description: >
 *       The events an organizer invited the person's email to that the person has
 *       not joined yet. Drafts, cancelled and started events are left out.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200: { description: "{ data, pagination }" }
 *       401: { description: Unauthorized }
 */
router.get(
  "/invitations",
  requireAuth,
  validate(paginationQuerySchema, "query"),
  asyncHandler<AuthenticatedRequest>(eventController.listInvitations),
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
 *         description: Case-insensitive text match on the event name, city, host name and tags
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: period
 *         description: Only events starting from now on (upcoming) or before now (past). Omit for both.
 *         schema: { type: string, enum: [upcoming, past] }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [Online, Offline, Hybrid] }
 *       - in: query
 *         name: type
 *         description: What kind of event it is
 *         schema: { type: string, enum: [volunteering, fundraiser, workshop, awareness, meetup, cultural, other] }
 *       - in: query
 *         name: access
 *         description: "Who can join: open (anyone), approval (the organizer approves each person) or invite (only invited emails)"
 *         schema: { type: string, enum: [open, approval, invite] }
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
  optionalAuth,
  validate(listEventsQuerySchema, "query"),
  asyncHandler(eventController.listEvents),
);

/**
 * @openapi
 * /events/{uid}/join:
 *   post:
 *     summary: Join an upcoming public event, or ask to join it
 *     description: >
 *       What happens depends on the event's access level and the person. An
 *       invited email goes straight in on any level and ignores the capacity.
 *       An open event takes the person (status going), or puts them on the
 *       waitlist when it is full and the waitlist is on. An approval event makes
 *       them pending (or waitlisted when it is full). An invite-only event
 *       refuses anyone not invited. The confirmation email goes only to people
 *       who are going, in production only.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: { type: string, maxLength: 300, description: "Shown to the organizer when the person is asking to join" }
 *     responses:
 *       201: { description: "{ message, joined, status (going, pending or waitlisted), alreadyJoined, emailSent }" }
 *       200: { description: Already registered, with the existing status }
 *       401: { description: Unauthorized }
 *       403: { description: The event is invite-only and the person was not invited, or the organizer declined them }
 *       404: { description: Event not found }
 *       409: { description: Event has already started, was cancelled, or is full with no waitlist }
 */
router.post(
  "/:uid/join",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  validate(joinBodySchema),
  asyncHandler<AuthenticatedRequest>(eventController.joinEvent),
);

/**
 * @openapi
 * /events/{uid}/registration:
 *   get:
 *     summary: The authenticated person's standing for an event
 *     description: >
 *       `status` is going, pending, waitlisted, declined or none. `joined` is true
 *       only for going. `invited` says an unused invitation exists for the
 *       person's email.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ joined, status, invited }" }
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
 *       registration time, status, note and check-in state, plus overall totals
 *       for every status. Only people going are listed unless `status` says
 *       otherwise. Host only; the public never sees attendee identities.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [going, pending, waitlisted, declined, all], default: going }
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
 *       200: { description: "{ event, data, pagination, summary: { registered, checkedIn, pending, waitlisted, declined } }" }
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
 *       link must start with http:// or https://. A Hybrid event needs both sets. A uid that is already taken
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
 *               status: { type: string, enum: [draft, published], description: "draft saves the event hidden from everyone but its organization; published (the default) makes it public. Publish, unpublish and cancel move it afterwards" }
 *               name: { type: string, minLength: 10, maxLength: 80 }
 *               description: { type: string, minLength: 20, maxLength: 200 }
 *               coverImage:
 *                 type: string
 *                 description: >
 *                   Either an https link (up to 2048 characters) or a base64
 *                   data URL of a PNG, JPEG, WebP or GIF image
 *                   (data:image/png;base64,...) that decodes to 5 MB or less.
 *                   http links, SVG and other data types are rejected.
 *               mode: { type: string, enum: [Online, Offline, Hybrid], description: "Hybrid needs both the in-person fields and the online ones" }
 *               startTime: { type: string, format: date-time, description: Must be in the future }
 *               endTime: { type: string, format: date-time, description: Must be after startTime }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               access: { type: string, enum: [open, approval, invite], default: open, description: "Who can join: open (anyone), approval (the organizer approves each person) or invite (only invited emails)" }
 *               waitlistEnabled: { type: boolean, default: true, description: "Whether a full event takes a waitlist" }
 *               timezone: { type: string, example: Asia/Kolkata, description: "The IANA timezone the event is held in. Does not move startTime or endTime; it says which clock the organizer meant" }
 *               eventType: { type: string, enum: [volunteering, fundraiser, workshop, awareness, meetup, cultural, other], description: "What kind of event it is. Optional in the API; the web form requires it" }
 *               tags: { type: array, maxItems: 8, items: { type: string, maxLength: 30 }, description: "Free-text tags, lower-cased and de-duplicated. [] clears them on edit" }
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
 *               mode: { type: string, enum: [Online, Offline, Hybrid], description: "Hybrid needs both the in-person fields and the online ones" }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               access: { type: string, enum: [open, approval, invite] }
 *               waitlistEnabled: { type: boolean }
 *               timezone: { type: string, example: Asia/Kolkata, description: "The IANA timezone the event is held in. Does not move startTime or endTime; it says which clock the organizer meant" }
 *               eventType: { type: string, enum: [volunteering, fundraiser, workshop, awareness, meetup, cultural, other], description: "What kind of event it is. Optional in the API; the web form requires it" }
 *               tags: { type: array, maxItems: 8, items: { type: string, maxLength: 30 }, description: "Free-text tags, lower-cased and de-duplicated. [] clears them on edit" }
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
 * /events/{uid}/publish:
 *   post:
 *     summary: Publish a draft event
 *     description: >
 *       Makes a draft public. The event must still pass the create rules (the
 *       start in the future, the mode's fields present). Host only.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message: Event Published, event }" }
 *       400: { description: The draft no longer passes the create rules }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: Already published, cancelled or ended }
 */
router.post(
  "/:uid/publish",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.publishEvent),
);

/**
 * @openapi
 * /events/{uid}/unpublish:
 *   post:
 *     summary: Take a published event back to a draft
 *     description: >
 *       Hides the event from everyone but its organization. Refused with 409 once
 *       anyone has registered (cancel the event instead), and for a cancelled or
 *       ended event. Host only.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message: Event Unpublished, event }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: Already a draft, cancelled, ended or has registrations }
 */
router.post(
  "/:uid/unpublish",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.unpublishEvent),
);

/**
 * @openapi
 * /events/{uid}:
 *   delete:
 *     summary: Delete a draft event
 *     description: >
 *       Only a draft can be deleted (it was never public and has no registrations).
 *       A published or cancelled event answers 409. Host only.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message: Draft Deleted }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: The event is not a draft }
 */
router.delete(
  "/:uid",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.deleteDraft),
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

/**
 * @openapi
 * /events/{uid}/attendees/{registrationId}/approve:
 *   post:
 *     summary: Approve a request, promote someone off the waitlist, or reverse a decline
 *     description: >
 *       Host only. The person becomes going and takes a spot, past the capacity if
 *       the event is full (the limit is soft). Approving someone already going
 *       changes nothing. A cancelled or ended event answers 409.
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
 *     responses:
 *       200: { description: "{ attendee }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event or registration not found }
 *       409: { description: The event was cancelled or has ended }
 */
router.post(
  "/:uid/attendees/:registrationId/approve",
  requireAuth,
  validate(attendeeParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.approveAttendee),
);

/**
 * @openapi
 * /events/{uid}/attendees/{registrationId}/decline:
 *   post:
 *     summary: Decline a request or waitlisted person, or remove someone who was going
 *     description: >
 *       Host only. The record stays as declined, so the person cannot ask again
 *       unless the organizer approves them later. A freed spot is released when
 *       the person was going. A cancelled event answers 409.
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
 *     responses:
 *       200: { description: "{ attendee }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event or registration not found }
 *       409: { description: The event was cancelled }
 */
router.post(
  "/:uid/attendees/:registrationId/decline",
  requireAuth,
  validate(attendeeParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.declineAttendee),
);

/**
 * @openapi
 * /events/{uid}/invites:
 *   get:
 *     summary: The emails invited to an event
 *     description: Host only. Newest first, each with whether the person has joined.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ data: [{ id, email, invitedAt, joined }], total }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 */
router.get(
  "/:uid/invites",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.listInvites),
);

/**
 * @openapi
 * /events/{uid}/invites:
 *   post:
 *     summary: Invite people to an event by email
 *     description: >
 *       Host only. An invited person must sign in with that exact email, and can
 *       then join on any access level, past the capacity. Emails already invited
 *       or already registered are skipped and reported. The invitation email goes
 *       out in production only. A draft, cancelled or ended event, or one past
 *       its limit of 200 invites, answers 409.
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
 *             required: [emails]
 *             properties:
 *               emails: { type: array, minItems: 1, maxItems: 50, items: { type: string, format: email } }
 *     responses:
 *       201: { description: "{ invited: string[], skipped: [{ email, reason }] }" }
 *       400: { description: Invalid emails }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event not found }
 *       409: { description: Draft, cancelled or ended event, or too many invites }
 */
router.post(
  "/:uid/invites",
  requireAuth,
  validate(eventUidParamsSchema, "params"),
  validate(inviteBodySchema),
  asyncHandler<AuthenticatedRequest>(eventController.inviteAttendees),
);

/**
 * @openapi
 * /events/{uid}/invites/{inviteId}:
 *   delete:
 *     summary: Take an invite back
 *     description: Host only. Refused with 409 once the person has joined through it.
 *     tags: [Events]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: "{ message: Invite removed }" }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization, or not the event's own host }
 *       404: { description: Event or invite not found }
 *       409: { description: The person already joined through the invite }
 */
router.delete(
  "/:uid/invites/:inviteId",
  requireAuth,
  validate(inviteParamsSchema, "params"),
  asyncHandler<AuthenticatedRequest>(eventController.revokeInvite),
);

export default router;
