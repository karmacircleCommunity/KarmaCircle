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
