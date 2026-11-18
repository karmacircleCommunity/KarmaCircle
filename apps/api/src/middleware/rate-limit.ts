import rateLimit, { type Store } from "express-rate-limit";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { getRedis } from "../config/redis";
import { STATUS_CODE } from "../constants/http-status";
import { FailoverStore, RedisRateLimitStore } from "./rate-limit-store";

/**
 * Real rate limiting only makes sense against real traffic. Skipping it in
 * NODE_ENV=test keeps the two Express-level limiters below from tripping
 * during a single Jest run — a test file that exercises `/auth/*` more than
 * `authLimiter`'s 20-per-15-minutes across its whole suite would otherwise
 * start getting real 429s partway through, unrelated to whatever behavior
 * that test is actually verifying.
 */
const skipInTest = () => env.NODE_ENV === "test";

/**
 * Where a limiter keeps its counts. With `REDIS_URL` set that is Redis, shared
 * by every server instance (S-2). Without it, the instance's own memory: fine
 * for one process on a laptop, but on Vercel many instances run at once and
 * each starts at zero, so the limit is easy to get around.
 */
function createStore(name: string): Store | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  return new FailoverStore(new RedisRateLimitStore(redis, `rl:${name}:`), name);
}

if (env.NODE_ENV === "production" && !env.REDIS_URL) {
  logger.warn(
    "REDIS_URL is not set: rate limits are counted per server instance, so on a platform that runs several instances they are easy to get around",
  );
}

export interface LimiterOptions {
  name: string;
  windowMs: number;
  limit: number;
  message: string;
  statusCode?: number;
  skip?: () => boolean;
  store?: Store;
}

export const createLimiter = ({
  name,
  windowMs,
  limit,
  message,
  statusCode,
  skip = skipInTest,
  store = createStore(name),
}: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode,
    skip,
    store,
    message: { message },
  });

export const apiLimiter = createLimiter({
  name: "api",
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: "Too many requests, please try again later.",
});

export const authLimiter = createLimiter({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  limit: 20,
  statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
  message: "Too many auth attempts, please try again later.",
});
