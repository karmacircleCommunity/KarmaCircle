import { z } from "zod";

/** The shortest secret allowed in production. 32 characters is 256 bits at best. */
export const MIN_SECRET_LENGTH = 32;

// Text that shows a value was copied from an example file, not generated.
const PLACEHOLDER_PARTS = [
  "changeme",
  "change-me",
  "change_me",
  "placeholder",
  "local-only",
  "local-dev",
  "your-secret",
  "your_secret",
  "yoursecret",
  "example",
  "test-",
  "dummy",
  "replace",
];
const COMMON_SECRETS = [
  "secret",
  "password",
  "default",
  "jwtsecret",
  "supersecret",
];

/**
 * What is wrong with a secret that must be strong, or undefined when it is
 * fine. The message never repeats the value, since it ends up in logs.
 */
export function weakSecretReason(value: string): string | undefined {
  const lower = value.trim().toLowerCase();
  if (value.length < MIN_SECRET_LENGTH) {
    return `must be at least ${MIN_SECRET_LENGTH} characters in production`;
  }
  if (
    PLACEHOLDER_PARTS.some((part) => lower.includes(part)) ||
    COMMON_SECRETS.includes(lower)
  ) {
    return "looks like a placeholder or example value, set a random one in production";
  }
  if (new Set(value).size < 8) {
    return "uses too few different characters, set a random one in production";
  }
  return undefined;
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
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

    // Optional because Resend is used only in production. Development and
    // test capture password-reset links locally and never construct a client.
    RESEND_API_KEY: z.string().optional(),
    // Production sender address. Falls back to Resend's onboarding sender
    // when unset. Development and test do not send mail. See config/mailer.ts.
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

    // The image service (apps/image-service). Optional: without both, the
    // upload-token route answers 503 and event covers keep using the old
    // in-form image. The URL is where browsers reach the service; the secret
    // signs the short upload tokens and must equal the service's own
    // IMAGE_SERVICE_SECRET.
    IMAGE_SERVICE_URL: z
      .string()
      .optional()
      .transform((value) => value?.trim().replace(/\/+$/, "") || undefined)
      .refine(
        (value) => value === undefined || /^https?:\/\/[^/]/.test(value),
        {
          message: "must be an http or https URL",
        },
      ),
    IMAGE_SERVICE_SECRET: z
      .string()
      .optional()
      .transform((value) => value?.trim() || undefined),

    // Optional error tracking (Sentry). Unset or empty means off: nothing is
    // sent and the SDK is never started. See config/monitoring.ts.
    SENTRY_DSN: z
      .string()
      .optional()
      .transform((value) => value?.trim() || undefined)
      .refine((value) => value === undefined || /^https?:\/\//.test(value), {
        message: "must be a Sentry DSN URL",
      }),
    // Names the deploy in error reports. Falls back to Vercel's commit SHA.
    SENTRY_RELEASE: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // The image service needs both settings or neither. A secret that is set
    // must be long enough in every environment, since it guards uploads even
    // on a shared staging server.
    if (
      value.IMAGE_SERVICE_SECRET &&
      value.IMAGE_SERVICE_SECRET.length < MIN_SECRET_LENGTH
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["IMAGE_SERVICE_SECRET"],
        message: `must be at least ${MIN_SECRET_LENGTH} characters`,
      });
    }
    if (
      Boolean(value.IMAGE_SERVICE_URL) !== Boolean(value.IMAGE_SERVICE_SECRET)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [
          value.IMAGE_SERVICE_URL
            ? "IMAGE_SERVICE_SECRET"
            : "IMAGE_SERVICE_URL",
        ],
        message: "must be set together with the other IMAGE_SERVICE_ variable",
      });
    }

    // Local development and tests use short example secrets on purpose
    // (.env.example), so the strict checks apply to production only.
    if (value.NODE_ENV !== "production") return;

    for (const name of [
      "JWT_SECRET",
      "SECRET_KEY",
      "IMAGE_SERVICE_SECRET",
    ] as const) {
      const secret = value[name];
      if (secret === undefined) continue;
      const reason = weakSecretReason(secret);
      if (reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: reason,
        });
      }
    }

    // The OAuth placeholders let the API start locally. In production they
    // would make Google sign-in fail in a confusing way.
    for (const name of ["CLIENT_ID", "CLIENT_SECRET"] as const) {
      if (value[name].toLowerCase().includes("placeholder")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message:
            "is still the example placeholder, set the real Google OAuth value in production",
        });
      }
    }
  });

/** Validates a set of variables (normally `process.env`). Throws one error listing every problem. */
export function parseEnv(source: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = parseEnv(process.env);
export type Env = typeof env;
