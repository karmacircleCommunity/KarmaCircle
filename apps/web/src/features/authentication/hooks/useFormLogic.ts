import { useState } from "react";
import { useNavigate } from "react-router-dom";
import checkInternetConnection from "@utils/CheckInternetConnection";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import useAuthStore from "@app/store/useAuth";
import { UserType } from "@/types/user";
import useValidation from "./useValidation";
import type {
  OrganizationFormState,
  IndividualFormState,
  SignupFormState,
  SubmitCallback,
  UseFormLogicResult,
} from "../types";

/**
 * Unused generic submit-handler hook built on `useValidation.js` — not
 * wired into any live page today (see `SPEC.md`). Driven by the Zustand
 * `isLoading` flag (shared with `AuthButton.jsx`) rather than local
 * `useState` loading.
 */
export function useFormLogic(
  initialState: SignupFormState,
  submitCallback: SubmitCallback,
  redirectPath: string,
  isSignup: boolean,
  userType: UserType,
): UseFormLogicResult {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<SignupFormState>(initialState);
  const { toggleLoading } = useAuthStore((state) => ({
    toggleLoading: state.toggleLoading,
  }));

  const handleChange: UseFormLogicResult["handleChange"] = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit: UseFormLogicResult["handleSubmit"] = async (
    e,
    country,
  ) => {
    e.preventDefault();

    if (!checkInternetConnection()) {
      return;
    }

    toggleLoading(true);

    formState.country = country;

    const validationErrors = isSignup
      ? userType === UserType.Individual
        ? useValidation(formState, true, false)
        : useValidation(formState, false, true)
      : [];

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      setFormState({ ...formState, errors: validationErrors });
      setTimeout(() => {
        toggleLoading(false);
      }, 1000);
    } else {
      const response = await submitCallback(formState);
      handleApiResponse(response);
    }
  };

  const handleApiResponse: (
    response: Awaited<ReturnType<SubmitCallback>>,
  ) => void = (response) => {
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

export const individualInitialFormState: IndividualFormState = {
  userType: UserType.Individual,
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

export const organizationInitialFormState: OrganizationFormState = {
  userType: UserType.Organization,
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
