import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Timezones for events (PG-11).
 *
 * An event's start and end are exact instants (UTC timestamps). Its
 * `timezone` (an IANA name such as `Asia/Kolkata`) says which clock the
 * organizer was reading when they typed "10:00 am". The form therefore
 * interprets the date and time pickers in the event's timezone, not the
 * browser's, and the pages show the event's own time with its zone, plus the
 * viewer's own time when it is different. An event saved before this existed
 * has no timezone and is shown in the viewer's own zone, as it always was.
 */

/** The browser's own IANA timezone, or `UTC` where it cannot be read. */
export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const FALLBACK_ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
];

/**
 * Every timezone the browser knows, for the form's picker, always including
 * `UTC` and the browser's own. Older browsers without
 * `Intl.supportedValuesOf` get a short list of common zones instead.
 */
export function listTimeZones(extra: readonly string[] = []): string[] {
  let zones: string[];
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    zones = supported && supported.length > 0 ? [...supported] : FALLBACK_ZONES;
  } catch {
    zones = FALLBACK_ZONES;
  }
  return [...new Set(["UTC", browserTimeZone(), ...extra, ...zones])].sort();
}

/**
 * The exact instant for a calendar date and a clock time read in `zone`.
 * The two inputs are the form's date picker and time picker values; only their
 * year, month, day, hour and minute are used, never the browser's own zone.
 */
export function combineInZone(date: Dayjs, time: Dayjs, zone: string): Date {
  const wall = `${date.format("YYYY-MM-DD")} ${time.format("HH:mm")}`;
  return dayjs.tz(wall, zone).toDate();
}

/** Midnight at the start of the calendar day `date` in `zone`, as an instant. */
export function startOfDayInZone(date: Dayjs, zone: string): Date {
  return dayjs.tz(date.format("YYYY-MM-DD"), zone).toDate();
}

/**
 * An instant as the date and time pickers hold it: two values whose year,
 * month, day, hour and minute are the wall clock in `zone`. (They are built in
 * the browser's own zone, which is only a container for those digits.)
 */
export function partsInZone(
  instant: string | Date,
  zone: string,
): { date: Dayjs; time: Dayjs } {
  const wall = dayjs(instant).tz(zone);
  return {
    date: dayjs(wall.format("YYYY-MM-DD")),
    time: dayjs(`2000-01-01T${wall.format("HH:mm")}`),
  };
}

const isValidZone = (zone: string | undefined): zone is string => {
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
};

/** The short zone name at an instant ("IST", "GMT+5:30", "PST"), or `""`. */
export function zoneAbbreviation(instant: string | Date, zone: string): string {
  try {
    const part = new Intl.DateTimeFormat(undefined, {
      timeZone: zone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(instant))
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** A picker label such as "Asia/Kolkata (GMT+5:30)". */
export function zoneOptionLabel(zone: string, now: Date = new Date()): string {
  const abbreviation = zoneAbbreviation(now, zone);
  return abbreviation ? `${zone} (${abbreviation})` : zone;
}

/** The zone to format an event's times in: its own, if it has a valid one. */
export const eventZone = (zone: string | undefined): string | undefined =>
  isValidZone(zone) ? zone : undefined;

/** The offset from UTC, in minutes, of `zone` at `instant`. */
function offsetMinutes(instant: Date, zone: string): number {
  const wall = dayjs(instant).tz(zone);
  return wall.utcOffset();
}

/**
 * The event's time as the viewer would read it on their own clock, such as
 * "Tue · 4:30 AM", or `undefined` when the event has no timezone or the
 * viewer's clock shows the same time (same offset at that moment), so the
 * note is only ever shown when it adds something.
 */
export function viewerTimeNote(
  instant: string | Date,
  zone: string | undefined,
  viewerZone: string = browserTimeZone(),
): string | undefined {
  const valid = eventZone(zone);
  if (!valid) return undefined;

  const at = new Date(instant);
  if (offsetMinutes(at, valid) === offsetMinutes(at, viewerZone))
    return undefined;

  const day = at.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: viewerZone,
  });
  const time = at.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: viewerZone,
  });
  return `${day} · ${time}`;
}
