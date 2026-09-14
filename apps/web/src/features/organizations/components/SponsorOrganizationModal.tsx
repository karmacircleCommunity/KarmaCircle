import { useState } from "react";
import { FiHeart, FiX } from "react-icons/fi";
import {
  CreateSponsorshipOrder,
  VerifySponsorshipPayment,
} from "@services/KarmaCircleApi";
import { STATUSCODE } from "@statics/Constants";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import { useRazorpayCheckout } from "../hooks/useRazorpayCheckout";

const AMOUNT_PRESETS = [500, 1000, 2500, 5000];

interface SponsorOrganizationModalProps {
  handle: string;
  name: string;
  logo?: string;
  onClose: () => void;
  /** Called once a payment is verified, with the organization's fresh
   *  counted total — the caller re-renders from it rather than this modal
   *  owning any of that state. */
  onSponsored: (raisedViaPlatform: number) => void;
}

/**
 * The real "Support {org}" flow behind an org's `sponsorship.enabled`
 * toggle — pick an amount, pay through Razorpay Checkout (cards, UPI,
 * netbanking, and international cards if the merchant account allows it —
 * all a Razorpay dashboard setting, not something this component
 * restricts), and only trust the payment once the backend has verified
 * Razorpay's own signature on it (`payment.service.ts
 * #verifySponsorshipPayment`) — never the mere fact that Checkout's
 * `handler` fired, which a client could forge.
 *
 * Builds its own overlay markup rather than the unused shared `Modal.tsx`
 * — every other modal in this app already does the same (see
 * `known-issues.md`), and a state-machine-shaped flow like this one (pick
 * amount → paying → done) doesn't fit a generic modal shell cleanly.
 */
const SponsorOrganizationModal = ({
  handle,
  name,
  logo,
  onClose,
  onSponsored,
}: SponsorOrganizationModalProps) => {
  const { openCheckout } = useRazorpayCheckout();
  const [amount, setAmount] = useState<number>(AMOUNT_PRESETS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [supporterName, setSupporterName] = useState("");
  const [paying, setPaying] = useState(false);

  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const validAmount = Number.isFinite(effectiveAmount) && effectiveAmount >= 1;

  const handlePay = async () => {
    if (!validAmount || paying) return;
    setPaying(true);

    const orderRes = await CreateSponsorshipOrder(handle, {
      amount: effectiveAmount,
      supporterName: supporterName.trim() || undefined,
    });

    if (!orderRes || orderRes.status !== STATUSCODE.OK) {
      showErrorToast(
        orderRes?.data?.message ??
          "Could not start the payment. Please try again.",
      );
      setPaying(false);
      return;
    }

    const { id: orderId, amount: orderAmountPaise, currency } = orderRes.data;

    try {
      await openCheckout({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: orderId,
        amount: orderAmountPaise,
        currency,
        name: `Support ${name}`,
        description: "via KarmaCircle",
        image: logo,
        prefill: supporterName.trim() ? { name: supporterName.trim() } : undefined,
        // Left unset deliberately — see RazorpayCheckoutOptions' own doc
        // comment: this shows every method the merchant account has
        // enabled rather than this component picking a subset.
        theme: { color: "#c2410c" },
        modal: {
          ondismiss: () => setPaying(false),
        },
        handler: async (response) => {
          const verifyRes = await VerifySponsorshipPayment(handle, response);

          if (verifyRes?.status === STATUSCODE.OK) {
            showSuccessToast(`Thank you for supporting ${name}.`);
            onSponsored(verifyRes.data.raisedViaPlatform);
            onClose();
          } else {
            showErrorToast(
              "We couldn't verify that payment. If money left your account, it will be refunded — contact us if it isn't within a few days.",
            );
          }
          setPaying(false);
        },
      });
    } catch {
      showErrorToast("Could not open the payment window. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="sponsor-modal-title"
            className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary"
          >
            Support {name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-brand-secondary/6 text-ink/50 transition-colors duration-200 hover:text-brand"
          >
            <FiX className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 font-poppins text-body leading-6 text-ink/65">
          Every rupee goes straight to {name} through Razorpay — cards, UPI
          and netbanking all work here.
        </p>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                setCustomAmount("");
              }}
              className={`cursor-pointer rounded-xl border px-2 py-2.5 font-outfit text-body font-medium transition-colors duration-200 ${
                !customAmount && amount === preset
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-brand-secondary/12 text-ink/70 hover:border-brand/35"
              }`}
            >
              ₹{preset}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block font-poppins text-caption tracking-wide text-ink/50 uppercase">
            Or enter an amount
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder="₹ Custom amount"
            className="w-full rounded-xl border border-brand-secondary/15 bg-transparent px-4 py-2.5 font-poppins text-body text-ink outline-none focus:border-brand/55"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block font-poppins text-caption tracking-wide text-ink/50 uppercase">
            Your name (optional)
          </span>
          <input
            type="text"
            value={supporterName}
            onChange={(event) => setSupporterName(event.target.value)}
            placeholder="Shown to nobody but you and Razorpay"
            className="w-full rounded-xl border border-brand-secondary/15 bg-transparent px-4 py-2.5 font-poppins text-body text-ink outline-none focus:border-brand/55"
          />
        </label>

        <button
          type="button"
          onClick={handlePay}
          disabled={!validAmount || paying}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-6 py-3 font-poppins text-body font-medium text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-colors duration-300 ease-out hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55"
        >
          <FiHeart aria-hidden="true" />
          {paying ? "Opening payment…" : `Pay ₹${validAmount ? effectiveAmount : "—"}`}
        </button>
      </div>
    </div>
  );
};

export default SponsorOrganizationModal;
