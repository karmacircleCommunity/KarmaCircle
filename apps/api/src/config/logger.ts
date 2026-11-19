import pino from "pino";
import type { LoggerOptions } from "pino";
import { env } from "./env";

/**
 * Header values that must never reach the logs. `pino-http` logs every
 * request's headers, and the browser's `Cookie` header carries the login
 * `Token`, so anyone who can read the logs could copy a live session. The
 * response's `Set-Cookie` is the same token being issued at sign-in. An
 * `Authorization` header is redacted for the same reason, though this API
 * does not read one today.
 */
export const REDACTED_LOG_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  'res.headers["set-cookie"]',
];

export const loggerOptions: LoggerOptions = {
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: { paths: REDACTED_LOG_PATHS, censor: "[redacted]" },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
};

export const logger = pino(loggerOptions);
