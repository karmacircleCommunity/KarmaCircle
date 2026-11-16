import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  createEvent,
  publishOrganizationProfile,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * An organization editing and cancelling its own events (PG-1 and PG-2,
 * November 2026). See docs/specs/events.md ("Editing and cancelling").
 *
 * Each test signs its own organization up through the real UI, publishes its
 * profile and an event through the API, and works with unique names, because
 * spec files run in parallel against one shared database. Nothing here is
 * seeded.
 */

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
}

async function readEvent(page: Page, uid: string) {
  const response = await page.request.get(
    `${E2E_API_URL}/events?uid=${encodeURIComponent(uid)}`,
  );
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<{
    name: string;
    status?: string;
    inviteOnly: boolean;
  }>;
}

test("an organization edits an event from Your events and sees the change on the event page", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-edit-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, inviteOnly: true });

  await page.goto("/organization/events");
  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await expect(page).toHaveURL(new RegExp(`/organization/events/${uid}/edit$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit your event" }),
  ).toBeVisible();

  // The page address is shown but locked, and the form starts as stored.
  const address = page.locator("#uid");
  await expect(address).toHaveValue(uid);
  await expect(address).toHaveJSProperty("readOnly", true);
  await expect(page.locator("#name")).toHaveValue(name);
  await expect(
    page.getByRole("checkbox", { name: /Invite-only/ }),
  ).toBeChecked();

  const newName = `Riverbank Cleanup, new venue ${stamp}`;
  await page.locator("#name").fill(newName);
  await page.getByRole("checkbox", { name: /Invite-only/ }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.getByText("Event updated")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: newName }),
  ).toBeVisible();
  await expect(page.getByText("Invite only")).toHaveCount(0);

  const stored = await readEvent(page, uid);
  expect(stored.name).toBe(newName);
  expect(stored.inviteOnly).toBe(false);
});

test("saving an edit form that has not changed sends nothing", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-nochange-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(page.locator("#name")).toHaveValue(name);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Nothing has changed yet.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/organization/events/${uid}/edit$`));
});

test("an organization cancels an event: the dialog can be dismissed, then confirmed, and the event stays public as cancelled", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-cancel-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  await page.goto("/organization/events");
  const cancelButton = page.getByRole("button", {
    name: `Cancel event ${name}`,
  });

  // Keeping the event closes the dialog and changes nothing.
  await cancelButton.click();
  const dialog = page.getByRole("dialog", { name: "Cancel this event?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("This can’t be undone.")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep event" }).click();
  await expect(dialog).toBeHidden();
  expect((await readEvent(page, uid)).status ?? "published").toBe("published");

  // Confirming cancels it.
  await cancelButton.click();
  await dialog.getByRole("button", { name: "Cancel event" }).click();
  await expect(
    page.getByText("Event cancelled", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(cancelButton).toHaveCount(0);
  await expect(page.getByRole("link", { name: `Edit ${name}` })).toHaveCount(0);
  expect((await readEvent(page, uid)).status).toBe("cancelled");

  // The public page still exists, says it was cancelled, and offers no Join.
  await page.goto(`/events/${uid}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("This event was cancelled")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Join this event/ }),
  ).toHaveCount(0);

  // The API refuses a join, and the edit page explains instead of showing a form.
  const attendeeContext = await browser.newContext();
  const attendee = await attendeeContext.newPage();
  try {
    await signUpIndividual(attendee, stamp);
    const join = await attendee.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(join.status()).toBe(409);
  } finally {
    await attendeeContext.close();
  }

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(
    page.getByRole("heading", { level: 1, name: "This event was cancelled" }),
  ).toBeVisible();
  await expect(page.locator("#name")).toHaveCount(0);
});

test("another organization cannot edit or cancel an event, in the page or through the API", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-foreign-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  const rivalContext = await browser.newContext();
  const rival = await rivalContext.newPage();
  try {
    await signedInHost(rival, stamp + 1);

    await rival.goto(`/organization/events/${uid}/edit`);
    await expect(
      rival.getByRole("heading", {
        level: 1,
        name: "You can only edit your own events",
      }),
    ).toBeVisible();
    await expect(rival.locator("#name")).toHaveCount(0);

    const edit = await rival.request.patch(`${E2E_API_URL}/events/${uid}`, {
      data: { name: `Rival renames the event ${stamp}` },
    });
    expect(edit.status()).toBe(403);
    const cancel = await rival.request.post(
      `${E2E_API_URL}/events/${uid}/cancel`,
    );
    expect(cancel.status()).toBe(403);
  } finally {
    await rivalContext.close();
  }

  const stored = await readEvent(page, uid);
  expect(stored.name).toBe(name);
  expect(stored.status ?? "published").toBe("published");
});
