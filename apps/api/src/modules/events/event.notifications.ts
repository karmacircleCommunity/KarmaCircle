import { logger } from "../../config/logger";
import {
  EventRecipient,
  sendEventCancellations,
  sendEventDecline,
  sendEventRequestOrganizerNotice,
  sendEventUpdates,
} from "../../config/mailer";
import { EventRegistration, IEvent } from "./event.model";
import { EventChanges, GOING, findOrganizerEmail } from "./event.service";
import type { RegistrationStatus } from "./event.constants";

/**
 * The emails that follow a change to an event or a registration. All of them are
 * best effort: the change is already saved, so nothing here throws, and a failed
 * send is logged and the rest still go out. The mailer itself sends in
 * production only.
 */

async function bestEffort(
  context: Record<string, unknown>,
  failure: string,
  send: () => Promise<unknown>,
) {
  try {
    await send();
  } catch (error) {
    logger.error({ error, ...context }, failure);
  }
}

/**
 * Hands everyone whose registration `filter` matches to `send`, which batches
 * the messages (see the mailer).
 */
async function emailRegistrants(
  event: IEvent,
  filter: Record<string, unknown>,
  failure: string,
  send: (recipients: EventRecipient[]) => Promise<unknown>,
) {
  await bestEffort({ eventUid: event.uid }, failure, async () => {
    const registrations = await EventRegistration.find({
      ...filter,
      eventUid: event.uid,
    })
      .select({ attendeeEmail: 1, attendeeName: 1 })
      .lean();

    await send(
      registrations.map(({ attendeeEmail, attendeeName }) => ({
        email: attendeeEmail,
        name: attendeeName,
      })),
    );
  });
}

/** Tells everyone going, waiting for an answer or waitlisted. */
export async function notifyEventCancelled(event: IEvent) {
  await emailRegistrants(
    event,
    { status: { $ne: "declined" } },
    "Event cancelled but the cancellation emails failed",
    (recipients) => sendEventCancellations(recipients, event),
  );
}

/** Tells the people going what moved. */
export async function notifyEventChanged(event: IEvent, changes: EventChanges) {
  await emailRegistrants(
    event,
    GOING,
    "Event updated but the update emails failed",
    (recipients) => sendEventUpdates(recipients, event, changes),
  );
}

/** Tells a person the organizer turned them down, or removed them. */
export async function notifyDeclined(
  event: IEvent,
  attendee: { email: string; name: string },
  previousStatus: RegistrationStatus,
) {
  await bestEffort(
    { eventUid: event.uid, attendeeEmail: attendee.email },
    "Registration declined but the email failed",
    () =>
      sendEventDecline(
        attendee.email,
        attendee.name,
        event,
        previousStatus === "going",
      ),
  );
}

/** Tells the organizer someone is waiting on them (a request or the waitlist). */
export async function notifyOrganizerOfRequest(
  event: IEvent,
  attendeeName: string,
  status: "pending" | "waitlisted",
) {
  await bestEffort(
    { eventUid: event.uid },
    "Request saved but the organizer notice failed",
    async () => {
      const organizerEmail = await findOrganizerEmail(event);
      if (organizerEmail) {
        await sendEventRequestOrganizerNotice(
          organizerEmail,
          event,
          attendeeName,
          status,
        );
      }
    },
  );
}
