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
  details: (userName?: string) => `${API}/organizations?userName=${userName}`,
  createEvent: `${API}/organization/createevent`,
  dashboard: `${API}/organizations/dashboard`,
};

const eventEndpoints = {
  all: `${API}/events`,
  create: `${API}/events/create`,
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
