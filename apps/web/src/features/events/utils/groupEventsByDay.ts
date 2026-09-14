import type { EventCardEvent } from "../types";

export interface EventDayGroup {
  label: string;
  events: EventCardEvent[];
}

/** "Today" / "Tomorrow" / "Yesterday" for the near term, else a full
 *  weekday + date ("Wednesday, 17 Sep") — compared by local calendar day,
 *  not by a raw 24-hour offset, so 11pm tonight and 1am tomorrow land in
 *  different groups the way a reader actually expects. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(date) - startOfDay(new Date())) / 86_400_000,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/**
 * Buckets an already-chronologically-sorted event list into same-day
 * groups, preserving order.
 *
 * Built for a directory with a handful of events, not hundreds, where a
 * flat multi-column grid reads as mostly empty space. Grouping by day
 * (Luma, Eventbrite and most real events products do the same) is what
 * turns a sparse list into something that reads as
 * intentional rather than unfinished, and it's information a visitor
 * actually wants: "what's on today/tomorrow" outranks a static grid for
 * something time-based the way an organization directory isn't.
 */
export function groupEventsByDay(events: EventCardEvent[]): EventDayGroup[] {
  const groups: EventDayGroup[] = [];

  for (const event of events) {
    const label = dayLabel(event.startsAt);
    const current = groups[groups.length - 1];
    if (current?.label === label) {
      current.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
  }

  return groups;
}
