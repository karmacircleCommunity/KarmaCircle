import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseKind,
  createEvent,
  publishOrganizationProfile,
  signUpIndividual,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
} from "./event-helpers";

/**
 * Drafts, publish and unpublish (PG-15): saving an event as a draft only its
 * organization can see, publishing it from the list or the edit form, taking a
 * published event back offline while nobody has registered, and deleting a
 * draft. See docs/specs/events.md.
 *
 * "A visitor" is a separate browser context with no cookies, so what it sees
 * is what the public sees.
 */

function slugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  await page.setViewportSize({ width: 1280, height: 900 });
}

/** Status of an event page address as a visitor (no cookies) sees it. */
async function visitorStatus(browser: Browser, uid: string) {
  const context = await browser.newContext();
  try {
    const response = await context.request.get(
      `${E2E_API_URL}/events?uid=${encodeURIComponent(uid)}`,
    );
    return response.status();
  } finally {
    await context.close();
  }
}

async function fillBasics(page: Page, name: string) {
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
  await page.getByLabel("City").fill("Guwahati");
  await page.getByLabel("State or region").fill("Assam");
}

test("an organization saves a draft that only it can see, and publishes it from the list", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");
  await fillBasics(page, name);

  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events$/);

  // It is in the owner's list, marked as a draft, with Publish and Delete.
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();
  await expect(
    row.getByRole("button", { name: `Publish ${name}` }),
  ).toBeVisible();
  await expect(
    row.getByRole("button", { name: `Delete draft ${name}` }),
  ).toBeVisible();
  await expect(
    row.getByRole("link", { name: `Attendees for ${name}` }),
  ).toHaveCount(0);

  // The owner can open it, with a banner saying nobody else can.
  await page.goto(`/events/${uid}`);
  await expect(
    page.getByText("This is a draft. Only you can see this page."),
  ).toBeVisible();
  await expect(page.getByText("Only you can see this event")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Join this event/ }),
  ).toHaveCount(0);

  // The public cannot: not by address, not in the directory.
  expect(await visitorStatus(browser, uid)).toBe(404);
  const visitorContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const visitor = await visitorContext.newPage();
  try {
    await visitor.goto("/events");
    await visitor
      .getByRole("searchbox", { name: "Search events" })
      .fill(String(stamp));
    await expect(visitor.getByText(/No events|0 events/).first()).toBeVisible();
    await expect(visitor.getByText(name)).toHaveCount(0);
    await visitor.goto(`/events/${uid}`);
    await expect(visitor.getByText(/No event at/)).toBeVisible();
  } finally {
    await visitorContext.close();
  }

  // Publishing makes it public.
  await page.goto("/organization/events");
  await page.getByRole("button", { name: `Publish ${name}` }).click();
  await expect(page.getByText("Event published")).toBeVisible();
  await expect(row.getByText("Draft", { exact: true })).toHaveCount(0);
  expect(await visitorStatus(browser, uid)).toBe(200);
});

test("a draft can be edited, saved again as a draft, and published from the edit form", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-draft-edit-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, status: "draft" });

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit your draft" }),
  ).toBeVisible();

  await page.locator("#name").fill(`${name}, renamed`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events$/);
  expect(await visitorStatus(browser, uid)).toBe(404);

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(page.locator("#name")).toHaveValue(`${name}, renamed`);
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("Event published")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  expect(await visitorStatus(browser, uid)).toBe(200);
});

test("a published event with no registrations can be taken offline and published again", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-unpublish-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  await page.goto("/organization/events");
  await page.getByRole("button", { name: `Unpublish ${name}` }).click();
  const dialog = page.getByRole("dialog", { name: "Take this event offline?" });
  await dialog.getByRole("button", { name: "Keep it public" }).click();
  expect(await visitorStatus(browser, uid)).toBe(200);

  await page.getByRole("button", { name: `Unpublish ${name}` }).click();
  await dialog.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Event is now a draft")).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();
  expect(await visitorStatus(browser, uid)).toBe(404);

  await page.getByRole("button", { name: `Publish ${name}` }).click();
  await expect(page.getByText("Event published")).toBeVisible();
  expect(await visitorStatus(browser, uid)).toBe(200);
});

test("an event that has registrations cannot be unpublished, and the message says to cancel", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-unpublish-regs-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  const attendeeContext = await browser.newContext();
  const attendee = await attendeeContext.newPage();
  try {
    await signUpIndividual(attendee, stamp);
    const joined = await attendee.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(joined.status()).toBe(201);
  } finally {
    await attendeeContext.close();
  }

  await page.goto("/organization/events");
  await page.getByRole("button", { name: `Unpublish ${name}` }).click();
  await page
    .getByRole("dialog", { name: "Take this event offline?" })
    .getByRole("button", { name: "Unpublish" })
    .click();
  await expect(
    page.getByText(
      "1 person has already registered, so this event cannot go back to a draft. Cancel it instead.",
    ),
  ).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Draft", { exact: true })).toHaveCount(0);
  expect(await visitorStatus(browser, uid)).toBe(200);
});

test("a draft can be deleted, a published event offers no delete, and the address is free again", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const draftUid = `evt-e2e-delete-draft-${stamp}`;
  const liveUid = `evt-e2e-delete-live-${stamp}`;
  const draftName = `Draft Cleanup ${stamp}`;
  const liveName = `Live Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid: draftUid, name: draftName, status: "draft" });
  await createEvent(page, { uid: liveUid, name: liveName });

  await page.goto("/organization/events");
  const draftRow = page.getByRole("listitem").filter({ hasText: draftName });
  await expect(
    page.getByRole("button", { name: `Delete draft ${liveName}` }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: `Delete draft ${draftName}` }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this draft?" });
  await expect(dialog.getByText("This can’t be undone.")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep draft" }).click();
  await expect(draftRow).toHaveCount(1);

  await page.getByRole("button", { name: `Delete draft ${draftName}` }).click();
  await dialog.getByRole("button", { name: "Delete draft" }).click();
  await expect(page.getByText("Draft deleted")).toBeVisible();
  await expect(draftRow).toHaveCount(0);

  // The API agrees, and refuses to delete the published one.
  const gone = await page.request.get(`${E2E_API_URL}/events?uid=${draftUid}`);
  expect(gone.status()).toBe(404);
  const refused = await page.request.delete(`${E2E_API_URL}/events/${liveUid}`);
  expect(refused.status()).toBe(409);
  await createEvent(page, { uid: draftUid, name: `${draftName} again` });
});
