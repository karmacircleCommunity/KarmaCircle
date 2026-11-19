import { Resend } from "resend";
import { env } from "./env";
import { STATUS_CODE } from "../constants/http-status";
import { AppError } from "../middleware/error-handler";
import { logger } from "./logger";
import type { IEvent } from "../modules/events/event.model";

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

export async function sendEventJoinConfirmation(
  to: string,
  attendeeName: string,
  event: IEvent,
): Promise<boolean> {
  if (env.NODE_ENV !== "production") return false;

  const eventUrl = `${env.ORIGIN_URL.replace(/\/$/, "")}/events/${encodeURIComponent(event.uid)}`;
  // In the event's own timezone when it has one (PG-11), named in the text
  // ("... 4:58 PM GMT+5:30"); otherwise in UTC, labelled, as before.
  const zone =
    event.timezone && isUsableZone(event.timezone) ? event.timezone : undefined;
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: zone ? "long" : "short",
    timeZone: zone ?? "UTC",
  }).format(new Date(event.startTime));
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
        <p>${escapeHtml(zone ? date : `${date} UTC`)}</p>
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

  const listUrl = `${env.ORIGIN_URL.replace(/\/$/, "")}/organization/events/${encodeURIComponent(event.uid)}/attendees`;
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

  const eventUrl = `${env.ORIGIN_URL.replace(/\/$/, "")}/events/${encodeURIComponent(event.uid)}`;
  const zone =
    event.timezone && isUsableZone(event.timezone) ? event.timezone : undefined;
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: zone ? "long" : "short",
    timeZone: zone ?? "UTC",
  }).format(new Date(event.startTime));
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
        <p>${escapeHtml(zone ? date : `${date} UTC`)}</p>
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
