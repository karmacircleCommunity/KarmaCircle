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
  handler?: () => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}
