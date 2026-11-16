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
  ListEventsQuery,
  MyEventsQuery,
  UpdateEventInput,
} from "./event.validation";
import {
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
} from "../../config/mailer";
import { logger } from "../../config/logger";

export async function listEvents(req: Request, res: Response) {
  const {
    uid,
    slug,
    host,
    search,
    period,
    mode,
    type,
    inviteOnly,
    page,
    limit,
  } = req.query as unknown as ListEventsQuery;
  const eventUid = uid ?? slug;
  // Set by `optionalAuth`: a signed-in organization sees its own drafts.
  const viewerEmail = (req as Request & { auth?: { email: string } }).auth
    ?.email;

  if (eventUid) {
    const event = await eventService.findViewableByUid(eventUid, viewerEmail);

    if (!event) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res.status(STATUS_CODE.OK).json(event);
  }

  const { data, total } = await eventService.findAll(
    { host, search, period, mode, type, inviteOnly },
    toSkipLimit({ page, limit }),
    { includeDrafts: await eventService.viewerOwnsHandle(viewerEmail, host) },
  );
  return res
    .status(STATUS_CODE.OK)
    .json({ data, pagination: buildPaginationMeta({ page, limit, total }) });
}

export async function listMyEvents(req: AuthenticatedRequest, res: Response) {
  const { page, limit, period } = req.query as unknown as MyEventsQuery;
  const { data, total } = await eventService.findForAttendee(req.auth.email, {
    skip: (page - 1) * limit,
    limit,
    period,
  });

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

  res
    .status(STATUS_CODE.CREATED)
    .json({ message: "Event Created", savedEvent });
}

export async function updateEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.updateEvent(
    req.auth.email,
    req.params.uid,
    req.body as UpdateEventInput,
  );

  res.status(STATUS_CODE.OK).json({ message: "Event Updated", event });
}

export async function publishEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.publishEvent(req.auth.email, req.params.uid);

  res.status(STATUS_CODE.OK).json({ message: "Event Published", event });
}

export async function unpublishEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.unpublishEvent(
    req.auth.email,
    req.params.uid,
  );

  res.status(STATUS_CODE.OK).json({ message: "Event Unpublished", event });
}

export async function deleteDraft(req: AuthenticatedRequest, res: Response) {
  await eventService.deleteDraft(req.auth.email, req.params.uid);

  res.status(STATUS_CODE.OK).json({ message: "Draft Deleted" });
}

export async function cancelEvent(req: AuthenticatedRequest, res: Response) {
  const event = await eventService.cancelEvent(req.auth.email, req.params.uid);

  res.status(STATUS_CODE.OK).json({ message: "Event Cancelled", event });
}

export async function joinEvent(req: AuthenticatedRequest, res: Response) {
  const result = await eventService.joinEvent(req.auth.email, req.params.uid);
  let emailSent = false;

  if (!result.alreadyJoined) {
    try {
      emailSent = await sendEventJoinConfirmation(
        result.attendee.email,
        result.attendee.name || "",
        result.event,
      );
    } catch (error) {
      logger.error(
        {
          error,
          eventUid: result.event.uid,
          attendeeEmail: result.attendee.email,
        },
        "Event joined but confirmation email failed",
      );
    }
  }

  if (!result.alreadyJoined) {
    // Best effort, like the attendee's own confirmation: a failed notice never
    // undoes the registration.
    try {
      const organizerEmail = await eventService.findOrganizerEmail(result.event);
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

  return res
    .status(result.alreadyJoined ? STATUS_CODE.OK : STATUS_CODE.CREATED)
    .json({
      message: result.alreadyJoined
        ? "You have already joined this event."
        : "You joined this event.",
      joined: true,
      alreadyJoined: result.alreadyJoined,
      emailSent,
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
  const { page, limit, search } = req.query as unknown as AttendeesQuery;
  const { event, data, total, summary } = await eventService.listAttendees(
    req.auth.email,
    req.params.uid,
    { search, ...toSkipLimit({ page, limit }) },
  );

  return res.status(STATUS_CODE.OK).json({
    event: {
      uid: event.uid,
      name: event.name,
      status: event.status,
      capacity: event.capacity,
    },
    data,
    pagination: buildPaginationMeta({ page, limit, total }),
    summary,
  });
}

export async function exportAttendees(req: AuthenticatedRequest, res: Response) {
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

export async function checkInAttendee(req: AuthenticatedRequest, res: Response) {
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
