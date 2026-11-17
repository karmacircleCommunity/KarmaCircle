import pino, { type DestinationStream, type LoggerOptions } from "pino";
import { env } from "./env";

/**
 * Header values that must never reach a log line. `pino-http` serializes the
 * whole request and response header sets, so without this the `Token` session
 * cookie (request `cookie`, response `set-cookie`) and any bearer credential
 * would be written in clear text to whatever collects the logs. Node lowercases
 * header names, so these paths are lowercase.
 */
export const LOG_REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers['proxy-authorization']",
  "res.headers['set-cookie']",
];

export const createLogger = (
  destination?: DestinationStream,
  options: LoggerOptions = {},
) => {
  const config: LoggerOptions = {
    level: env.NODE_ENV === "test" ? "silent" : "info",
    redact: { paths: LOG_REDACT_PATHS, censor: "[Redacted]" },
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    ...options,
  };
  return destination ? pino(config, destination) : pino(config);
};

export const logger = createLogger();
