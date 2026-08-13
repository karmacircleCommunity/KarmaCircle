import Axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default async function displayRazorpay(money) {
  const data = await Axios.post(
    `${import.meta.env.VITE_API_URL}/payment/razorpay`,
    { amount: money },
  );

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    currency: data.currency,
    amount: data.data.amount,
    name: "Milan",
    description: "A hub for NGOs",
    image: "https://i.ibb.co/JC4g0ZD/favicon.png",
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
