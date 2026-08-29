import { apiConnector } from "@services/ApiConnector";
import { organizationEndpoints } from "@services/ApiEndpoints";
import type { Organization } from "../types";

/**
 * Fully implemented and correct, but never called from anywhere (see
 * `SPEC.md`). Goes through `apiConnector()` — the "Layer B" call path —
 * and, unlike `KarmaCircleApi.ts`'s functions, throws on a non-200 status
 * rather than returning the error response; a caller needs `try/catch`.
 * Response shape is unverified from this repo — the backend is the
 * source of truth.
 */
export const getOrganizations = async (): Promise<Organization[]> => {
  const getOrganizationsData = await apiConnector(
    "GET",
    `${organizationEndpoints.all}`,
  );

  if (getOrganizationsData.status !== 200) {
    throw new Error("Could not get Organizations");
  }

  return getOrganizationsData.data;
};
