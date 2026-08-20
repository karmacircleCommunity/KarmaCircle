import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { STATUS_CODE } from "../constants/http-status";

/**
 * Real rate limiting only makes sense against real traffic. Skipping it in
 * NODE_ENV=test keeps the two Express-level limiters below from tripping
 * during a single Jest run — a test file that exercises `/auth/*` more than
 * `authLimiter`'s 20-per-15-minutes across its whole suite would otherwise
 * start getting real 429s partway through, unrelated to whatever behavior
 * that test is actually verifying.
 */
const skipInTest = () => env.NODE_ENV === "test";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: { message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
  skip: skipInTest,
  message: { message: "Too many auth attempts, please try again later." },
});
