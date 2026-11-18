import {
  buildEventHead,
  defaultImageOf,
  injectHead,
  type SeoEvent,
} from "./eventHead";

/** The shape of an event page address: what the create form allows for a uid. */
export const EVENT_UID_PATTERN = /^[a-z0-9][a-z0-9-]{0,98}$/;

export interface RenderDeps {
  /** The app's `index.html`. */
  loadShell: () => Promise<string>;
  /** The public event, or `null` when there is none (unknown, or a draft). */
  loadEvent: (uid: string) => Promise<SeoEvent | null>;
  siteUrl: string;
  defaultImage?: string;
}

export interface RenderResult {
  html: string;
  /** True when the event's own tags went in, false for the plain page. */
  injected: boolean;
}

/**
 * The page for `/events/:uid`: the app's `index.html` with this event's share
 * and search tags in its head. Whatever goes wrong (an address that is not an
 * event address, an event that does not exist, an API that is down or slow,
 * a page the markup cannot be put into) the person still gets the plain app
 * page, which loads and shows the event as it always has. Only the app page
 * itself failing to load is an error.
 */
export async function renderEventPage(
  uid: string,
  deps: RenderDeps,
): Promise<RenderResult> {
  const shell = await deps.loadShell();
  if (!EVENT_UID_PATTERN.test(uid)) return { html: shell, injected: false };

  let event: SeoEvent | null = null;
  try {
    event = await deps.loadEvent(uid);
  } catch {
    return { html: shell, injected: false };
  }
  if (!event || typeof event.name !== "string" || !event.name.trim()) {
    return { html: shell, injected: false };
  }

  const head = buildEventHead(event, {
    siteUrl: deps.siteUrl,
    defaultImage: deps.defaultImage ?? defaultImageOf(shell),
  });
  const html = injectHead(shell, head);
  return { html, injected: html !== shell };
}
