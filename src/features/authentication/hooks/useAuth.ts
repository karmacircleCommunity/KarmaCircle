import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { emailRegex } from "@statics/Constants.js";
import { updateUserData } from "@app/store/slices/userSlice";
import checkInternetConnection from "@utils/CheckInternetConnection.js";
import { LoginUser, RegisterUser } from "@services/MilanApi.js";
import { showErrorToast, showSuccessToast } from "@utils/Toasts.js";
import { AuthType } from "../types";
import type { Credentials, SetAuthErrors, UseAuthResult } from "../types";

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

    if (emailRegex.test(credentials.email) === false) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
      return;
    }

    // Passwords needs to be minimum 8 characters long with atleast 1 number, 1 uppercase and 1 lowercase letter
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (passwordRegex.test(credentials.password) === false) {
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

      setTimeout(() => {
        navigate("/");
        setLoading(false);
      }, 1000);
    } else {
      showErrorToast(response?.data?.message);
      setLoading(false);
    }
  }

  return {
    authenticateUser,
    loading,
  };
}
