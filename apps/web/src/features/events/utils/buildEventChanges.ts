import dayjs from "dayjs";
import {
  combineInZone,
  eventZone,
  startOfDayInZone,
} from "@features/events/utils/eventTimezone";
import { parseTags } from "@features/events/utils/eventTags";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import { detailChanges } from "@features/events/utils/eventDetailFields";
import type { ApiEvent, EventFormState } from "@features/events/types";

/** The shape `PATCH /events/:uid` accepts: any subset of the editable fields. */
export type EventChanges = Record<string, unknown>;

/**
 * What changed between the stored event and the edit form, as the body for
 * `PATCH /events/:uid`. Anything unchanged is left out, so:
 *
 * - the cover image (possibly a multi-megabyte data URL) is only sent when a
 *   new one was chosen;
 * - a start time left alone is never re-sent, so an event already running does
 *   not trip the API's "start must be in the future" rule, and a stored time
 *   with seconds is not rewritten by the form's whole-minute value;
 * - the date-only fields (`startDate`, `endDate`) travel with their time.
 *
 * Location fields go together: if the mode or any field of the chosen mode
 * changed, all of that mode's fields are sent, because the API drops the other
 * mode's fields and requires the chosen mode's to be present.
 */
export function buildEventChanges(
  form: EventFormState,
  original: ApiEvent,
): EventChanges {
  const changes: EventChanges = {};

  if (form.name !== original.name) changes.name = form.name;
  if (form.description !== original.description) {
    changes.description = form.description;
  }
  if (form.inviteOnly !== original.inviteOnly) {
    changes.inviteOnly = form.inviteOnly;
  }
  if (form.coverImage !== (original.coverImage ?? "")) {
    changes.coverImage = form.coverImage;
  }

  // A capacity is typed as text; empty means no limit, which on edit has to be
  // said out loud (`null`) because leaving the key out means "unchanged".
  const typedCapacity = form.capacity.trim();
  if (
    typedCapacity !==
    (original.capacity === undefined ? "" : String(original.capacity))
  ) {
    changes.capacity = typedCapacity === "" ? null : Number(typedCapacity);
  }

  // The type can be changed but not emptied (the form requires one).
  if (form.eventType !== "" && form.eventType !== original.eventType) {
    changes.eventType = form.eventType;
  }
  const nextTags = parseTags(form.tags);
  if (JSON.stringify(nextTags) !== JSON.stringify(original.tags ?? [])) {
    changes.tags = nextTags;
  }

  const modeChanged = form.mode !== original.mode;
  const locationFields = [
    ...(hasVenue(form.mode)
      ? (["city", "state", "country", "address"] as const)
      : []),
    ...(hasOnlineAccess(form.mode)
      ? (["platform", "platformLink"] as const)
      : []),
  ];
  const locationChanged = locationFields.some(
    (field) => form[field] !== (original[field] ?? ""),
  );
  if (modeChanged) changes.mode = form.mode;
  if (modeChanged || locationChanged) {
    for (const field of locationFields) changes[field] = form[field];
  }

  // The pickers hold wall-clock digits; the event's timezone says whose clock.
  // Changing only the timezone therefore moves the real start and end, so those
  // are compared (and sent) as instants.
  if (form.startDate && form.startTime) {
    const startAt = dayjs(
      combineInZone(form.startDate, form.startTime, form.timezone),
    );
    if (!startAt.isSame(dayjs(original.startTime), "minute")) {
      changes.startTime = startAt.toDate();
      changes.startDate = startOfDayInZone(form.startDate, form.timezone);
    }
  }
  if (form.endDate && form.endTime) {
    const endAt = dayjs(
      combineInZone(form.endDate, form.endTime, form.timezone),
    );
    if (!endAt.isSame(dayjs(original.endTime), "minute")) {
      changes.endTime = endAt.toDate();
      changes.endDate = startOfDayInZone(form.endDate, form.timezone);
    }
  }

  Object.assign(changes, detailChanges(form, original));

  // A timezone is sent when it differs from the stored one. An older event has
  // none, so the browser's zone shown in the form is only pinned onto it once
  // something else is being saved anyway; opening and closing the form changes
  // nothing.
  const storedZone = eventZone(original.timezone);
  if (
    storedZone
      ? form.timezone !== storedZone
      : Object.keys(changes).length > 0
  ) {
    changes.timezone = form.timezone;
  }

  return changes;
}
