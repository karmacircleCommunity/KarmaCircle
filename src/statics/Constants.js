export const defaults = {
  coverImage:
    "https://images.pexels.com/videos/3045163/free-video-3045163.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
  logo: "https://api.freelogodesign.org/assets/thumb/logo/bdd55f703a074abb8bf50c0d3891c0a9_400.png?t=638314396148720000",
};

export const authTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "club", label: "Organization" },
];

export const brandingFields = ["tagLine", "description"];
export const addressFields = ["city", "state", "address", "country", "pincode"];
export const mandatoryFields = ["name", "username"];
export const emailRegex = /^[a-zA-Z0-9._:$!%-]+@[a-zA-Z0-9.-]+.[a-zA-Z]$/;

export const STATUSCODE = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  CONFLICT: 409,
  GONE: 410,
  PRECONDITION_FAILED: 412,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export const STATUSMESSAGE = {
  LOGIN_SUCCESS: "Logged in !",
  LOGIN_FAILED: "Login failed !",
  LOGOUT_SUCCESS: "Logged out sucessfully !",
  LOGOUT_FAILED: "Logout failed !",
  SIGNUP_SUCCESS: "Signed up !",
  SIGNUP_FAILED: "Signup failed !",
  USER_NOT_FOUND: "User not found !",
  DASHBOARD_FETCH_FAILED: "Failed to fetch dashboard data !",
  USER_ALREADY_EXISTS: "User already exists, please Login !",
  INVALID_CREDENTIALS: "Invalid credentials !",
  INTERNAL_SERVER_ERROR: "Internal server error, try again later !",
  UNAUTHORIZED: "Unauthorized !",
  FORBIDDEN: "Forbidden !",
  NOT_FOUND: "Not found !",
  EVENT_NOT_FOUND: "Event not found !",
  EVENT_UID_ALREADY_EXISTS: "Please choose another unique event uid !",
  CREATE_EVENT_FAILED: "Failed to create event",
  PRODUCT_SLUG_ALREADY_EXISTS: "productSlug already exists",
  PRODUCT_ADD_FAILED: "Failed to add product",
  PRODUCT_FETCH_FAILED: "Failed to fetch products",
  PRODUCT_NOT_FOUND: "Product not found",
  PASSWORD_UPDATE_SUCCESS: "Password Updated Successfully",
  PROFILE_UPDATE_SUCCESS: "Profile Updated Successfully",
  TOO_MANY_REQUESTS: "You have already reported a problem in the last 2 hours.",
};
