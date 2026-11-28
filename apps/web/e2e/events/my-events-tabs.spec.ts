import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  createEvent,
  openMyEventsFromMenu,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * My Events for an organization that both runs events and goes to them: the
 * Attending and Hosting tabs must never show each other's events.
 */

const DESKTOP = { width: 1280, height: 900 };

/** A second organization, in its own browser session, with one public event. */
async function otherOrganizationEvent(
  browser: Browser,
  stamp: number,
  uid: string,
  name: string,
) {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  try {
    await signUpOrganization(page, stamp);
    await createEvent(page, { uid, name });
  } finally {
    await context.close();
  }
}

test("an organization sees the events it hosts and the events it attends on separate tabs", async ({
  page,
  browser,
}) => {
  await page.setViewportSize(DESKTOP);
  const stamp = uniqueStamp();
  const theirUid = `evt-e2e-tabs-theirs-${stamp}`;
  const theirName = `Neighbour Cleanup ${stamp}`;
  const ownName = `Own Cleanup ${stamp}`;
  const draftName = `Own Draft ${stamp}`;
  await otherOrganizationEvent(browser, uniqueStamp(), theirUid, theirName);
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid: `evt-e2e-tabs-own-${stamp}`, name: ownName });
  await createEvent(page, {
    uid: `evt-e2e-tabs-draft-${stamp}`,
    name: draftName,
    status: "draft",
  });
  const joined = await page.request.post(
    `${E2E_API_URL}/events/${theirUid}/join`,
  );
  expect(joined.status()).toBe(201);

  // The menu leads to Hosting, which holds only its own events.
  await page.goto("/events");
  await openMyEventsFromMenu(page);
  const hosting = page.getByRole("tab", { name: "Hosting" });
  await expect(hosting).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: `Cancel event ${ownName}` }),
  ).toBeVisible();
  await expect(page.getByText(theirName)).toHaveCount(0);
  await expect(page.getByText(draftName)).toHaveCount(0);

  await page.getByRole("tab", { name: /^Drafts/ }).click();
  await expect(
    page.getByRole("button", { name: `Publish ${draftName}` }),
  ).toBeVisible();

  // Attending holds only the event it joined, with nothing to manage.
  await page.getByRole("tab", { name: "Attending" }).click();
  await expect(page).toHaveURL(/\/events\/mine\?tab=attending$/);
  await expect(
    page.getByRole("link", { name: new RegExp(theirName) }),
  ).toContainText("You're going");
  await expect(page.getByText(ownName)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create event" })).toHaveCount(0);

  // The address keeps the tab, and the keyboard moves between the two.
  await page.reload();
  const attending = page.getByRole("tab", { name: "Attending" });
  await expect(attending).toHaveAttribute("aria-selected", "true");
  await attending.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hosting).toBeFocused();
  await expect(hosting).toHaveAttribute("aria-selected", "true");
});

test("My Events keeps the two tabs inside a small phone's width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const stamp = uniqueStamp();
  await signUpOrganization(page, stamp);
  await createEvent(page, {
    uid: `evt-e2e-tabs-phone-${stamp}`,
    name: `Phone Draft ${stamp}`,
    status: "draft",
  });

  await page.goto("/events/mine");
  await expect(page.getByRole("tab", { name: /^Drafts/ })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
