// All the AXIOS API calls will be made from here to the backend
// These functions will be exported and then imported wherever needed

import Axios from "axios";
import type { AxiosError } from "axios";
import { store } from "@app/store/store";
import { clearRejectedSession } from "@utils/clearRejectedSession";
import "react-toastify/dist/ReactToastify.css";
import {
  authEndpoints,
  organizationEndpoints,
  eventEndpoints,
  paymentEndpoints,
  userEndpoints,
} from "./ApiEndpoints";
import type {
  CoverGrantResult,
  CoverSendOptions,
  CoverSendResult,
  CoverUploadGrant,
} from "@features/events/types/interfaces";

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

// REQUEST A PASSWORD RESET LINK — the backend always responds the same
// way whether or not `email` has an account (see apps/api/docs/specs/
// auth.md), so the caller should only branch on network/status success,
// never on the response body implying the email did or didn't exist.
export const ForgotPassword = async (email: string) => {
  try {
    const response = await Axios.post(authEndpoints.forgotPassword, {
      email,
    });
    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// CONSUME A PASSWORD RESET LINK — `token` comes from the
// /auth/reset-password/:token route param.
export const ResetPassword = async (payload: {
  token: string;
  newPassword: string;
}) => {
  try {
    const response = await Axios.post(authEndpoints.resetPassword, payload);
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

// CREATE A RAZORPAY ORDER TO SUPPORT ONE ORGANIZATION — public, no auth: a
// supporter need not have a KarmaCircle account to sponsor one.
export const CreateSponsorshipOrder = async (
  handle: string,
  payload: { amount: number; supporterName?: string; supporterEmail?: string },
) => {
  try {
    const response = await Axios.post(
      paymentEndpoints.sponsorshipOrder(handle),
      payload,
    );
    return response;
  } catch (error) {
    return (error as AxiosError).response;
  }
};

// VERIFY A COMPLETED RAZORPAY CHECKOUT PAYMENT — only this call, not the
// browser's own "it said success", is what credits the organization. See
// apps/api/src/modules/payments/payment.service.ts#verifySponsorshipPayment.
export const VerifySponsorshipPayment = async (
  handle: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) => {
  try {
    const response = await Axios.post(
      paymentEndpoints.sponsorshipVerify(handle),
      payload,
    );
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
  const requestedUser = store.getState().user;
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
    clearRejectedSession(error, requestedUser);
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

export interface EventWriteResult {
  ok: boolean;
  status?: number;
  message?: string;
  /** Field-level problems from a `400`, keyed by the API's `path`. */
  errors?: { path: string; message: string }[];
}

const toEventWriteFailure = (error: unknown): EventWriteResult => {
  const apiError = (
    error as AxiosError<{
      message?: string;
      errors?: { path: string; message: string }[];
    }>
  ).response;
  return {
    ok: false,
    status: apiError?.status,
    message: apiError?.data?.message,
    errors: apiError?.data?.errors,
  };
};

// edit event API: only the fields that changed need to be sent
export const UpdateEvent = async (
  uid: string,
  changes: unknown,
): Promise<EventWriteResult> => {
  try {
    const response = await Axios.patch(eventEndpoints.update(uid), changes, {
      withCredentials: true,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// publish a draft: it must still pass the create rules
export const PublishEvent = async (uid: string): Promise<EventWriteResult> => {
  try {
    const response = await Axios.post(eventEndpoints.publish(uid), undefined, {
      withCredentials: true,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// take a published event with no registrations back to a draft
export const UnpublishEvent = async (
  uid: string,
): Promise<EventWriteResult> => {
  try {
    const response = await Axios.post(
      eventEndpoints.unpublish(uid),
      undefined,
      {
        withCredentials: true,
      },
    );
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// delete a draft for good (a published event can only be cancelled)
export const DeleteDraft = async (uid: string): Promise<EventWriteResult> => {
  try {
    const response = await Axios.delete(eventEndpoints.update(uid), {
      withCredentials: true,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// cover upload step 1: ask the API for a short-lived token for the image service
export const RequestCoverUpload = async (): Promise<CoverGrantResult> => {
  try {
    const response = await Axios.post<CoverUploadGrant>(
      eventEndpoints.coverUpload,
      undefined,
      { withCredentials: true },
    );
    return { status: response.status, grant: response.data };
  } catch (error) {
    const apiError = (error as AxiosError<{ message?: string }>).response;
    return { status: apiError?.status, message: apiError?.data?.message };
  }
};

// cover upload step 2: send the picture straight to the image service, not
// through the API. No cookies go along: the service checks the token instead,
// and it does not allow credentialed requests.
export const SendCoverImage = async (
  grant: CoverUploadGrant,
  file: File,
  { signal, onProgress }: CoverSendOptions,
): Promise<CoverSendResult> => {
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await Axios.post(grant.uploadUrl, form, {
      headers: { Authorization: `Bearer ${grant.token}` },
      withCredentials: false,
      signal,
      // Every answer, including 413 and 415, carries a message to show.
      validateStatus: () => true,
      onUploadProgress: (progress) => {
        if (progress.total) {
          onProgress?.(Math.round((progress.loaded / progress.total) * 100));
        }
      },
    });
    return { status: response.status, body: response.data };
  } catch (error) {
    if (Axios.isCancel(error)) return { cancelled: true };
    return { networkError: true };
  }
};

// cancel event API: the event stays public with a cancelled badge
export const CancelEvent = async (uid: string): Promise<EventWriteResult> => {
  try {
    const response = await Axios.post(eventEndpoints.cancel(uid), undefined, {
      withCredentials: true,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// leave event API: gives the registered spot back
export const LeaveEvent = async (uid: string): Promise<EventWriteResult> => {
  try {
    const response = await Axios.delete(eventEndpoints.leave(uid), {
      withCredentials: true,
    });
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// check one attendee in (or undo it); host only
export const SetAttendeeCheckIn = async (
  uid: string,
  registrationId: string,
  checkedIn: boolean,
): Promise<EventWriteResult> => {
  try {
    const response = await Axios.patch(
      eventEndpoints.attendee(uid, registrationId),
      { checkedIn },
      { withCredentials: true },
    );
    return { ok: true, status: response.status };
  } catch (error) {
    return toEventWriteFailure(error);
  }
};

// the attendee list as a CSV text, for the host to save
export const FetchAttendeesCsv = async (
  uid: string,
): Promise<{ ok: true; csv: string } | { ok: false; message?: string }> => {
  try {
    const response = await Axios.get<string>(
      eventEndpoints.attendeesExport(uid),
      {
        withCredentials: true,
        responseType: "text",
      },
    );
    return { ok: true, csv: response.data };
  } catch (error) {
    return { ok: false, message: toEventWriteFailure(error).message };
  }
};

export const JoinEvent = async (uid: string) => {
  try {
    const response = await Axios.post(eventEndpoints.join(uid), undefined, {
      withCredentials: true,
    });
    return { ok: true as const, ...response };
  } catch (error) {
    const apiError = (error as AxiosError<{ message?: string }>).response;
    return {
      ok: false as const,
      status: apiError?.status,
      message: apiError?.data?.message,
    };
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
