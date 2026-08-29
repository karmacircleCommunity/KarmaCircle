import { CookieOptions } from "express";
import { env } from "../../config/env";

/**
 * Also the JWT's own expiresIn (see signToken in auth.service.ts) — kept as
 * one source of truth so the Token cookie and the JWT it carries always
 * expire at the exact same instant.
 */
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Local dev runs the frontend and this API over plain HTTP on localhost,
 * where a `Secure` cookie is at best browser-dependent. Everywhere else is
 * HTTPS. Deriving this from ORIGIN_URL's scheme keeps it to one signal
 * rather than a second "am I local" env var that could disagree with it.
 */
const isSecureContext = env.ORIGIN_URL.startsWith("https://");

/**
 * `sameSite: "lax"`, not "none", because the frontend and this API now
 * share one registrable domain in every environment (www/api .karmacircle.org,
 * dev/api.dev .karmacircle.org, and localhost:3000/:5050, where ports don't
 * affect same-site). Same-site requests carry Lax cookies fine, and Lax keeps
 * the CSRF protection that "none" switches off entirely. The Google OAuth
 * callback still works: Lax cookies may be *set* on a top-level navigation,
 * and every later call is a same-site XHR.
 *
 * `domain` is omitted when ORIGIN_DOMAIN is unset (localhost), producing a
 * host-only cookie: Chrome rejects an explicit `Domain=localhost`.
 */
function baseCookieOptions(): CookieOptions {
  return {
    sameSite: "lax",
    secure: isSecureContext,
    ...(env.ORIGIN_DOMAIN ? { domain: env.ORIGIN_DOMAIN } : {}),
  };
}

/**
 * For the session token itself. Always httpOnly: nothing in the frontend
 * reads the Token cookie (it hydrates its user state from the signin/signup
 * response body and /auth/login/success instead), so there is no reason to
 * expose a bearer credential to page JavaScript.
 */
export function httpOnlyCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    httpOnly: true,
    expires: new Date(Date.now() + THIRTY_DAYS_MS),
  };
}

/**
 * For non-secret flags the frontend genuinely has to read: today only
 * `OAuthLoginInitiated`, the marker Home.tsx uses to notice it has just
 * come back from Google. Never use this for anything that grants access.
 */
export function readableCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    httpOnly: false,
    expires: new Date(Date.now() + THIRTY_DAYS_MS),
  };
}

export function clearedCookieOptions(httpOnly: boolean): CookieOptions {
  return {
    ...baseCookieOptions(),
    httpOnly,
    expires: new Date(0),
  };
}
