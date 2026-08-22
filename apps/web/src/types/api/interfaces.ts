/**
 * Shared shapes for `src/services/MilanApi.ts` responses.
 * That file is plain JS (see docs/specs/api-integration.md) and every
 * function in it catches network errors and returns `error.response`
 * instead of throwing, so callers always deal with a response-shaped
 * value (or `undefined` on a total network failure) rather than a
 * try/catch. These types describe that convention, not axios's own
 * `AxiosResponse` (which callers here never see unwrapped).
 */

export interface ApiResponseBody<T = unknown> {
  message?: string;
  user?: T;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  status?: number;
  data?: ApiResponseBody<T>;
}
