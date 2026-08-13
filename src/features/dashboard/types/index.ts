/**
 * Shape of `useSWR(userEndpoints.profile, fetcher)`'s data — the
 * logged-in account's own profile record (`GET /user/profile`). This is
 * a different data source than the Redux `user` slice (`src/types/user.ts`'s
 * `User`) even though the two overlap in practice, so it gets its own
 * type rather than reusing/extending that one. Response shape is
 * unverified from this repo (no backend code here); this only pins
 * down the fields `Dashboard.tsx` actually reads.
 */
export interface DashboardProfileUser {
  _id?: string;
  userName?: string;
  name?: string;
  description?: string;
  config?: {
    hasCompletedProfile?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DashboardProfileResponse {
  user?: DashboardProfileUser;
}
