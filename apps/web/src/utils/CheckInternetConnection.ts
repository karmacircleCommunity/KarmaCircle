import { toast } from "react-toastify";

/**
 * Checks for an active internet connection using the browser's navigator.
 * If there is no internet connection, displays an error toast message using React Toastify.
 */
function checkInternetConnection(): boolean {
  if (navigator.onLine === false) {
    toast.error("Please check your internet connection", {
      position: "top-right",
      autoClose: 1200,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      progress: undefined,
      closeButton: false,
    });
    return false;
  }

  return true;
}

export default checkInternetConnection;
