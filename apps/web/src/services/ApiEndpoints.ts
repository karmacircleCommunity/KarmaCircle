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
  follow: (handle: string) =>
    `${API}/organizations/${encodeURIComponent(handle)}/follow`,
  profileView: (handle: string) =>
    `${API}/organizations/${encodeURIComponent(handle)}/analytics/profile-view`,
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

/** Largest `limit` the API accepts (`paginationQuerySchema`). */
const HOST_EVENTS_LIMIT = 100;

const eventEndpoints = {
  create: `${API}/events/create`,
  mine: () => `${API}/events/mine`,
  /**
   * One host's own events, filtered server-side by `hostUsername` — the
   * organization's "Your events" page. Filtering a fetched page in the
   * browser instead would hide anything on page two.
   * Asks for the largest page the API allows. With no `period` the API lists
   * a host's events newest first, so a host with more than 100 events loses
   * its oldest, never its newest or upcoming ones. (The default limit of 20
   * used to cut the list off after 20 events.)
   */
  byHost: (handle: string) =>
    `${API}/events?host=${encodeURIComponent(handle)}&limit=${HOST_EVENTS_LIMIT}`,
  /**
   * One event's full record, for the detail page (`DetailedEvent.tsx`).
   * There's no dedicated `GET /events/:uid` route — the same `GET /events`
   * endpoint returns a bare event object instead of a page whenever `uid`
   * is set (`event.controller.ts#listEvents`), so this reuses that branch
   * rather than adding a new one. Mirrors `organizationEndpoints.byHandle`.
   */
  byUid: (uid: string) => `${API}/events?uid=${encodeURIComponent(uid)}`,
  /** `PATCH` to edit one of the organization's own events. */
  update: (uid: string) => `${API}/events/${encodeURIComponent(uid)}`,
  /** `POST` to make one of the organization's own drafts public. */
  publish: (uid: string) => `${API}/events/${encodeURIComponent(uid)}/publish`,
  /** `POST` to take a published event back to a draft. */
  unpublish: (uid: string) =>
    `${API}/events/${encodeURIComponent(uid)}/unpublish`,
  /** `POST` to cancel one of the organization's own events. */
  cancel: (uid: string) => `${API}/events/${encodeURIComponent(uid)}/cancel`,
  join: (uid: string) => `${API}/events/${encodeURIComponent(uid)}/join`,
  registration: (uid: string) =>
    `${API}/events/${encodeURIComponent(uid)}/registration`,
  /** `DELETE` to leave an event the signed-in attendee joined (same URL as
   *  the `GET` registration check). */
  leave: (uid: string) =>
    `${API}/events/${encodeURIComponent(uid)}/registration`,
  /** The host's attendee list: one page, optionally narrowed by `search`. */
  attendees: (
    uid: string,
    params: { page?: number; limit?: number; search?: string } = {},
  ) => {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 50));
    if (params.search) query.set("search", params.search);
    return `${API}/events/${encodeURIComponent(uid)}/attendees?${query.toString()}`;
  },
  /** `PATCH` to check one attendee in or out. */
  attendee: (uid: string, registrationId: string) =>
    `${API}/events/${encodeURIComponent(uid)}/attendees/${encodeURIComponent(registrationId)}`,
  /** The attendee list as a CSV download. */
  attendeesExport: (uid: string) =>
    `${API}/events/${encodeURIComponent(uid)}/attendees/export`,
  /**
   * One page of the public directory, filtered, split and ordered by the
   * API (`GET /events`, see `listEventsQuerySchema` in
   * apps/api/src/modules/events/event.validation.ts). `period` is always
   * sent: the directory is either upcoming or past, never both.
   * Pages are `limit` long (the API caps it at 100) and carry their own
   * `pagination.total`, so the directory loads more instead of fetching
   * everything up front.
   */
  directory: (params: {
    period: "upcoming" | "past";
    search?: string;
    mode?: "Online" | "Offline" | "Hybrid";
    /** What kind of event it is (PG-9), as the API's slug. */
    type?: string;
    inviteOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    query.set("period", params.period);
    if (params.search) query.set("search", params.search);
    if (params.mode) query.set("mode", params.mode);
    if (params.type) query.set("type", params.type);
    if (params.inviteOnly !== undefined) {
      query.set("inviteOnly", String(params.inviteOnly));
    }
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 12));
    return `${API}/events?${query.toString()}`;
  },
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
