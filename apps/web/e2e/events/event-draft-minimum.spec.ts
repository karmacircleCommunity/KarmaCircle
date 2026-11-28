import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseKind,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
} from "./event-helpers";

/**
 * How much a draft needs compared with publishing: a draft is saved with only a
 * name, a format and dates, reloads as saved, and cannot be published (from the
 * edit form or from My events) until the rest is filled in. Whatever a draft
 * does contain must still be valid. See docs/specs/events.md.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A calendar date comfortably in the future, as a date input holds it. */
const futureDay = () =>
  new Date(Date.now() + 5 * DAY_MS).toISOString().slice(0, 10);

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function openNewForm(page: Page, name: string, day: string) {
  await page.goto("/organization/events/new");
  await page.getByLabel("Event name").fill(name);
  await page.locator("#startDate").fill(day);
  await page.locator("#startTime").fill("10:00");
  await page.locator("#endDate").fill(day);
  await page.locator("#endTime").fill("12:00");
}

/** The edit form's section tab, whether or not it is marked as having errors
 *  (the mark is part of the tab's accessible name). */
const sectionTab = (page: Page, section: string) =>
  page.getByRole("tab", { name: new RegExp(section) });

/** The event as its owner (the signed-in page) reads it. */
async function storedEvent(page: Page, uid: string) {
  const response = await page.request.get(`${E2E_API_URL}/events?uid=${uid}`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as Record<string, unknown>;
}

async function visitorStatus(browser: Browser, uid: string) {
  const context = await browser.newContext();
  try {
    const response = await context.request.get(
      `${E2E_API_URL}/events?uid=${uid}`,
    );
    return response.status();
  } finally {
    await context.close();
  }
}

/** Saves a draft straight through the API with only what a draft needs. */
async function seedDraft(
  page: Page,
  uid: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  const start = new Date(Date.now() + 5 * DAY_MS);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const response = await page.request.post(`${E2E_API_URL}/events/create`, {
    data: {
      uid,
      name,
      mode: "Offline",
      status: "draft",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      ...extra,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

test("a draft needs only a name and dates, reloads as saved, and publishes once complete", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const name = `Lakeside Planting ${stamp}`;
  const uid = slugFromName(name);
  const day = futureDay();
  await signedInHost(page, stamp);
  await openNewForm(page, name, day);

  await expect(page.getByText("A draft needs")).toBeVisible();
  await expect(page.getByText("Publishing also needs")).toBeVisible();
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await expect(page).toHaveURL(/\/events\/mine\?tab=hosting&show=drafts$/);

  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();
  const saved = await storedEvent(page, uid);
  expect(saved.status).toBe("draft");
  for (const field of [
    "description",
    "coverImage",
    "eventType",
    "address",
    "city",
    "state",
  ]) {
    expect(saved[field], field).toBeFalsy();
  }

  // A fresh load of the edit form shows what was saved, and nothing invented.
  const editPath = `/organization/events/${uid}/edit`;
  await page.goto(editPath);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit your draft" }),
  ).toBeVisible();
  await expect(page.locator("#name")).toHaveValue(name);
  await expect(page.locator("#description")).toHaveValue("");
  await sectionTab(page, "Date & place").click();
  await expect(page.locator("#startDate")).toHaveValue(day);
  await expect(page.locator("#startTime")).toHaveValue("10:00");
  await expect(page.locator("#endTime")).toHaveValue("12:00");
  await expect(page.locator("#city")).toHaveValue("");

  // One venue field on its own is fine for a draft.
  await page.locator("#city").fill("Guwahati");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page).toHaveURL(/\/events\/mine\?tab=hosting&show=drafts$/);
  await page.goto(editPath);
  await sectionTab(page, "Date & place").click();
  await expect(page.locator("#city")).toHaveValue("Guwahati");

  // Publishing is refused by the form: nothing is sent.
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      !["GET", "OPTIONS"].includes(request.method()) &&
      request.url().startsWith(`${E2E_API_URL}/events/${uid}`)
    ) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(sectionTab(page, "Basics.*has errors")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Description is required")).toBeVisible();
  await expect(page.getByText("Cover image is required")).toBeVisible();
  await expect(
    page.getByText("Choose what kind of event this is"),
  ).toBeVisible();
  await sectionTab(page, "Date & place.*has errors").click();
  await expect(page.getByText("Address is required")).toBeVisible();
  await expect(page.getByText("State is required")).toBeVisible();
  await expect(page.getByText("City is required")).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(await visitorStatus(browser, uid)).toBe(404);

  // Filled in, it publishes.
  await page.locator("#address").fill("12 River Road");
  await page.locator("#state").fill("Assam");
  await sectionTab(page, "Basics").click();
  await page
    .locator("#description")
    .fill("A morning of planting along the lake, open to everyone.");
  await chooseKind(page);
  await page.locator("#coverImage").setInputFiles({
    name: "event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await expect(page.getByText("Uploading…")).toHaveCount(0);
  await expect(page.getByAltText("Event cover preview")).toBeVisible();
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("Event published")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  expect(await visitorStatus(browser, uid)).toBe(200);
});

test("a draft may have a short description, but what is filled in must be valid", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Evening Helpline Call ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await openNewForm(page, name, futureDay());
  await page.getByRole("button", { name: /^Online/ }).click();
  await expect(
    page.getByText(/a video platform and meeting link/),
  ).toBeVisible();

  await page.getByLabel("Meeting link").fill("meet.example.com/room");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(
    page.getByText("Enter a complete link starting with http:// or https://"),
  ).toBeVisible();
  const missing = await page.request.get(`${E2E_API_URL}/events?uid=${uid}`);
  expect(missing.status()).toBe(404);

  await page.getByLabel("Meeting link").fill("");
  await page.getByLabel("About this event").fill("Soon");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await expect(page).toHaveURL(/\/events\/mine\?tab=hosting&show=drafts$/);
  const saved = await storedEvent(page, uid);
  expect(saved.description).toBe("Soon");
  expect(saved.platformLink).toBeFalsy();

  // Emptying it again clears it.
  await page.goto(`/organization/events/${uid}/edit`);
  await page.locator("#description").fill("");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page).toHaveURL(/\/events\/mine\?tab=hosting&show=drafts$/);
  expect((await storedEvent(page, uid)).description).toBeFalsy();
});

test("Publish on My events says what is missing and offers the edit form", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const bareUid = `evt-e2e-bare-draft-${stamp}`;
  const noKindUid = `evt-e2e-no-kind-${stamp}`;
  const bareName = `Bare Draft Cleanup ${stamp}`;
  const noKindName = `Unsorted Draft Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await seedDraft(page, bareUid, bareName, { eventType: "volunteering" });
  await seedDraft(page, noKindUid, noKindName, {
    description: "A complete draft in every way except its kind.",
    coverImage: "https://example.com/e2e-cover.png",
    city: "Guwahati",
    state: "Assam",
    country: "India",
    address: "Fancy Bazaar",
  });

  await page.goto("/events/mine?tab=hosting&show=drafts");
  const bareRow = page.getByRole("listitem").filter({ hasText: bareName });
  await expect(bareRow.getByText("Location TBA")).toBeVisible();
  await page.getByRole("button", { name: `Publish ${bareName}` }).click();
  await expect(bareRow.getByRole("alert")).toContainText(
    "Add a description before publishing",
  );
  expect(await visitorStatus(browser, bareUid)).toBe(404);

  const noKindRow = page.getByRole("listitem").filter({ hasText: noKindName });
  await page.getByRole("button", { name: `Publish ${noKindName}` }).click();
  await expect(noKindRow.getByRole("alert")).toContainText(
    "Choose what kind of event this is",
  );
  expect(await visitorStatus(browser, noKindUid)).toBe(404);

  // The visible label and the screen-reader-only name are separate elements,
  // so the browser may put a space before the colon.
  await noKindRow.getByRole("link", { name: /Finish this event/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/organization/events/${noKindUid}/edit$`),
  );
  await chooseKind(page);
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("Event published")).toBeVisible();
  expect(await visitorStatus(browser, noKindUid)).toBe(200);
});
