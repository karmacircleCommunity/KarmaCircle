import { passwordRegex } from "@statics/Constants";

export type PasswordStrength = "weak" | "medium" | "strong";

// Live strength read, purely a UX hint — the actual pass/fail gate on
// submit is always `passwordRegex` alone (see useAuth.ts and
// ResetPassword.tsx). "weak" here means "doesn't even meet that minimum
// yet"; a password can only be "medium" or "strong" once it already does.
export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) {
    return null;
  }
  if (!passwordRegex.test(password)) {
    return "weak";
  }
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  return password.length >= 12 && hasSpecialChar ? "strong" : "medium";
}

export const PASSWORD_STRENGTH_META: Record<
  PasswordStrength,
  { label: string; barColor: string; textColor: string; barWidth: string }
> = {
  weak: {
    label: "Weak",
    barColor: "bg-error",
    textColor: "text-error",
    barWidth: "w-1/3",
  },
  medium: {
    label: "Medium",
    barColor: "bg-warning",
    textColor: "text-warning",
    barWidth: "w-2/3",
  },
  strong: {
    label: "Strong",
    barColor: "bg-success",
    textColor: "text-success",
    barWidth: "w-full",
  },
};
