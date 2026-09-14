const API = import.meta.env.VITE_API_URL;

const userEndpoints = {
  details: (userName?: string) => `${API}/user?userName=${userName}`,
  profile: `${API}/user/profile`,
  update: `${API}/user/update/profile`,
  report: `${API}/user/report`,
  completeProfile: `${API}/user/complete`,
  updateProfile: `${API}/user/update`,
};

const organizationEndpoints = {
  all: `${API}/organizations`,
  /** Legacy account lookup — still answered out of the users collection. */
  details: (userName?: string) => `${API}/organizations?userName=${userName}`,
  createEvent: `${API}/organization/createevent`,
  dashboard: `${API}/organizations/dashboard`,
  /** The signed-in organization's own record, private fields included. */
  mine: `${API}/organizations/me`,
  /** The closed tag/domain lists the setup form renders — never hardcode a
   *  second copy of these in the frontend. */
  taxonomy: `${API}/organizations/taxonomy`,
  /** One live organization's public profile. A draft organization 404s
   *  here exactly as an unknown handle does. */
  byHandle: (handle: string) => `${API}/organizations/${handle}`,
  /** The public directory, filtered server-side. */
  directory: (params: {
    search?: string;
    domain?: string;
    tag?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.domain) query.set("domain", params.domain);
    if (params.tag) query.set("tag", params.tag);
    query.set("limit", String(params.limit ?? 60));
    return `${API}/organizations?${query.toString()}`;
  },
};

const paymentEndpoints = {
  razorpay: `${API}/payment/razorpay`,
  /** Creates a Razorpay order for one organization's "Support" button —
   *  404s for an unknown/non-live handle, 403s if it hasn't turned
   *  sponsorship on. See apps/api/docs/specs/payments.md. */
  sponsorshipOrder: (handle: string) =>
    `${API}/payment/organizations/${handle}/order`,
  /** Verifies the three fields Razorpay Checkout's success handler hands
   *  back, and credits the organization's counted total on a match. */
  sponsorshipVerify: (handle: string) =>
    `${API}/payment/organizations/${handle}/verify`,
};

const eventEndpoints = {
  all: `${API}/events`,
  create: `${API}/events/create`,
  /**
   * One host's own events, filtered server-side by `hostUsername` — the
   * organization's "Your events" page. Filtering a fetched page in the
   * browser instead would hide anything on page two.
   */
  byHost: (handle: string) =>
    `${API}/events?host=${encodeURIComponent(handle)}`,
  /**
   * One event's full record, for the detail page (`DetailedEvent.tsx`).
   * There's no dedicated `GET /events/:uid` route — the same `GET /events`
   * endpoint returns a bare event object instead of a page whenever `uid`
   * is set (`event.controller.ts#listEvents`), so this reuses that branch
   * rather than adding a new one. Mirrors `organizationEndpoints.byHandle`.
   */
  byUid: (uid: string) => `${API}/events?uid=${encodeURIComponent(uid)}`,
  /**
   * The public directory. Unlike `organizationEndpoints.directory()`,
   * `GET /events` has no server-side `search`/domain filter to send
   * (`listEventsQuerySchema` — apps/api/src/modules/events/event.validation.ts
   * — only knows `uid`/`slug`/`host`/pagination), so `Events.tsx` filters
   * the fetched page in the browser instead. `limit` is set generously high
   * (the API caps it at 100) rather than left at the default 20, so that
   * client-side filtering isn't quietly hiding events sitting on a second
   * page it never fetched.
   */
  directory: (limit = 100) => `${API}/events?limit=${limit}`,
};

const authEndpoints = {
  signin: `${API}/auth/signin`,
  signup: `${API}/auth/signup`,
  checkEmail: `${API}/auth/check-email`,
  forgotPassword: `${API}/auth/forgot-password`,
  resetPassword: `${API}/auth/reset-password`,
  googleLogin: `${API}/auth/google`,
  googleLoginSuccess: `${API}/auth/login/success`,
  logout: `${API}/auth/logout`,
};

export {
  authEndpoints,
  organizationEndpoints,
  eventEndpoints,
  paymentEndpoints,
  userEndpoints,
};
