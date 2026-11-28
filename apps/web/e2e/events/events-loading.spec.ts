import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  chooseFilter,
  createEvent,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * How `/events` and the event page load: the directory fetches its next page by
 * itself as the end comes near, shows card placeholders meanwhile, and offers a
 * retry when a page fails. The event page shows its own placeholders.
 */

/** One more page than the first: 12 cards a page. */
const TOTAL = 14;

/** Publishes `TOTAL` events that only a search for `stamp` finds together. */
async function seedTwoPages(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  for (let index = 0; index < TOTAL; index += 1) {
    await createEvent(page, {
      uid: `evt-e2e-scroll-${stamp}-${index}`,
      name: `Scroll Drive ${stamp} number ${index}`,
      startsInDays: 3 + index,
    });
  }
}

const isSecondPage = (url: URL) =>
  url.pathname === "/events" && url.searchParams.get("page") === "2";

async function openSearch(page: Page, stamp: number) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/events");
  await page
    .getByRole("searchbox", { name: "Search events" })
    .fill(String(stamp));
  await expect(page.getByText(`${TOTAL} events`)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(12);
}

test("scrolling to the end of the directory loads the next page by itself", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await seedTwoPages(page, stamp);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(isSecondPage, async (route) => {
    await held;
    await route.continue();
  });

  await openSearch(page, stamp);
  await expect(page.getByRole("button", { name: /load more/i })).toHaveCount(0);

  // Placeholders for the two events on their way, and the cards stay put.
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByTestId("event-card-skeleton")).toHaveCount(2);
  await expect(page.getByText("Loading more events")).toBeAttached();
  await expect(page.getByRole("article").first()).toHaveCSS("opacity", "1");

  release();
  await expect(page.getByRole("article")).toHaveCount(TOTAL);
  await expect(page.getByTestId("event-card-skeleton")).toHaveCount(0);
  // The list ends without a closing message.
  await expect(page.getByText(/That's all/)).toHaveCount(0);
});

test("applying a filter keeps the cards on screen until the answer arrives", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await seedTwoPages(page, stamp);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) =>
      url.pathname === "/events" && url.searchParams.get("period") === "past",
    async (route) => {
      await held;
      await route.continue();
    },
  );

  await openSearch(page, stamp);
  await chooseFilter(page, "Past");

  // The old cards stay, with no placeholders and no count that is not theirs.
  await expect(page.getByText("Updating events")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(12);
  await expect(page.getByTestId("event-card-skeleton")).toHaveCount(0);

  release();
  await expect(
    page.getByRole("heading", { name: "Nothing matches that yet" }),
  ).toBeVisible();
});

test("a page that fails to load can be asked for again", async ({ page }) => {
  const stamp = uniqueStamp();
  await seedTwoPages(page, stamp);
  await page.route(isSecondPage, (route) => route.abort());

  await openSearch(page, stamp);
  await page.getByRole("article").last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toContainText(
    "Could not load more events.",
  );
  await expect(page.getByRole("article")).toHaveCount(12);

  await page.unroute(isSecondPage);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("article")).toHaveCount(TOTAL);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the event page shows placeholders until the event arrives", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-skeleton-${stamp}`;
  const name = `Placeholder Drive ${stamp}`;
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name });
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === "/events" && url.searchParams.get("uid") === uid,
    async (route) => {
      await held;
      await route.continue();
    },
  );

  await page.goto(`/events/${uid}`);
  const loading = page.getByRole("status").filter({ hasText: "Loading event" });
  await expect(loading).toBeAttached();

  release();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(loading).toHaveCount(0);
});
