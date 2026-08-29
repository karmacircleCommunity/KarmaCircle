// Small shared bits every auth-flow form field (Auth.tsx, ForgotPassword.tsx,
// ResetPassword.tsx) uses, kept in one place so the three pages' inputs
// can't visually drift apart from each other.

export const inputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-outfit text-body text-ink transition placeholder:text-[14px] placeholder:text-gray-500 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/15 focus:outline-none disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500";

// Every field a step asks the user to actually fill in is mandatory — this
// asterisk is purely a visual "required" cue next to the label, not tied to
// HTML's own `required` attribute/validation, which each form already
// handles itself via its own `errors` state + submit gate.
export const RequiredMark = () => (
  <span className="ml-0.5 align-top text-xs text-red-500" aria-hidden="true">
    *
  </span>
);
