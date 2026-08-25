import Axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import type { RazorpayCheckoutOptions } from "../types";

/**
 * Not currently imported by any component (see `SPEC.md`) — the only
 * reachable path to this file was the broken `Donate.jsx`. Kept
 * behavior-identical during this types-only conversion, including its
 * documented, previously-untested bug: `data` below is the full Axios
 * response, so `data.currency`/`data.id` read off the wrong object
 * level and evaluate to `undefined` (should be `data.data.currency`/
 * `data.data.id`) — see docs/specs/donate-shop-trending.md. Suppressed
 * rather than fixed, since fixing it is a behavior change out of scope
 * here.
 */
export default async function displayRazorpay(money: number) {
  const data = await Axios.post(
    `${import.meta.env.VITE_API_URL}/payment/razorpay`,
    { amount: money },
  );

  const options: RazorpayCheckoutOptions = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    // @ts-expect-error — known bug, see docs/specs/donate-shop-trending.md:
    // should be `data.data.currency` (Axios responses nest the payload
    // under `.data`).
    currency: data.currency,
    amount: data.data.amount,
    name: "KarmaCircle",
    description: "A hub for NGOs",
    image: "https://i.ibb.co/JC4g0ZD/favicon.png",
    // @ts-expect-error — same bug as `currency` above; should be `data.data.id`.
    order_id: data.id,
    handler: function () {
      toast("🌈 Thankyou for the help.", {
        position: "top-right",
        autoClose: 1200,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
        closeButton: false,
      });
    },
    prefill: {
      name: "Tamal Das",
      email: "tamalcodes@gmail.com",
      contact: "8240415709",
    },
  };

  const paymentObject = new window.Razorpay(options);
  paymentObject.open();
}
