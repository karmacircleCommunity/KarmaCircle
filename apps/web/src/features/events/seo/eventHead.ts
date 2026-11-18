/**
 * Search and share markup for one event (PG-20): the title, description and
 * Open Graph / Twitter tags that link previews read, and the schema.org
 * `Event` data that search engines read.
 *
 * Kept free of imports from the rest of the app (no `@` aliases, no React), so
 * the Vercel function in `apps/web/api/event-page.ts` can use it as it is.
 *
 * Everything stated here is something the event page itself shows: the name,
 * the dates, the place, whether it is cancelled and what it costs. Search
 * engines treat markup that says more than the page as a violation.
 */

export interface SeoEvent {
  uid: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  status?: string;
  mode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  platform?: string;
  platformLink?: string;
  coverImage?: string;
  hostName?: string;
  organizerHandle?: string;
  cost?: { amount: number; currency: string };
  capacity?: number;
  registrationCount?: number;
}

export interface SeoContext {
  /** The public address of the site, without a trailing slash. */
  siteUrl: string;
  /** Used when the event has no cover a crawler can fetch. */
  defaultImage?: string;
}

export interface EventHead {
  title: string;
  description: string;
  /** The tags, ready to go in `<head>`. */
  tags: string;
}

const SITE_NAME = "KarmaCircle";
const MAX_DESCRIPTION = 200;
const MAX_IMAGE_URL = 2048;

const SCHEMA = "https://schema.org";

/** Escapes a value for use in HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// U+2028 and U+2029, built from their numbers so no invisible character sits in this file.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

/**
 * JSON that is safe inside a `<script>` element. `</script>` or `<!--` in an
 * event name would otherwise end the script early and let the rest run as
 * page content, so `<`, `>` and `&` are written as escapes (still the same
 * JSON), as are the two line separators JavaScript treats as line breaks.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEPARATOR, "\\u2028")
    .replace(PARAGRAPH_SEPARATOR, "\\u2029");
}

export const eventPageUrl = (ctx: SeoContext, uid: string) =>
  `${ctx.siteUrl}/events/${encodeURIComponent(uid)}`;

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

/** At most `max` characters, cut at a word and marked with an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = collapse(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

const validDate = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * A picture a crawler can fetch. A cover stored inside the event as a data URL
 * (how covers worked before the image service) cannot be a link preview, so
 * it falls back to the site's own image.
 */
export function eventImage(
  event: SeoEvent,
  ctx: SeoContext,
): string | undefined {
  const cover = event.coverImage?.trim();
  if (cover && cover.length <= MAX_IMAGE_URL && /^https?:\/\//i.test(cover)) {
    return cover;
  }
  return ctx.defaultImage;
}

const venueName = (event: SeoEvent) =>
  [event.address, event.city, event.state, event.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

function placeOf(event: SeoEvent) {
  const name = venueName(event);
  if (!name) return null;
  return {
    "@type": "Place",
    name,
    address: {
      "@type": "PostalAddress",
      ...(event.address?.trim() ? { streetAddress: event.address.trim() } : {}),
      ...(event.city?.trim() ? { addressLocality: event.city.trim() } : {}),
      ...(event.state?.trim() ? { addressRegion: event.state.trim() } : {}),
      ...(event.country?.trim()
        ? { addressCountry: event.country.trim() }
        : {}),
    },
  };
}

/**
 * The schema.org `Event` for an event, or `null` when Google could not use
 * it: with no readable start date or no place to hold it (an in-person event
 * with no address at all) the markup would be invalid, so there is none
 * rather than a broken one.
 */
export function eventJsonLd(
  event: SeoEvent,
  ctx: SeoContext,
): Record<string, unknown> | null {
  const start = validDate(event.startTime);
  if (!start || !event.name?.trim()) return null;
  const end = validDate(event.endTime);
  const url = eventPageUrl(ctx, event.uid);

  const mode =
    event.mode === "Online" || event.mode === "Hybrid" ? event.mode : "Offline";
  const physical = placeOf(event);
  const virtual = {
    "@type": "VirtualLocation",
    url: event.platformLink?.trim() || url,
  };
  const location =
    mode === "Online"
      ? virtual
      : mode === "Hybrid"
        ? [physical, virtual].filter(Boolean)
        : physical;
  if (!location || (Array.isArray(location) && location.length === 0))
    return null;

  const image = eventImage(event, ctx);
  const full =
    event.capacity !== undefined &&
    event.capacity > 0 &&
    (event.registrationCount ?? 0) >= event.capacity;

  return {
    "@context": SCHEMA,
    "@type": "Event",
    name: event.name.trim(),
    ...(event.description?.trim()
      ? { description: collapse(event.description) }
      : {}),
    startDate: start.toISOString(),
    ...(end && end > start ? { endDate: end.toISOString() } : {}),
    eventStatus: `${SCHEMA}/${event.status === "cancelled" ? "EventCancelled" : "EventScheduled"}`,
    eventAttendanceMode: `${SCHEMA}/${
      mode === "Online"
        ? "OnlineEventAttendanceMode"
        : mode === "Hybrid"
          ? "MixedEventAttendanceMode"
          : "OfflineEventAttendanceMode"
    }`,
    location,
    ...(image ? { image: [image] } : {}),
    ...(event.hostName?.trim()
      ? {
          organizer: {
            "@type": "Organization",
            name: event.hostName.trim(),
            ...(event.organizerHandle
              ? {
                  url: `${ctx.siteUrl}/organization/${encodeURIComponent(event.organizerHandle)}`,
                }
              : {}),
          },
        }
      : {}),
    // A price the page shows, or nothing. A free event says so instead of
    // inventing an offer with a made-up currency.
    ...(event.cost && event.cost.amount > 0 && event.cost.currency
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: String(event.cost.amount),
            priceCurrency: event.cost.currency.toUpperCase(),
            availability: `${SCHEMA}/${full ? "SoldOut" : "InStock"}`,
          },
        }
      : { isAccessibleForFree: true }),
    url,
  };
}

/** The title, description and tags for an event page. */
export function buildEventHead(event: SeoEvent, ctx: SeoContext): EventHead {
  const url = eventPageUrl(ctx, event.uid);
  const title = `${event.name.trim()} | ${SITE_NAME}`;
  const description = truncate(
    event.description?.trim() ||
      `${event.name.trim()}, an event on ${SITE_NAME}.`,
    MAX_DESCRIPTION,
  );
  const image = eventImage(event, ctx);
  const jsonLd = eventJsonLd(event, ctx);

  const meta = (key: "name" | "property", name: string, content: string) =>
    `<meta ${key}="${name}" content="${escapeHtml(content)}" />`;

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    meta("name", "description", description),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:url", url),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    ...(image
      ? [
          meta("property", "og:image", image),
          meta("property", "og:image:alt", `${event.name.trim()} cover image`),
        ]
      : []),
    meta("name", "twitter:card", image ? "summary_large_image" : "summary"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    ...(image ? [meta("name", "twitter:image", image)] : []),
    ...(jsonLd
      ? [`<script type="application/ld+json">${jsonForScript(jsonLd)}</script>`]
      : []),
  ].join("\n    ");

  return { title, description, tags };
}

// A meta tag by name or property, however its attributes are ordered or wrapped.
const GENERIC_TAGS =
  /<meta\b[^>]*?\b(?:name|property)\s*=\s*["'](?:description|title|og:[^"']*|twitter:[^"']*)["'][^>]*>\s*/gi;
const TITLE_TAG = /<title\b[^>]*>[\s\S]*?<\/title>\s*/gi;
const CANONICAL_TAG = /<link\b[^>]*?\brel\s*=\s*["']canonical["'][^>]*>\s*/gi;
const JSON_LD_TAG =
  /<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>\s*/gi;

/**
 * Puts an event's tags into the app's `index.html`, in place of the site-wide
 * ones, so a crawler that does not run JavaScript still reads this event. The
 * rest of the page is untouched and the app boots as it always does. If the
 * page has no `</head>` it is returned as it was.
 */
export function injectHead(html: string, head: EventHead): string {
  const closing = html.search(/<\/head\s*>/i);
  if (closing === -1) return html;
  const stripped = html
    .replace(TITLE_TAG, "")
    .replace(GENERIC_TAGS, "")
    .replace(CANONICAL_TAG, "")
    .replace(JSON_LD_TAG, "");
  const at = stripped.search(/<\/head\s*>/i);
  return `${stripped.slice(0, at)}  ${head.tags}\n  ${stripped.slice(at)}`;
}

/** The site-wide share image the page already names, to fall back on. */
export function defaultImageOf(html: string): string | undefined {
  const tag = /<meta\b[^>]*?\bproperty\s*=\s*["']og:image["'][^>]*>/i.exec(
    html,
  )?.[0];
  const content = tag && /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
  return content && /^https?:\/\//i.test(content) ? content : undefined;
}
