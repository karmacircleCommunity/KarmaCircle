import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseFilter,
  chooseKind,
  publishOrganizationProfile,
  signUpOrganization,
  TINY_PNG_BASE64,
  uniqueStamp,
  chooseOption,
  dropdown,
} from "./event-helpers";

/**
 * The online path of the organizer's full-page publishing form at
 * `/organization/events/new`: a video platform plus a meeting link, the link
 * checks, and what the published event shows afterwards. The in-person path
 * is covered by the last test in `events-responsive.spec.ts`.
 *
 * The form, its client checks (`useEvent.ts`) and the API schema
 * (`event.validation.ts`) all require a complete http or https meeting link
 * for an online event. The form opens with the start one hour from now, so
 * these tests leave the date and time fields alone.
 */

const MEETING_LINK_MISSING = "Please provide a meeting link";
const MEETING_LINK_INVALID =
  "Enter a complete link starting with http:// or https://";

/** Mirrors the form's own page address derivation from the event name. */
function slugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Fills the fields every event needs and switches the format to Online.
 *  Returns the page address the form derives from the name. */
async function fillOnlineEventBasics(page: Page, name: string) {
  await page.getByLabel("Event name").fill(name);
  const slug = slugFromName(name);
  await expect(page.getByLabel("Event page address")).toHaveValue(slug);
  await page
    .getByLabel("About this event")
    .fill(
      "A live conversation for neighbours, volunteers and donors, held entirely over video.",
    );
  await chooseKind(page);
  await page.locator("#coverImage").setInputFiles({
    name: "online-event.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await page.getByRole("button", { name: /^Online/ }).click();
  await expect(dropdown(page, "Video platform")).toBeVisible();
  return slug;
}

async function openPublishingForm(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/organization/events/new");
  await expect(
    page.getByRole("heading", { name: "Bring people together" }),
  ).toBeVisible();
}

async function expectNothingPublished(page: Page, slug: string) {
  await expect(page).toHaveURL(/\/organization\/events\/new$/);
  const response = await page.request.get(`${E2E_API_URL}/events?uid=${slug}`);
  expect(response.status()).toBe(404);
}

test("an organization publishes an online event with a platform and a meeting link", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await openPublishingForm(page, stamp);

  const name = `Volunteer Town Hall ${stamp}`;
  const slug = await fillOnlineEventBasics(page, name);

  // The platform list defaults to Zoom; pick another to prove the choice is
  // what gets saved.
  await expect(dropdown(page, "Video platform")).toHaveAttribute(
    "data-value",
    "Zoom Meeting",
  );
  await chooseOption(page, "Video platform", "Google Meet");

  // No link at all.
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText(MEETING_LINK_MISSING, { exact: true }),
  ).toBeVisible();
  await expectNothingPublished(page, slug);

  // A link with no scheme.
  await page.getByLabel("Meeting link").fill("meet.google.com/abc-defg-hij");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText(MEETING_LINK_INVALID, { exact: true }),
  ).toBeVisible();
  await expectNothingPublished(page, slug);

  // A complete link, but not http or https.
  await page.getByLabel("Meeting link").fill("ftp://meet.example.com/room");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText(MEETING_LINK_INVALID, { exact: true }),
  ).toBeVisible();
  await expectNothingPublished(page, slug);

  // A complete https link publishes.
  const meetingLink = "https://meet.google.com/abc-defg-hij";
  await page.getByLabel("Meeting link").fill(meetingLink);
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${slug}$`), {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // The detail page explains how to join instead of giving a venue.
  await expect(
    page.getByRole("heading", { level: 2, name: "How to join" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Where it is" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 3, name: "On Google Meet" }),
  ).toBeVisible();
  const joinLink = page.getByRole("link", { name: /Open the join link/ });
  await expect(joinLink).toHaveAttribute("href", meetingLink);
  await expect(joinLink).toHaveAttribute("target", "_blank");

  // The saved record carries the same platform and link.
  const saved = await page.request.get(`${E2E_API_URL}/events?uid=${slug}`);
  expect(saved.ok()).toBeTruthy();
  expect(await saved.json()).toMatchObject({
    uid: slug,
    mode: "Online",
    platform: "Google Meet",
    platformLink: meetingLink,
  });

  // And the organization finds it in its hosted-events list.
  await page.goto("/events/mine?tab=hosting");
  // Anchored: the row's "Edit <name>" link also contains the event name.
  await expect(
    page.getByRole("link", { name: new RegExp(`^${name}`) }),
  ).toBeVisible();
});

test("an online event published with the default platform is saved as a Zoom meeting", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await openPublishingForm(page, stamp);

  const name = `Donor Briefing Call ${stamp}`;
  const slug = await fillOnlineEventBasics(page, name);

  await expect(dropdown(page, "Video platform")).toHaveAttribute(
    "data-value",
    "Zoom Meeting",
  );
  const meetingLink = "https://zoom.example.com/j/987654321";
  await page.getByLabel("Meeting link").fill(meetingLink);
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${slug}$`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { level: 3, name: "On Zoom Meeting" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open the join link/ }),
  ).toHaveAttribute("href", meetingLink);

  // An online event is listed under the directory's Online type filter.
  await page.goto("/events");
  await page
    .getByRole("searchbox", { name: "Search events" })
    .fill(String(stamp));
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await chooseFilter(page, "Online");
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await chooseFilter(page, "Offline");
  await expect(page.getByRole("heading", { level: 2, name })).toHaveCount(0);
});
