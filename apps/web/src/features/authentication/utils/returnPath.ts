/**
 * Where to send someone back to after signing in or signing up, for a visitor
 * who was asked to sign in in the middle of something (pressing Join on an
 * event). The path travels to `/auth/signin` in router state as `returnTo`.
 *
 * A Google sign-in leaves the site and comes back to `/`, which drops router
 * state, so that one path is also kept in `sessionStorage` (this tab only) for
 * `Home.tsx` to pick up.
 */
const STORAGE_KEY = "karmacircle:auth-return-path";

/** Backslashes and control characters, which URL parsers rewrite: `/\host`
 *  and `/<tab>/host` both become `//host`, another site. */
const hasUnsafeCharacter = (value: string) =>
  [...value].some((char) => char === "\\" || char < " " || char === "\u007f");

/**
 * `value` as a path on this site, or `null` for anything else: another origin,
 * a protocol-relative address, a scheme, or an auth page (which would only
 * bounce a signed-in person on to `/`).
 */
export function safeReturnPath(
  value: unknown,
  origin: string = window.location.origin,
): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    hasUnsafeCharacter(value)
  ) {
    return null;
  }

  const url = new URL(value, origin);
  // Checked again after parsing: `/..//host` normalizes to `//host`.
  if (
    url.origin !== origin ||
    url.pathname.startsWith("//") ||
    /^\/auth(\/|$)/i.test(url.pathname)
  ) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Reads the `returnTo` a page was opened with, from router state. */
export function returnPathFromState(state: unknown): string | null {
  return safeReturnPath((state as { returnTo?: unknown } | null)?.returnTo);
}

/**
 * Where a finished email sign-in or sign-up goes. A brand-new organization
 * always starts at its setup page. Everyone else goes back to the page that
 * asked them to sign in, if one did, replacing the form in history so Back
 * never returns to it.
 */
export function destinationAfterAuth(
  returnTo: string | null,
  isNewOrganization: boolean,
): { to: string; replace: boolean } {
  if (isNewOrganization) return { to: "/organization/setup", replace: false };
  return returnTo
    ? { to: returnTo, replace: true }
    : { to: "/", replace: false };
}

/** Keeps the path across the Google round trip; `null` forgets an older one. */
export function rememberReturnPath(path: string | null): void {
  try {
    if (path) sessionStorage.setItem(STORAGE_KEY, path);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; signing in then ends on the home page.
  }
}

/** The kept path, if it is still a safe one, forgetting it as it is read. */
export function takeReturnPath(): string | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return stored === null ? null : safeReturnPath(stored);
  } catch {
    return null;
  }
}
