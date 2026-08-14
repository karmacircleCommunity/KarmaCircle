import type { User } from "@/types/user";

/**
 * `successCallback()` (`MilanApi.js`, `GET /auth/login/success`) returns
 * the raw Axios response on success but the raw caught error object on
 * failure — its own catch block returns `err`, not `err.response` (see
 * SPEC.md). That's why this type carries both a `data.message` shape
 * (success) and a bare top-level `message` (failure, e.g. `"Network Error"`)
 * rather than picking one.
 */
export interface OAuthSuccessResponse {
  status?: number;
  data?: {
    message?: string;
    user?: User;
  };
  message?: string;
}
