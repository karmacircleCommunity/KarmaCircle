import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  chooseOption,
  createEvent,
  dropdown,
  openEditSection,
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
    access: string;
  }>;
}

test("an organization edits an event from My events and sees the change on the event page", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-edit-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, access: "invite" });

  await page.goto("/events/mine?tab=hosting");
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
  await openEditSection(page, "Attendance");
  await expect(dropdown(page, "Who can join")).toHaveText(/Invite only/);

  const newName = `Riverbank Cleanup, new venue ${stamp}`;
  await chooseOption(page, "Who can join", "Open to everyone");
  await openEditSection(page, "Basics");
  await page.locator("#name").fill(newName);
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.getByText("Event updated")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: newName }),
  ).toBeVisible();
  await expect(page.getByText("Invite only")).toHaveCount(0);

  const stored = await readEvent(page, uid);
  expect(stored.name).toBe(newName);
  expect(stored.access).toBe("open");
});

test("an edit form that has not changed offers no save, and offers it once something differs", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-nochange-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  await page.goto(`/organization/events/${uid}/edit`);
  await expect(page.locator("#name")).toHaveValue(name);
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toHaveCount(0);

  await page.locator("#name").fill(`${name}, renamed`);
  await expect(save).toBeVisible();

  // Putting the name back means nothing differs again, so the save goes away.
  await page.locator("#name").fill(name);
  await expect(save).toHaveCount(0);
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

  await page.goto("/events/mine?tab=hosting");
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

/** Matches the app's request for one event's record, and nothing else. */
function isFetchOf(uid: string) {
  return (url: URL) =>
    url.pathname === "/events" && url.searchParams.get("uid") === uid;
}

/** A draft online event, whose page links straight back to My events. */
async function seedOnlineDraft(page: Page, uid: string, name: string) {
  await createEvent(page, { uid, name, mode: "Online", status: "draft" });
}

test("the edit form starts from a fresh copy, not the one the event page cached", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-fresh-edit-${stamp}`;
  const name = `Donor Call ${stamp}`;
  const newLink = "https://meet.example.com/changed-since";
  await signedInHost(page, stamp);
  await seedOnlineDraft(page, uid, name);

  // The event page fetches the event, and the app keeps that copy.
  await page.goto(`/events/${uid}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  // The stored link then changes behind the app's back.
  const changed = await page.request.patch(`${E2E_API_URL}/events/${uid}`, {
    data: { platformLink: newLink },
  });
  expect(changed.ok(), await changed.text()).toBeTruthy();

  // Reach the edit form by links only: a full load would empty the cache.
  await page.getByRole("link", { name: "Back to my events" }).click();
  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await openEditSection(page, "Date & place");
  await expect(page.getByLabel("Meeting link")).toHaveValue(newLink);

  await openEditSection(page, "Basics");
  await page.locator("#name").fill(`${name} moved`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();

  const response = await page.request.get(`${E2E_API_URL}/events?uid=${uid}`);
  expect(await response.json()).toMatchObject({
    name: `${name} moved`,
    platformLink: newLink,
  });
});

test("an edit form that cannot load its event offers another try", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-edit-retry-${stamp}`;
  const name = `Helpline Evening ${stamp}`;
  await signedInHost(page, stamp);
  await seedOnlineDraft(page, uid, name);
  await page.goto("/events/mine?tab=hosting&show=drafts");

  const oneEvent = isFetchOf(uid);
  await page.route(oneEvent, (route) => route.abort());
  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await expect(
    page.getByRole("heading", { name: "Could not load this event" }),
  ).toBeVisible();
  await expect(page.locator("#name")).toHaveCount(0);

  await page.unroute(oneEvent);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#name")).toHaveValue(name);
});
