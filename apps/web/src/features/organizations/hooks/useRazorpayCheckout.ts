import { useCallback } from "react";
import type { RazorpayCheckoutOptions } from "@features/donate-shop-trending/types";

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * Loads Razorpay's Checkout script exactly once for the whole app, no
 * matter how many components ask for it or how many times they re-render.
 *
 * `donate-shop-trending/pages/Donate.tsx` has a documented version of this
 * same idea with no dependency array on its `useEffect` — it re-injects
 * the `<script>` tag into `document.body` on every render (see
 * `known-issues.md`). This is that fixed, reusable: a module-level cached
 * promise, so the first caller triggers exactly one `<script>` tag and
 * every caller after that (including a second organization's profile
 * mounted later in the same session) awaits the same load.
 */
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Let a later attempt retry (a flaky network shouldn't leave this
        // permanently rejected for the rest of the session).
        scriptPromise = null;
        reject(new Error("Could not load Razorpay Checkout."));
      };
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

/**
 * `openCheckout(options)` loads the script if needed, then opens Razorpay's
 * Standard Checkout modal with whatever `options` the caller built (an
 * order id from `POST /payment/organizations/:handle/order`, a `handler`
 * that verifies the payment, etc.) — see
 * `components/SponsorOrganizationModal.tsx` for the one caller today.
 */
export function useRazorpayCheckout() {
  const openCheckout = useCallback(async (options: RazorpayCheckoutOptions) => {
    await loadCheckoutScript();
    const checkout = new window.Razorpay(options);
    checkout.open();
  }, []);

  return { openCheckout };
}
