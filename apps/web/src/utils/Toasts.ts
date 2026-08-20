import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import checkInternetConnection from "./CheckInternetConnection";

/**
 * Displays a success toast message using React Toastify.
 */
export const showSuccessToast = (message?: string): void => {
  if (!checkInternetConnection()) {
    return;
  }

  toast.success(message, {
    position: "top-center",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: false,
    draggable: false,
    progress: undefined,
    closeButton: false,
    // @ts-expect-error — `bodyStyle` isn't a real `ToastOptions` field
    // (react-toastify silently ignores it at runtime); pre-existing,
    // preserved as-is rather than removed for a types-only pass.
    bodyStyle: {
      borderRadius: "50%",
      fontFamily: "Outfit, sans-serif",
      width: "fit-content",
    },
  });
};

/**
 * Displays an error toast message using React Toastify.
 */
export const showErrorToast = (message?: string): void => {
  if (!checkInternetConnection()) {
    return;
  }

  toast.error(message, {
    position: "top-center",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: false,
    pauseOnHover: true,
    draggable: false,
    progress: undefined,
    closeButton: false,
    style: {
      borderRadius: "10px",
      fontFamily: "Outfit, sans-serif",
      width: "fit-content",
    },
  });
};
