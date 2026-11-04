import { useSWRConfig } from "swr";
import type { Dayjs } from "dayjs";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import { CreateEvent } from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { EventFormErrors, EventFormState, UseEventResult } from "../types";

const EVENT_UID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Validates and submits the shared event form, then refreshes public and host lists. */
const combineDateAndTime = (date: Dayjs, time: Dayjs) =>
  date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0);

export function useEvent(event: EventFormState): UseEventResult {
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

    if (uid && !EVENT_UID_PATTERN.test(uid)) {
      errors.uid = "Use lowercase letters, numbers, and single hyphens only";
    }

    if (data.mode === "Offline") {
      if (!data.city) errors.city = "City is required";
      if (!data.state) errors.state = "State is required";
      if (!data.country) errors.country = "Country is required";
      if (!data.address) errors.address = "Address is required";
    } else {
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
        ? combineDateAndTime(data.startDate, data.startTime)
        : null;
    const endAt =
      data.endDate && data.endTime
        ? combineDateAndTime(data.endDate, data.endTime)
        : null;

    if (startAt && endAt && endAt.isBefore(startAt)) {
      errors.endTime = "End date and time must follow the start date and time";
    }

    return errors;
  };

  const submitCallback = async (
    event: EventFormState,
    onSuccess: () => void,
    errors: EventFormErrors,
  ): Promise<void> => {
    if (Object.keys(errors).length === 0) {
      // CreateEvent() returns the caught Axios error as-is on failure.
      const requestEvent = {
        ...event,
        startDate: event.startDate?.startOf("day").toDate(),
        endDate: event.endDate?.startOf("day").toDate(),
        startTime:
          event.startDate && event.startTime
            ? combineDateAndTime(event.startDate, event.startTime).toDate()
            : event.startTime,
        endTime:
          event.endDate && event.endTime
            ? combineDateAndTime(event.endDate, event.endTime).toDate()
            : event.endTime,
      };
      const response = (await CreateEvent(requestEvent)) as {
        status?: number;
        data?: { message?: string };
        response?: { data?: { message?: string } };
      };

      if (response.status === 201) {
        showSuccessToast(response.data?.message);
        onSuccess();

        void mutate(eventEndpoints.directory());
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
