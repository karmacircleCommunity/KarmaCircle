import { eventPhase } from "@features/events/utils/formatEventFacts";

interface Hosted {
  startTime: string;
  endTime?: string;
  status?: string;
}

/**
 * An organization's events as its profile lists them. Drafts (sent only to the
 * organization itself) are their own group whatever their dates say, because a
 * draft has not happened and is not about to. The rest split by whether the
 * event has ended, so one that is running stays under "upcoming".
 */
export function groupHostedEvents<T extends Hosted>(events: T[]) {
  const soonestFirst = (a: T, b: T) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  const published = events.filter((event) => event.status !== "draft");
  const hasEnded = (event: T) =>
    eventPhase(event.startTime, event.endTime) === "ended";

  return {
    drafts: events
      .filter((event) => event.status === "draft")
      .sort(soonestFirst),
    upcoming: published.filter((event) => !hasEnded(event)).sort(soonestFirst),
    past: published.filter(hasEnded).sort((a, b) => soonestFirst(b, a)),
  };
}

/** The one label a listed event may carry beside its date, if any. */
export function hostedEventState(
  event: Hosted,
): "Draft" | "Cancelled" | "Happening now" | undefined {
  if (event.status === "draft") return "Draft";
  if (event.status === "cancelled") return "Cancelled";
  return eventPhase(event.startTime, event.endTime) === "ongoing"
    ? "Happening now"
    : undefined;
}
