import type { IEvent } from "../events/event.model";

/**
 * The jobs the API puts on the queue for apps/notification-worker. This shape
 * is the contract with the Go side (internal/job/job.go): the fixtures in
 * apps/notification-worker/testdata/contract are checked by tests on both
 * sides, so changing one without the other fails a build.
 */
export type NotificationKind =
  "event_reminder" | "event_changed" | "event_cancelled";

export interface NotificationChange {
  /** `start` and `end` carry RFC 3339 times, the rest carry plain text. */
  field: "start" | "end" | "place" | "mode" | "link";
  from: string;
  to: string;
}

export interface NotificationEvent {
  uid: string;
  name: string;
  startTime: string;
  timezone?: string;
  mode?: string;
  place?: string;
}

export interface NotificationJob {
  id: string;
  kind: NotificationKind;
  runAt: string;
  to: string;
  name?: string;
  event: NotificationEvent;
  changes?: NotificationChange[];
  attempts: number;
}

/** One person who is registered for an event. */
export interface Recipient {
  /** The registration's id: part of every job id, so one person gets one email of each kind. */
  registrationId: string;
  email: string;
  name: string;
}

/** What is compared to find out whether an edit is worth an email. */
export interface EventFacts {
  uid: string;
  name: string;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  mode: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  platform?: string;
  platformLink?: string;
}

/** How long before an event its reminder goes out. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

/** A reminder due less than this far ahead is not worth queueing. */
const MIN_REMINDER_NOTICE_MS = 60 * 1000;

export const factsOf = (event: IEvent): EventFacts => ({
  uid: event.uid,
  name: event.name,
  startTime: event.startTime,
  endTime: event.endTime,
  timezone: event.timezone,
  mode: event.mode,
  city: event.city,
  state: event.state,
  country: event.country,
  address: event.address,
  platform: event.platform,
  platformLink: event.platformLink,
});

const venueOf = (facts: EventFacts) =>
  [facts.address, facts.city, facts.state, facts.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

/** Where it is held, in words an email can use. */
export function placeOf(facts: EventFacts): string {
  const online = facts.platform?.trim()
    ? `Online (${facts.platform.trim()})`
    : "Online";
  if (facts.mode === "Online") return online;
  if (facts.mode === "Hybrid") {
    const venue = venueOf(facts);
    return venue ? `${venue}, and ${online}` : online;
  }
  return venueOf(facts);
}

const eventOf = (facts: EventFacts): NotificationEvent => ({
  uid: facts.uid,
  name: facts.name,
  startTime: facts.startTime.toISOString(),
  ...(facts.timezone ? { timezone: facts.timezone } : {}),
  mode: facts.mode,
  ...(placeOf(facts) ? { place: placeOf(facts) } : {}),
});

export const reminderJobId = (
  uid: string,
  registrationId: string,
  startTime: Date,
) =>
  `reminder:${uid}:${registrationId}:${Math.floor(startTime.getTime() / 1000)}`;

export const changedJobId = (
  uid: string,
  registrationId: string,
  editedAt: Date,
) => `changed:${uid}:${registrationId}:${editedAt.getTime()}`;

export const cancelledJobId = (uid: string, registrationId: string) =>
  `cancelled:${uid}:${registrationId}`;

export const REMINDER_ID_PREFIX = "reminder:";

const person = (recipient: Recipient) => ({
  to: recipient.email,
  ...(recipient.name.trim() ? { name: recipient.name.trim() } : {}),
});

/**
 * The reminder for one registration, sent a day before the start. `null`
 * when that moment has already passed or is about to: someone who joins the
 * day before has just been sent a confirmation, and a reminder a minute
 * later would be noise.
 */
export function buildReminder(
  facts: EventFacts,
  recipient: Recipient,
  now: Date,
): NotificationJob | null {
  const runAt = new Date(facts.startTime.getTime() - REMINDER_LEAD_MS);
  if (runAt.getTime() - now.getTime() < MIN_REMINDER_NOTICE_MS) return null;
  return {
    id: reminderJobId(facts.uid, recipient.registrationId, facts.startTime),
    kind: "event_reminder",
    runAt: runAt.toISOString(),
    ...person(recipient),
    event: eventOf(facts),
    attempts: 0,
  };
}

/** What changed between two versions of an event, as far as an attendee cares. */
export function diffEvent(
  before: EventFacts,
  after: EventFacts,
): NotificationChange[] {
  const changes: NotificationChange[] = [];
  if (before.startTime.getTime() !== after.startTime.getTime()) {
    changes.push({
      field: "start",
      from: before.startTime.toISOString(),
      to: after.startTime.toISOString(),
    });
  }
  if (before.endTime.getTime() !== after.endTime.getTime()) {
    changes.push({
      field: "end",
      from: before.endTime.toISOString(),
      to: after.endTime.toISOString(),
    });
  }
  if (before.mode !== after.mode) {
    changes.push({ field: "mode", from: before.mode, to: after.mode });
  }
  if (placeOf(before) !== placeOf(after)) {
    changes.push({ field: "place", from: placeOf(before), to: placeOf(after) });
  }
  if ((before.platformLink ?? "") !== (after.platformLink ?? "")) {
    changes.push({
      field: "link",
      from: before.platformLink ?? "",
      to: after.platformLink ?? "",
    });
  }
  return changes;
}

/** True when a reminder queued earlier would now say something out of date. */
export const reminderIsStale = (before: EventFacts, after: EventFacts) =>
  before.name !== after.name ||
  (before.timezone ?? "") !== (after.timezone ?? "") ||
  diffEvent(before, after).length > 0;

export function buildChanged(
  facts: EventFacts,
  recipient: Recipient,
  changes: NotificationChange[],
  editedAt: Date,
): NotificationJob {
  return {
    id: changedJobId(facts.uid, recipient.registrationId, editedAt),
    kind: "event_changed",
    runAt: editedAt.toISOString(),
    ...person(recipient),
    event: eventOf(facts),
    changes,
    attempts: 0,
  };
}

export function buildCancelled(
  facts: EventFacts,
  recipient: Recipient,
  cancelledAt: Date,
): NotificationJob {
  return {
    id: cancelledJobId(facts.uid, recipient.registrationId),
    kind: "event_cancelled",
    runAt: cancelledAt.toISOString(),
    ...person(recipient),
    event: eventOf(facts),
    attempts: 0,
  };
}
