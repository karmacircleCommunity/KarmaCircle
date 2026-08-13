import { useState } from "react";
import useValidation from "./useValidation.js";
import { showErrorToast, showSuccessToast } from "@utils/Toasts.js";
import { useNavigate } from "react-router-dom";
import checkInternetConnection from "@utils/CheckInternetConnection.js";
import useAuthStore from "@app/store/useAuth.js";

export function useFormLogic(
  initialState,
  submitCallback,
  redirectPath,
  isSignup,
  userType,
) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState(initialState);
  const { toggleLoading } = useAuthStore((state) => ({
    toggleLoading: state.toggleLoading,
  }));

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e, country) => {
    e.preventDefault();

    if (!checkInternetConnection()) {
      return;
    }

    toggleLoading(true);

    formState.country = country;

    const validationErrors = isSignup
      ? userType === "individual"
        ? useValidation(formState, true, false)
        : useValidation(formState, false, true)
      : [];

    if (validationErrors.length > 0) {
      setFormState({ ...formState, errors: validationErrors });
      setTimeout(() => {
        toggleLoading(false);
      }, 1000);
    } else {
      const data = await submitCallback(formState);
      handleApiResponse(data);
    }
  };

  const handleApiResponse = (response) => {
    if (response?.status === 201 || response?.status === 200) {
      showSuccessToast(response?.data?.message);
      setTimeout(() => {
        toggleLoading(false);
        navigate(redirectPath);
      }, 2000);
    } else {
      showErrorToast(response?.message);
      setFormState({ ...formState });
      setTimeout(() => {
        toggleLoading(false);
      }, 1000);
    }
  };

  return {
    formState,
    setFormState,
    handleChange,
    handleSubmit,
  };
}

export const individualInitialFormState = {
  userType: "individual",
  slug: "",
  email: "",
  password: "",
  confirmPassword: "",
  city: "",
  state: "",
  address: "",
  country: "",
  pincode: "",
  firstName: "",
  lastName: "",
};

export const clubInitialFormState = {
  userType: "club",
  slug: "",
  email: "",
  password: "",
  name: "",
  confirmPassword: "",
  tagLine: "",
  description: "",
  website: "",
  city: "",
  state: "",
  address: "",
  country: "",
  pincode: "",
};
