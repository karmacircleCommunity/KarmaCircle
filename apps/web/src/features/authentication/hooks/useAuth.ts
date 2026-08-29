import { useState } from "react";
import { UserType } from "@/types/user";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { passwordRegex, STATUSMESSAGE } from "@statics/Constants";
import { updateUserData } from "@app/store/slices/userSlice";
import checkInternetConnection from "@utils/CheckInternetConnection";
import { LoginUser, RegisterUser } from "@services/MilanApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import { AuthType } from "../types";
import type { Credentials, SetAuthErrors, UseAuthResult } from "../types";
import { validateEmail } from "../utils/validateEmail";

export function useAuth(authType: AuthType): UseAuthResult {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  async function authenticateUser(
    credentials: Credentials,
    setErrors: SetAuthErrors,
  ): Promise<void> {
    if (!checkInternetConnection()) {
      return;
    }

    const emailError = validateEmail(credentials.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }

    if (authType === AuthType.SignIn) {
      // Sign-in only needs a non-empty password — the strength rules
      // (min length, 1 number, 1 upper/lowercase) are a password-creation
      // concept and only apply on SignUp below. The actual credential
      // check happens server-side via LoginUser.
      if (!credentials.password) {
        setErrors((prev) => ({ ...prev, password: "Password is required" }));
        return;
      }
    } else if (passwordRegex.test(credentials.password) === false) {
      // Passwords needs to be minimum 8 characters long with atleast 1 number, 1 uppercase and 1 lowercase letter
      setErrors((prev) => ({
        ...prev,
        password:
          "Password must be minimum 8 characters long with atleast 1 number, 1 uppercase and 1 lowercase letter",
      }));
      return;
    }

    setLoading(true);

    const response = await (authType === AuthType.SignIn
      ? LoginUser(credentials)
      : RegisterUser({
          ...credentials,
          userType: credentials.userType?.value,
        }));

    if (response?.status === 201 || response?.status === 200) {
      showSuccessToast(response?.data?.message);
      dispatch(
        updateUserData({
          ...response.data.user,
          isLoggedIn: true,
        }),
      );

      // A brand-new organization has nothing to see on the home page: its
      // record exists but is in draft, invisible everywhere until the
      // required details are filled. Send it to the one screen that can
      // change that — which asks whether it wants to do that now rather
      // than forcing the form on it, and exits back to "/" if not. See
      // features/organizations/pages/OrganizationSetup.tsx.
      const isNewOrganization =
        authType === AuthType.SignUp &&
        credentials.userType?.value === UserType.Organization;

      setTimeout(() => {
        navigate(isNewOrganization ? "/organization/setup" : "/");
        setLoading(false);
      }, 1000);
    } else {
      showErrorToast(response?.data?.message);

      // The backend's 400 responses (Zod validation failures) include a
      // per-field `errors: [{ path, message }]` array alongside the
      // generic `message` above — surface the ones that map to a field
      // this form actually renders, instead of only ever showing the
      // generic "Validation failed" toast.
      const fieldErrors = response?.data?.errors as
        | Array<{ path: string; message: string }>
        | undefined;
      if (Array.isArray(fieldErrors)) {
        setErrors((prev) => {
          const next = { ...prev };
          for (const { path, message } of fieldErrors) {
            if (path === "email" || path === "password") {
              next[path] = message;
            }
          }
          return next;
        });
      }

      // Signup's 409 "already exists" response isn't Zod-shaped (no
      // `errors` array, just the plain message above) — map it onto the
      // `email` field too so the email step gets the inline error (and,
      // on SignUp, steps back to show it) even if the live check-email
      // call this form makes before this point somehow missed it.
      if (
        authType === AuthType.SignUp &&
        response?.data?.message === STATUSMESSAGE.USER_ALREADY_EXISTS
      ) {
        setErrors((prev) => ({ ...prev, email: response.data.message }));
      }

      setLoading(false);
    }
  }

  return {
    authenticateUser,
    loading,
  };
}
