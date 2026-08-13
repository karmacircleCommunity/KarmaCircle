// All the AXIOS API calls will be made from here to the backend
// These functions will be exported and then imported wherever needed

import Axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import {
  authEndpoints,
  clubEndpoints,
  eventEndpoints,
  userEndpoints,
} from "./ApiEndpoints.js";

// LOGIN USER
export const LoginUser = async (credentials) => {
  try {
    const User = await Axios.post(authEndpoints.signin, credentials, {
      withCredentials: true,
    });

    return User;
  } catch (error) {
    return error.response;
  }
};

// REGISTER USER
export const RegisterUser = async (credentials) => {
  try {
    const User = await Axios.post(authEndpoints.signup, credentials, {
      withCredentials: true,
    });
    return User;
  } catch (error) {
    return error.response;
  }
};

// get all clubs
export const GetAllClubs = async () => {
  try {
    const clubs = await Axios.get(clubEndpoints.all);
    return clubs;
  } catch (error) {
    return error.response;
  }
};

// REPORT PROBLEMS
export const ReportProblem = async (credentials) => {
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
export const completeProfileApiCall = async ({ credentials }) => {
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
    return error.response;
  }
};

// Update User Profile
export const updateUserProfile = async ({ credentials }) => {
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
    return error.response;
  }
};

// Google Auth screen
export const GoogleAuth = async () => {
  try {
    const response = await Axios.get(authEndpoints.googleLogin, {
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
export const CreateEvent = async (event) => {
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
    const response = await Axios.get(clubEndpoints.dashboard, {
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    return error;
  }
};
