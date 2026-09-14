import { FilterQuery } from "mongoose";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { findByOwnerEmail } from "../organizations/organization.service";
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
    // `organizerHandle` is the real link (see event.model.ts); matching
    // `hostUsername` too keeps this working for events created before that
    // field existed, with no backfill migration needed — for an
    // organization host the two values have always been identical anyway
    // (`hostUsername` is set from the same `userName`/`handle`).
    query.$or = [
      { hostUsername: filters.host },
      { organizerHandle: filters.host },
    ];
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

  // Real link, not string matching: looked up from the host's own
  // organization record rather than trusted off the request body. `null`
  // for an individual host — findByOwnerEmail only ever matches an
  // organization's own collection.
  const organization =
    host.userType === "organization" ? await findByOwnerEmail(email) : null;

  const event = new Event({
    ...data,
    hostName: host.name,
    hostUsername: host.userName,
    organizerHandle: organization?.handle,
  });

  return event.save();
}
