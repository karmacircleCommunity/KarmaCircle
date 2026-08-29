process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test-placeholder";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.SECRET_KEY = "test-secret-key";
process.env.CLIENT_ID = "test-client-id";
process.env.CLIENT_SECRET = "test-client-secret";
process.env.CALLBACK_URL = "http://localhost:5000/auth/google/callback";
process.env.successURL = "http://localhost:3000/";
process.env.RAZORPAY_KEY_ID = "test-razorpay-key-id";
process.env.RAZORPAY_KEY_SECRET = "test-razorpay-key-secret";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.RESEND_FROM_EMAIL = "test@example.com";
process.env.ORIGIN_URL = "http://localhost:3000";
// Empty, matching local dev: cookies are host-only, with no Domain attribute.
process.env.ORIGIN_DOMAIN = "";
process.env.CORS_ORIGINS = "";
