import { FilterQuery } from "mongoose";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { findByEmail } from "../users/user.service";
import { CreateEventInput } from "./event.validation";
import { Event, IEvent } from "./event.model";

export async function findByUid(uid: string) {
  return Event.findOne({ uid });
}

export async function findAll(
  filters: { host?: string },
  pagination: { skip: number; limit: number },
) {
  const query: FilterQuery<IEvent> = {};

  if (filters.host) {
    query.hostUsername = filters.host;
  }

  const [data, total] = await Promise.all([
    Event.find(query).skip(pagination.skip).limit(pagination.limit),
    Event.countDocuments(query),
  ]);
  return { data, total };
}

export async function createEvent(
  email: string,
  data: CreateEventInput,
): Promise<IEvent> {
  const existingEvent = await Event.findOne({ uid: data.uid });
  if (existingEvent) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      STATUS_MESSAGE.EVENT_UID_ALREADY_EXISTS,
    );
  }

  const host = await findByEmail(email);
  if (!host) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }

  const event = new Event({
    ...data,
    hostName: host.name,
    hostUsername: host.userName,
  });

  return event.save();
}
