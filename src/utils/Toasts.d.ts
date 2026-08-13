/**
 * Type declarations for the plain-JS `Toasts.js` sitting next to this
 * file — shared infra outside this pass's scope. Both toasts are called
 * with `response?.data?.message`-shaped values that are legitimately
 * `string | undefined` (an offline/network-failure response has no
 * message), which is looser than the file's own JSDoc `{string}`
 * claims; this declaration reflects what callers actually pass.
 */
export declare const showSuccessToast: (message?: string) => void;
export declare const showErrorToast: (message?: string) => void;
