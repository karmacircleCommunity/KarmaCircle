import type { DisplayEvent } from "@features/events/types";
import { eventEndpoints } from "@services/ApiEndpoints";

/** What a calendar needs to know about an event. */
export interface CalendarEntry {
  title: string;
  description: string;
  start: Date;
  end: Date;
  location: string;
  url: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Where it is held, in the same words the API puts in the calendar file
 * (`placeOf` in `apps/api/src/modules/events/event.place.ts`), so the three
 * ways of adding an event never describe it differently. An online event
 * with a meeting link uses the link: Google Calendar makes it clickable.
 */
export function calendarLocation(event: DisplayEvent): string {
  const venue = [event.address, event.city, event.state, event.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const online = event.platform?.trim()
    ? `Online (${event.platform.trim()})`
    : "Online";

  if (event.mode === "Online") return event.platformLink?.trim() || online;
  if (event.mode === "Hybrid")
    return venue ? `${venue}, and ${online}` : online;
  return venue;
}

/**
 * The event as a calendar entry, or `null` when its times cannot be read. An
 * end that is not after the start becomes one hour, so a link never makes an
 * entry that ends before it begins.
 */
export function toCalendarEntry(
  event: DisplayEvent,
  pageUrl: string,
): CalendarEntry | null {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  let end = new Date(event.endsAt);
  if (Number.isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + ONE_HOUR_MS);
  }
  return {
    title: event.title,
    description: [event.summary, pageUrl].filter(Boolean).join("\n\n"),
    start,
    end,
    location: calendarLocation(event),
    url: pageUrl,
  };
}

/** `20261122T013000Z`, the form Google Calendar wants. */
const compactUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

/** Opens Google Calendar's "new event" page with the event filled in. */
export function googleCalendarUrl(entry: CalendarEntry): string {
  return `https://calendar.google.com/calendar/render?${query({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${compactUtc(entry.start)}/${compactUtc(entry.end)}`,
    details: entry.description,
    location: entry.location,
  })}`;
}

/** Opens Outlook on the web (outlook.com) with the event filled in. */
export function outlookCalendarUrl(entry: CalendarEntry): string {
  return `https://outlook.live.com/calendar/0/deeplink/compose?${query({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: entry.title,
    startdt: entry.start.toISOString(),
    enddt: entry.end.toISOString(),
    body: entry.description,
    location: entry.location,
  })}`;
}

/** The `.ics` file, for Apple Calendar, desktop Outlook and anything else. */
export const icsUrl = (uid: string) => eventEndpoints.calendar(uid);
