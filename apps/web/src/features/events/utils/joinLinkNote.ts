import type { EventPhase } from "@features/events/types";

/**
 * What the joining card of an online or hybrid event says about the meeting
 * link when the viewer was not sent one. The API includes `platformLink` only
 * for the hosting organization and for a signed-in person who is going, so a
 * missing link is the normal case for everyone else.
 *
 * It promises nothing about how the link arrives: that is the organizer's own
 * `linkDelivery` text, which the card shows separately. `undefined` means the
 * card needs no sentence of ours, either because the link is there or because
 * there is nothing left to join.
 */
export function joinLinkNote({
  hasLink,
  isHost,
  going,
  phase,
  cancelled,
  refreshing = false,
}: {
  hasLink: boolean;
  isHost: boolean;
  going: boolean;
  phase: EventPhase;
  cancelled: boolean;
  /** The event is being fetched again, for example right after joining. */
  refreshing?: boolean;
}): string | undefined {
  if (hasLink || cancelled) return undefined;
  if (isHost) return "No meeting link has been added yet.";
  if (phase === "ended") return undefined;
  if (going) {
    return refreshing
      ? "Getting your meeting link…"
      : "The meeting link is not available yet.";
  }
  return phase === "ongoing"
    ? "Joining has closed because the event has started, so the meeting link is not shown."
    : "The meeting link is shown here once you have joined.";
}
