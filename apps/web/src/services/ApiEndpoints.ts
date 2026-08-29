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
};

const authEndpoints = {
  signin: `${API}/auth/signin`,
  signup: `${API}/auth/signup`,
  checkEmail: `${API}/auth/check-email`,
  googleLogin: `${API}/auth/google`,
  googleLoginSuccess: `${API}/auth/login/success`,
  logout: `${API}/auth/logout`,
};

export { authEndpoints, organizationEndpoints, eventEndpoints, userEndpoints };
