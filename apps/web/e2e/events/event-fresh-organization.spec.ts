import { expect, test } from "@playwright/test";
import { createEvent, signUpOrganization, uniqueStamp } from "./event-helpers";

/**
 * A brand-new organization can host events without finishing its profile
 * (November 2026). Profile setup stays optional: the events pages only ask for
 * an organization account, so a draft profile never blocks publishing, editing
 * or reading the attendee list.
 *
 * Deliberately does not call `publishOrganizationProfile`, unlike every other
 * events spec.
 */
test("a new organization with a draft profile can open the form, publish and see its events", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-fresh-org-${stamp}`;
  const name = `Fresh Start Cleanup ${stamp}`;

  await signUpOrganization(page, stamp);

  // The create form opens straight away, with no "finish your profile" panel.
  await page.goto("/organization/events/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bring people together" }),
  ).toBeVisible();
  await expect(page.getByText("Draft — not visible yet")).toHaveCount(0);

  // The API accepts the event, and the Hosting tab lists it.
  await createEvent(page, { uid, name });
  await page.goto("/events/mine?tab=hosting");
  await expect(
    page.getByRole("heading", { level: 1, name: "My events" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: `Edit ${name}` })).toBeVisible();

  // The attendee page opens too.
  await page.goto(`/organization/events/${uid}/attendees`);
  await expect(page.getByText("Draft — not visible yet")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "My events" }).first(),
  ).toBeVisible();
});
