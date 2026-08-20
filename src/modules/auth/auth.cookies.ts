import { CookieOptions } from "express";
import { env } from "../../config/env";

/**
 * Also the JWT's own expiresIn (see signToken in auth.service.ts) — kept as
 * one source of truth so the Token cookie and the JWT it carries always
 * expire at the exact same instant.
 */
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function httpOnlyCookieOptions(): CookieOptions {
  return {
    sameSite: "none",
    httpOnly: true,
    expires: new Date(Date.now() + THIRTY_DAYS_MS),
    secure: true,
    domain: env.ORIGIN_DOMAIN,
  };
}

export function readableCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now() + THIRTY_DAYS_MS),
    domain: env.ORIGIN_DOMAIN,
  };
}

export function clearedCookieOptions(httpOnly: boolean): CookieOptions {
  return {
    expires: new Date(0),
    httpOnly,
    secure: true,
    sameSite: "none",
    domain: env.ORIGIN_DOMAIN,
  };
}
