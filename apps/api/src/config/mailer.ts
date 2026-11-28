import { Resend } from "resend";
import { env } from "./env";
import { STATUS_CODE } from "../constants/http-status";
import { AppError } from "../middleware/error-handler";
import { logger } from "./logger";
import type { IEvent } from "../modules/events/event.model";
import type { EventChanges } from "../modules/events/event.service";

const DEFAULT_FROM = "KarmaCircle <onboarding@resend.dev>";

// Constructed lazily, not at module load — same reasoning as
// payment.service.ts's getRazorpayClient: RESEND_API_KEY is optional in
// env.ts, so building the client eagerly at import time would crash the
// whole API on boot rather than just the one route that actually needs it.
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new AppError(
      STATUS_CODE.SERVICE_UNAVAILABLE,
      "Email sending is not configured yet.",
    );
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  return resend;
}

/**
 * Non-production outbox. Password reset links are captured here in both
 * development and test so neither environment can reach Resend. The test
 * route and loopback-only development route expose links for local flows.
 */
interface ResetOutboxEntry {
  to: string;
  resetUrl: string;
}
const nonProductionOutbox: ResetOutboxEntry[] = [];

export function getLastResetUrl(to: string): string | undefined {
  return [...nonProductionOutbox].reverse().find((entry) => entry.to === to)
    ?.resetUrl;
}

export function clearResetOutbox(): void {
  nonProductionOutbox.length = 0;
}

function resetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your KarmaCircle password</h2>
      <p>We got a request to reset the password for this account. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (env.NODE_ENV !== "production") {
    nonProductionOutbox.push({ to, resetUrl });
    return;
  }

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: "Reset your KarmaCircle password",
    html: resetEmailHtml(resetUrl),
  });

  if (error) {
    logger.error({ error }, "Failed to send password reset email");
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send the password reset email, try again later.",
    );
  }
}

/**
 * Tells a brand-new organization its profile is still a draft (November 2026).
 * Organizations can host events straight away, so this is the nudge instead of
 * a gate: finish the details so the public page works and people can find it.
 * Best effort and production only, like the event emails.
 */
export async function sendOrganizationSetupReminder(
  to: string,
  organizationName: string,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const setupUrl = `${env.ORIGIN_URL.replace(/\/$/, "")}/organization/setup`;
  const safeName = escapeHtml(organizationName || "there");

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: "Finish your KarmaCircle organization details",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
        <h2>Welcome to KarmaCircle</h2>
        <p>Hi ${safeName},</p>
        <p>You can host events right away. Your organization page is still a draft, though: until you add your details, people cannot open it, and some things may look incomplete.</p>
        <p><a href="${setupUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">Add your details</a></p>
        <p>It takes a few minutes, and you can skip questions and come back.</p>
        <p>KarmaCircle</p>
      </div>
    `,
  });

  if (error) {
    logger.error({ error }, "Failed to send organization setup reminder");
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send the setup reminder.",
    );
  }

  return true;
}

/** Whether the runtime knows `zone`, so a bad stored value never breaks an email. */
function isUsableZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

const webUrl = (path: string) => `${env.ORIGIN_URL.replace(/\/$/, "")}${path}`;
const eventPageUrl = (uid: string) =>
  webUrl(`/events/${encodeURIComponent(uid)}`);
const attendeesPageUrl = (uid: string) =>
  webUrl(`/organization/events/${encodeURIComponent(uid)}/attendees`);

/**
 * A moment of an event as its emails write it: in the event's own timezone when
 * it has one (PG-11), named in the text ("... 4:58 PM GMT+5:30"); otherwise in
 * UTC, labelled. Plain text, so escape it before it goes into HTML.
 */
function formatEventMoment(event: IEvent, moment: Date): string {
  const zone =
    event.timezone && isUsableZone(event.timezone) ? event.timezone : undefined;
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: zone ? "long" : "short",
    timeZone: zone ?? "UTC",
  }).format(new Date(moment));
  return zone ? date : `${date} UTC`;
}

export async function sendEventJoinConfirmation(
  to: string,
  attendeeName: string,
  event: IEvent,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const eventUrl = eventPageUrl(event.uid);
  const date = formatEventMoment(event, event.startTime);
  const safeName = escapeHtml(attendeeName || "there");
  const safeEventName = escapeHtml(event.name);

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: `You're going to ${event.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
        <h2>You're going!</h2>
        <p>Hi ${safeName},</p>
        <p>Your place at <strong>${safeEventName}</strong> is confirmed.</p>
        <p>${escapeHtml(date)}</p>
        <p><a href="${eventUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">View event details</a></p>
        <p>See you there,<br />KarmaCircle</p>
      </div>
    `,
  });

  if (error) {
    logger.error(
      { error, eventUid: event.uid },
      "Failed to send event join confirmation",
    );
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send event confirmation email.",
    );
  }

  return true;
}

/**
 * Tells an event's organizer that someone joined (PG-6). Best effort and
 * production only, like the attendee's confirmation. Carries the attendee's
 * name and the running total, never their email (the organizer sees that on
 * the attendee list).
 */
export async function sendEventJoinOrganizerNotice(
  to: string,
  event: IEvent,
  attendeeName: string,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const listUrl = attendeesPageUrl(event.uid);
  const safeEventName = escapeHtml(event.name);
  const safeAttendee = escapeHtml(attendeeName || "Someone");
  const total = event.registrationCount ?? 0;
  const spots = event.capacity
    ? ` (${total} of ${event.capacity} places taken)`
    : ` (${total} registered)`;

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: `${attendeeName || "Someone"} joined ${event.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
        <h2>New registration</h2>
        <p><strong>${safeAttendee}</strong> joined <strong>${safeEventName}</strong>${escapeHtml(spots)}.</p>
        <p><a href="${listUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">See who is coming</a></p>
        <p>KarmaCircle</p>
      </div>
    `,
  });

  if (error) {
    logger.error(
      { error, eventUid: event.uid },
      "Failed to send organizer join notice",
    );
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send the organizer notice.",
    );
  }

  return true;
}

/**
 * Emails an invitation to an event (PG-4), with a link to its page. Best effort
 * and production only, like the other event emails. The invitee must sign in
 * with this exact address to use the invite, which the email says.
 */
export async function sendEventInvitation(
  to: string,
  event: IEvent,
  organizerName: string,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const eventUrl = eventPageUrl(event.uid);
  const date = formatEventMoment(event, event.startTime);
  const safeEventName = escapeHtml(event.name);
  const safeOrganizer = escapeHtml(organizerName || "An organizer");
  const safeTo = escapeHtml(to);

  const client = getResendClient();

  const { error } = await client.emails.send({
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: `You're invited to ${event.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
        <h2>You're invited</h2>
        <p><strong>${safeOrganizer}</strong> invited you to <strong>${safeEventName}</strong>.</p>
        <p>${escapeHtml(date)}</p>
        <p><a href="${eventUrl}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">View the event</a></p>
        <p>To join, sign in or sign up to KarmaCircle with <strong>${safeTo}</strong>, the address this invitation was sent to.</p>
        <p>KarmaCircle</p>
      </div>
    `,
  });

  if (error) {
    logger.error(
      { error, eventUid: event.uid },
      "Failed to send event invitation",
    );
    throw new AppError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send the event invitation.",
    );
  }

  return true;
}

/** An email about a change to an event or a registration. */
interface EventNotice {
  to: string;
  subject: string;
  heading: string;
  /** HTML, so everything in it that came from a person must already be escaped. */
  body: string;
  button: { label: string; url: string };
}

/** A notice as Resend takes it: a heading, the paragraphs and one button. */
function eventNoticeMessage(notice: EventNotice) {
  return {
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to: notice.to,
    subject: notice.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #282828;">
        <h2>${notice.heading}</h2>
        ${notice.body}
        <p><a href="${notice.button.url}" style="display:inline-block;padding:12px 20px;background:#a8623e;color:#fff;border-radius:8px;text-decoration:none;">${notice.button.label}</a></p>
        <p>KarmaCircle</p>
      </div>
    `,
  };
}

/** Sends a notice that goes to one person, throwing if Resend refuses it. */
async function deliverEventNotice(
  notice: EventNotice,
  eventUid: string,
  failure: string,
): Promise<boolean> {
  const client = getResendClient();

  const { error } = await client.emails.send(eventNoticeMessage(notice));

  if (error) {
    logger.error({ error, eventUid }, failure);
    throw new AppError(STATUS_CODE.INTERNAL_SERVER_ERROR, failure);
  }

  return true;
}

/** Most messages Resend accepts in one batch request. */
export const EMAIL_BATCH_SIZE = 100;

/** The wait before each new try of a batch that Resend rate-limited. */
export const RATE_LIMIT_RETRY_DELAYS_MS: readonly number[] = [500, 1000, 2000];

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One batch request, tried again after a pause for as long as Resend answers
 * that we are sending too fast (nothing was accepted, so nothing is sent twice)
 * and there are delays left. Resolves with the error that remains, or `null`.
 * The SDK reports a refused request as `error` instead of throwing.
 */
async function sendBatch(
  client: Resend,
  messages: ReturnType<typeof eventNoticeMessage>[],
) {
  for (let attempt = 0; ; attempt += 1) {
    const { error } = await client.batch.send(messages);
    const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
    if (error?.name !== "rate_limit_exceeded" || delay === undefined) {
      return error;
    }
    await wait(delay);
  }
}

/**
 * Sends the same news to many people: one message each, so nobody sees another
 * address, in batch requests of up to `EMAIL_BATCH_SIZE` made one after the
 * other to stay within Resend's request rate. A batch that fails is logged and
 * the rest still go out. Resolves with how many messages Resend accepted.
 */
async function deliverEventNoticeBatches(
  notices: EventNotice[],
  eventUid: string,
  failure: string,
): Promise<number> {
  if (notices.length === 0) return 0;

  const client = getResendClient();
  let accepted = 0;

  for (let start = 0; start < notices.length; start += EMAIL_BATCH_SIZE) {
    const batch = notices
      .slice(start, start + EMAIL_BATCH_SIZE)
      .map(eventNoticeMessage);
    const error = await sendBatch(client, batch).catch(
      (thrown: unknown) => thrown,
    );
    if (error) {
      logger.error({ error, eventUid, recipients: batch.length }, failure);
    } else {
      accepted += batch.length;
    }
  }

  return accepted;
}

/** Someone a notice about an event goes to. */
export interface EventRecipient {
  email: string;
  name: string;
}

/**
 * Tells the people going, waiting for an answer or waitlisted that the event is
 * off. Best effort and production only.
 */
export async function sendEventCancellations(
  recipients: EventRecipient[],
  event: IEvent,
): Promise<number> {
  if (env.NODE_ENV !== "production") return 0;

  const date = formatEventMoment(event, event.startTime);

  return deliverEventNoticeBatches(
    recipients.map(({ email, name }) => ({
      to: email,
      subject: `${event.name} was cancelled`,
      heading: "Event cancelled",
      body: `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p><strong>${escapeHtml(event.hostName || "The organizer")}</strong> cancelled <strong>${escapeHtml(event.name)}</strong>.</p>
        <p>It was planned for ${escapeHtml(date)}.</p>`,
      button: { label: "View the event", url: eventPageUrl(event.uid) },
    })),
    event.uid,
    "Failed to send cancellation emails.",
  );
}

const MODE_DESCRIPTIONS: Record<IEvent["mode"], string> = {
  Online: "online",
  Offline: "in person",
  Hybrid: "both in person and online",
};

/**
 * Tells the people going what changed about the time, the format, the venue or
 * the meeting link. The link itself is never written in the email, which can be
 * forwarded; the event page shows it to the people going. Best effort and
 * production only.
 */
export async function sendEventUpdates(
  recipients: EventRecipient[],
  event: IEvent,
  changes: EventChanges,
): Promise<number> {
  if (env.NODE_ENV !== "production") return 0;

  const lines: string[] = [];
  if (changes.time) {
    lines.push(
      `New time: ${formatEventMoment(event, event.startTime)} to ${formatEventMoment(event, event.endTime)}`,
    );
  }
  if (changes.mode) {
    lines.push(`New format: the event is now ${MODE_DESCRIPTIONS[event.mode]}`);
  }
  if (changes.venue) {
    const venue = [event.address, event.city, event.state, event.country]
      .filter(Boolean)
      .join(", ");
    lines.push(`New venue: ${venue}`);
  }
  if (changes.meetingLink) {
    lines.push("New meeting link: you can find it on the event page");
  }
  const list = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");

  return deliverEventNoticeBatches(
    recipients.map(({ email, name }) => ({
      to: email,
      subject: `${event.name} has changed`,
      heading: "Event details changed",
      body: `
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p><strong>${escapeHtml(event.name)}</strong>, which you are going to, was updated.</p>
        <ul>${list}</ul>`,
      button: { label: "View event details", url: eventPageUrl(event.uid) },
    })),
    event.uid,
    "Failed to send event update emails.",
  );
}

/**
 * Tells a person the organizer did not approve their request, or, when they
 * `wasGoing`, took their place away. Best effort and production only.
 */
export async function sendEventDecline(
  to: string,
  attendeeName: string,
  event: IEvent,
  wasGoing: boolean,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const safeEventName = `<strong>${escapeHtml(event.name)}</strong>`;

  return deliverEventNotice(
    {
      to,
      subject: wasGoing
        ? `Your place at ${event.name} was removed`
        : `Your request to join ${event.name} was not approved`,
      heading: wasGoing ? "Your place was removed" : "Request not approved",
      body: `
        <p>Hi ${escapeHtml(attendeeName || "there")},</p>
        <p>${
          wasGoing
            ? `The organizer removed your place at ${safeEventName}.`
            : `The organizer did not approve your request to join ${safeEventName}.`
        }</p>`,
      button: { label: "View the event", url: eventPageUrl(event.uid) },
    },
    event.uid,
    "Failed to send the decline email.",
  );
}

/**
 * Tells the organizer that someone asked to join or went on the waitlist, so a
 * decision is waiting on the attendee page. Carries the person's name, never
 * their email. Best effort and production only.
 */
export async function sendEventRequestOrganizerNotice(
  to: string,
  event: IEvent,
  attendeeName: string,
  status: "pending" | "waitlisted",
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const name = attendeeName || "Someone";
  const action =
    status === "waitlisted" ? "joined the waitlist for" : "asked to join";

  return deliverEventNotice(
    {
      to,
      subject: `${name} ${action} ${event.name}`,
      heading:
        status === "waitlisted" ? "New on the waitlist" : "New request to join",
      body: `
        <p><strong>${escapeHtml(name)}</strong> ${action} <strong>${escapeHtml(event.name)}</strong>.</p>`,
      button: { label: "Review the list", url: attendeesPageUrl(event.uid) },
    },
    event.uid,
    "Failed to send the organizer request notice.",
  );
}
