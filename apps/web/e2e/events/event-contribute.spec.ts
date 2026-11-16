import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  createEvent,
  publishOrganizationProfile,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * The event page's "Contribute" button (PG-8): it opens the hosting
 * organization's own Support flow instead of a placeholder toast. The money goes
 * to the organization, not to the event alone. See docs/specs/events.md.
 *
 * Fundraiser fields cannot be set through the public API yet (PG-26), so the
 * test gives its event one through the E2E-only route
 * (`apps/api/tests/e2e/test-routes.ts`).
 */

async function eventWithFundraiser(page: Page, stamp: number) {
  const org = await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
  const uid = `evt-e2e-contribute-${stamp}`;
  await createEvent(page, { uid, name: `Riverbank Cleanup ${stamp}` });
  const response = await page.request.post(
    `${E2E_API_URL}/__test__/events/${uid}/fundraiser`,
  );
  expect(response.status(), await response.text()).toBe(204);
  return { uid, org };
}

test("Contribute opens the organization's Support dialog when it takes direct support", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const { uid, org } = await eventWithFundraiser(page, stamp);
  const patch = await page.request.patch(`${E2E_API_URL}/organizations/me`, {
    data: { sponsorship: { enabled: true } },
  });
  expect(patch.ok(), await patch.text()).toBeTruthy();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/events/${uid}`);
  await expect(page.getByText("Raising for this event")).toBeVisible();
  await expect(
    page.getByText(
      `Contributions go to ${org.name} through its Support page, not to this event alone.`,
    ),
  ).toBeVisible();

  await page.getByRole("link", { name: "Contribute" }).click();
  await expect(page).toHaveURL(/\/organization\/[^/?]+\?support=1$/);
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: `Support ${org.name}` }),
  ).toBeVisible();
});

test("Contribute still lands on the profile when the organization has not turned support on", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const { uid, org } = await eventWithFundraiser(page, stamp);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/events/${uid}`);
  await page.getByRole("link", { name: "Contribute" }).click();

  await expect(page).toHaveURL(/\/organization\/[^/?]+\?support=1$/);
  await expect(
    page.getByRole("heading", { level: 1, name: org.name }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the Support dialog does not open from a plain profile visit", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const { org } = await eventWithFundraiser(page, stamp);
  const patch = await page.request.patch(`${E2E_API_URL}/organizations/me`, {
    data: { sponsorship: { enabled: true } },
  });
  expect(patch.ok(), await patch.text()).toBeTruthy();

  const me = await page.request.get(`${E2E_API_URL}/organizations/me`);
  const { handle } = (await me.json()) as { handle: string };
  await page.goto(`/organization/${handle}`);
  await expect(
    page.getByRole("heading", { level: 1, name: org.name }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
