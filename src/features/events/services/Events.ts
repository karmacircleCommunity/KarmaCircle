import { apiConnector } from "@services/ApiConnector.js";
import { eventEndpoints } from "@services/ApiEndpoints.js";
import type { EventRecord } from "../types";

/**
 * Correct and fully implemented, never called (see SPEC.md). Same
 * apiConnector-based, throw-on-non-200 shape as `clubs/services/Clubs.ts`'s
 * `getClubs()` — a caller needs `try/catch`, not an `if (status ===...)` check.
 */
export const getEvents = async (): Promise<EventRecord[]> => {
  const getEventsData = await apiConnector("GET", `${eventEndpoints.all}`);

  if (getEventsData.status !== 200) {
    throw new Error("Could not get Events");
  }

  return getEventsData.data;
};
