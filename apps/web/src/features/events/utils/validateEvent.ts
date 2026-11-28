import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RESERVED_EVENT_ADDRESSES } from "@features/events/constants/reservedEventAddresses";
import { combineInZone } from "@features/events/utils/eventTimezone";
import { validateTags } from "@features/events/utils/eventTags";
import { eventToFormState } from "@features/events/utils/eventToFormState";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import {
  DETAIL_FORM_KEYS,
  validateDetails,
} from "@features/events/utils/eventDetailFields";
import type {
  ApiEvent,
  EventFormErrors,
  EventFormState,
  SubmitIntent,
} from "@features/events/types";

/**
 * The checks the event form runs before it sends anything, in two strengths.
 *
 * Saving a **draft** needs only the name, the page address, the format and the
 * start and end. Everything else may be left empty, but whatever is filled in
 * has to be valid (lengths, link format, number ranges).
 *
 * **Publishing** (a new event, or a draft) and saving an already published event
 * need all of that plus the description, the cover image, the kind of event and
 * the venue or the way to join that the format asks for.
 */

/** The limits mirror `event.constants.ts` in the API. */
export const EVENT_LIMITS = {
  nameMin: 10,
  nameMax: 80,
  descriptionMin: 20,
  descriptionMax: 200,
  cityMax: 100,
  stateMax: 100,
  countryMax: 100,
  addressMax: 200,
  platformMax: 60,
  platformLinkMax: 2048,
  capacityMax: 100_000,
} as const;

/** Said by the form and by the Publish button on My events. */
export const MISSING_KIND_MESSAGE = "Choose what kind of event this is";

const EVENT_UID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const VENUE_FIELDS = [
  { key: "address", noun: "street address", required: "Address is required" },
  { key: "city", noun: "city", required: "City is required" },
  { key: "state", noun: "state or region", required: "State is required" },
  { key: "country", noun: "country", required: "Country is required" },
] as const;

const isBlank = (value: string) => value.trim() === "";

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** The exact moment a date and a clock time mean in the event's timezone (PG-11). */
const instant = (date: Dayjs | null, time: Dayjs | null, timezone: string) =>
  date?.isValid() && time?.isValid()
    ? dayjs(combineInZone(date, time, timezone))
    : null;

/**
 * Every field that is wrong for what the organizer is trying to do. `intent` is
 * the button that was pressed; saving a published event is `publish`. Pass
 * `original` (the stored event) when editing.
 */
export function validateEventForm(
  form: EventFormState,
  intent: SubmitIntent,
  original?: ApiEvent,
): EventFormErrors {
  const errors: EventFormErrors = {};
  const publishing = intent === "publish";
  const L = EVENT_LIMITS;

  const nameLength = form.name.trim().length;
  if (nameLength === 0) {
    errors.name = "Name is required";
  } else if (nameLength < L.nameMin || form.name.length > L.nameMax) {
    errors.name = `Name should be between ${L.nameMin} and ${L.nameMax} characters`;
  }

  // The page address is fixed once the event exists.
  if (!original) {
    if (!form.uid) {
      errors.uid = "Event page address is required";
    } else if (!EVENT_UID_PATTERN.test(form.uid)) {
      errors.uid = "Use lowercase letters, numbers, and single hyphens only";
    } else if (RESERVED_EVENT_ADDRESSES.includes(form.uid)) {
      errors.uid = "That event page address is reserved. Choose another one";
    }
  }

  if (isBlank(form.description)) {
    if (publishing) errors.description = "Description is required";
  } else if (publishing) {
    if (
      form.description.trim().length < L.descriptionMin ||
      form.description.length > L.descriptionMax
    ) {
      errors.description = `Description should be between ${L.descriptionMin} and ${L.descriptionMax} characters`;
    }
  } else if (form.description.length > L.descriptionMax) {
    errors.description = `Keep the description to ${L.descriptionMax} characters or fewer`;
  }

  if (publishing && !form.coverImage) {
    errors.coverImage = "Cover image is required";
  }

  if (publishing && !form.eventType) {
    errors.eventType = MISSING_KIND_MESSAGE;
  }
  const tagsError = validateTags(form.tags);
  if (tagsError) errors.tags = tagsError;

  if (!form.mode) errors.mode = "Mode is required";

  // Only the chosen format's fields are checked: the others are not sent.
  if (hasVenue(form.mode)) {
    for (const { key, noun, required } of VENUE_FIELDS) {
      const max = L[`${key}Max`];
      if (isBlank(form[key])) {
        if (publishing) errors[key] = required;
      } else if (form[key].length > max) {
        errors[key] = `Keep the ${noun} to ${max} characters or fewer`;
      }
    }
  }
  if (hasOnlineAccess(form.mode)) {
    if (isBlank(form.platform)) {
      if (publishing) errors.platform = "Choose an online platform";
    } else if (form.platform.length > L.platformMax) {
      errors.platform = `Keep the platform to ${L.platformMax} characters or fewer`;
    }
    const link = form.platformLink.trim();
    if (link === "") {
      if (publishing) errors.platformLink = "Please provide a meeting link";
    } else if (!isHttpUrl(link)) {
      errors.platformLink =
        "Enter a complete link starting with http:// or https://";
    } else if (link.length > L.platformLinkMax) {
      errors.platformLink = `Keep the meeting link to ${L.platformLinkMax} characters or fewer`;
    }
  }

  if (!form.startDate?.isValid()) errors.startDate = "Start date is required";
  if (!form.startTime?.isValid()) errors.startTime = "Start time is required";
  if (!form.endDate?.isValid()) errors.endDate = "End date is required";
  if (!form.endTime?.isValid()) errors.endTime = "End time is required";

  const startAt = instant(form.startDate, form.startTime, form.timezone);
  const endAt = instant(form.endDate, form.endTime, form.timezone);

  if (startAt && endAt && !endAt.isAfter(startAt)) {
    errors.endTime = "End date and time must follow the start date and time";
  }

  // An edit that leaves the start alone may keep a start already in the past
  // (the event is running, or the draft was saved long ago). A moved start must
  // be in the future, and so must the start of anything about to go public.
  const startMoved =
    !original ||
    (startAt !== null && !startAt.isSame(dayjs(original.startTime), "minute"));
  const goingPublic = publishing && original?.status === "draft";
  if (startAt && (startMoved || goingPublic) && startAt.isBefore(dayjs())) {
    errors.startTime = "Start date and time must be in the future";
  }

  const typedCapacity = form.capacity.trim();
  if (typedCapacity !== "") {
    const capacity = Number(typedCapacity);
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > L.capacityMax
    ) {
      errors.capacity = `Enter a whole number from 1 to ${L.capacityMax}, or leave it empty for no limit`;
    }
  }

  Object.assign(errors, validateDetails(form, form.mode));

  return errors;
}

/** What the API itself refuses to publish without, or with. */
const API_PUBLISH_FIELDS: readonly (keyof EventFormState)[] = [
  "description",
  "coverImage",
  "startTime",
  "endTime",
  "address",
  "city",
  "state",
  "country",
  "platform",
  "platformLink",
];

/**
 * Whether publishing a stored draft has to be stopped here for want of a kind of
 * event. The API publishes an event without one; the form never has. With
 * anything else missing too, the request goes ahead, because the API refuses it
 * and says which field comes first.
 */
export function onlyKindStopsPublish(draft: ApiEvent): boolean {
  if (draft.eventType) return false;
  const problems = validateEventForm(eventToFormState(draft), "publish", draft);
  return !API_PUBLISH_FIELDS.some((field) => problems[field]);
}

/** The form fields the API can name in a validation error, by their own name. */
const API_FIELDS: ReadonlySet<string> = new Set<keyof EventFormState>([
  "name",
  "uid",
  "description",
  "eventType",
  "tags",
  "coverImage",
  "mode",
  "startDate",
  "startTime",
  "endDate",
  "endTime",
  "timezone",
  "address",
  "city",
  "state",
  "country",
  "platform",
  "platformLink",
  "access",
  "capacity",
  "waitlistEnabled",
  ...DETAIL_FORM_KEYS,
]);

/** The API sends the fee as one object; the form has a box per part. */
const COST_FIELDS: Record<string, keyof EventFormState> = {
  amount: "costAmount",
  currency: "costCurrency",
  note: "costNote",
};

/** The form field an API error `path` (such as `cost.amount` or `tags.2`) is about. */
export function formFieldForApiPath(
  path: string,
): keyof EventFormState | undefined {
  const [head, part] = path.split(".");
  if (head === "cost") return COST_FIELDS[part ?? "amount"] ?? "costAmount";
  return API_FIELDS.has(head) ? (head as keyof EventFormState) : undefined;
}

/**
 * The API's field-level problems (a `400`) as form errors, so they show under
 * the boxes they are about. The first message for a field wins; a problem with
 * no matching box is left to the toast.
 */
export function formErrorsFromApi(
  problems: readonly { path?: string; message: string }[] | undefined,
): EventFormErrors {
  const errors: EventFormErrors = {};
  // A database-level refusal sends plain strings, which name no field.
  for (const problem of problems ?? []) {
    if (!problem?.path) continue;
    const field = formFieldForApiPath(problem.path);
    if (field && !errors[field]) errors[field] = problem.message;
  }
  return errors;
}
