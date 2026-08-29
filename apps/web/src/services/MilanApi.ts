// All the AXIOS API calls will be made from here to the backend
// These functions will be exported and then imported wherever needed

import Axios from "axios";
import type { AxiosError } from "axios";
import "react-toastify/dist/ReactToastify.css";
import {
  authEndpoints,
  organizationEndpoints,
  eventEndpoints,
  userEndpoints,
} from "./ApiEndpoints";

// LOGIN USER
export const LoginUser = async (credentials: unknown) => {
  try {
    const User = await Axios.post(authEndpoints.signin, credentials, {
      withCredentials: true,
    });

    return User;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// REGISTER USER
export const RegisterUser = async (credentials: unknown) => {
  try {
    const User = await Axios.post(authEndpoints.signup, credentials, {
      withCredentials: true,
    });
    return User;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// CHECK IF AN EMAIL ALREADY HAS AN ACCOUNT — used by the sign-up form to
// steer an existing user to sign-in before they fill out the rest of the
// form, instead of only finding out via signup's own 409 at the very end.
export const CheckEmailExists = async (email: string) => {
  try {
    const response = await Axios.get(authEndpoints.checkEmail, {
      params: { email },
    });
    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// get all organizations
export const GetAllOrganizations = async () => {
  try {
    const organizations = await Axios.get(organizationEndpoints.all);
    return organizations;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// UPDATE THE SIGNED-IN ORGANIZATION'S OWN RECORD
// PATCH, not PUT, on purpose: the setup form saves whatever the user has
// filled in so far, and the backend decides on its own whether that was
// the last required field (which publishes the organization) — see
// apps/api/src/modules/organizations/organization.service.ts.
export const UpdateMyOrganization = async (details: unknown) => {
  try {
    const response = await Axios.patch(organizationEndpoints.mine, details, {
      withCredentials: true,
    });

    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// REPORT PROBLEMS
export const ReportProblem = async (credentials: unknown) => {
  try {
    const response = await Axios.post(userEndpoints.report, credentials);
    if (response.data.success === true) {
      return true;
    } else if (response.data.message === "tryagain") {
      return "tryagain";
    } else {
      return false;
    }
  } catch (error) {
    console.error("Report problem request failed:", error);
    alert("INTERNAL ERROR, PLEASE TRY AGAIN LATER");
  }
};

// Complete User Profile
export const completeProfileApiCall = async ({
  credentials,
}: {
  credentials: unknown;
}) => {
  try {
    const response = await Axios.patch(
      userEndpoints.completeProfile,
      credentials,
      {
        withCredentials: true,
      },
    );

    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// Update User Profile
export const updateUserProfile = async ({
  credentials,
}: {
  credentials: unknown;
}) => {
  try {
    const response = await Axios.patch(
      userEndpoints.updateProfile,
      credentials,
      {
        withCredentials: true,
      },
    );

    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// Google Auth screen
// `userType` ("individual" | "organization") is forwarded as a query param and the
// backend round-trips it through Google's OAuth `state` param — without it,
// every Google sign-up (including "Organization") silently lands as an
// Individual account, since the backend defaults an absent/unknown userType
// to Individual. Omit it entirely for sign-in, where there's no account
// type to set.
export const GoogleAuth = async (userType?: string) => {
  try {
    const response = await Axios.get(authEndpoints.googleLogin, {
      params: userType ? { userType } : undefined,
      withCredentials: true,
    });
    return response.data.url;
  } catch (error) {
    console.error("Google auth request failed:", error);
    alert("INTERNAL ERROR, PLEASE TRY AGAIN LATER");
  }
};

// Google Auth callback
export const successCallback = async () => {
  try {
    const response = await Axios.get(authEndpoints.googleLoginSuccess, {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (err) {
    return err;
  }
};

// Google logout
export const Logout = async () => {
  try {
    const response = await Axios.get(authEndpoints.logout, {
      withCredentials: true,
    });

    return response;
  } catch (error) {
    return error;
  }
};

// create event API
export const CreateEvent = async (event: unknown) => {
  try {
    const response = await Axios.post(eventEndpoints.create, event, {
      withCredentials: true,
    });

    return response;
  } catch (error) {
    return error;
  }
};

export const fetchDashboard = async () => {
  try {
    const response = await Axios.get(organizationEndpoints.dashboard, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    return error;
  }
};
