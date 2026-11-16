import dayjs from "dayjs";
import { formatTags } from "@features/events/utils/eventTags";
import { detailFieldsFromEvent } from "@features/events/utils/eventDetailFields";
import type { ApiEvent, EventFormState } from "@features/events/types";

/**
 * A stored event as the create/edit form's state, for editing it. The date and
 * time fields come from `startTime` and `endTime` (the real instants), read in
 * the browser's own timezone, which is how the form lets an organizer pick
 * them. Fields a mode does not use fall back to the form's own defaults.
 */
export function eventToFormState(event: ApiEvent): EventFormState {
  const start = dayjs(event.startTime);
  const end = dayjs(event.endTime);

  return {
    name: event.name,
    uid: event.uid,
    description: event.description,
    coverImage: event.coverImage ?? "",
    mode: event.mode,
    startDate: start.startOf("day"),
    endDate: end.startOf("day"),
    startTime: start,
    endTime: end,
    address: event.address ?? "",
    city: event.city ?? "",
    state: event.state ?? "",
    country: event.country || "India",
    platform: event.platform || "Zoom Meeting",
    platformLink: event.platformLink ?? "",
    inviteOnly: event.inviteOnly,
    capacity: event.capacity === undefined ? "" : String(event.capacity),
    eventType: event.eventType ?? "",
    tags: formatTags(event.tags),
    ...detailFieldsFromEvent(event),
  };
}
