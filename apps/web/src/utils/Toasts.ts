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

  // A toast with nothing in it is a bubble that appears, says nothing and
  // leaves — which is exactly what an API response with no `message` field
  // used to produce. Say nothing instead.
  if (!message) {
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

  // Unlike a success, an error the user can't see is worse than a vague
  // one — fall back to generic copy rather than swallowing it. See
  // showSuccessToast above for why an empty toast is never rendered.
  const text = message || "Something went wrong. Please try again.";

  toast.error(text, {
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
