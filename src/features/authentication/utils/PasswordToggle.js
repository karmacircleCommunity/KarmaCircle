export const passwordToggle = (passwordType, setPasswordType) => {
  setPasswordType(passwordType === "password" ? "text" : "password");
};

export const confirmPasswordToggle = (
  confirmPasswordType,
  setConfirmPasswordType,
) => {
  setConfirmPasswordType(
    confirmPasswordType === "password" ? "text" : "password",
  );
};
