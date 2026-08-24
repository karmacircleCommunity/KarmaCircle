import { emailRegex } from "@statics/Constants";

/**
 * The one email-format check every auth entry point uses — `Auth.tsx`'s
 * `"email"` step (both its "Continue" button's disabled state and its
 * submit handler) and `useAuth.ts`'s own submit-time validation all call
 * this rather than each running `emailRegex.test(...)` with their own
 * copy of the error message. Applies identically to individual and
 * organization sign-up — the email field is the same input either way,
 * just gated once here instead of twice.
 *
 * Returns the error message to show if the email is invalid, or `null`
 * if it's fine.
 */
export function validateEmail(email: string): string | null {
  return emailRegex.test(email)
    ? null
    : "Please enter a valid email address";
}
