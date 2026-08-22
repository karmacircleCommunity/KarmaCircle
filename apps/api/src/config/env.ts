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

  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),

  ORIGIN_URL: z.string().min(1, "ORIGIN_URL is required"),
  ORIGIN_DOMAIN: z.string().min(1, "ORIGIN_DOMAIN is required"),
  IGNORE_ORIGINS: z
    .string()
    .optional()
    .transform((value) => value === "true"),
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
