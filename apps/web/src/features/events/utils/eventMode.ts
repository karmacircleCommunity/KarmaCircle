import type { EventMode } from "@features/events/types";

/**
 * What each event mode needs (PG-10). `Hybrid` has a venue and a live stream,
 * so it counts as both: every place that used to ask "in person or online?"
 * asks these two questions instead.
 */

/** An in-person or hybrid event has a venue (address, city, directions). */
export const hasVenue = (mode: EventMode) => mode !== "Online";

/** An online or hybrid event has a way to join remotely (platform, link). */
export const hasOnlineAccess = (mode: EventMode) => mode !== "Offline";

/** Short label for the mode, as the form and the filters name it. */
export const MODE_LABELS: Record<EventMode, string> = {
  Offline: "In person",
  Online: "Online",
  Hybrid: "Hybrid",
};

/**
 * Where the event happens, in one short line for a card or a list row.
 * Online: "Online · Zoom Meeting". In person: "Guwahati, India". Hybrid: the
 * place with "Hybrid" in front, since the venue is what a person plans around.
 */
export function describeWhere(event: {
  mode: EventMode;
  city?: string;
  country?: string;
  platform?: string;
}): string {
  const place =
    [event.city, event.country].filter(Boolean).join(", ") || "Location TBA";

  if (event.mode === "Online") {
    return `Online${event.platform ? ` · ${event.platform}` : ""}`;
  }
  return event.mode === "Hybrid" ? `Hybrid · ${place}` : place;
}

/** Whether there is anything to show about the venue. A draft may have none of
 *  it yet, and an online event never does. */
export function hasVenueContent(
  event: {
    mode: EventMode;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  },
  gettingThere?: string,
): boolean {
  return (
    hasVenue(event.mode) &&
    Boolean(
      event.address ||
      event.city ||
      event.state ||
      event.country ||
      gettingThere,
    )
  );
}

/** Whether there is anything to show about joining remotely. */
export function hasJoiningContent(
  event: { mode: EventMode; platform?: string; platformLink?: string },
  ...notes: (string | undefined)[]
): boolean {
  return (
    hasOnlineAccess(event.mode) &&
    [event.platform, event.platformLink, ...notes].some(Boolean)
  );
}
