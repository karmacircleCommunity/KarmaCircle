import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseFilter,
  chooseKind,
  createEvent,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
  dropdown,
} from "./event-helpers";

/**
 * The kind of event and its tags (PG-9): the form requires a kind, shows it
 * and the tags on the event page and the card, and the directory can filter by
 * kind and find an event by a tag. See docs/specs/events.md.
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

test("the form needs a kind, then the event page and the API carry the kind and tags", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const name = `Riverbank Cleanup ${stamp}`;
  const uid = slugFromName(name);
  await signedInHost(page, stamp);
  await page.goto("/organization/events/new");

  await page.getByLabel("Event name").fill(name);
  await page
    .getByLabel("About this event")
    .fill("A morning of practical help for the neighbourhood, open to all.");
  await page.locator("#coverImage").setInputFiles({
    name: "event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await page.getByLabel("Street address").fill("12 River Road");
  await page.getByLabel("City").fill("Guwahati");
  await page.getByLabel("State or region").fill("Assam");

  // No kind chosen: nothing is published.
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText("Choose what kind of event this is"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/organization\/events\/new$/);
  expect(
    (await page.request.get(`${E2E_API_URL}/events?uid=${uid}`)).status(),
  ).toBe(404);

  // Too many tags are refused before anything is sent.
  await chooseKind(page, "fundraiser");
  await page.getByLabel("Tags (optional)").fill("a, b, c, d, e, f, g, h, i");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page.getByText("Use at most 8 tags")).toBeVisible();

  await page.getByLabel("Tags (optional)").fill(" Beach , Clean-up, beach ");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`), {
    timeout: 15_000,
  });

  await expect(
    page.getByText("Fundraiser", { exact: true }).first(),
  ).toBeVisible();
  const tags = page.getByRole("list", { name: "Tags" });
  await expect(tags.getByRole("listitem")).toHaveText(["#beach", "#clean-up"]);

  const stored = await readEvent(page, uid);
  expect(stored.eventType).toBe("fundraiser");
  expect(stored.tags).toEqual(["beach", "clean-up"]);
});

test("the edit form shows the stored kind and tags and can change them", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-kind-edit-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Riverbank Cleanup ${stamp}`,
    eventType: "workshop",
  });

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(dropdown(page, "Kind of event")).toHaveAttribute(
    "data-value",
    "workshop",
  );
  await chooseKind(page, "meetup");
  await page.getByLabel("Tags (optional)").fill("networking");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));

  const stored = await readEvent(page, uid);
  expect(stored.eventType).toBe("meetup");
  expect(stored.tags).toEqual(["networking"]);

  // Clearing the tags removes them; the kind stays.
  await page.goto(`/organization/events/${uid}/edit`);
  await page.getByLabel("Tags (optional)").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  const cleared = await readEvent(page, uid);
  expect(cleared.tags).toEqual([]);
  expect(cleared.eventType).toBe("meetup");
});

test("the directory filters by kind, finds a tag in the search, and the card names the kind", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid: `evt-e2e-k-fund-${stamp}`,
    name: `Gala Evening ${stamp}`,
    eventType: "fundraiser",
  });
  await createEvent(page, {
    uid: `evt-e2e-k-work-${stamp}`,
    name: `First Aid Class ${stamp}`,
    eventType: "workshop",
  });

  await page.goto("/events");
  await page
    .getByRole("searchbox", { name: "Search events" })
    .fill(String(stamp));
  await expect(page.getByText(`Gala Evening ${stamp}`)).toBeVisible();
  await expect(page.getByText(`First Aid Class ${stamp}`)).toBeVisible();

  await chooseFilter(page, "Fundraiser");
  await expect(page.getByText(`Gala Evening ${stamp}`)).toBeVisible();
  await expect(page.getByText(`First Aid Class ${stamp}`)).toHaveCount(0);
  await expect(
    page.getByText("Fundraiser", { exact: true }).first(),
  ).toBeVisible();

  // Both kinds are back when the filter is reset.
  await chooseFilter(page, "All kinds");
  await expect(page.getByText(`First Aid Class ${stamp}`)).toBeVisible();
});
