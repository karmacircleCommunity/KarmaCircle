/**
 * Formatting for the numbers and spans on the event detail page.
 *
 * Date/time formatting deliberately stays in `constants/eventDirectory.ts`
 * alongside `formatEventDate`/`formatEventBadge`, which the card already
 * imports from there - splitting the two halves of "format an event" across
 * two folders would be worse than the mild inconsistency of leaving them.
 */

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
