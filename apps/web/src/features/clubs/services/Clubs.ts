import { apiConnector } from "@services/ApiConnector";
import { clubEndpoints } from "@services/ApiEndpoints";
import type { Club } from "../types";

/**
 * Fully implemented and correct, but never called from anywhere (see
 * `SPEC.md`). Goes through `apiConnector()` — the "Layer B" call path —
 * and, unlike `MilanApi.js`'s functions, throws on a non-200 status
 * rather than returning the error response; a caller needs `try/catch`.
 * Response shape is unverified from this repo — the backend is the
 * source of truth.
 */
export const getClubs = async (): Promise<Club[]> => {
  const getClubsData = await apiConnector("GET", `${clubEndpoints.all}`);

  if (getClubsData.status !== 200) {
    throw new Error("Could not get Clubs");
  }

  return getClubsData.data;
};
