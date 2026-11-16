import { useSWRConfig } from "swr";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { RESERVED_EVENT_ADDRESSES } from "@features/events/constants/reservedEventAddresses";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import {
  CreateEvent,
  PublishEvent,
  UpdateEvent,
} from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import {
  combineInZone,
  startOfDayInZone,
} from "@features/events/utils/eventTimezone";
import { parseTags, validateTags } from "@features/events/utils/eventTags";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import { buildEventChanges } from "@features/events/utils/buildEventChanges";
import {
  detailPayloadForCreate,
  omitDetailFields,
  validateDetails,
} from "@features/events/utils/eventDetailFields";
import type {
  ApiEvent,
  EventFormErrors,
  EventFormState,
  SubmitIntent,
  UseEventResult,
} from "@features/events/types";

const EVENT_UID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** The exact moment a date and a clock time mean in the event's timezone (PG-11). */
const combineDateAndTime = (date: Dayjs, time: Dayjs, timezone: string) =>
  dayjs(combineInZone(date, time, timezone));

/**
 * Validates and submits the shared event form, then refreshes public and host
 * lists.
 *
 * Pass `original` (the stored event) to edit instead of create. Editing sends
 * only what changed to `PATCH /events/:uid`; the page address is fixed, so its
 * checks are skipped; and "the start must be in the future" applies only when
 * the start was actually moved, matching the API (an event already running
 * can still fix a typo).
 */
export function useEvent(
  event: EventFormState,
  original?: ApiEvent,
): UseEventResult {
  const { uid, ...data } = event;
  const { mutate } = useSWRConfig();
  const { organization } = useMyOrganization();

  const validateEvent = (): EventFormErrors => {
    const errors: EventFormErrors = {};

    if (
      !data.name ||
      !uid ||
      !data.description ||
      !data.coverImage ||
      !data.mode ||
      !data.startDate ||
      !data.endDate ||
      !data.startTime ||
      !data.endTime
    ) {
      if (!data.name) errors.name = "Name is required";
      if (!uid) errors.uid = "Event page address is required";
      if (!data.description) errors.description = "Description is required";
      if (!data.coverImage) errors.coverImage = "Cover image is required";
      if (!data.mode) errors.mode = "Mode is required";
      if (!data.startDate) errors.startDate = "Start date is required";
      if (!data.endDate) errors.endDate = "End date is required";
      if (!data.startTime) errors.startTime = "Start time is required";
      if (!data.endTime) errors.endTime = "End time is required";
    }

    if (!original) {
      if (uid && !EVENT_UID_PATTERN.test(uid)) {
        errors.uid = "Use lowercase letters, numbers, and single hyphens only";
      } else if (RESERVED_EVENT_ADDRESSES.includes(uid)) {
        errors.uid = "That event page address is reserved. Choose another one";
      }
    }

    if (hasVenue(data.mode)) {
      if (!data.city) errors.city = "City is required";
      if (!data.state) errors.state = "State is required";
      if (!data.country) errors.country = "Country is required";
      if (!data.address) errors.address = "Address is required";
    }
    if (hasOnlineAccess(data.mode)) {
      if (!data.platform) errors.platform = "Choose an online platform";
      if (!data.platformLink) {
        errors.platformLink = "Please provide a meeting link";
      } else if (!isHttpUrl(data.platformLink)) {
        errors.platformLink =
          "Enter a complete link starting with http:// or https://";
      }
    }

    if (data.name.length < 10 || data.name.length > 80)
      errors.name = "Name should be between 10 and 80 characters";

    if (data.description.length < 20 || data.description.length > 200)
      errors.description =
        "Description should be between 20 and 200 characters";

    const startAt =
      data.startDate && data.startTime
        ? combineDateAndTime(data.startDate, data.startTime, data.timezone)
        : null;
    const endAt =
      data.endDate && data.endTime
        ? combineDateAndTime(data.endDate, data.endTime, data.timezone)
        : null;

    if (startAt && endAt && !endAt.isAfter(startAt)) {
      errors.endTime = "End date and time must follow the start date and time";
    }

    const typedCapacity = data.capacity.trim();
    if (typedCapacity !== "") {
      const capacity = Number(typedCapacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
        errors.capacity =
          "Enter a whole number from 1 to 100000, or leave it empty for no limit";
      }
    }

    Object.assign(errors, validateDetails(data, data.mode));

    if (!data.eventType) {
      errors.eventType = "Choose what kind of event this is";
    }
    const tagsError = validateTags(data.tags);
    if (tagsError) errors.tags = tagsError;

    // An edit that leaves the start alone may keep a start already in the
    // past (the event is running); only a moved start must be in the future.
    const startMoved =
      !original ||
      !startAt ||
      !startAt.isSame(dayjs(original.startTime), "minute");
    if (startAt && startMoved && startAt.isBefore(dayjs())) {
      errors.startTime = "Start date and time must be in the future";
    }

    return errors;
  };

  const submitCallback = async (
    event: EventFormState,
    onSuccess: () => void,
    errors: EventFormErrors,
    intent: SubmitIntent = "publish",
  ): Promise<void> => {
    if (Object.keys(errors).length === 0 && original) {
      const changes = buildEventChanges(event, original);
      const hasChanges = Object.keys(changes).length > 0;
      const isDraft = original.status === "draft";
      // Publishing a draft saves any changes first, then makes it public.
      const publishing = isDraft && intent === "publish";

      if (!hasChanges && !publishing) {
        showErrorToast("Nothing has changed yet.");
        return;
      }

      const refresh = () => {
        void mutate(eventEndpoints.byUid(original.uid));
        if (organization?.handle) {
          void mutate(eventEndpoints.byHost(organization.handle));
        }
      };
      const failure = (result: {
        message?: string;
        errors?: { message: string }[];
      }) =>
        showErrorToast(
          result.errors?.[0]?.message ??
            result.message ??
            "Could not update the event. Try again.",
        );

      if (hasChanges) {
        const result = await UpdateEvent(original.uid, changes);
        if (!result.ok) {
          failure(result);
          return;
        }
      }

      if (publishing) {
        const published = await PublishEvent(original.uid);
        refresh();
        if (!published.ok) {
          // The changes are saved; only the publish step was refused.
          failure(published);
          return;
        }
      }

      showSuccessToast(
        publishing
          ? "Event published"
          : isDraft
            ? "Draft saved"
            : "Event updated",
      );
      onSuccess();
      refresh();
    } else if (Object.keys(errors).length === 0) {
      // CreateEvent() returns the caught Axios error as-is on failure.
      const requestEvent = {
        ...omitDetailFields(event),
        ...detailPayloadForCreate(event),
        capacity: event.capacity.trim() ? Number(event.capacity) : undefined,
        tags: parseTags(event.tags),
        ...(intent === "draft" ? { status: "draft" } : {}),
        startDate: event.startDate
          ? startOfDayInZone(event.startDate, event.timezone)
          : undefined,
        endDate: event.endDate
          ? startOfDayInZone(event.endDate, event.timezone)
          : undefined,
        startTime:
          event.startDate && event.startTime
            ? combineInZone(event.startDate, event.startTime, event.timezone)
            : event.startTime,
        endTime:
          event.endDate && event.endTime
            ? combineInZone(event.endDate, event.endTime, event.timezone)
            : event.endTime,
      };
      const response = (await CreateEvent(requestEvent)) as {
        status?: number;
        data?: { message?: string };
        response?: { data?: { message?: string } };
      };

      if (response.status === 201) {
        showSuccessToast(
          intent === "draft"
            ? "Draft saved. Only you can see it until you publish it."
            : response.data?.message,
        );
        onSuccess();

        // The public directory (`useSWRInfinite` in `Events.tsx`) is not
        // refreshed from here: SWR's global `mutate` skips infinite keys. It
        // refetches every loaded page itself when `/events` is next opened
        // (`revalidateAll`).
        if (organization?.handle) {
          void mutate(eventEndpoints.byHost(organization.handle));
        }
      } else {
        showErrorToast(
          response.response?.data?.message ??
            "Could not create event. Try again.",
        );
      }
    } else {
      showErrorToast("Please fill all the required fields");
    }
  };

  return {
    validateEvent,
    submitCallback,
  };
}
