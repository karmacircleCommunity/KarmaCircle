import dayjs from "dayjs";
import {
  combineInZone,
  eventZone,
  startOfDayInZone,
} from "@features/events/utils/eventTimezone";
import { parseTags } from "@features/events/utils/eventTags";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import {
  detailChanges,
  detailPayloadForCreate,
  omitDetailFields,
} from "@features/events/utils/eventDetailFields";
import type {
  ApiEvent,
  EventFormState,
  SubmitIntent,
} from "@features/events/types";

/** A box holding nothing but spaces is an empty box. */
const textValue = (value: string) => (value.trim() === "" ? "" : value);

/**
 * Fields a draft may be saved without. Left empty, they are left out of the
 * create request altogether: an empty string is not "no value" to the API.
 */
const OMITTED_WHEN_EMPTY = [
  "description",
  "coverImage",
  "eventType",
  "address",
  "city",
  "state",
  "country",
  "platform",
  "platformLink",
] as const;

/**
 * The form as the body for `POST /events/create`. Only what was filled in is
 * sent, only the chosen format's venue or joining fields go, and a draft says
 * `status: "draft"`. The dates and times are the wall clock in the event's own
 * timezone (PG-11), turned into real instants.
 */
export function buildCreatePayload(
  form: EventFormState,
  intent: SubmitIntent,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ...omitDetailFields(form),
    ...detailPayloadForCreate(form),
    tags: parseTags(form.tags),
    ...(intent === "draft" ? { status: "draft" } : {}),
  };

  for (const field of OMITTED_WHEN_EMPTY) {
    if (textValue(form[field]) === "") delete body[field];
  }
  if (!hasVenue(form.mode)) {
    for (const field of ["address", "city", "state", "country"]) {
      delete body[field];
    }
  }
  if (!hasOnlineAccess(form.mode)) {
    delete body.platform;
    delete body.platformLink;
  }

  if (form.capacity.trim() === "") delete body.capacity;
  else body.capacity = Number(form.capacity);

  const { startDate, startTime, endDate, endTime, timezone } = form;
  if (startDate) body.startDate = startOfDayInZone(startDate, timezone);
  if (endDate) body.endDate = startOfDayInZone(endDate, timezone);
  if (startDate && startTime) {
    body.startTime = combineInZone(startDate, startTime, timezone);
  }
  if (endDate && endTime) {
    body.endTime = combineInZone(endDate, endTime, timezone);
  }

  return body;
}

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
 * mode's fields and requires the chosen mode's to be present on a published
 * event. A field a draft has never had (empty before and still empty) is left
 * out. A description or location field that was emptied goes as `null`, which
 * clears it (only a draft gets that far: the form refuses it otherwise).
 */
export function buildEventChanges(
  form: EventFormState,
  original: ApiEvent,
): EventChanges {
  const changes: EventChanges = {};

  if (form.name !== original.name) changes.name = form.name;
  const description = textValue(form.description);
  if (description !== (original.description ?? "")) {
    changes.description = description || null;
  }
  if (form.access !== original.access) changes.access = form.access;
  if (form.waitlistEnabled !== (original.waitlistEnabled !== false)) {
    changes.waitlistEnabled = form.waitlistEnabled;
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
    (field) => textValue(form[field]) !== (original[field] ?? ""),
  );
  if (modeChanged) changes.mode = form.mode;
  if (modeChanged || locationChanged) {
    for (const field of locationFields) {
      const next = textValue(form[field]);
      if (next !== "" || original[field]) changes[field] = next || null;
    }
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
    storedZone ? form.timezone !== storedZone : Object.keys(changes).length > 0
  ) {
    changes.timezone = form.timezone;
  }

  return changes;
}
