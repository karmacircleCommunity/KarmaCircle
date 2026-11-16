import { eventZone } from "@features/events/utils/eventTimezone";

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
 * Deliberately not `getFormattedDate.ts` (this feature's other date
 * helper): that one takes the API's `{ date, time }` string pair, while
 * this one takes a real ISO timestamp, which is what a live `Event`
 * record's `startTime` actually is.
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
 * "4 hours", "2 days" - how long the thing actually runs for.
 *
 * Rounds to the half hour below a day and to whole days above it, because
 * "1 day 7 hours" is not how anyone describes a weekend build.
 */
export const formatDuration = (startsAt: string, endsAt: string) => {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000,
    ),
  );

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
 * Whether an event counts as "completed" - used by `EventCard`'s
 * "Completed" pill and the detail page's join-panel swap
 * (`EventHero`/`EventJoinPanel`/`EventMobileActionBar`) to match the same
 * `startsAt` cut `Events.tsx` already sorts Upcoming/Past by (that page
 * pins its own `Date.now()` once per page load rather than calling this,
 * so a card doesn't hop tabs mid-scroll - see its own comment).
 *
 * Deliberately `startsAt`, not `endsAt`, even on the detail page where
 * `endsAt` is available and would be the more literally correct signal
 * ("has this actually finished"). `EventCardEvent` (the directory card's
 * shape) doesn't carry `endsAt` at all, so using a stricter cut only on
 * the detail page would let a card sitting in the Past tab open into a
 * detail page that still offered to Join, or vice versa - one shared,
 * slightly looser definition beats two disagreeing correct ones.
 */
export const isEventPast = (startsAt: string) =>
  new Date(startsAt).getTime() < Date.now();

/** "1 spot left" or "12 spots left" - the singular matters at the last place. */
export const formatSpotsLeft = (spotsLeft: number) =>
  `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`;
