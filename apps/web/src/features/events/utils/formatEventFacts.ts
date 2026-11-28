import { eventZone } from "@features/events/utils/eventTimezone";
import type { EventPhase } from "@features/events/types";

/**
 * Formatting for the dates, numbers and spans this feature renders -
 * one home for "format an event" instead of split across two files.
 * `formatEventDate`/`formatEventBadge`/`formatEventTime` used to live in
 * the now-retired `constants/eventDirectory.ts` fixture; they moved here
 * once that file's sample events were replaced by live `GET /events` data.
 */

/**
 * "Sat 12 Sep · 9:00 pm" in the visitor's own locale.
 *
 * The long form, for surfaces that show the date once - the detail page
 * hero. `EventCard` uses `formatEventBadge` + `formatEventTime` instead,
 * because it shows both and the two would otherwise print the same day
 * number twice.
 *
 * **With an event's `timezone` (PG-11)** the time is the event's own clock, not
 * the viewer's, and ends with the zone ("Sat · Sep 12, 9:00 PM GMT+5:30") so
 * nobody has to guess which clock it is. With none (an older event, or a
 * moment that is not an event's, such as when someone registered) it is the
 * viewer's own clock, as before.
 */
export const formatEventDate = (startsAt: string, timezone?: string) => {
  const zone = eventZone(timezone);
  return new Date(startsAt)
    .toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      ...(zone ? { timeZone: zone, timeZoneName: "short" as const } : {}),
    })
    .replace(", ", " · ");
};

/** Short form for the badge on the cover: "12 SEP", in the event's zone if it has one. */
export const formatEventBadge = (startsAt: string, timezone?: string) => {
  const zone = eventZone(timezone);
  return new Date(startsAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(zone ? { timeZone: zone } : {}),
  });
};

/**
 * "Sat · 9:00 pm" - weekday and start time, no day number.
 *
 * The companion to `formatEventBadge` on a card that shows both: the badge
 * carries the date, this carries the part the badge can't fit.
 */
export const formatEventTime = (startsAt: string, timezone?: string) => {
  const date = new Date(startsAt);
  const zone = eventZone(timezone);

  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    ...(zone ? { timeZone: zone } : {}),
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(zone ? { timeZone: zone, timeZoneName: "short" as const } : {}),
  })}`;
};

/**
 * An agenda row's time, written the way the page writes its other times.
 *
 * Agenda times are free text the organizer typed ("9:00 am", "After lunch"),
 * so the page showed "9:00" in the hero and "9:00 AM" in the schedule. A value
 * that is unambiguously a clock time (with am or pm, or two-digit 24-hour
 * "09:00") is rewritten in the visitor's own clock style; the hour and minute
 * stay exactly as typed, with no timezone conversion. Anything else, such as
 * "9:00", a range or a phrase, is shown as written.
 */
export const formatAgendaTime = (time: string) => {
  const typed = time.trim();
  const twelve = /^(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s*([ap])\.?m\.?$/i.exec(
    typed,
  );
  const full = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typed);
  if (!twelve && !full) return time;

  const hour = twelve
    ? (Number(twelve[1]) % 12) + (twelve[3].toLowerCase() === "p" ? 12 : 0)
    : Number(full![1]);
  const minute = Number((twelve ? twelve[2] : full![2]) ?? 0);

  return new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit", timeZone: "UTC" },
  );
};

/**
 * "4 hours", "2 days" - how long the thing actually runs for.
 *
 * Rounds to the half hour below a day and to whole days above it, because
 * "1 day 7 hours" is not how anyone describes a weekend build.
 */
export const formatDuration = (startsAt: string, endsAt: string) => {
  const rawMinutes =
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;

  // An unreadable date must not leak "NaN days" onto the page.
  if (Number.isNaN(rawMinutes)) return "Duration unknown";

  const minutes = Math.max(0, Math.round(rawMinutes));

  if (minutes < 60) return `${minutes} minutes`;

  if (minutes < 60 * 24) {
    const hours = Math.round((minutes / 60) * 2) / 2;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const days = Math.max(1, Math.round(minutes / (60 * 24)));
  return `${days} ${days === 1 ? "day" : "days"}`;
};

/** A maps search URL for a venue - no map SDK, no API key, no tracker. */
export const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * Where an event stands in time, the one definition every surface shares
 * (card, hero, join panel, mobile bar, calendar links, My Events and the
 * organization profile): "ongoing" between the start and the end, "ended"
 * only once the **end** has passed. The API splits `period=upcoming` from
 * `past` the same way, and closes joining and leaving at the start.
 *
 * A record with no readable end is judged by its start alone, and one with no
 * readable time at all counts as upcoming.
 */
export const eventPhase = (startsAt: string, endsAt?: string): EventPhase => {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt ?? "").getTime();

  if ((Number.isNaN(end) ? start : end) < now) return "ended";
  return start < now ? "ongoing" : "upcoming";
};

/** "1 spot left" or "12 spots left" - the singular matters at the last place. */
export const formatSpotsLeft = (spotsLeft: number) =>
  `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`;
