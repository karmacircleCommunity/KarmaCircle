import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import type { DisplayEvent } from "@features/events/types";

/**
 * "Add to calendar" (PG-19): a Google Calendar link and an `.ics` file, which
 * Apple Calendar, Outlook and most other apps open. Both are built here from
 * the event the page already has, so there is no extra request and no email.
 */

/** `2026-11-24T10:30:00.000Z` becomes `20261124T103000Z`, the calendar format. */
function toCalendarTime(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** True when both times can be read, so a bad record shows no calendar links. */
export function hasCalendarTimes(
  event: Pick<DisplayEvent, "startsAt" | "endsAt">,
) {
  return (
    !Number.isNaN(new Date(event.startsAt).getTime()) &&
    !Number.isNaN(new Date(event.endsAt).getTime())
  );
}

/** The venue for an in-person or hybrid event, the join link for an online one. */
export function calendarLocation(event: DisplayEvent): string {
  if (hasVenue(event.mode)) {
    const place = [event.address, event.city, event.state, event.country]
      .filter(Boolean)
      .join(", ");
    if (place) return place;
  }
  if (hasOnlineAccess(event.mode) && event.platformLink) {
    return event.platformLink;
  }
  return "";
}

function calendarDescription(event: DisplayEvent, pageUrl: string): string {
  return [event.summary, pageUrl].filter(Boolean).join("\n\n");
}

export function googleCalendarUrl(
  event: DisplayEvent,
  pageUrl: string,
): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarTime(event.startsAt)}/${toCalendarTime(event.endsAt)}`,
    details: calendarDescription(event, pageUrl),
  });
  const location = calendarLocation(event);
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escapes the characters that mean something inside an `.ics` text value. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Lines over 75 characters are continued on the next line, starting with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) {
    parts.push(line.slice(i, i + 74));
  }
  return parts.join("\r\n ");
}

export function buildIcs(
  event: DisplayEvent,
  pageUrl: string,
  now: Date = new Date(),
): string {
  const location = calendarLocation(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KarmaCircle//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@karmacircle.org`,
    `DTSTAMP:${toCalendarTime(now.toISOString())}`,
    `DTSTART:${toCalendarTime(event.startsAt)}`,
    `DTEND:${toCalendarTime(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(calendarDescription(event, pageUrl))}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `URL:${pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function icsFileName(event: Pick<DisplayEvent, "id">): string {
  return `${event.id}.ics`;
}
