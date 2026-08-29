import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  SECRET_KEY: z.string().min(1, "SECRET_KEY is required"),

  CLIENT_ID: z.string().min(1, "CLIENT_ID is required"),
  CLIENT_SECRET: z.string().min(1, "CLIENT_SECRET is required"),
  CALLBACK_URL: z.string().min(1, "CALLBACK_URL is required"),
  successURL: z.string().min(1, "successURL is required"),

  // Optional, not required, on purpose: Razorpay isn't wired up as a
  // launch-blocking dependency. payment.service.ts constructs the Razorpay
  // client lazily and throws a clear AppError if a request actually reaches
  // it without these set, rather than the whole API refusing to boot.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Same lazy-optional pattern as Razorpay above: config/mailer.ts builds
  // the Resend client lazily and throws a 503 AppError if a request that
  // actually needs to send an email (POST /auth/forgot-password) reaches
  // it without this set, rather than blocking the whole API from booting.
  RESEND_API_KEY: z.string().optional(),
  // Falls back to Resend's own onboarding@resend.dev test sender if unset
  // — fine for local dev, but any real deploy should set a verified
  // sending address. See config/mailer.ts.
  RESEND_FROM_EMAIL: z.string().optional(),

  // The canonical frontend URL: used for the password-reset link
  // (auth.service.ts) and as the OAuth success redirect. Exactly one value,
  // because a redirect can only have one destination. CORS is a separate
  // concern, see CORS_ORIGINS below.
  ORIGIN_URL: z.string().min(1, "ORIGIN_URL is required"),

  // Every browser origin allowed to make credentialed requests, as a
  // comma-separated list. ORIGIN_URL is always allowed implicitly, so this
  // only needs the *extra* origins (e.g. http://localhost:3000 alongside a
  // deployed frontend). Replaces the old IGNORE_ORIGINS allow-everything
  // escape hatch, which turned local dev into a wildcard CORS policy.
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  // The `Domain` attribute for auth cookies. Set it to the registrable
  // domain shared by the frontend and this API (".karmacircle.org") so one
  // cookie covers www/dev/api. Leave it UNSET for localhost: an explicit
  // `Domain=localhost` is rejected by Chrome, and a host-only cookie is
  // what local dev actually wants. See auth.cookies.ts.
  ORIGIN_DOMAIN: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
