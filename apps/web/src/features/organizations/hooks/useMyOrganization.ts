import { selectUser } from "@app/store/slices/userSlice";
import { organizationEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import { useSelector } from "react-redux";
import useSWR from "swr";
import type { MyOrganization } from "../types";

/**
 * The signed-in organization's own record, for anything outside the setup
 * flow that needs to know whether it is still a draft — the navbar's
 * "Finish setting up" entry, the dashboard reminder, and the gate on
 * organization-only pages.
 *
 * Fetches nothing at all for an individual or a signed-out visitor:
 * `GET /organizations/me` is a 403 for them, and a 403 on every page load
 * is both noise and a toast waiting to happen. SWR dedupes by key, so the
 * several components that call this on one page share a single request.
 */
export function useMyOrganization() {
  const user = useSelector(selectUser);
  const isOrganization =
    user?.isLoggedIn === true && user?.userType === "organization";

  const { data, isLoading, mutate } = useSWR<MyOrganization>(
    isOrganization ? organizationEndpoints.mine : null,
    fetcher,
  );

  return {
    organization: data,
    isOrganization,
    /** True only while a request is actually in flight. */
    isLoading: isOrganization && isLoading,
    /** A record exists and is still invisible to everyone else. */
    isDraft: Boolean(data && !data.isLive),
    mutate,
  };
}
