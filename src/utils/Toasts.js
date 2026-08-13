import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import checkInternetConnection from "./CheckInternetConnection.js";

/**
 * Displays a success toast message using React Toastify.
 *
 * @param {string} message - The message to be displayed in the success toast.
 * @returns {void}
 */
export const showSuccessToast = (message) => {
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
    bodyStyle: {
      borderRadius: "50%",
      fontFamily: "Outfit, sans-serif",
      width: "fit-content",
    },
  });
};

/**
 * Displays an error toast message using React Toastify.
 *
 * @param {string} message - The message to be displayed in the error toast.
 * @returns {void}
 */
export const showErrorToast = (message) => {
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
