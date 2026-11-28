import type { HostingList, MyEventsTab } from "@features/events/types";

/** The lists under each side of My Events, the default one first. */
export const ATTENDING_LISTS: readonly MyEventsTab[] = [
  "Upcoming",
  "Past",
  "Invited",
];

export const HOSTING_LISTS: readonly HostingList[] = [
  "Upcoming",
  "Past",
  "Drafts",
];
