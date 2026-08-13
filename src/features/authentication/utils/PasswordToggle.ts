import type { Dispatch, SetStateAction } from "react";

type PasswordInputType = "password" | "text";

/**
 * Generic `password ⇄ text` input-type flippers, meant to be paired with
 * a `useState<PasswordInputType>` pair per input. Unused today — both
 * live pages inline their own `showPassword` boolean instead (see
 * `SPEC.md`).
 */
export const passwordToggle = (
  passwordType: PasswordInputType,
  setPasswordType: Dispatch<SetStateAction<PasswordInputType>>,
) => {
  setPasswordType(passwordType === "password" ? "text" : "password");
};

export const confirmPasswordToggle = (
  confirmPasswordType: PasswordInputType,
  setConfirmPasswordType: Dispatch<SetStateAction<PasswordInputType>>,
) => {
  setConfirmPasswordType(
    confirmPasswordType === "password" ? "text" : "password",
  );
};
