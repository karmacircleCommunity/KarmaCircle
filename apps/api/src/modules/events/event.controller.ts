import { Request, Response } from "express";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AuthenticatedRequest } from "../../middleware/auth";
import { AppError } from "../../middleware/error-handler";
import { buildPaginationMeta, toSkipLimit } from "../../utils/pagination";
import * as eventService from "./event.service";
import { CreateEventInput, ListEventsQuery } from "./event.validation";

export async function listEvents(req: Request, res: Response) {
  const { uid, slug, page, limit } = req.query as unknown as ListEventsQuery;
  const eventUid = uid ?? slug;

  if (eventUid) {
    const event = await eventService.findByUid(eventUid);

    if (!event) {
      throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.NOT_FOUND);
    }

    return res.status(STATUS_CODE.OK).json(event);
  }

  const { data, total } = await eventService.findAll(
    toSkipLimit({ page, limit }),
  );
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
