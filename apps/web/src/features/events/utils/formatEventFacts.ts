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
 */
export const formatEventDate = (startsAt: string) =>
  new Date(startsAt)
    .toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(", ", " · ");

/** Short form for the badge on the cover: "12 SEP". */
export const formatEventBadge = (startsAt: string) =>
  new Date(startsAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

/**
 * "Sat · 9:00 pm" - weekday and start time, no day number.
 *
 * The companion to `formatEventBadge` on a card that shows both: the badge
 * carries the date, this carries the part the badge can't fit.
 */
export const formatEventTime = (startsAt: string) => {
  const date = new Date(startsAt);

  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

/**
 * "₹4,50,000", "KES 620,000" - whichever the runtime's locale data can do.
 *
 * Whole units only: a raised-of-goal bar with decimals on it reads as a
 * bank statement, not a fundraiser.
 */
export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

/** Raised as a whole percentage of goal, clamped so an over-funded drive
 *  cannot push the bar past its track. */
export const fundedPercent = (raised: number, goal: number) =>
  goal <= 0 ? 0 : Math.min(100, Math.round((raised / goal) * 100));

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
