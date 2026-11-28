import { REGISTRATION_STATUS_LABELS } from "@features/events/constants/eventAccess";
import { eventEndpoints } from "@services/ApiEndpoints";
import { eventPhase } from "@features/events/utils/formatEventFacts";
import type {
  ApiEvent,
  HostingList,
  MyEventsTab,
  MyEventsView,
} from "@features/events/types";

/**
 * One page of a My Events tab. Upcoming (which includes events running now)
 * and Past are the person's own registrations; Invited is the list of upcoming
 * events they were invited to and have not joined.
 */
export function myEventsUrl(
  tab: MyEventsTab,
  page: number,
  limit: number,
): string {
  const url = new URL(
    tab === "Invited" ? eventEndpoints.invitations() : eventEndpoints.mine(),
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  if (tab !== "Invited") url.searchParams.set("period", tab.toLowerCase());
  return url.toString();
}

/** The pill on a My Events row: where this person stands with the event. */
export function myEventStatusLabel(
  event: Pick<
    ApiEvent,
    "status" | "startTime" | "endTime" | "registrationStatus"
  >,
  tab: MyEventsTab,
): string {
  if (event.status === "cancelled") return "Cancelled";
  if (tab === "Invited") return "Invited";
  if (event.registrationStatus && event.registrationStatus !== "going") {
    return REGISTRATION_STATUS_LABELS[event.registrationStatus];
  }
  return eventPhase(event.startTime, event.endTime) === "ended"
    ? "You joined"
    : "You're going";
}

/**
 * Which side of My Events an address asks for. Only an account that can host
 * has a Hosting side, and it opens there unless the address says otherwise.
 */
export function myEventsView(
  search: URLSearchParams,
  hosts: boolean,
): MyEventsView {
  if (!hosts) return "attending";
  return search.get("tab") === "attending" ? "attending" : "hosting";
}

/** The list an address asks for within a view; the first one if it names none. */
export function myEventsList<T extends string>(
  search: URLSearchParams,
  lists: readonly T[],
): T {
  const asked = search.get("show");
  return lists.find((list) => list.toLowerCase() === asked) ?? lists[0];
}

/** The query string that opens My Events on one list of one view. */
export function myEventsSearch(
  view: MyEventsView,
  list: MyEventsTab | HostingList = "Upcoming",
): string {
  const search = new URLSearchParams({ tab: view });
  if (list !== "Upcoming") search.set("show", list.toLowerCase());
  return `?${search.toString()}`;
}

/** The address of an organization's own events, for links back to them. */
export function hostingPath(list: HostingList = "Upcoming"): string {
  return `/events/mine${myEventsSearch("hosting", list)}`;
}
