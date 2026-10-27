import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as eventService from "./event.service";
import {
  CreateEventInput,
  ListEventsQuery,
  MyEventsQuery,
} from "./event.validation";
import { sendEventJoinConfirmation } from "../../config/mailer";
import { logger } from "../../config/logger";

export async function listEvents(req: Request, res: Response) {
  const { uid, slug, host, page, limit } =
    req.query as unknown as ListEventsQuery;
  const eventUid = uid ?? slug;

  if (eventUid) {
    const event = await eventService.findByUid(eventUid);

    if (!event) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res.status(STATUS_CODE.OK).json(event);
  }

  const { data, total } = await eventService.findAll(
    { host },
    toSkipLimit({ page, limit }),
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

export async function joinEvent(req: AuthenticatedRequest, res: Response) {
  const result = await eventService.joinEvent(req.auth.email, req.params.uid);
  let emailSent = false;

  if (!result.alreadyJoined) {
    try {
      await sendEventJoinConfirmation(
        result.attendee.email,
        result.attendee.name || "",
        result.event,
      );
      emailSent = true;
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
