import type { Page, Route } from "@playwright/test";
import { E2E_API_URL } from "./env";

/**
 * Stands in for a paged API list, so a test can have more than one page
 * without creating dozens of records.
 */

/** Answers a credentialed cross-origin request the way the API would. */
function answer(route: Route, body: unknown) {
  return route.fulfill({
    json: body,
    headers: {
      "access-control-allow-origin":
        route.request().headers().origin ?? "http://localhost:3001",
      "access-control-allow-credentials": "true",
    },
  });
}

interface MockOptions<Item> {
  /** The API path of the list. */
  path: string;
  items: Item[];
  /** Fields the answer carries beside `data` and `pagination`. */
  extra?: Record<string, unknown>;
}

/**
 * Serves `items` in pages of whatever `limit` is asked for. `hold` keeps back
 * the answers a test picks until it calls the returned function; `fail` aborts
 * the ones it picks until `recover` is called.
 */
export async function mockPagedList<Item>(
  page: Page,
  { path, items, extra }: MockOptions<Item>,
) {
  let held: ((url: URL) => boolean) | undefined;
  let failing: ((url: URL) => boolean) | undefined;
  let release = () => {};
  let gate = Promise.resolve();

  await page.route(
    // The origin too: a web page can have the same path as the list it reads.
    (url) => url.origin === E2E_API_URL && url.pathname === path,
    async (route) => {
      const url = new URL(route.request().url());
      if (held?.(url)) await gate;
      if (failing?.(url)) return route.abort();
      const number = Number(url.searchParams.get("page") ?? 1);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      return answer(route, {
        ...extra,
        data: items.slice((number - 1) * limit, number * limit),
        pagination: {
          page: number,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit),
        },
      });
    },
  );

  return {
    hold(matches: (url: URL) => boolean) {
      held = matches;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => release();
    },
    fail(matches: (url: URL) => boolean) {
      failing = matches;
    },
    recover() {
      failing = undefined;
    },
  };
}

export const isPage = (number: number) => (url: URL) =>
  url.searchParams.get("page") === String(number);
