import {
  browserTimeZone,
  eventZone,
  partsInZone,
} from "@features/events/utils/eventTimezone";
import { formatTags } from "@features/events/utils/eventTags";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import { detailFieldsFromEvent } from "@features/events/utils/eventDetailFields";
import type { ApiEvent, EventFormState } from "@features/events/types";

/**
 * A stored event as the create/edit form's state, for editing it. The date and
 * time fields come from `startTime` and `endTime` (the real instants), read as
 * the wall clock in the event's own timezone (PG-11), so an organizer in London
 * editing a Kolkata event sees the Kolkata times they typed. An older event with
 * no timezone is read in the browser's, as it always was. A field the event's
 * format uses shows exactly what is stored, empty included (a draft may have
 * none of them); fields the format does not use fall back to the form's own
 * defaults, ready for a change of format.
 */
export function eventToFormState(event: ApiEvent): EventFormState {
  const timezone = eventZone(event.timezone) ?? browserTimeZone();
  const start = partsInZone(event.startTime, timezone);
  const end = partsInZone(event.endTime, timezone);
  const country = hasVenue(event.mode)
    ? (event.country ?? "")
    : event.country || "India";
  const platform = hasOnlineAccess(event.mode)
    ? (event.platform ?? "")
    : event.platform || "Zoom Meeting";

  return {
    name: event.name,
    uid: event.uid,
    description: event.description ?? "",
    coverImage: event.coverImage ?? "",
    mode: event.mode,
    timezone,
    startDate: start.date,
    endDate: end.date,
    startTime: start.time,
    endTime: end.time,
    address: event.address ?? "",
    city: event.city ?? "",
    state: event.state ?? "",
    country,
    platform,
    platformLink: event.platformLink ?? "",
    access: event.access,
    waitlistEnabled: event.waitlistEnabled !== false,
    capacity: event.capacity === undefined ? "" : String(event.capacity),
    eventType: event.eventType ?? "",
    tags: formatTags(event.tags),
    ...detailFieldsFromEvent(event),
  };
}
