import { logger } from "../../config/logger";
import { EventRegistration, type IEvent } from "../events/event.model";
import {
  REMINDER_ID_PREFIX,
  buildCancelled,
  buildChanged,
  buildReminder,
  diffEvent,
  factsOf,
  reminderIsStale,
  reminderJobId,
  type EventFacts,
  type Recipient,
} from "./notification.jobs";
import {
  cancelEventJobs,
  cancelJob,
  enqueueJobs,
  notificationsEnabled,
} from "./notification.queue";

/**
 * What the event service calls when something happens to an event or a
 * registration. Everything here is best effort: a notification problem is
 * logged and never fails the request that caused it, and with no `REDIS_URL`
 * all of it does nothing.
 */

/** The most people one edit or cancellation will notify. Beyond it is logged. */
export const MAX_RECIPIENTS = 5000;

/** The longest a request waits on notifications. Redis is normally a few milliseconds. */
const WORK_BUDGET_MS = 1500;

export type LoadRecipients = (eventUid: string) => Promise<Recipient[]>;

const loadRecipients: LoadRecipients = async (eventUid) => {
  const rows = await EventRegistration.find({ eventUid })
    .select("attendeeEmail attendeeName")
    .limit(MAX_RECIPIENTS + 1)
    .lean();
  if (rows.length > MAX_RECIPIENTS) {
    logger.warn(
      { eventUid, max: MAX_RECIPIENTS },
      "Too many registrations to notify, only the first are",
    );
  }
  return rows.slice(0, MAX_RECIPIENTS).map((row) => ({
    registrationId: String(row._id),
    email: row.attendeeEmail,
    name: row.attendeeName,
  }));
};

async function safely(
  label: string,
  work: () => Promise<unknown>,
): Promise<void> {
  if (!notificationsEnabled()) return;
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      work(),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          logger.warn(
            { label },
            "Notification work is taking too long, carrying on without waiting",
          );
          resolve();
        }, WORK_BUDGET_MS);
      }),
    ]);
  } catch (error) {
    logger.error(
      { err: error, label },
      "Could not update the notification queue",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** A new registration: queue its reminder. */
export function scheduleReminder(
  event: IEvent,
  recipient: Recipient,
  now: Date = new Date(),
): Promise<void> {
  return safely("scheduleReminder", async () => {
    const job = buildReminder(factsOf(event), recipient, now);
    if (job) await enqueueJobs([job]);
  });
}

/** Someone left: their reminder is no longer wanted. */
export function cancelReminder(
  event: IEvent,
  registrationId: string,
): Promise<void> {
  return safely("cancelReminder", async () => {
    await cancelJob(
      reminderJobId(event.uid, registrationId, event.startTime),
      event.uid,
    );
  });
}

/**
 * An event was edited. When something an attendee cares about changed (start,
 * end, place, format, link) every registered person is told, and the queued
 * reminders are rebuilt so none of them still says the old time or place.
 */
export function notifyEventUpdated(
  before: EventFacts,
  after: IEvent,
  options: { load?: LoadRecipients; now?: Date } = {},
): Promise<void> {
  return safely("notifyEventUpdated", async () => {
    if (after.status !== "published") return;
    const now = options.now ?? new Date();
    const afterFacts = factsOf(after);
    const changes = diffEvent(before, afterFacts);
    if (!reminderIsStale(before, afterFacts) || afterFacts.startTime <= now)
      return;

    const recipients = await (options.load ?? loadRecipients)(after.uid);
    // The reminders already queued describe the old event. Remove them, then
    // queue fresh ones. A reminder that was already sent stays sent: its id is
    // remembered, so it is not sent a second time for the same start time.
    await cancelEventJobs(after.uid, REMINDER_ID_PREFIX);
    const reminders = recipients.flatMap(
      (r) => buildReminder(afterFacts, r, now) ?? [],
    );
    const notices = changes.length
      ? recipients.map((r) => buildChanged(afterFacts, r, changes, now))
      : [];
    await enqueueJobs([...reminders, ...notices]);
  });
}

/** An event was cancelled: stop its reminders and tell everyone registered. */
export function notifyEventCancelled(
  event: IEvent,
  options: { load?: LoadRecipients; now?: Date } = {},
): Promise<void> {
  return safely("notifyEventCancelled", async () => {
    const now = options.now ?? new Date();
    const recipients = await (options.load ?? loadRecipients)(event.uid);
    await cancelEventJobs(event.uid);
    const facts = factsOf(event);
    await enqueueJobs(recipients.map((r) => buildCancelled(facts, r, now)));
  });
}
