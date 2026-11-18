import * as Sentry from "@sentry/node";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Error tracking (O-5). Off unless `SENTRY_DSN` is set, so local development,
 * tests and CI send nothing. The rest of the code only calls `reportError`,
 * which keeps the vendor in one file.
 */

// How long to wait for a report to leave before answering. Serverless
// functions can be frozen once the response is sent, so the report has to be
// out first. Only unexpected errors pay this, and only when tracking is on.
const FLUSH_TIMEOUT_MS = 2000;

type Transport = NonNullable<Sentry.NodeOptions["transport"]>;

export interface MonitoringOptions {
  dsn?: string;
  /** Replaces the network transport. Used by tests to capture what would be sent. */
  transport?: Transport;
}

/** Starts error tracking once. Returns whether it is on. */
export function initMonitoring(options: MonitoringOptions = {}): boolean {
  if (Sentry.isInitialized()) return true;
  const dsn = options.dsn ?? env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    release: env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
    // Errors only, no performance tracing. Personal data is scrubbed in beforeSend.
    tracesSampleRate: 0,
    // Collect nothing about the request. The SDK collects headers, cookies,
    // bodies and query strings by default, and these can hold a session, a
    // reset token or a person's details.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    transport: options.transport,
    beforeSend(event) {
      // A report must never carry a session or a login. Nothing attaches
      // these today; this keeps it true if an integration starts to.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
      }
      delete event.user;
      return event;
    },
  });
  return true;
}

export interface ErrorContext {
  method?: string;
  /** The route pattern such as `/events/:uid`, never the real URL: it can hold tokens and names. */
  route?: string;
}

/**
 * Sends an unexpected error to the tracker and waits for it to leave.
 * Never throws and never rejects, so a tracking problem cannot turn into a
 * second failure inside the error handler.
 */
export async function reportError(
  error: unknown,
  context: ErrorContext = {},
): Promise<void> {
  if (!Sentry.isInitialized()) return;
  try {
    Sentry.withScope((scope) => {
      if (context.method) scope.setTag("http.method", context.method);
      if (context.route) scope.setTag("http.route", context.route);
      Sentry.captureException(error);
    });
    await Sentry.flush(FLUSH_TIMEOUT_MS);
  } catch (trackingError) {
    logger.warn(
      { err: trackingError },
      "Could not send the error to the tracker",
    );
  }
}

/** Stops error tracking. For tests and graceful shutdown. */
export async function shutdownMonitoring(): Promise<void> {
  await Sentry.close(FLUSH_TIMEOUT_MS);
}
