/**
 * Minimal shape of the options object `PaymentGateway.ts` builds for
 * `window.Razorpay(options)`. Not the full Razorpay Checkout API
 * surface — only the fields this file actually sets. Razorpay ships no
 * types of its own here (loaded at runtime via a `<script>` tag, not
 * an npm package), hence the `declare global` below.
 */
export interface RazorpayCheckoutOptions {
  key?: string;
  currency?: string;
  amount?: number;
  name?: string;
  description?: string;
  image?: string;
  order_id?: string;
  handler?: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Left unset (rather than restricted to a subset) so Checkout shows
   *  every method the merchant's own Razorpay account has enabled — cards,
   *  UPI, netbanking, wallets, and international cards where the account
   *  allows them. Restricting this here would be a code-side cap on
   *  something that's actually an account setting. */
  method?: Record<string, boolean>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  notes?: Record<string, string>;
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}
