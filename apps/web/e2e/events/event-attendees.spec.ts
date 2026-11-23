import { readFileSync } from "node:fs";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  createEvent,
  openEditSection,
  publishOrganizationProfile,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * Leaving an event (PG-3), capacity and spots left (PG-5), and the organizer's
 * attendee list with check-in and CSV export (PG-6). See docs/specs/events.md.
 *
 * Each test signs up its own organization and attendees through the real UI
 * with a unique stamp (spec files run in parallel against one database) and
 * publishes its event through the API. Attendees use their own browser
 * contexts so no two sessions share cookies.
 */

const DESKTOP = { width: 1280, height: 900 };

async function openAttendee(
  browser: Browser,
  stamp: number,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await signUpIndividual(page, stamp);
  return { context, page };
}

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
}

test("an attendee can leave an event, give the spot back and join again", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-leave-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    await attendee.goto(`/events/${uid}`);
    await attendee.getByRole("button", { name: "Join this event" }).click();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();

    // Asking to leave opens a confirmation, and keeping the place changes nothing.
    await attendee.getByRole("button", { name: "Leave event" }).click();
    const dialog = attendee.getByRole("dialog", { name: "Leave this event?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Stay registered" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();

    // Confirming gives the place up.
    await attendee.getByRole("button", { name: "Leave event" }).click();
    await dialog.getByRole("button", { name: "Leave event" }).click();
    await expect(attendee.getByText("You left this event")).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Join this event" }),
    ).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Leave event" }),
    ).toHaveCount(0);

    const status = await attendee.request.get(
      `${E2E_API_URL}/events/${uid}/registration`,
    );
    expect(await status.json()).toMatchObject({
      joined: false,
      status: "none",
    });

    // My Events no longer lists it.
    await attendee.goto("/events/mine");
    await expect(attendee.getByText(name)).toHaveCount(0);

    // And they can join again.
    await attendee.goto(`/events/${uid}`);
    await attendee.getByRole("button", { name: "Join this event" }).click();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a full event with no waitlist refuses the next person until someone leaves", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-full-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, capacity: 1, waitlistEnabled: false });

  const first = await openAttendee(browser, stamp);
  const second = await openAttendee(browser, stamp + 1);
  try {
    // One spot is shown before anyone joins.
    await second.page.goto(`/events/${uid}`);
    await expect(
      second.page.locator("#details").getByText("1 spot left"),
    ).toBeVisible();

    await first.page.goto(`/events/${uid}`);
    await first.page.getByRole("button", { name: "Join this event" }).click();
    await expect(
      first.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
    // The person who holds the place still sees "You are going", never "full".
    await expect(
      first.page.locator("#details").getByText("Full", { exact: true }),
    ).toBeVisible();

    // The next person sees a full event with nothing to click.
    await second.page.reload();
    await expect(
      second.page.getByRole("button", { name: "Event is full" }),
    ).toBeDisabled();
    await expect(
      second.page.locator("#details").getByText("Full", { exact: true }),
    ).toBeVisible();

    // The API agrees, so a stale page cannot sneak in.
    const refused = await second.page.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(refused.status()).toBe(409);
    expect((await refused.json()).message).toBe("This event is full.");

    // The first attendee leaves; the place is free again.
    await first.page.getByRole("button", { name: "Leave event" }).click();
    await first.page
      .getByRole("dialog", { name: "Leave this event?" })
      .getByRole("button", { name: "Leave event" })
      .click();
    await expect(first.page.getByText("You left this event")).toBeVisible();

    await second.page.reload();
    await second.page.getByRole("button", { name: "Join this event" }).click();
    await expect(
      second.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await first.context.close();
    await second.context.close();
  }
});

test("an organization sets a capacity from the edit form and cannot go below who has joined", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-cap-edit-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    await attendee.goto(`/events/${uid}`);
    await attendee.getByRole("button", { name: "Join this event" }).click();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }

  await page.goto(`/organization/events/${uid}/edit`);
  await openEditSection(page, "Attendance");
  const capacity = page.getByLabel("Maximum attendees (optional)");
  await expect(capacity).toHaveValue("");

  // The form rejects nonsense before it reaches the API.
  await capacity.fill("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText(
      "Enter a whole number from 1 to 100000, or leave it empty for no limit",
    ),
  ).toBeVisible();

  // A limit of 2 is fine with one person registered.
  await capacity.fill("2");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.locator("#details").getByText("1 spot left")).toBeVisible();

  // Removing it again returns to no limit.
  await page.goto(`/organization/events/${uid}/edit`);
  await openEditSection(page, "Attendance");
  await expect(page.getByLabel("Maximum attendees (optional)")).toHaveValue(
    "2",
  );
  await page.getByLabel("Maximum attendees (optional)").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${uid}$`));
  await expect(page.locator("#details").getByText("No limit")).toBeVisible();
});

test("the API refuses a capacity below the people already registered", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-cap-low-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name: `Riverbank Cleanup ${stamp}` });

  const first = await openAttendee(browser, stamp);
  const second = await openAttendee(browser, stamp + 1);
  try {
    for (const attendee of [first, second]) {
      const joined = await attendee.page.request.post(
        `${E2E_API_URL}/events/${uid}/join`,
      );
      expect(joined.status()).toBe(201);
    }
  } finally {
    await first.context.close();
    await second.context.close();
  }

  await page.goto(`/organization/events/${uid}/edit`);
  await openEditSection(page, "Attendance");
  await page.getByLabel("Maximum attendees (optional)").fill("1");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Capacity cannot be lower than the 2 people already going."),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/organization/events/${uid}/edit$`));
});

test("an organizer sees who joined, checks people in, searches and downloads the list", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-roster-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, capacity: 5 });

  const first = await openAttendee(browser, stamp);
  const second = await openAttendee(browser, stamp + 1);
  try {
    for (const attendee of [first, second]) {
      const joined = await attendee.page.request.post(
        `${E2E_API_URL}/events/${uid}/join`,
      );
      expect(joined.status()).toBe(201);
    }
  } finally {
    await first.context.close();
    await second.context.close();
  }

  // Found from Your events.
  await page.goto("/organization/events");
  await page.getByRole("link", { name: `Attendees for ${name}` }).click();
  await expect(page).toHaveURL(
    new RegExp(`/organization/events/${uid}/attendees$`),
  );
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  const registered = page
    .getByText("Registered", { exact: true })
    .locator("..");
  await expect(registered).toContainText("2");
  await expect(registered).toContainText("of 5");
  await expect(
    page.getByText(`events-attendee-${stamp}@example.com`),
  ).toBeVisible();
  await expect(
    page.getByText(`events-attendee-${stamp + 1}@example.com`),
  ).toBeVisible();

  // Search narrows the list to one person by email.
  await page
    .getByRole("searchbox", { name: "Search attendees" })
    .fill(String(stamp + 1));
  await expect(
    page.getByText(`events-attendee-${stamp}@example.com`),
  ).toHaveCount(0);
  const row = page.getByRole("listitem").filter({
    hasText: `events-attendee-${stamp + 1}@example.com`,
  });
  await expect(row).toHaveCount(1);

  // Check in and undo.
  const checkIn = row.getByRole("button", { name: /Check in Event Attendee/ });
  await checkIn.click();
  const undo = row.getByRole("button", { name: /Undo check-in for/ });
  await expect(undo).toBeVisible();
  await expect(row.getByText(/Checked in/).first()).toBeVisible();
  const checkedInCard = page
    .getByText("Checked in", { exact: true })
    .first()
    .locator("..");
  await expect(checkedInCard).toContainText("1");
  await undo.click();
  await expect(
    row.getByRole("button", { name: /Check in Event Attendee/ }),
  ).toBeVisible();
  await row.getByRole("button", { name: /Check in Event Attendee/ }).click();
  await expect(
    row.getByRole("button", { name: /Undo check-in for/ }),
  ).toBeVisible();

  // Nothing matches a search that finds nobody.
  await page
    .getByRole("searchbox", { name: "Search attendees" })
    .fill("zzz-nobody");
  await expect(page.getByText("Nobody matches that search")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search attendees" }).fill("");
  await expect(page.getByRole("listitem")).toHaveCount(2);

  // The CSV has both people and the check-in.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`${uid}-attendees.csv`);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv).toContain(`events-attendee-${stamp}@example.com`);
  expect(csv).toContain(`events-attendee-${stamp + 1}@example.com`);
  expect(csv).toContain('"Yes"');
  expect(csv.trim().split("\r\n")).toHaveLength(3);
});

test("only the hosting organization can open an event's attendee list", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-roster-private-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name: `Riverbank Cleanup ${stamp}` });

  const attendee = await openAttendee(browser, stamp);
  const rivalContext = await browser.newContext();
  const rival = await rivalContext.newPage();
  try {
    const joined = await attendee.page.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(joined.status()).toBe(201);

    await signedInHost(rival, stamp + 1);
    await rival.goto(`/organization/events/${uid}/attendees`);
    await expect(
      rival.getByRole("heading", {
        level: 1,
        name: "You can only see your own events’ attendees",
      }),
    ).toBeVisible();
    await expect(rival.getByText("@example.com")).toHaveCount(0);

    const api = await rival.request.get(
      `${E2E_API_URL}/events/${uid}/attendees`,
    );
    expect(api.status()).toBe(403);
    const exportCsv = await rival.request.get(
      `${E2E_API_URL}/events/${uid}/attendees/export`,
    );
    expect(exportCsv.status()).toBe(403);
  } finally {
    await attendee.context.close();
    await rivalContext.close();
  }
});
