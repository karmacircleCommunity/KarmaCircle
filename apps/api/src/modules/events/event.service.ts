import { FilterQuery } from "mongoose";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import { findOrCreateForOwner } from "../organizations/organization.service";
import { findByEmail } from "../users/user.service";
import { CreateEventInput } from "./event.validation";
import { Event, EventRegistration, IEvent } from "./event.model";

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

export async function findForAttendee(
  email: string,
  pagination: {
    skip: number;
    limit: number;
    period: "upcoming" | "past";
  },
) {
  const attendee = await findByEmail(email);
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }

  const registrations = await EventRegistration.find({ userId: attendee._id })
    .select({ eventUid: 1 })
    .lean();
  const eventUids = registrations.map(({ eventUid }) => eventUid);
  if (eventUids.length === 0) return { data: [], total: 0 };

  const now = new Date();
  const query = {
    uid: { $in: eventUids },
    startTime: pagination.period === "upcoming" ? { $gte: now } : { $lt: now },
  };
  const sort = pagination.period === "upcoming" ? 1 : -1;
  const [data, total] = await Promise.all([
    Event.find(query)
      .sort({ startTime: sort, uid: sort })
      .skip(pagination.skip)
      .limit(pagination.limit),
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

  // Every event on the circle is an NGO-run drive, not something a plain
  // individual account hosts - so `organizerHandle` below must never be
  // unset for a newly created event (September 2026; see events.md). This
  // was previously optional (`organization?.handle`, `null` for a
  // non-organization host), which meant a card/detail page for one of
  // those events had no way to link back anywhere.
  if (host.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  // `findOrCreateForOwner`, not `findByOwnerEmail` - backfills the
  // Organization document for an account that predates that collection,
  // the same guarantee `organization.controller.ts#getMine`/`updateMine`
  // already rely on, so this never resolves to nothing for a real
  // organization host.
  const organization = await findOrCreateForOwner({
    email,
    userName: host.userName,
    name: host.name,
  });

  const event = new Event({
    ...data,
    hostName: host.name,
    hostUsername: host.userName,
    organizerHandle: organization.handle,
  });

  return event.save();
}

export async function joinEvent(email: string, uid: string) {
  const [event, attendee] = await Promise.all([
    findByUid(uid),
    findByEmail(email),
  ]);

  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  if (event.inviteOnly) {
    throw new AppError(STATUS_CODE.FORBIDDEN, "This event is invite-only.");
  }
  if (event.startTime.getTime() < Date.now()) {
    throw new AppError(STATUS_CODE.CONFLICT, "This event has already started.");
  }

  const existing = await EventRegistration.findOne({
    eventUid: uid,
    userId: attendee._id,
  });
  if (existing) return { event, attendee, alreadyJoined: true };

  try {
    await EventRegistration.create({
      eventUid: uid,
      userId: attendee._id,
      attendeeEmail: attendee.email,
      attendeeName: attendee.name || "",
    });
  } catch (error) {
    // The compound unique index closes the concurrent double-click race.
    if ((error as { code?: number }).code !== 11000) throw error;
    return { event, attendee, alreadyJoined: true };
  }

  return { event, attendee, alreadyJoined: false };
}

export async function getRegistrationStatus(email: string, uid: string) {
  const event = await findByUid(uid);
  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }

  const attendee = await findByEmail(email);
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }

  const registration = await EventRegistration.exists({
    eventUid: uid,
    userId: attendee._id,
  });
  return { joined: Boolean(registration) };
}
