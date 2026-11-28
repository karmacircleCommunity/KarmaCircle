import { Error as MongooseError, FilterQuery } from "mongoose";
import { STATUS_CODE, STATUS_MESSAGE } from "../../constants/http-status";
import { AppError } from "../../middleware/error-handler";
import {
  findByOwnerEmail,
  findOrCreateForOwner,
} from "../organizations/organization.service";
import { Organization } from "../organizations/organization.model";
import { findByEmail, findByUsername } from "../users/user.service";
import type { IUser } from "../users/user.model";
import {
  CreateEventInput,
  UpdateEventInput,
  assertEventRules,
} from "./event.validation";
import {
  Event,
  EventInvite,
  EventRegistration,
  IEvent,
  effectiveAccess,
} from "./event.model";
import {
  EVENT_INVITES_PER_EVENT_MAX,
  type EventAccess,
  type EventType,
  type RegistrationStatus,
} from "./event.constants";

/**
 * Matches the registrations that hold a spot. A row saved before `status`
 * existed has none and is going, which `$nin` matches too.
 */
export const GOING = {
  status: { $nin: ["pending", "waitlisted", "declined"] },
} as const;

/** The status of a registration, with the pre-`status` rows read as going. */
const statusOf = (registration: { status?: RegistrationStatus | null }) =>
  registration.status ?? "going";

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

/** What it takes to recognize the events an organization account hosts. */
export interface HostIdentity {
  /** Absent for an account that predates the organizations collection. */
  handle?: string;
  userName: string;
}

/** `null` for a personal account, which hosts nothing. */
export async function findHostIdentity(
  user: IUser,
): Promise<HostIdentity | null> {
  if (user.userType !== "organization") return null;
  const organization = await findByOwnerEmail(user.email);
  return { handle: organization?.handle, userName: user.userName };
}

/**
 * The one ownership rule: the real `organizerHandle` link, or the legacy
 * free-text `hostUsername` for events saved before that field existed (the same
 * two-way match `findAll`'s `host` filter uses).
 */
export function isHostedBy(event: IEvent, host: HostIdentity) {
  return (
    (host.handle !== undefined && event.organizerHandle === host.handle) ||
    event.hostUsername === host.userName
  );
}

/** Whether `email` is the organization that hosts `event`. Never throws. */
async function isHostOf(email: string, event: IEvent) {
  const user = await findByEmail(email);
  if (!user) return false;
  const host = await findHostIdentity(user);
  return host !== null && isHostedBy(event, host);
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
  access?: EventAccess;
  type?: EventType;
}

/**
 * The filter for one access level. An event saved before `access` existed has
 * none: it is open, or approval-style if its old `inviteOnly` flag was set.
 */
function accessCondition(access: EventAccess): FilterQuery<IEvent> {
  if (access === "invite") return { access: "invite" };
  if (access === "approval") {
    return {
      $or: [{ access: "approval" }, { access: null, inviteOnly: true }],
    } as FilterQuery<IEvent>;
  }
  return {
    access: { $in: ["open", null] },
    inviteOnly: { $ne: true },
  } as FilterQuery<IEvent>;
}

/**
 * An event is upcoming until it ends, so one that is running now is still
 * upcoming; it is past once its `endTime` has gone by. Joining, leaving and
 * invitations are different questions: they close when the event starts.
 */
function periodCondition(period: "upcoming" | "past"): FilterQuery<IEvent> {
  const now = new Date();
  return { endTime: period === "upcoming" ? { $gte: now } : { $lt: now } };
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

  if (filters.period) conditions.push(periodCondition(filters.period));

  if (filters.mode) conditions.push({ mode: filters.mode });
  if (filters.type) conditions.push({ eventType: filters.type });

  if (filters.access) conditions.push(accessCondition(filters.access));

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
    .select({ eventUid: 1, status: 1 })
    .lean();
  // Each event carries the person's own standing (PG-14): going, asked to
  // join, on the waitlist, or not approved.
  const statusByUid = new Map(
    registrations.map((row) => [row.eventUid, statusOf(row)]),
  );
  if (registrations.length === 0) return { events: [], statusByUid, total: 0 };

  const query = {
    uid: { $in: [...statusByUid.keys()] },
    ...periodCondition(pagination.period),
  };
  const sort = pagination.period === "upcoming" ? 1 : -1;
  const [events, total] = await Promise.all([
    Event.find(query)
      .sort({ startTime: sort, uid: sort })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Event.countDocuments(query),
  ]);
  return { events, statusByUid, total };
}

/**
 * The upcoming events the attendee has been invited to by email (PG-4) and has
 * not joined yet: what the "Invited" tab of My Events lists. A draft or
 * cancelled event, one that has started, and one the person already holds a
 * registration for are left out.
 */
export async function findInvitedFor(
  email: string,
  pagination: { skip: number; limit: number },
) {
  const attendee = await findByEmail(email);
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }

  const invites = await EventInvite.find({
    email: attendee.email.toLowerCase(),
    usedAt: null,
  })
    .select({ eventUid: 1 })
    .lean();
  const invitedUids = invites.map(({ eventUid }) => eventUid);
  if (invitedUids.length === 0) return { data: [], total: 0 };

  const registered = await EventRegistration.find({
    userId: attendee._id,
    eventUid: { $in: invitedUids },
  })
    .select({ eventUid: 1 })
    .lean();
  const taken = new Set(registered.map(({ eventUid }) => eventUid));

  const query = {
    uid: { $in: invitedUids.filter((uid) => !taken.has(uid)) },
    // Not `status: "published"`: an event saved before `status` existed has
    // none, and reads as published.
    status: { $nin: ["draft", "cancelled"] },
    startTime: { $gte: new Date() },
  };
  const [data, total] = await Promise.all([
    Event.find(query)
      .sort({ startTime: 1, uid: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Event.countDocuments(query),
  ]);
  return { data, total };
}

/**
 * Adds `requestCount` (people waiting on the organizer: pending requests and
 * the waitlist) to each event, for the host's own list (PG-14). One grouped
 * query for the whole page, never per event.
 */
export async function withRequestCounts<T extends { uid: string }>(
  events: T[],
) {
  if (events.length === 0) return [];
  const counts = await EventRegistration.aggregate<{
    _id: string;
    count: number;
  }>([
    {
      $match: {
        eventUid: { $in: events.map((event) => event.uid) },
        status: { $in: ["pending", "waitlisted"] },
      },
    },
    { $group: { _id: "$eventUid", count: { $sum: 1 } } },
  ]);
  const byUid = new Map(counts.map((row) => [row._id, row.count]));
  return events.map((event) => ({
    ...event,
    requestCount: byUid.get(event.uid) ?? 0,
  }));
}

/** Someone else changed or removed the event between our read and our write. */
const eventChanged = () =>
  new AppError(STATUS_CODE.CONFLICT, STATUS_MESSAGE.EVENT_CHANGED);

/**
 * Saves a loaded event. The schema's optimistic concurrency refuses the write
 * when the event was saved or deleted since it was read, which is a `409`.
 */
async function saveEvent(event: IEvent): Promise<IEvent> {
  try {
    return await event.save();
  } catch (error) {
    if (
      error instanceof MongooseError.VersionError ||
      error instanceof MongooseError.DocumentNotFoundError
    ) {
      throw eventChanged();
    }
    throw error;
  }
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
    ...withoutEmpty(fields),
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
 * caller owns it (see `isHostedBy`). `404` unknown event, `401` the token's
 * account is gone, `403 NOT_AN_ORGANIZATION` for a personal account, `403` for
 * another organization's event.
 */
async function findManagedEvent(email: string, uid: string) {
  const event = await findByUid(uid);
  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }

  const user = await findByEmail(email);
  if (!user) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }
  const host = await findHostIdentity(user);
  if (!host) {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      STATUS_MESSAGE.NOT_AN_ORGANIZATION,
    );
  }

  if (!isHostedBy(event, host)) {
    throw new AppError(STATUS_CODE.FORBIDDEN, STATUS_MESSAGE.FORBIDDEN);
  }

  return event;
}

/** What an organizer can only do while an event is neither over nor cancelled. */
type OpenEventAction = "edit" | "cancel" | "unpublish" | "decide";

/** How each action is refused for a cancelled event, and for an ended one. */
const CLOSED_EVENT_MESSAGES: Record<
  OpenEventAction,
  { cancelled: string; ended: string }
> = {
  edit: {
    cancelled: "A cancelled event cannot be edited.",
    ended: "An event that has already ended cannot be edited.",
  },
  cancel: {
    cancelled: "This event is already cancelled.",
    ended: "An event that has already ended cannot be cancelled.",
  },
  unpublish: {
    cancelled: "This event is already cancelled.",
    ended: "An event that has already ended cannot go back to a draft.",
  },
  decide: {
    cancelled: "This event was cancelled.",
    ended:
      "This event has already ended, so who is going can no longer change.",
  },
};

function assertEventStillOpen(event: IEvent, action: OpenEventAction) {
  if (event.status === "cancelled") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      CLOSED_EVENT_MESSAGES[action].cancelled,
    );
  }
  if (event.endTime.getTime() < Date.now()) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      CLOSED_EVENT_MESSAGES[action].ended,
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

/**
 * A create body with its empty values dropped: `null` is only meaningful when
 * editing, and `undefined` is what a blank draft field parses to.
 */
function withoutEmpty<T extends Record<string, unknown>>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  ) as { [K in keyof T]: Exclude<T[K], null> };
}

/**
 * Sets or removes an event's capacity (PG-5). Setting one recounts
 * `registrationCount` from the real registrations that are going, because the
 * counter is not trusted for an event that never had a capacity (it may
 * predate the field), and refuses a limit below the number of people going.
 * People pending or on the waitlist do not count.
 */
async function applyCapacity(event: IEvent, capacity: number | null) {
  if (capacity === null) {
    event.set("capacity", undefined);
    return;
  }

  const registered = await EventRegistration.countDocuments({
    eventUid: event.uid,
    ...GOING,
  });
  if (capacity < registered) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `Capacity cannot be lower than the ${registered} ${registered === 1 ? "person" : "people"} already going.`,
    );
  }
  event.capacity = capacity;
  event.registrationCount = registered;
}

/** What an edit changed that the people going need to hear about. */
export interface EventChanges {
  time: boolean;
  mode: boolean;
  /** The event has a venue and it is not the one it had. */
  venue: boolean;
  /** The event has a meeting link and it is not the one it had. */
  meetingLink: boolean;
}

/**
 * The parts of an event an attendee plans around. Times are compared to the
 * minute, which is all anyone is shown, and only the fields the mode uses count,
 * so clearing a leftover field the mode ignores is not a change.
 */
function planningDetails(event: IEvent) {
  const toMinute = (date: Date) => Math.floor(date.getTime() / 60_000);
  return {
    time: `${toMinute(event.startTime)}-${toMinute(event.endTime)}`,
    mode: event.mode,
    venue:
      event.mode === "Online"
        ? ""
        : JSON.stringify(
            [event.address, event.city, event.state, event.country].map(
              (part) => part ?? "",
            ),
          ),
    meetingLink: event.mode === "Offline" ? "" : (event.platformLink ?? ""),
  };
}

/** `null` when nothing an attendee plans around is different. */
function diffPlanningDetails(
  before: ReturnType<typeof planningDetails>,
  after: ReturnType<typeof planningDetails>,
): EventChanges | null {
  const changes: EventChanges = {
    time: before.time !== after.time,
    mode: before.mode !== after.mode,
    // Losing the venue or the link only happens with a change of mode, which
    // says so itself.
    venue: after.venue !== "" && before.venue !== after.venue,
    meetingLink:
      after.meetingLink !== "" && before.meetingLink !== after.meetingLink,
  };
  return Object.values(changes).some(Boolean) ? changes : null;
}

/**
 * Edits an event. The page address (`uid`) never changes. The merged event
 * must still satisfy the rules for its status (a draft may stay incomplete, a
 * published event may not become so), except that a start time left alone may
 * already be in the past (an event in progress can still fix a typo), and only
 * the fields of the chosen mode are kept, so switching an event from Offline
 * to Online drops its address instead of leaving it stored but hidden.
 * `changes` is what the people going should be told about: `null` for a draft,
 * and for an edit that moved nothing they plan around.
 */
export async function updateEvent(
  email: string,
  uid: string,
  data: UpdateEventInput,
): Promise<{ event: IEvent; changes: EventChanges | null }> {
  const event = await findManagedEvent(email, uid);
  assertEventStillOpen(event, "edit");
  const isDraft = event.status === "draft";

  const startChanged =
    data.startTime !== undefined &&
    data.startTime.getTime() !== event.startTime.getTime();
  const merged = {
    mode: data.mode ?? event.mode,
    startTime: data.startTime ?? event.startTime,
    endTime: data.endTime ?? event.endTime,
    description: "description" in data ? data.description : event.description,
    coverImage: "coverImage" in data ? data.coverImage : event.coverImage,
    city: "city" in data ? data.city : event.city,
    state: "state" in data ? data.state : event.state,
    country: "country" in data ? data.country : event.country,
    address: "address" in data ? data.address : event.address,
    platform: "platform" in data ? data.platform : event.platform,
    platformLink:
      "platformLink" in data ? data.platformLink : event.platformLink,
  };
  assertEventRules(
    merged,
    isDraft
      ? { requireFutureStart: startChanged, stage: "draft" }
      : {
          requireFutureStart: startChanged,
          stage: "published-edit",
          edited: new Set(Object.keys(data)),
        },
  );

  const before = planningDetails(event);
  const { capacity, ...fields } = data;
  // `null` (or a blank text) removes an optional field; anything else replaces
  // it.
  for (const [key, value] of Object.entries(fields)) {
    event.set(key, value === null ? undefined : value);
  }
  if (capacity !== undefined) await applyCapacity(event, capacity);
  for (const field of staleFieldsFor(merged.mode)) event.set(field, undefined);

  const saved = await saveEvent(event);
  return {
    event: saved,
    changes: isDraft
      ? null
      : diffPlanningDetails(before, planningDetails(saved)),
  };
}

/**
 * Cancels an event: the status flips to `cancelled`, the event stays public
 * with a badge, and new joins are refused. Existing registrations are kept. The
 * flip happens in one conditional update, so of two taps only one succeeds and
 * the attendees are told once. It also moves `__v` on, so an edit or unpublish
 * that read the event before this cannot save over the cancellation.
 */
export async function cancelEvent(email: string, uid: string): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "draft") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "A draft has not been published, so there is nothing to cancel. Delete it instead.",
    );
  }
  assertEventStillOpen(event, "cancel");

  const cancelled = await Event.findOneAndUpdate(
    { _id: event._id, status: { $nin: ["cancelled", "draft"] } },
    {
      $set: { status: "cancelled", cancelledAt: new Date() },
      $inc: { __v: 1 },
    },
    { new: true },
  );
  if (!cancelled) throw eventChanged();
  return cancelled;
}

/**
 * Makes a draft public (PG-15). The event has to be as complete as one published
 * straight away: description, cover image and the mode's fields present, and the
 * start still in the future. `409` for an event that is not a draft.
 */
export async function publishEvent(
  email: string,
  uid: string,
): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "published") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "This event is already published.",
    );
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
      description: event.description,
      coverImage: event.coverImage,
      city: event.city,
      state: event.state,
      country: event.country,
      address: event.address,
      platform: event.platform,
      platformLink: event.platformLink,
    },
    { requireFutureStart: true, stage: "publish" },
  );

  event.status = "published";
  return saveEvent(event);
}

/**
 * Takes a published event back to a draft, hidden from everyone but its
 * organization (PG-15). Refused with `409` once anyone has registered (the
 * event is cancelled instead, which keeps them informed of what happened), for
 * a cancelled or ended event, and for one that is already a draft.
 */
export async function unpublishEvent(
  email: string,
  uid: string,
): Promise<IEvent> {
  const event = await findManagedEvent(email, uid);
  if (event.status === "draft") {
    throw new AppError(STATUS_CODE.CONFLICT, "This event is already a draft.");
  }
  assertEventStillOpen(event, "unpublish");

  const registered = await EventRegistration.countDocuments({ eventUid: uid });
  if (registered > 0) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `${registered} ${registered === 1 ? "person has" : "people have"} already registered, so this event cannot go back to a draft. Cancel it instead.`,
    );
  }

  event.status = "draft";
  return saveEvent(event);
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
  // Still a draft at the moment of deleting: one published meanwhile stays.
  const { deletedCount } = await Event.deleteOne({
    _id: event._id,
    status: "draft",
  });
  if (deletedCount === 0) throw eventChanged();
}

/** Whether a limited event has no room left for someone else to go. */
const isFull = (event: IEvent) =>
  event.capacity != null && (event.registrationCount ?? 0) >= event.capacity;

/**
 * Takes one spot atomically: the update only matches while the event has no
 * capacity or the counter is still below it, so two people racing for the last
 * spot cannot both get it. Returns the updated event, or `null` when it is full.
 */
function reserveSpot(uid: string) {
  return Event.findOneAndUpdate(
    {
      uid,
      $or: [
        { capacity: null },
        {
          $expr: { $lt: [{ $ifNull: ["$registrationCount", 0] }, "$capacity"] },
        },
      ],
    },
    { $inc: { registrationCount: 1 } },
    { new: true },
  );
}

/** Takes a spot without checking the capacity (invited people, approvals). */
function takeSpot(uid: string) {
  return Event.findOneAndUpdate(
    { uid },
    { $inc: { registrationCount: 1 } },
    { new: true },
  );
}

/**
 * Moves a registration that is not going to going (PG-4, PG-14) and takes a
 * spot for it, past the capacity if need be. Matches on the current status in
 * the same update, so two taps cannot count one person twice. `null` when the
 * registration was not in one of `from`.
 */
async function moveToGoing(
  uid: string,
  filter: Record<string, unknown>,
  from: readonly RegistrationStatus[] = ["pending", "waitlisted", "declined"],
) {
  const moved = await EventRegistration.findOneAndUpdate(
    { ...filter, eventUid: uid, status: { $in: from } },
    { $set: { status: "going", decidedAt: new Date() } },
    { new: true },
  );
  if (moved) await takeSpot(uid);
  return moved;
}

/**
 * Registers the authenticated person for an event, or asks for them (PG-4,
 * PG-14). What happens depends on who is joining and the event's access level:
 *
 * - an invited email goes straight in on any level, past the capacity (and
 *   turns a pending, waitlisted or declined request into going);
 * - `invite` events refuse everyone else with `403`;
 * - `open` events take the person (going), or waitlist them when the event is
 *   full and the waitlist is on, or answer `409` when it is full and it is off;
 * - `approval` events make the person `pending` for the organizer (or
 *   `waitlisted` when the event is already full and the waitlist is on).
 *
 * A person the organizer declined gets `403` and cannot ask again. Asking
 * twice is harmless and returns the existing standing.
 */
export async function joinEvent(email: string, uid: string, note?: string) {
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
  if (event.startTime.getTime() < Date.now()) {
    throw new AppError(STATUS_CODE.CONFLICT, "This event has already started.");
  }

  const access = effectiveAccess(event);
  const [invite, existing] = await Promise.all([
    EventInvite.findOne({ eventUid: uid, email: attendee.email.toLowerCase() }),
    EventRegistration.findOne({ eventUid: uid, userId: attendee._id }),
  ]);

  if (existing) {
    const current = statusOf(existing);
    if (current !== "going" && invite) {
      // An invitation settles it: the organizer picked this person.
      const moved = await moveToGoing(uid, { _id: existing._id });
      if (moved) {
        await EventInvite.updateOne(
          { _id: invite._id, usedAt: null },
          { $set: { usedAt: new Date() } },
        );
        const fresh = await findByUid(uid);
        return {
          event: fresh ?? event,
          attendee,
          status: "going" as RegistrationStatus,
          alreadyJoined: false,
        };
      }
    }
    if (current === "declined") {
      throw new AppError(
        STATUS_CODE.FORBIDDEN,
        "The organizer did not approve your request to join this event.",
      );
    }
    return { event, attendee, status: current, alreadyJoined: true };
  }

  if (access === "invite" && !invite) {
    throw new AppError(
      STATUS_CODE.FORBIDDEN,
      "This event is invite-only. Only people the organizer invited can join.",
    );
  }

  const waitlistOn = event.waitlistEnabled !== false;
  const full = new AppError(STATUS_CODE.CONFLICT, "This event is full.");
  let status: RegistrationStatus;
  let counted: IEvent | null = null;

  if (invite) {
    counted = await takeSpot(uid);
    status = "going";
  } else if (access === "open") {
    counted = await reserveSpot(uid);
    if (counted) status = "going";
    else if (waitlistOn) status = "waitlisted";
    else throw full;
  } else if (isFull(event)) {
    if (!waitlistOn) throw full;
    status = "waitlisted";
  } else {
    status = "pending";
  }

  try {
    await EventRegistration.create({
      eventUid: uid,
      userId: attendee._id,
      attendeeEmail: attendee.email,
      attendeeName: attendee.name || "",
      status,
      ...(status !== "going" && note ? { note } : {}),
    });
  } catch (error) {
    if (status === "going") await releaseSpot(uid);
    // The compound unique index closes the concurrent double-click race.
    if ((error as { code?: number }).code !== 11000) throw error;
    const raced = await EventRegistration.findOne({
      eventUid: uid,
      userId: attendee._id,
    });
    return {
      event,
      attendee,
      status: raced ? statusOf(raced) : status,
      alreadyJoined: true,
    };
  }

  if (invite) {
    await EventInvite.updateOne(
      { _id: invite._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );
  }

  return { event: counted ?? event, attendee, status, alreadyJoined: false };
}

/** Gives one spot back. Never drops the counter below zero. */
async function releaseSpot(uid: string) {
  await Event.updateOne(
    { uid, registrationCount: { $gt: 0 } },
    { $inc: { registrationCount: -1 } },
  );
}

/**
 * A person gives up their place or their request (PG-3). Works for going,
 * pending and waitlisted registrations alike. `404` for an unknown event,
 * `409` once the event has started (a registration from then on is a record of
 * who was there), `404` if they had none, and `409` for a person the organizer
 * declined (that record stays, so they cannot simply ask again). A cancelled
 * event can still be left. A freed spot is released only when the person was
 * going.
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

  const removed = await EventRegistration.findOneAndDelete(
    { eventUid: uid, userId: attendee._id, status: { $ne: "declined" } },
    { includeResultMetadata: false },
  );
  if (!removed) {
    const declined = await EventRegistration.exists({
      eventUid: uid,
      userId: attendee._id,
    });
    throw new AppError(
      declined ? STATUS_CODE.CONFLICT : STATUS_CODE.NOT_FOUND,
      declined
        ? "The organizer did not approve your request, so there is nothing to leave."
        : "You are not registered for this event.",
    );
  }

  if (statusOf(removed) === "going") await releaseSpot(uid);
  return { event, attendee };
}

/**
 * Where to send the organizer a notice about their event (PG-6): the owning
 * organization's `ownerEmail`, or for an event saved before `organizerHandle`
 * existed, the host user's own email. `null` if neither can be found.
 */
export async function findOrganizerEmail(
  event: IEvent,
): Promise<string | null> {
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
  status?: RegistrationStatus | null;
  note?: string | null;
  decidedAt?: Date | null;
  checkedInAt?: Date | null;
}) {
  return {
    id: String(registration._id),
    name: registration.attendeeName,
    email: registration.attendeeEmail,
    joinedAt: registration.createdAt,
    status: statusOf(registration),
    note: registration.note ?? null,
    decidedAt: registration.decidedAt ?? null,
    checkedIn: Boolean(registration.checkedInAt),
    checkedInAt: registration.checkedInAt ?? null,
  };
}

/**
 * The organizer's attendee list for one event (PG-6): one page of
 * registrations oldest first, narrowed to one status (going by default, PG-14)
 * and optionally by a literal search on name or email, plus overall totals for
 * every status. Only the hosting organization can read it; the public never
 * sees attendee identities.
 */
export async function listAttendees(
  email: string,
  uid: string,
  query: {
    search?: string;
    status: RegistrationStatus | "all";
    skip: number;
    limit: number;
  },
) {
  const event = await findManagedEvent(email, uid);

  const filter: FilterQuery<unknown> = { eventUid: uid };
  if (query.status === "going") Object.assign(filter, GOING);
  else if (query.status !== "all") filter.status = query.status;
  if (query.search) {
    const pattern = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ attendeeName: pattern }, { attendeeEmail: pattern }];
  }

  const [rows, matching, grouped, checkedIn] = await Promise.all([
    EventRegistration.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .skip(query.skip)
      .limit(query.limit)
      .lean(),
    EventRegistration.countDocuments(filter),
    EventRegistration.aggregate<{ _id: RegistrationStatus; count: number }>([
      { $match: { eventUid: uid } },
      {
        $group: { _id: { $ifNull: ["$status", "going"] }, count: { $sum: 1 } },
      },
    ]),
    EventRegistration.countDocuments({
      eventUid: uid,
      ...GOING,
      checkedInAt: { $exists: true, $ne: null },
    }),
  ]);
  const count = (status: RegistrationStatus) =>
    grouped.find((row) => row._id === status)?.count ?? 0;

  return {
    event,
    data: rows.map(toAttendee),
    total: matching,
    summary: {
      registered: count("going"),
      checkedIn,
      pending: count("pending"),
      waitlisted: count("waitlisted"),
      declined: count("declined"),
    },
  };
}

/** One CSV cell: quoted, and neutralized if a spreadsheet would run it. */
function csvCell(value: string) {
  // A leading = + - @ tab or CR makes Excel and Sheets treat the cell as a
  // formula, and a name or email is attacker-controlled text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Every registration for an event as CSV, for the host (PG-6): people going,
 * asking to join, on the waitlist and declined, told apart by the Status column.
 */
export async function exportAttendeesCsv(email: string, uid: string) {
  await findManagedEvent(email, uid);

  const rows = await EventRegistration.find({ eventUid: uid })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const header = [
    "Name",
    "Email",
    "Registered at",
    "Checked in",
    "Checked in at",
    "Status",
    "Note",
  ];
  const lines = rows.map((row) => {
    const attendee = toAttendee(row);
    return [
      attendee.name,
      attendee.email,
      attendee.joinedAt.toISOString(),
      attendee.checkedIn ? "Yes" : "No",
      attendee.checkedInAt ? attendee.checkedInAt.toISOString() : "",
      attendee.status,
      attendee.note ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

/**
 * Marks one attendee as checked in or not (PG-6). Host only. `409` for a
 * cancelled event and for a person who is not going, `404` if the registration
 * is not for this event. Checking in someone already checked in keeps the
 * original time.
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
  if (statusOf(registration) !== "going") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "Only people who are going can be checked in.",
    );
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

/**
 * The organizer approves a request or promotes someone off the waitlist
 * (PG-4, PG-14): the person becomes going and takes a spot, past the capacity
 * if the event is full (the limit is soft). Also reverses a decline. Host only;
 * `409` for a cancelled or ended event, `404` for an unknown registration.
 * Approving someone already going changes nothing (`changed` is false).
 */
export async function approveRegistration(
  email: string,
  uid: string,
  registrationId: string,
) {
  const event = await findManagedEvent(email, uid);
  assertEventStillOpen(event, "decide");

  const moved = await moveToGoing(uid, { _id: registrationId });
  const registration =
    moved ??
    (await EventRegistration.findOne({ _id: registrationId, eventUid: uid }));
  if (!registration) {
    throw new AppError(STATUS_CODE.NOT_FOUND, "Registration not found.");
  }

  return {
    event: (await findByUid(uid)) ?? event,
    attendee: toAttendee(registration),
    changed: Boolean(moved),
  };
}

/**
 * The organizer declines a request, a waitlisted person, or removes someone
 * who was going (PG-4, PG-14). The record stays as `declined`, so the person
 * cannot ask again unless the organizer approves them later. A freed spot is
 * released when the person was going, and their check-in is cleared. Host only;
 * `409` for a cancelled event, `404` for an unknown registration. Declining
 * someone already declined changes nothing (`previousStatus` is `null`);
 * otherwise it is the standing the person lost.
 */
export async function declineRegistration(
  email: string,
  uid: string,
  registrationId: string,
) {
  const event = await findManagedEvent(email, uid);
  assertEventStillOpen(event, "decide");

  const previous = await EventRegistration.findOneAndUpdate(
    { _id: registrationId, eventUid: uid, status: { $ne: "declined" } },
    {
      $set: { status: "declined", decidedAt: new Date() },
      $unset: { checkedInAt: 1 },
    },
    { returnDocument: "before" },
  );
  if (previous && statusOf(previous) === "going") await releaseSpot(uid);

  const registration = await EventRegistration.findOne({
    _id: registrationId,
    eventUid: uid,
  });
  if (!registration) {
    throw new AppError(STATUS_CODE.NOT_FOUND, "Registration not found.");
  }
  return {
    event,
    attendee: toAttendee(registration),
    previousStatus: previous ? statusOf(previous) : null,
  };
}

function toInvite(invite: {
  _id: unknown;
  email: string;
  createdAt: Date;
  usedAt?: Date | null;
}) {
  return {
    id: String(invite._id),
    email: invite.email,
    invitedAt: invite.createdAt,
    joined: Boolean(invite.usedAt),
  };
}

/**
 * The organizer invites people by email (PG-4). An invited person must sign in
 * with that exact email; the invite lets them join on any access level and past
 * the capacity. Emails already invited, or already registered for the event, are
 * skipped and reported. `409` for a draft, a cancelled event, one that has
 * started (joining closes then, so an invite could not be used) or ended, or when
 * the event would pass its invite limit.
 */
export async function inviteByEmail(
  email: string,
  uid: string,
  emails: string[],
) {
  const event = await findManagedEvent(email, uid);
  if (event.status === "cancelled") {
    throw new AppError(STATUS_CODE.CONFLICT, "This event was cancelled.");
  }
  if (event.status === "draft") {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "Publish the event before inviting people.",
    );
  }
  if (event.startTime.getTime() < Date.now()) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "This event has already started, so you can no longer invite people.",
    );
  }

  const [existing, registered] = await Promise.all([
    EventInvite.find({ eventUid: uid }).select({ email: 1 }).lean(),
    EventRegistration.find({ eventUid: uid, attendeeEmail: { $in: emails } })
      .select({ attendeeEmail: 1 })
      .lean(),
  ]);
  const invited = new Set(existing.map((row) => row.email));
  const registeredEmails = new Set(
    registered.map((row) => row.attendeeEmail.toLowerCase()),
  );

  const skipped: {
    email: string;
    reason: "already-invited" | "already-registered";
  }[] = [];
  const fresh: string[] = [];
  for (const address of emails) {
    if (invited.has(address))
      skipped.push({ email: address, reason: "already-invited" });
    else if (registeredEmails.has(address))
      skipped.push({ email: address, reason: "already-registered" });
    else fresh.push(address);
  }

  if (invited.size + fresh.length > EVENT_INVITES_PER_EVENT_MAX) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      `You can invite up to ${EVENT_INVITES_PER_EVENT_MAX} people to one event.`,
    );
  }

  if (fresh.length > 0) {
    // An upsert per email, so a race with another request cannot double-invite.
    await EventInvite.bulkWrite(
      fresh.map((address) => ({
        updateOne: {
          filter: { eventUid: uid, email: address },
          update: {
            $setOnInsert: { eventUid: uid, email: address, invitedBy: email },
          },
          upsert: true,
        },
      })),
    );
  }

  return { event, invited: fresh, skipped };
}

/** Every invite for an event (PG-4), newest first. Host only. */
export async function listInvites(email: string, uid: string) {
  await findManagedEvent(email, uid);
  const rows = await EventInvite.find({ eventUid: uid })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return rows.map(toInvite);
}

/**
 * Takes an invite back (PG-4). Host only. `404` for an unknown invite, `409` once
 * the person has joined through it (they are an attendee by then; decline them
 * from the attendee list instead).
 */
export async function revokeInvite(
  email: string,
  uid: string,
  inviteId: string,
) {
  await findManagedEvent(email, uid);
  const invite = await EventInvite.findOne({ _id: inviteId, eventUid: uid });
  if (!invite) {
    throw new AppError(STATUS_CODE.NOT_FOUND, "Invite not found.");
  }
  if (invite.usedAt) {
    throw new AppError(
      STATUS_CODE.CONFLICT,
      "This person already joined through the invite. Decline them from the attendee list instead.",
    );
  }
  await invite.deleteOne();
}

/**
 * The authenticated person's standing for one event (PG-14): `status` is
 * `going`, `pending`, `waitlisted`, `declined` or `none`, and `invited` says an
 * unused invitation exists for their email. `joined` stays true only for going.
 */
export async function getRegistrationStatus(email: string, uid: string) {
  const event = await findPublicByUid(uid);
  if (!event) {
    throw new AppError(STATUS_CODE.NOT_FOUND, STATUS_MESSAGE.EVENT_NOT_FOUND);
  }

  const attendee = await findByEmail(email);
  if (!attendee) {
    throw new AppError(STATUS_CODE.UNAUTHORIZED, STATUS_MESSAGE.UNAUTHORIZED);
  }

  const registration = await EventRegistration.findOne({
    eventUid: uid,
    userId: attendee._id,
  }).select({ status: 1 });
  if (registration) {
    const status = statusOf(registration);
    return { joined: status === "going", status, invited: false };
  }

  const invited = await EventInvite.exists({
    eventUid: uid,
    email: attendee.email.toLowerCase(),
  });
  return { joined: false, status: "none" as const, invited: Boolean(invited) };
}
