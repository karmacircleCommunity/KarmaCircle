import { renderEventPage } from "../src/features/events/seo/renderEventPage";
import type { SeoEvent } from "../src/features/events/seo/eventHead";

/**
 * Serves `/events/:uid` with that event's share and search tags in the HTML
 * (PG-20), because the app is a single-page app: link previews (WhatsApp,
 * Slack, Facebook, LinkedIn, X) and most crawlers read the HTML as delivered
 * and never run the JavaScript that would show the event's name. `vercel.json`
 * routes `/events/<address>` here; every other path still gets the app.
 *
 * The page it returns is the app's own `index.html` with the tags swapped in,
 * so the app boots exactly as before, and any failure returns the plain page.
 *
 * Settings (Vercel project environment, all optional):
 * - `API_URL` (falls back to `VITE_API_URL`): where to read the event.
 * - `SITE_URL`: the public address used in the tags, for example
 *   `https://www.karmacircle.org`. Set it in production: without it the tags
 *   use this deployment's own address, which is a `vercel.app` one.
 *
 * The app page is read from this deployment itself (`VERCEL_URL`, which Vercel
 * sets and a visitor cannot change), never from a host a request names: the
 * `Host` header is the visitor's to choose, and fetching from it would let
 * anyone make this function request any address. The header is only a
 * fallback for running somewhere that has no `VERCEL_URL`.
 */

// This file is built by Vercel, not by Vite, and the web app's TypeScript
// settings do not include Node's types, so the little it needs is declared.
declare const process: { env: Record<string, string | undefined> };

interface Req {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface Res {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

const header = (req: Req, name: string) => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const FETCH_TIMEOUT_MS = 3000;

async function fetchWithTimeout(url: string, accept: string) {
  return fetch(url, {
    headers: { accept },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export default async function handler(req: Req, res: Res) {
  const host = header(req, "x-forwarded-host") ?? header(req, "host") ?? "";
  const proto = header(req, "x-forwarded-proto") === "http" ? "http" : "https";
  const origin = `${proto}://${host}`;
  const shellOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : origin;
  const siteUrl = (process.env.SITE_URL ?? shellOrigin).replace(/\/+$/, "");
  const apiUrl = (
    process.env.API_URL ??
    process.env.VITE_API_URL ??
    ""
  ).replace(/\/+$/, "");
  const uid =
    new URL(req.url ?? "/", "http://placeholder").searchParams.get("uid") ?? "";

  try {
    const { html } = await renderEventPage(uid, {
      siteUrl,
      loadShell: async () => {
        const response = await fetchWithTimeout(
          `${shellOrigin}/index.html`,
          "text/html",
        );
        if (!response.ok)
          throw new Error(`index.html answered ${response.status}`);
        return response.text();
      },
      loadEvent: async (eventUid) => {
        if (!apiUrl) return null;
        const response = await fetchWithTimeout(
          `${apiUrl}/events?uid=${encodeURIComponent(eventUid)}`,
          "application/json",
        );
        return response.ok ? ((await response.json()) as SeoEvent) : null;
      },
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Fresh for five minutes at the edge, then served stale while it refreshes,
    // so a popular event does not reach the API on every share.
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=86400",
    );
    res.end(html);
  } catch {
    // Not even the app page could be read. Better a short plain answer than a
    // hung request; the next request tries again.
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end("This page is temporarily unavailable.");
  }
}
