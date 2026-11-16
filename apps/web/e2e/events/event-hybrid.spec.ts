import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseKind,
  createEvent,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
} from "./event-helpers";

/**
 * Hybrid events (PG-10): an event with a venue and a live stream. Covers
 * publishing one through the form (both sets of fields are needed), what the
 * event page shows, editing the mode, and the directory's Hybrid filter.
 * See docs/specs/events.md.
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

async function readEvent(page: Page, uid: string) {
  const response = await page.request.get(
    `${E2E_API_URL}/events?uid=${encodeURIComponent(uid)}`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test("an organization publishes a hybrid event with a venue and a stream", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Open Day ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");

  await page.getByLabel("Event name").fill(name);
  await page
    .getByLabel("About this event")
    .fill("Come to the river in person, or join the walkthrough from home.");
  await chooseKind(page);
  await page.locator("#coverImage").setInputFiles({
    name: "event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });

  // Choosing Hybrid shows the venue fields and the stream fields together.
  await page.getByRole("button", { name: /^Hybrid/ }).click();
  await expect(page.getByRole("button", { name: /^Hybrid/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Street address")).toBeVisible();
  await expect(page.getByLabel("Video platform")).toBeVisible();
  await expect(page.getByLabel("Meeting link")).toBeVisible();
  await expect(page.getByLabel("Getting there")).toBeVisible();
  await expect(page.getByLabel("When the join link arrives")).toBeVisible();

  // A venue alone is not enough: the stream needs a link too.
  await page.getByLabel("Street address").fill("12 River Road");
  await page.getByLabel("City").fill("Guwahati");
  await page.getByLabel("State or region").fill("Assam");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("Please provide a meeting link")).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events\/new$/);
  expect(
    (await page.request.get(`${E2E_API_URL}/events?uid=${uid}`)).status(),
  ).toBe(404);

  await page
    .getByLabel("Meeting link")
    .fill("https://meet.example.com/open-day");
  await page.getByLabel("Getting there").fill("Use the river-side gate");
  await page
    .getByLabel("When the join link arrives")
    .fill("Emailed that morning");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });

  // The page answers both questions.
  await expect(
    page.getByText("Hybrid · Guwahati, India").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Where it is and how to join" }),
  ).toBeVisible();
  const where = page.locator("#location");
  await expect(where).toContainText("12 River Road");
  await expect(where).toContainText("Use the river-side gate");
  await expect(where).toContainText("Open in maps");
  await expect(where).toContainText("On Zoom Meeting");
  await expect(where).toContainText("Emailed that morning");
  await expect(
    where.getByRole("link", { name: "Open the join link" }),
  ).toHaveAttribute("href", "https://meet.example.com/open-day");

  const stored = await readEvent(page, uid);
  expect(stored.mode).toBe("Hybrid");
  expect(stored.address).toBe("12 River Road");
  expect(stored.platformLink).toBe("https://meet.example.com/open-day");
  expect(stored.gettingThere).toBe("Use the river-side gate");
  expect(stored.linkDelivery).toBe("Emailed that morning");
});

test("the edit form moves an event between in person, online and hybrid", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-hybrid-edit-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Riverbank Cleanup ${stamp}`,
    mode: "Offline",
  });

  // In person to hybrid: the form already holds the venue, it asks for a link.
  await page.goto(`/organization/events/${uid}/edit`);
  await page.getByRole("button", { name: /^Hybrid/ }).click();
  await page.getByLabel("Meeting link").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Please provide a meeting link")).toBeVisible();

  await page.getByLabel("Meeting link").fill("https://meet.example.com/hybrid");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  expect((await readEvent(page, uid)).mode).toBe("Hybrid");
  await expect(
    page.getByText("Hybrid · Guwahati, India").first(),
  ).toBeVisible();

  // Hybrid to online: the venue is dropped.
  await page.goto(`/organization/events/${uid}/edit`);
  await expect(page.getByRole("button", { name: /^Hybrid/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /^Online/ }).click();
  await expect(page.getByLabel("Street address")).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  const online = await readEvent(page, uid);
  expect(online.mode).toBe("Online");
  expect(online.address).toBeUndefined();
  expect(online.platformLink).toBe("https://meet.example.com/hybrid");
});

test("the directory filters hybrid events apart from online and in-person ones", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid: `evt-e2e-h-hybrid-${stamp}`,
    name: `Hybrid Gathering ${stamp}`,
    mode: "Hybrid",
  });
  await createEvent(page, {
    uid: `evt-e2e-h-online-${stamp}`,
    name: `Online Gathering ${stamp}`,
    mode: "Online",
  });
  await createEvent(page, {
    uid: `evt-e2e-h-offline-${stamp}`,
    name: `Offline Gathering ${stamp}`,
    mode: "Offline",
  });

  await page.goto("/events");
  await page
    .getByRole("searchbox", { name: "Search events" })
    .fill(String(stamp));
  await expect(page.getByText(`Hybrid Gathering ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Online Gathering ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Offline Gathering ${stamp}`)).toBeVisible();

  await page.getByRole("button", { name: "Filter by type" }).click();
  await page.getByRole("option", { name: "Hybrid" }).click();
  await expect(page.getByText(`Hybrid Gathering ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Online Gathering ${stamp}`)).toHaveCount(0);
  await expect(page.getByText(`Offline Gathering ${stamp}`)).toHaveCount(0);

  // The card says where, with Hybrid in front of the place.
  await expect(page.getByText("Hybrid · Guwahati, India")).toBeVisible();
});
