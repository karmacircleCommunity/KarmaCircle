import type { CheckableProfileInfo } from "../types";

/**
 * Checks if certain fields are missing in the user profile information.
 * Uses strict `=== undefined` — an empty string does not count as
 * missing (see SPEC.md). Called only from `Profile.tsx`, against the
 * Redux `user` object.
 */
export function checkMissingFields(info?: CheckableProfileInfo): boolean {
  if (
    info?.city === undefined ||
    info?.state === undefined ||
    info?.address === undefined ||
    info?.country === undefined ||
    info?.pincode === undefined
  ) {
    return true;
  } else if (
    (info?.userType === "club" && info?.tagLine === undefined) ||
    (info?.userType === "club" && info?.description === undefined)
  ) {
    return true;
  } else {
    return false;
  }
}
