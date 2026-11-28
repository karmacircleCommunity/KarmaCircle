import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as eventService from "./event.service";
import {
  AttendeesQuery,
  CheckInBody,
  CreateEventInput,
  InviteBody,
  JoinBody,
  ListEventsQuery,
  MyEventsQuery,
  UpdateEventInput,
} from "./event.validation";
import {
  sendEventInvitation,
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
} from "../../config/mailer";
import { logger } from "../../config/logger";
import { effectiveAccess } from "./event.model";
import { presentEvent, presentEvents } from "./event.presenter";
import {
  notifyDeclined,
  notifyEventCancelled,
  notifyEventChanged,
  notifyOrganizerOfRequest,
} from "./event.notifications";

export async function listEvents(req: Request, res: Response) {
  const { uid, slug, host, search, period, mode, type, access, page, limit } =
    req.query as unknown as ListEventsQuery;
  const eventUid = uid ?? slug;
  // Set by `optionalAuth`: a signed-in organization sees its own drafts, and
  // the host and the people going see an event's meeting link.
  const viewerEmail = (req as Request & { auth?: { email: string } }).auth
    ?.email;

  if (eventUid) {
    const event = await eventService.findViewableByUid(eventUid, viewerEmail);

    if (!event) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res
      .status(STATUS_CODE.OK)
      .json(await presentEvent(event, viewerEmail));
  }

  const ownsHandle = await eventService.viewerOwnsHandle(viewerEmail, host);
  const { data, total } = await eventService.findAll(
    { host, search, period, mode, type, access },
    toSkipLimit({ page, limit }),
    { includeDrafts: ownsHandle },
  );
  const events = await presentEvents(data, viewerEmail);
  return res.status(STATUS_CODE.OK).json({
    // The host's own list also says how many people are waiting on them.
    data: ownsHandle ? await eventService.withRequestCounts(events) : events,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
}

export async function listMyEvents(req: AuthenticatedRequest, res: Response) {
  const { page, limit, period } = req.query as unknown as MyEventsQuery;
  const { events, statusByUid, total } = await eventService.findForAttendee(
    req.auth.email,
    { ...toSkipLimit({ page, limit }), period },
  );
  const data = (await presentEvents(events, req.auth.email)).map((event) => ({
    ...event,
    registrationStatus: statusByUid.get(event.uid) ?? "going",
  }));

  return res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
}

export async function createEvent(req: AuthenticatedRequest, res: Response) {
  const email = req.auth.email;
  const savedEvent = await eventService.createEvent(
    email,
    req.body as CreateEventInput,
  );

  res.status(STATUS_CODE.CREATED).json({
    message: "Event Created",
    savedEvent: await presentEvent(savedEvent, email),
  });
}

export async function updateEvent(req: AuthenticatedRequest, res: Response) {
  const { event, changes } = await eventService.updateEvent(
    req.auth.email,
    req.params.uid,
    req.body as UpdateEventInput,
  );
  if (changes) await notifyEventChanged(event, changes);

  res.status(STATUS_CODE.OK).json({
    message: "Event Updated",
    event: await presentEvent(event, req.auth.email),
  });
}

export async function publishEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.publishEvent(req.auth.email, req.params.uid);

  res.status(STATUS_CODE.OK).json({
    message: "Event Published",
    event: await presentEvent(event, req.auth.email),
  });
}

export async function unpublishEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.unpublishEvent(
    req.auth.email,
    req.params.uid,
  );

  res.status(STATUS_CODE.OK).json({
    message: "Event Unpublished",
    event: await presentEvent(event, req.auth.email),
  });
}

export async function deleteDraft(req: AuthenticatedRequest, res: Response) {
  await eventService.deleteDraft(req.auth.email, req.params.uid);

  res.status(STATUS_CODE.OK).json({ message: "Draft Deleted" });
}

export async function cancelEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.cancelEvent(req.auth.email, req.params.uid);
  await notifyEventCancelled(event);

  res.status(STATUS_CODE.OK).json({
    message: "Event Cancelled",
    event: await presentEvent(event, req.auth.email),
  });
}

export async function joinEvent(req: AuthenticatedRequest, res: Response) {
  const result = await eventService.joinEvent(
    req.auth.email,
    req.params.uid,
    (req.body as JoinBody).note,
  );
  const going = result.status === "going";
  let emailSent = false;
  // Only a send that was tried and refused. Development and test send nothing,
  // which is not a failure the person should be warned about.
  let emailFailed = false;

  // A new request or waitlist spot waits on the organizer, so tell them.
  if (
    !result.alreadyJoined &&
    (result.status === "pending" || result.status === "waitlisted")
  ) {
    await notifyOrganizerOfRequest(
      result.event,
      result.attendee.name || "",
      result.status,
    );
  }

  // Only a person who is going gets the confirmation and counts toward the
  // organizer's joined notice.
  if (!result.alreadyJoined && going) {
    try {
      emailSent = await sendEventJoinConfirmation(
        result.attendee.email,
        result.attendee.name || "",
        result.event,
      );
    } catch (error) {
      emailFailed = true;
      logger.error(
        {
          error,
          eventUid: result.event.uid,
          attendeeEmail: result.attendee.email,
        },
        "Event joined but confirmation email failed",
      );
    }

    // Best effort, like the attendee's own confirmation: a failed notice never
    // undoes the registration.
    try {
      const organizerEmail = await eventService.findOrganizerEmail(
        result.event,
      );
      if (organizerEmail) {
        await sendEventJoinOrganizerNotice(
          organizerEmail,
          result.event,
          result.attendee.name || "",
        );
      }
    } catch (error) {
      logger.error(
        { error, eventUid: result.event.uid },
        "Event joined but organizer notice failed",
      );
    }
  }

  const message = result.alreadyJoined
    ? going
      ? "You have already joined this event."
      : result.status === "waitlisted"
        ? "You are already on the waitlist for this event."
        : "You have already asked to join this event."
    : going
      ? "You joined this event."
      : result.status === "waitlisted"
        ? "This event is full, so you are on the waitlist."
        : "Your request was sent to the organizer.";

  return res
    .status(result.alreadyJoined ? STATUS_CODE.OK : STATUS_CODE.CREATED)
    .json({
      message,
      joined: going,
      status: result.status,
      alreadyJoined: result.alreadyJoined,
      emailSent,
      emailFailed,
    });
}

export async function leaveEvent(req: AuthenticatedRequest, res: Response) {
  await eventService.leaveEvent(req.auth.email, req.params.uid);

  return res.status(STATUS_CODE.OK).json({
    message: "You left this event.",
    joined: false,
  });
}

export async function listAttendees(req: AuthenticatedRequest, res: Response) {
  const { page, limit, search, status } =
    req.query as unknown as AttendeesQuery;
  const { event, data, total, summary } = await eventService.listAttendees(
    req.auth.email,
    req.params.uid,
    { search, status, ...toSkipLimit({ page, limit }) },
  );

  return res.status(STATUS_CODE.OK).json({
    event: {
      uid: event.uid,
      name: event.name,
      status: event.status,
      capacity: event.capacity,
      access: effectiveAccess(event),
      waitlistEnabled: event.waitlistEnabled !== false,
    },
    data,
    pagination: buildPaginationMeta({ page, limit, total }),
    summary,
  });
}

export async function exportAttendees(
  req: AuthenticatedRequest,
  res: Response,
) {
  const csv = await eventService.exportAttendeesCsv(
    req.auth.email,
    req.params.uid,
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${req.params.uid.replace(/[^a-z0-9-]/gi, "")}-attendees.csv"`,
  );
  return res.status(STATUS_CODE.OK).send(csv);
}

export async function checkInAttendee(
  req: AuthenticatedRequest,
  res: Response,
) {
  const attendee = await eventService.setCheckIn(
    req.auth.email,
    req.params.uid,
    req.params.registrationId,
    (req.body as CheckInBody).checkedIn,
  );

  return res.status(STATUS_CODE.OK).json({ attendee });
}

export async function getRegistrationStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  const status = await eventService.getRegistrationStatus(
    req.auth.email,
    req.params.uid,
  );
  return res.status(STATUS_CODE.OK).json(status);
}

/**
 * Approves a request or promotes someone off the waitlist (PG-4, PG-14). The
 * person is emailed that their place is confirmed, in production only and best
 * effort; a failed email never undoes the approval.
 */
export async function approveAttendee(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { event, attendee, changed } = await eventService.approveRegistration(
    req.auth.email,
    req.params.uid,
    req.params.registrationId,
  );

  if (changed) {
    try {
      await sendEventJoinConfirmation(attendee.email, attendee.name, event);
    } catch (error) {
      logger.error(
        { error, eventUid: event.uid, attendeeEmail: attendee.email },
        "Registration approved but confirmation email failed",
      );
    }
  }

  return res.status(STATUS_CODE.OK).json({ attendee });
}

/**
 * Declines or removes a person (PG-4, PG-14) and tells them, unless they were
 * already declined.
 */
export async function declineAttendee(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { event, attendee, previousStatus } =
    await eventService.declineRegistration(
      req.auth.email,
      req.params.uid,
      req.params.registrationId,
    );
  if (previousStatus) {
    await notifyDeclined(event, attendee, previousStatus);
  }

  return res.status(STATUS_CODE.OK).json({ attendee });
}

export async function inviteAttendees(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { event, invited, skipped } = await eventService.inviteByEmail(
    req.auth.email,
    req.params.uid,
    (req.body as InviteBody).emails,
  );

  // One email per new invite, best effort and production only.
  const organizerName = event.hostName;
  for (const address of invited) {
    try {
      await sendEventInvitation(address, event, organizerName);
    } catch (error) {
      logger.error(
        { error, eventUid: event.uid, inviteeEmail: address },
        "Invite saved but invitation email failed",
      );
    }
  }

  return res.status(STATUS_CODE.CREATED).json({ invited, skipped });
}

export async function listInvites(req: AuthenticatedRequest, res: Response) {
  const data = await eventService.listInvites(req.auth.email, req.params.uid);
  return res.status(STATUS_CODE.OK).json({ data, total: data.length });
}

export async function revokeInvite(req: AuthenticatedRequest, res: Response) {
  await eventService.revokeInvite(
    req.auth.email,
    req.params.uid,
    req.params.inviteId,
  );
  return res.status(STATUS_CODE.OK).json({ message: "Invite removed" });
}

export async function listInvitations(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { page, limit } = req.query as unknown as {
    page: number;
    limit: number;
  };
  const { data, total } = await eventService.findInvitedFor(
    req.auth.email,
    toSkipLimit({ page, limit }),
  );

  return res.status(STATUS_CODE.OK).json({
    data: await presentEvents(data, req.auth.email),
    pagination: buildPaginationMeta({ page, limit, total }),
  });
}
