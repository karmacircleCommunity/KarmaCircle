import { useSWRConfig } from "swr";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import {
  CreateEvent,
  PublishEvent,
  UpdateEvent,
} from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import {
  buildCreatePayload,
  buildEventChanges,
} from "@features/events/utils/buildEventChanges";
import {
  formErrorsFromApi,
  validateEventForm,
} from "@features/events/utils/validateEvent";
import type {
  ApiEvent,
  EventFormErrors,
  EventFormState,
  SubmitIntent,
  UseEventResult,
} from "@features/events/types";

/** A refused write, as much of it as the form shows. */
interface Refusal {
  message?: string;
  errors?: { path: string; message: string }[];
}

/** Says why the API refused, preferring the first field's own message. */
const showRefusal = (refusal: Refusal | undefined, fallback: string) => {
  showErrorToast(refusal?.errors?.[0]?.message ?? refusal?.message ?? fallback);
  return formErrorsFromApi(refusal?.errors);
};

/**
 * Validates and submits the shared event form, then refreshes public and host
 * lists.
 *
 * `intent` decides how much is required: a draft needs little, publishing (and
 * saving a published event) needs everything (see `validateEvent.ts`).
 *
 * Pass `original` (the stored event) to edit instead of create. Editing sends
 * only what changed to `PATCH /events/:uid`; the page address is fixed, so its
 * checks are skipped; and "the start must be in the future" applies only when
 * the start was actually moved or a draft is about to be published, matching
 * the API (an event already running can still fix a typo).
 *
 * `onStored` receives the saved event when an edit was stored but the page
 * stays open (the publish that followed was refused), so further changes are
 * measured against what the API now holds.
 */
export function useEvent(
  event: EventFormState,
  original?: ApiEvent,
  onStored?: (stored: ApiEvent) => void,
): UseEventResult {
  const { mutate } = useSWRConfig();
  const { organization } = useMyOrganization();

  const validateEvent = (intent: SubmitIntent = "publish"): EventFormErrors =>
    validateEventForm(event, intent, original);

  const submitCallback = async (
    event: EventFormState,
    onSuccess: () => void,
    errors: EventFormErrors,
    intent: SubmitIntent = "publish",
  ): Promise<EventFormErrors | undefined> => {
    // An invalid form never reaches the API.
    if (Object.keys(errors).length > 0) {
      showErrorToast("Please fix the highlighted fields");
      return;
    }

    if (original) {
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
        // Dropped, not just revalidated: no page should open on the old copy.
        void mutate(eventEndpoints.byUid(original.uid), undefined);
        if (organization?.handle) {
          void mutate(eventEndpoints.byHost(organization.handle));
        }
      };

      let stored: ApiEvent | undefined;
      if (hasChanges) {
        const result = await UpdateEvent(original.uid, changes);
        if (!result.ok) {
          return showRefusal(result, "Could not update the event. Try again.");
        }
        stored = result.event;
      }

      if (publishing) {
        const published = await PublishEvent(original.uid);
        refresh();
        if (!published.ok) {
          // The changes are saved; only the publish step was refused.
          if (stored) onStored?.(stored);
          return showRefusal(
            published,
            "Could not publish the event. Try again.",
          );
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
      return;
    }

    // CreateEvent() returns the caught Axios error as-is on failure.
    const response = (await CreateEvent(buildCreatePayload(event, intent))) as {
      status?: number;
      data?: { message?: string };
      response?: { data?: Refusal };
    };

    if (response.status !== 201) {
      return showRefusal(
        response.response?.data,
        "Could not create event. Try again.",
      );
    }

    showSuccessToast(
      intent === "draft"
        ? "Draft saved. Only you can see it until you publish it."
        : response.data?.message,
    );
    onSuccess();

    // The public directory (`usePagedList` in `Events.tsx`) is not
    // refreshed from here: SWR's global `mutate` skips infinite keys. It
    // refetches the pages it kept itself when `/events` is next opened.
    if (organization?.handle) {
      void mutate(eventEndpoints.byHost(organization.handle));
    }
    return;
  };

  return {
    validateEvent,
    submitCallback,
  };
}
