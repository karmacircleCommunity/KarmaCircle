import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import checkInternetConnection from "./CheckInternetConnection";

// Shared options for every toast in the app. Visual theming (colors, font,
// corner radius, shadow) comes from the `--toastify-*` variable overrides in
// styles/index.css, not from per-call inline styles - see that file for why
// (the previous version of this file carried `bodyStyle`/`style` hacks that
// fought react-toastify's own unlayered CSS and mostly lost, which is why a
// toast used to render in the library's stock green/white regardless of what
// was passed here). Position/timing stay a per-call concern.
const BASE_OPTIONS = {
  position: "top-center" as const,
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: false,
  draggable: false,
  closeButton: false,
};

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

  toast.success(message, BASE_OPTIONS);
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

  toast.error(text, { ...BASE_OPTIONS, pauseOnHover: true });
};

/**
 * Displays a warning toast message using React Toastify. Not yet called
 * from any API path (every existing call site is a clean success/error),
 * added alongside the success/error helpers above so a future
 * needs-attention-but-not-failed case (e.g. a partially applied bulk
 * action) has a helper that already matches the app's toast styling
 * instead of a raw `toast.warning(...)` call reintroducing the stock
 * react-toastify look.
 */
export const showWarningToast = (message?: string): void => {
  if (!checkInternetConnection()) {
    return;
  }

  if (!message) {
    return;
  }

  toast.warning(message, { ...BASE_OPTIONS, pauseOnHover: true });
};

/**
 * Displays an info toast message using React Toastify. See
 * showWarningToast above - not yet called from any API path.
 */
export const showInfoToast = (message?: string): void => {
  if (!checkInternetConnection()) {
    return;
  }

  if (!message) {
    return;
  }

  toast.info(message, BASE_OPTIONS);
};
