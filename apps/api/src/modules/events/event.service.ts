import { FilterQuery } from "mongoose";
import { factsOf } from "../notifications/notification.jobs";
import {
  cancelReminder,
  notifyEventCancelled,
  notifyEventUpdated,
  scheduleReminder,
} from "../notifications/notification.service";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import {
  findByOwnerEmail,
  findOrCreateForOwner,
} from "../organizations/organization.service";
import { Organization } from "../organizations/organization.model";
import { findByEmail, findByUsername } from "../users/user.service";
import {
  CreateEventInput,
  UpdateEventInput,
  assertEventRules,
} from "./event.validation";
import { Event, EventRegistration, IEvent } from "./event.model";
import type { EventType } from "./event.constants";

export async function findByUid(uid: string) {
  return Event.findOne({ uid });
}

/**
 * The event for a public action (join, leave, registration check). A draft
 * (PG-15) does not exist to anyone but its organization, so it answers as not
 * found here rather than admitting it is there.
 */
export async function findPublicByUid(uid: string) {
  return Event.findOne({ uid, status: { $ne: "draft" } });
}

/** Whether `email` is the organization that hosts `event`. Never throws. */
async function isHostOf(email: string, event: IEvent) {
  const host = await findByEmail(email);
  if (!host || host.userType !== "organization") return false;

  const organization = await findByOwnerEmail(email);
  return (
    (organization !== null && event.organizerHandle === organization.handle) ||
    event.hostUsername === host.userName
  );
}

/**
 * The event as `viewerEmail` may see it (PG-15): a published or cancelled event
 * to anyone, a draft only to the organization that hosts it. `null` when the
 * event does not exist or is a draft the viewer does not own.
 */
export async function findViewableByUid(uid: string, viewerEmail?: string) {
  const event = await findByUid(uid);
  if (!event) return null;
  if (event.status !== "draft") return event;
  return viewerEmail && (await isHostOf(viewerEmail, event)) ? event : null;
}

/**
 * Whether `viewerEmail` is the organization `handle`. Lets the host list
 * include its own drafts while the same URL stays public for everyone else.
 */
export async function viewerOwnsHandle(
  viewerEmail: string | undefined,
  handle: string | undefined,
) {
  if (!viewerEmail || !handle) return false;
  const organization = await findByOwnerEmail(viewerEmail);
  return organization !== null && organization.handle === handle;
}

export interface EventListFilters {
  host?: string;
  search?: string;
  period?: "upcoming" | "past";
  mode?: "Online" | "Offline" | "Hybrid";
  inviteOnly?: boolean;
  type?: EventType;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function findAll(
  filters: EventListFilters,
  pagination: { skip: number; limit: number },
  options: { includeDrafts?: boolean } = {},
) {
  const conditions: FilterQuery<IEvent>[] = [];

  // Drafts (PG-15) are listed only for the organization that owns them.
  if (!options.includeDrafts) conditions.push({ status: { $ne: "draft" } });

  if (filters.host) {
    // `organizerHandle` is the real link (see event.model.ts); matching
    // `hostUsername` too keeps this working for events created before that
    // field existed, with no backfill migration needed — for an
    // organization host the two values have always been identical anyway
    // (`hostUsername` is set from the same `userName`/`handle`).
    conditions.push({
      $or: [{ hostUsername: filters.host }, { organizerHandle: filters.host }],
    });
  }

  if (filters.search) {
    // Escaped, so the text is matched literally and never read as a pattern.
    const pattern = new RegExp(escapeRegExp(filters.search), "i");
    conditions.push({
      $or: [
        { name: pattern },
        { city: pattern },
        { hostName: pattern },
        { tags: pattern },
      ],
    });
  }

  if (filters.period) {
    const now = new Date();
    conditions.push({
      startTime: filters.period === "upcoming" ? { $gte: now } : { $lt: now },
    });
  }

  if (filters.mode) conditions.push({ mode: filters.mode });
  if (filters.type) conditions.push({ eventType: filters.type });

  if (filters.inviteOnly !== undefined) {
    // Events saved before `inviteOnly` existed have no value, and read as
    // open to everyone, so "open" must match a missing field too.
    conditions.push(
      filters.inviteOnly ? { inviteOnly: true } : { inviteOnly: { $ne: true } },
    );
  }

  const query: FilterQuery<IEvent> = conditions.length
    ? { $and: conditions }
    : {};

  // `_id` breaks ties between events that start at the same moment, so a
  // page boundary can never repeat or skip one.
  // Newest first for `past`, and for one host's whole list (`host` with no
  // `period`): a host with more events than fit in a page must keep its
  // newest and upcoming ones, and lose its oldest. Every other list is
  // soonest first.
  const newestFirst =
    filters.period === "past" ||
    (filters.period === undefined && !!filters.host);
  const direction = newestFirst ? -1 : 1;
  const [data, total] = await Promise.all([
    Event.find(query)
      .sort({ startTime: direction, _id: direction })
      .skip(pagination.skip)
      .limit(pagination.limit),
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
  // Friendly early answer. This is not race-safe on its own: the unique
  // index on `uid` is the real guard, handled at `save()` below.
  const existingEvent = await Event.exists({ uid: data.uid });
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

  // `capacity: null` only means "remove the limit" when editing; on create it
  // just means no limit, so it is dropped rather than stored as null.
  const { capacity, ...fields } = data;
  const event = new Event({
    ...withoutNulls(fields),
    ...(capacity ? { capacity } : {}),
    hostName: host.name,
    hostUsername: host.userName,
    organizerHandle: organization.handle,
  });
  // Only the chosen mode's fields are kept, as on edit.
  for (const field of staleFieldsFor(event.mode)) event.set(field, undefined);

  try {
    return await event.save();
  } catch (error) {
    // Two organizers submitting the same address at once can both pass the
    // pre-check above; the unique index rejects the loser with 11000.
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(
        STATUS_CODE.CONFLICT,
        STATUS_MESSAGE.EVENT_UID_ALREADY_EXISTS,
      );
    }
    throw error;
  }
}

/**
 * Loads an event for an organizer action (edit or cancel) and checks that the
 * caller owns it. `404` unknown event, `401` the token's account is gone,
 * `403 NOT_AN_ORGANIZATION` for a personal account, `403` for another
 * organization's event. Ownership matches the real `organizerHandle` link, or
 * the legacy free-text `hostUsername` for events saved before that field
 * existed (the same two-way match `findAll`'s `host` filter uses).
 */
async function findManagedEvent(email: string, uid: string) {
  const event = await findByUid(uid);
  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }

  const host = await findByEmail(email);
  if (!host) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  if (host.userType !== "organization") {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  const organization = await findByOwnerEmail(email);
  const ownsEvent =
    (organization !== null &&
      event.organizerHandle === organization.handle) ||
    event.hostUsername === host.userName;
  if (!ownsEvent) {
    throw new AppError(STATUS_CODE.FORBIDDEN, STATUS_MESSAGE.FORBIDDEN);
  }

  return event;
}

/** Edits and cancellations stop once an event is over, or already cancelled. */
function assertEventStillOpen(event: IEvent, action: "edited" | "cancelled") {
  if (event.status === "cancelled") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      action === "edited"
        ? "A cancelled event cannot be edited."
        : "This event is already cancelled.",
    );
  }
  if (event.endTime.getTime() < Date.now()) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `An event that has already ended cannot be ${action}.`,
    );
  }
}

const OFFLINE_ONLY_FIELDS = [
  "address",
  "city",
  "state",
  "country",
  "mapIframe",
  "gettingThere",
] as const;
const ONLINE_ONLY_FIELDS = [
  "platform",
  "platformLink",
  "linkDelivery",
  "joinRequirements",
] as const;

/**
 * The fields that do not belong to a mode and are therefore dropped: an Online
 * event has no venue, an Offline one no join link, and a Hybrid one (PG-10)
 * keeps both.
 */
function staleFieldsFor(mode: IEvent["mode"]): readonly string[] {
  if (mode === "Online") return OFFLINE_ONLY_FIELDS;
  if (mode === "Offline") return ONLINE_ONLY_FIELDS;
  return [];
}

/** A create body with its `null`s (meaningful only when editing) dropped. */
function withoutNulls<T extends Record<string, unknown>>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== null),
  ) as { [K in keyof T]: Exclude<T[K], null> };
}

/**
 * Sets or removes an event's capacity (PG-5). Setting one recounts
 * `registrationCount` from the real registrations, because the counter is not
 * trusted for an event that never had a capacity (it may predate the field),
 * and refuses a limit below the number of people already registered.
 */
async function applyCapacity(event: IEvent, capacity: number | null) {
  if (capacity === null) {
    event.set("capacity", undefined);
    return;
  }

  const registered = await EventRegistration.countDocuments({
    eventUid: event.uid,
  });
  if (capacity < registered) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `Capacity cannot be lower than the ${registered} ${registered === 1 ? "person" : "people"} already registered.`,
    );
  }
  event.capacity = capacity;
  event.registrationCount = registered;
}

/**
 * Edits an event. The page address (`uid`) never changes. The merged event
 * must still satisfy the create rules, except that a start time left alone may
 * already be in the past (an event in progress can still fix a typo), and only
 * the fields of the chosen mode are kept, so switching an event from Offline
 * to Online drops its address instead of leaving it stored but hidden.
 */
export async function updateEvent(
  email: string,
  uid: string,
  data: UpdateEventInput,
): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  assertEventStillOpen(event, "edited");
  // What the event was before this edit, to tell the people who joined what changed.
  const before = factsOf(event);

  const startChanged =
    data.startTime !== undefined &&
    data.startTime.getTime() !== event.startTime.getTime();
  const merged = {
    mode: data.mode ?? event.mode,
    startTime: data.startTime ?? event.startTime,
    endTime: data.endTime ?? event.endTime,
    city: "city" in data ? data.city : event.city,
    state: "state" in data ? data.state : event.state,
    country: "country" in data ? data.country : event.country,
    address: "address" in data ? data.address : event.address,
    platform: "platform" in data ? data.platform : event.platform,
    platformLink:
      "platformLink" in data ? data.platformLink : event.platformLink,
  };
  assertEventRules(merged, { requireFutureStart: startChanged });

  const { capacity, ...fields } = data;
  // `null` removes an optional field; anything else replaces it.
  for (const [key, value] of Object.entries(fields)) {
    event.set(key, value === null ? undefined : value);
  }
  if (capacity !== undefined) await applyCapacity(event, capacity);
  for (const field of staleFieldsFor(merged.mode)) event.set(field, undefined);

  const saved = await event.save();
  await notifyEventUpdated(before, saved);
  return saved;
}

/**
 * Cancels an event: the status flips to `cancelled`, the event stays public
 * with a badge, and new joins are refused. Existing registrations are kept.
 * Telling registered attendees is not built yet (PG-18).
 */
export async function cancelEvent(email: string, uid: string): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "draft") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "A draft has not been published, so there is nothing to cancel. Delete it instead.",
    );
  }
  assertEventStillOpen(event, "cancelled");

  event.status = "cancelled";
  event.cancelledAt = new Date();
  const saved = await event.save();
  await notifyEventCancelled(saved);
  return saved;
}

/**
 * Makes a draft public (PG-15). The event has to be as valid as a new one: the
 * start must still be in the future, and the mode's fields must be present
 * (a draft saved last month may have drifted). `409` for an event that is not a
 * draft, or has ended.
 */
export async function publishEvent(email: string, uid: string): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "published") {
    throw new AppError(STATUS_CODE.CONFLICT, "This event is already published.");
  }
  if (event.status === "cancelled") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "A cancelled event cannot be published.",
    );
  }

  assertEventRules(
    {
      mode: event.mode,
      startTime: event.startTime,
      endTime: event.endTime,
      city: event.city,
      state: event.state,
      country: event.country,
      address: event.address,
      platform: event.platform,
      platformLink: event.platformLink,
    },
    { requireFutureStart: true },
  );

  event.status = "published";
  return event.save();
}

/**
 * Takes a published event back to a draft, hidden from everyone but its
 * organization (PG-15). Refused with `409` once anyone has registered (the
 * event is cancelled instead, which keeps them informed of what happened), for
 * a cancelled or ended event, and for one that is already a draft.
 */
export async function unpublishEvent(email: string, uid: string): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "draft") {
    throw new AppError(STATUS_CODE.CONFLICT, "This event is already a draft.");
  }
  assertEventStillOpen(event, "cancelled");

  const registered = await EventRegistration.countDocuments({ eventUid: uid });
  if (registered > 0) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `${registered} ${registered === 1 ? "person has" : "people have"} already registered, so this event cannot go back to a draft. Cancel it instead.`,
    );
  }

  event.status = "draft";
  return event.save();
}

/**
 * Deletes a draft for good (PG-15). Only a draft can go: it was never public
 * and has no registrations, so nothing depends on it. A published or cancelled
 * event answers `409` (cancel instead; published events are never deleted).
 */
export async function deleteDraft(email: string, uid: string): Promise<void> {
  const event = await findManagedEvent(email, uid);
  if (event.status !== "draft") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "Only a draft can be deleted. Cancel a published event instead.",
    );
  }
  await Event.deleteOne({ _id: event._id });
}

export async function joinEvent(email: string, uid: string) {
  const [event, attendee] = await Promise.all([
    findPublicByUid(uid),
    findByEmail(email),
  ]);

  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  if (event.status === "cancelled") {
    throw new AppError(STATUS_CODE.CONFLICT, "This event was cancelled.");
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

  // Reserve a spot first, atomically: the update only matches while the event
  // has no capacity or the counter is still below it, so two people racing for
  // the last spot cannot both get it. It is given back if the registration
  // cannot be saved.
  const reserved = await Event.findOneAndUpdate(
    {
      uid,
      $or: [
        { capacity: null },
        { $expr: { $lt: [{ $ifNull: ["$registrationCount", 0] }, "$capacity"] } },
      ],
    },
    { $inc: { registrationCount: 1 } },
    { new: true },
  );
  if (!reserved) {
    throw new AppError(STATUS_CODE.CONFLICT, "This event is full.");
  }

  let registration;
  try {
    registration = await EventRegistration.create({
      eventUid: uid,
      userId: attendee._id,
      attendeeEmail: attendee.email,
      attendeeName: attendee.name || "",
    });
  } catch (error) {
    await releaseSpot(uid);
    // The compound unique index closes the concurrent double-click race.
    if ((error as { code?: number }).code !== 11000) throw error;
    return { event, attendee, alreadyJoined: true };
  }

  await scheduleReminder(reserved, {
    registrationId: String(registration._id),
    email: attendee.email,
    name: attendee.name || "",
  });
  return { event: reserved, attendee, alreadyJoined: false };
}

/** Gives one spot back. Never drops the counter below zero. */
async function releaseSpot(uid: string) {
  await Event.updateOne(
    { uid, registrationCount: { $gt: 0 } },
    { $inc: { registrationCount: -1 } },
  );
}

/**
 * An attendee gives up their registration (PG-3). `404` for an unknown event,
 * `409` once the event has started (a registration from then on is a record of
 * who was there), `404` if they were not registered. A cancelled event can
 * still be left. The freed spot is released for the next person.
 */
export async function leaveEvent(email: string, uid: string) {
  const [event, attendee] = await Promise.all([
    findPublicByUid(uid),
    findByEmail(email),
  ]);

  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  if (event.startTime.getTime() < Date.now()) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "This event has already started, so you can no longer leave it.",
    );
  }

  const removed = await EventRegistration.findOne({
    eventUid: uid,
    userId: attendee._id,
  }).select("_id");
  // `deletedCount` decides who removed it, so two simultaneous leaves cannot
  // both give the spot back.
  const deleted = removed
    ? await EventRegistration.deleteOne({ _id: removed._id })
    : null;
  if (!removed || deleted?.deletedCount !== 1) {
    throw new AppError(
      STATUS_CODE.NOT_FOUND,
      "You are not registered for this event.",
    );
  }

  await releaseSpot(uid);
  await cancelReminder(event, String(removed._id));
  return { event, attendee };
}

/**
 * Where to send the organizer a notice about their event (PG-6): the owning
 * organization's `ownerEmail`, or for an event saved before `organizerHandle`
 * existed, the host user's own email. `null` if neither can be found.
 */
export async function findOrganizerEmail(event: IEvent): Promise<string | null> {
  if (event.organizerHandle) {
    const organization = await Organization.findOne({
      handle: event.organizerHandle,
    });
    if (organization) return organization.ownerEmail;
  }
  const host = await findByUsername(event.hostUsername);
  return host?.email ?? null;
}

function toAttendee(registration: {
  _id: unknown;
  attendeeName: string;
  attendeeEmail: string;
  createdAt: Date;
  checkedInAt?: Date | null;
}) {
  return {
    id: String(registration._id),
    name: registration.attendeeName,
    email: registration.attendeeEmail,
    joinedAt: registration.createdAt,
    checkedIn: Boolean(registration.checkedInAt),
    checkedInAt: registration.checkedInAt ?? null,
  };
}

/**
 * The organizer's attendee list for one event (PG-6): one page of
 * registrations oldest first, optionally narrowed by a literal search on name or
 * email, plus overall totals. Only the hosting organization can read it; the
 * public never sees attendee identities.
 */
export async function listAttendees(
  email: string,
  uid: string,
  query: { search?: string; skip: number; limit: number },
) {
  const event = await findManagedEvent(email, uid);

  const filter: FilterQuery<unknown> = { eventUid: uid };
  if (query.search) {
    const pattern = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ attendeeName: pattern }, { attendeeEmail: pattern }];
  }

  const [rows, matching, registered, checkedIn] = await Promise.all([
    EventRegistration.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(query.skip)
      .limit(query.limit)
      .lean(),
    EventRegistration.countDocuments(filter),
    EventRegistration.countDocuments({ eventUid: uid }),
    EventRegistration.countDocuments({
      eventUid: uid,
      checkedInAt: { $exists: true, $ne: null },
    }),
  ]);

  return {
    event,
    data: rows.map(toAttendee),
    total: matching,
    summary: { registered, checkedIn },
  };
}

/** One CSV cell: quoted, and neutralized if a spreadsheet would run it. */
function csvCell(value: string) {
  // A leading = + - @ tab or CR makes Excel and Sheets treat the cell as a
  // formula, and a name or email is attacker-controlled text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Every registration for an event as CSV, for the host (PG-6). */
export async function exportAttendeesCsv(email: string, uid: string) {
  await findManagedEvent(email, uid);

  const rows = await EventRegistration.find({ eventUid: uid })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const header = ["Name", "Email", "Registered at", "Checked in", "Checked in at"];
  const lines = rows.map((row) => {
    const attendee = toAttendee(row);
    return [
      attendee.name,
      attendee.email,
      attendee.joinedAt.toISOString(),
      attendee.checkedIn ? "Yes" : "No",
      attendee.checkedInAt ? attendee.checkedInAt.toISOString() : "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

/**
 * Marks one attendee as checked in or not (PG-6). Host only. `409` for a
 * cancelled event, `404` if the registration is not for this event. Checking in
 * someone already checked in keeps the original time.
 */
export async function setCheckIn(
  email: string,
  uid: string,
  registrationId: string,
  checkedIn: boolean,
) {
  const event = await findManagedEvent(email, uid);
  if (event.status === "cancelled") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "A cancelled event has no check-in.",
    );
  }

  const registration = await EventRegistration.findOne({
    _id: registrationId,
    eventUid: uid,
  });
  if (!registration) {
    throw new AppError(STATUS_CODE.NOT_FOUND, "Registration not found.");
  }

  if (checkedIn && !registration.checkedInAt) {
    registration.checkedInAt = new Date();
    await registration.save();
  } else if (!checkedIn && registration.checkedInAt) {
    registration.set("checkedInAt", undefined);
    await registration.save();
  }

  return toAttendee(registration);
}

export async function getRegistrationStatus(email: string, uid: string) {
  const event = await findPublicByUid(uid);
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
