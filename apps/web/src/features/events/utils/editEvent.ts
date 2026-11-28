import { STATUSCODE } from "@statics/Constants";
import type { ApiEvent, EditBlocker } from "@features/events/types";

/**
 * Whether the API said there is no such event for this visitor: a 404 for an
 * unknown event or someone else's draft, a 400 for an id it cannot read. A
 * network failure, a timeout, a rate limit or a server error says nothing
 * about whether the event exists.
 */
export const isMissingEvent = (error: unknown) => {
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;
  return status === STATUSCODE.NOT_FOUND || status === STATUSCODE.BAD_REQUEST;
};

/**
 * Why the edit form must not open for a stored event, or `undefined` when it
 * may. `at` is when the event was loaded, not the current time: an event that
 * ends while its form is open must not take the typed changes away (the API
 * refuses the save and says why).
 */
export function editBlocker(
  event: Pick<
    ApiEvent,
    "organizerHandle" | "hostUsername" | "status" | "endTime"
  >,
  organizationHandle: string | undefined,
  at: number,
): EditBlocker | undefined {
  const owns =
    organizationHandle !== undefined &&
    (event.organizerHandle === organizationHandle ||
      event.hostUsername === organizationHandle);
  if (!owns) return "foreign";
  if (event.status === "cancelled") return "cancelled";
  if (new Date(event.endTime).getTime() >= at) return undefined;
  // A draft never took place, whatever its dates say.
  return event.status === "draft" ? "draft-expired" : "ended";
}
