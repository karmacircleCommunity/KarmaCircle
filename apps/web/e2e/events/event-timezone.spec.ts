import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseKind,
  createEvent,
  openEditSection,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
  chooseOption,
  dropdown,
} from "./event-helpers";

/**
 * Event timezones (PG-11): the form reads its date and time pickers in the
 * event's timezone (not the browser's), the pages show the event's own clock
 * with its zone and the viewer's clock beside it, and an older event with no
 * timezone behaves as it always did. See docs/specs/events.md.
 *
 * Each test runs its browsers in explicit timezones (Playwright's `timezoneId`),
 * so the results do not depend on where the suite is run.
 */

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A date this many days ahead as YYYY-MM-DD (UTC calendar day; far enough ahead to be future everywhere). */
function dateAhead(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function hostInZone(browser: Browser, timezoneId: string, stamp: number) {
  const context = await browser.newContext({
    timezoneId,
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  return { context, page };
}

async function readEvent(page: Page, uid: string) {
  const response = await page.request.get(
    `${E2E_API_URL}/events?uid=${encodeURIComponent(uid)}`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test("the form reads its times in the chosen timezone, and the page shows that clock with the viewer's beside it", async ({
  browser,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  // The organizer's browser is in London; the event is in Tokyo (UTC+9, no DST).
  const { context, page } = await hostInZone(browser, "Europe/London", stamp);
  const day = dateAhead(10);
  try {
    await page.goto("/organization/events/new");
    await expect(dropdown(page, "Timezone")).toHaveAttribute(
      "data-value",
      "Europe/London",
    );

    await page.getByLabel("Event name").fill(name);
    await page
      .getByLabel("About this event")
      .fill("A morning of practical help for the neighbourhood, open to all.");
    await chooseKind(page);
    await page.locator("#coverImage").setInputFiles({
      name: "event.png",
      mimeType: "image/png",
      buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
    });
    await page.getByLabel("Street address").fill("12 River Road");
    await page.getByLabel("City").fill("Tokyo");
    await page.getByLabel("State or region").fill("Kanto");

    await chooseOption(page, "Timezone", /^Asia\/Tokyo/);
    await page.locator("#startDate").fill(day);
    await page.locator("#startTime").fill("10:00");
    await page.locator("#endDate").fill(day);
    await page.locator("#endTime").fill("12:00");
    // The preview names the zone.
    await expect(page.getByText(/10:00 AM GMT\+9/)).toBeVisible();

    await page.getByRole("button", { name: "Publish event" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
      timeout: 15_000,
    });

    // 10:00 in Tokyo is 01:00 UTC, whatever clock the organizer's browser runs on.
    const stored = await readEvent(page, uid);
    expect(stored.timezone).toBe("Asia/Tokyo");
    expect(stored.startTime).toBe(`${day}T01:00:00.000Z`);
    expect(stored.endTime).toBe(`${day}T03:00:00.000Z`);

    // The event's own clock, with the zone named, and the London reader's clock beside it.
    const facts = page.locator("header ul").last();
    await expect(facts).toContainText("10:00 AM GMT+9");
    await expect(facts).toContainText("your time)");
  } finally {
    await context.close();
  }

  // A reader in Los Angeles sees the same event hour, and their own clock beside it.
  const viewer = await browser.newContext({
    timezoneId: "America/Los_Angeles",
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
  });
  try {
    const viewerPage = await viewer.newPage();
    await viewerPage.goto(`/events/${uid}`);
    const facts = viewerPage.locator("header ul").last();
    await expect(facts).toContainText("10:00 AM GMT+9");
    await expect(facts).toContainText(
      /\((Mon|Tue|Wed|Thu|Fri|Sat|Sun) · 6:00 PM|\((Mon|Tue|Wed|Thu|Fri|Sat|Sun) · 5:00 PM/,
    );

    // The directory card reads in the event's zone too.
    await viewerPage.goto("/events");
    await viewerPage
      .getByRole("searchbox", { name: "Search events" })
      .fill(String(stamp));
    await expect(viewerPage.getByText(/10:00 AM GMT\+9/)).toBeVisible();
  } finally {
    await viewer.close();
  }
});

test("an event in the reader's own timezone shows no 'your time' note", async ({
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-tz-same-${stamp}`;
  const { context, page } = await hostInZone(browser, "Asia/Kolkata", stamp);
  try {
    await createEvent(page, {
      uid,
      name: `Riverbank Cleanup ${stamp}`,
      timezone: "Asia/Kolkata",
    });
    await page.goto(`/events/${uid}`);
    const facts = page.locator("header ul").last();
    await expect(facts).toContainText("GMT+5:30");
    await expect(facts).not.toContainText("your time");
  } finally {
    await context.close();
  }
});

test("editing opens in the event's clock whoever is editing, and changing the timezone moves the real moment", async ({
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-tz-edit-${stamp}`;
  // The organizer's browser is in New York; the event was set in Kolkata (UTC+5:30).
  const { context, page } = await hostInZone(
    browser,
    "America/New_York",
    stamp,
  );
  try {
    await createEvent(page, {
      uid,
      name: `Riverbank Cleanup ${stamp}`,
      timezone: "Asia/Kolkata",
      startsInDays: 8,
    });
    const before = await readEvent(page, uid);
    const startUtc = new Date(before.startTime);
    // What the clocks in Kolkata read at that moment.
    const kolkata = new Date(startUtc.getTime() + 5.5 * 3_600_000);
    const hh = String(kolkata.getUTCHours()).padStart(2, "0");
    const mm = String(kolkata.getUTCMinutes()).padStart(2, "0");

    await page.goto(`/organization/events/${uid}/edit`);
    await openEditSection(page, "Date & place");
    await expect(dropdown(page, "Timezone")).toHaveAttribute(
      "data-value",
      "Asia/Kolkata",
    );
    await expect(page.locator("#startTime")).toHaveValue(`${hh}:${mm}`);

    // Same digits, other clock: the real start moves by the difference (Kolkata is 3.5h behind Tokyo).
    await chooseOption(page, "Timezone", /^Asia\/Tokyo/);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));

    const after = await readEvent(page, uid);
    expect(after.timezone).toBe("Asia/Tokyo");
    // The form works in whole minutes, so the seconds the API stamped are dropped.
    const startToTheMinute = Math.floor(startUtc.getTime() / 60_000) * 60_000;
    expect(new Date(after.startTime).getTime()).toBe(
      startToTheMinute - 3.5 * 3_600_000,
    );
  } finally {
    await context.close();
  }
});

test("an older event with no timezone shows no zone, and saving an edit pins the browser's", async ({
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-tz-legacy-${stamp}`;
  const { context, page } = await hostInZone(
    browser,
    "America/New_York",
    stamp,
  );
  try {
    await createEvent(page, { uid, name: `Riverbank Cleanup ${stamp}` });
    expect((await readEvent(page, uid)).timezone).toBeUndefined();

    await page.goto(`/events/${uid}`);
    const facts = page.locator("header ul").last();
    await expect(facts).not.toContainText("GMT");
    await expect(facts).not.toContainText("your time");

    // Opening the form and leaving changes nothing.
    await page.goto(`/organization/events/${uid}/edit`);
    await openEditSection(page, "Date & place");
    await expect(dropdown(page, "Timezone")).toHaveAttribute(
      "data-value",
      "America/New_York",
    );
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toHaveCount(0);
    expect((await readEvent(page, uid)).timezone).toBeUndefined();

    // Saving a real change pins the zone shown, without moving the event.
    const before = await readEvent(page, uid);
    await openEditSection(page, "Basics");
    await page.locator("#name").fill(`Riverbank Cleanup ${stamp}, renamed`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
    const after = await readEvent(page, uid);
    expect(after.timezone).toBe("America/New_York");
    expect(after.startTime).toBe(before.startTime);
  } finally {
    await context.close();
  }
});
