import { placeOf } from "./event.place";

/**
 * The calendar file for one event (RFC 5545), so an attendee can add it to
 * Apple Calendar, Outlook, Google Calendar or anything else that reads `.ics`.
 *
 * Choices worth knowing:
 * - Times are written in UTC (`...Z`), so the file needs no timezone
 *   definitions and every calendar shows the right moment in the viewer's own
 *   zone. The event's own zone is only a display matter and is not needed.
 * - The `UID` is the event's page address, so adding the file again, or
 *   adding a changed version of it, updates the entry instead of duplicating it.
 *   `SEQUENCE` and `LAST-MODIFIED` come from when the event last changed, so a
 *   calendar knows which copy is newer.
 * - A cancelled event is written with `STATUS:CANCELLED`, so a calendar that
 *   already has it can mark it cancelled.
 * - The file is built from what the public event page shows. Nothing private
 *   (no organizer email, no attendee) goes in it.
 */

export interface CalendarSource {
  uid: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  status?: string;
  mode: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  platform?: string;
  platformLink?: string;
  updatedAt?: Date;
}

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

/**
 * Escapes a text value: backslash, semicolon and comma are special, and a line
 * break is written as `\n`. Control characters are dropped, because they have
 * no place in a calendar and some break parsers.
 */
export function escapeText(value: string): string {
  const backslash = String.fromCharCode(92);
  return (
    value
      // Keeps tab, line feed and carriage return; drops the other controls.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      // A backslash, a semicolon or a comma gets a backslash in front.
      .replace(/[\\;,]/g, (character) => backslash + character)
      .replace(/\r\n|\r|\n/g, backslash + "n")
  );
}

/**
 * Folds a line so none is longer than 75 octets: the rest continues on the
 * next line after one space. Counted in bytes, not characters, and a
 * multi-byte character is never split.
 */
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= MAX_LINE_OCTETS) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // A continuation line starts with a space, which counts toward its 75.
  let limit = MAX_LINE_OCTETS;
  for (const character of line) {
    const bytes = Buffer.byteLength(character, "utf8");
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += character;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** `20261122T013000Z`. */
export function formatUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** A file name from the event's page address, safe on every system. */
export function icsFileName(uid: string): string {
  const safe = uid
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "event"}.ics`;
}

export function buildEventIcs(
  event: CalendarSource,
  options: { siteUrl: string },
): string {
  const siteUrl = options.siteUrl.replace(/\/+$/, "");
  const pageUrl = `${siteUrl}/events/${encodeURIComponent(event.uid)}`;
  const host = new URL(siteUrl).hostname;
  const modified = event.updatedAt ?? new Date();
  const cancelled = event.status === "cancelled";
  const place = placeOf(event);

  const description = [
    event.description.trim(),
    event.platformLink ? `Join online: ${event.platformLink}` : "",
    `Event page: ${pageUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KarmaCircle//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@${host}`,
    `DTSTAMP:${formatUtc(modified)}`,
    `LAST-MODIFIED:${formatUtc(modified)}`,
    // Minutes since 1970: only has to grow every time the event changes.
    `SEQUENCE:${Math.floor(modified.getTime() / 60_000)}`,
    `DTSTART:${formatUtc(event.startTime)}`,
    `DTEND:${formatUtc(event.endTime)}`,
    `SUMMARY:${escapeText(event.name)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(place ? [`LOCATION:${escapeText(place)}`] : []),
    `URL:${pageUrl}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    ...(cancelled
      ? []
      : [
          // A reminder on the device an hour before, on top of the email a day before.
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(event.name)}`,
          "TRIGGER:-PT1H",
          "END:VALARM",
        ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join(CRLF) + CRLF;
}
