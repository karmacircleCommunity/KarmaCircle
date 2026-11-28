import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { E2E_API_URL } from "../env";
import {
  backdateEvent,
  createEvent,
  publishOrganizationProfile,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * What an attendee sees as their relationship to an event changes: the meeting
 * link (only for the host and people going), an event that is happening now,
 * signing in from the Join button and coming back, the note sent with a
 * request, the Invited tab of My Events, and a draft with most details still
 * missing. See docs/specs/events.md.
 *
 * Each test builds its own organization, event and attendees from a unique
 * stamp. Attendees use their own browser contexts so no two sessions share
 * cookies.
 *
 * Google sign-in is not covered: it needs a real Google account. The way back
 * it relies on is unit tested (`returnPath.test.ts`).
 */

const DESKTOP = { width: 1280, height: 900 };
const HOUR_MS = 60 * 60 * 1000;
/** About half an hour ago: a backdated event runs two hours, so it is on now. */
const STARTED_RECENTLY = 0.02;
/** The password `signUpIndividual` gives every attendee it creates. */
const ATTENDEE_PASSWORD = "Abcdefgh1234!";
const MEETING_LINK = "https://zoom.example.com/j/1";
const LINK_NOTE = "The meeting link is shown here once you have joined.";
const CLOSED = "Joining has closed because the event has started.";

async function openVisitor(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: DESKTOP });
  return { context, page: await context.newPage() };
}

async function openAttendee(browser: Browser, stamp: number) {
  const visitor = await openVisitor(browser);
  const { email } = await signUpIndividual(visitor.page, stamp);
  return { ...visitor, email };
}

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
}

const joinLink = (page: Page) =>
  page.getByRole("link", { name: "Open the join link" });

test("the meeting link appears on joining and goes on leaving", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-link-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Donor Call ${stamp}`,
    mode: "Online",
  });

  // The host has the link without joining.
  await page.goto(`/events/${uid}`);
  await expect(joinLink(page)).toHaveAttribute("href", MEETING_LINK);

  const visitor = await openVisitor(browser);
  const attendee = await openAttendee(browser, stamp);
  try {
    for (const viewer of [visitor.page, attendee.page]) {
      await viewer.goto(`/events/${uid}`);
      await expect(viewer.getByText(LINK_NOTE)).toBeVisible();
      await expect(joinLink(viewer)).toHaveCount(0);
    }

    await attendee.page
      .getByRole("button", { name: "Join this event" })
      .click();
    await expect(joinLink(attendee.page)).toHaveAttribute("href", MEETING_LINK);
    await expect(attendee.page.getByText(LINK_NOTE)).toHaveCount(0);

    await attendee.page.getByRole("button", { name: "Leave event" }).click();
    await attendee.page
      .getByRole("dialog")
      .getByRole("button", { name: "Leave event" })
      .click();
    await expect(joinLink(attendee.page)).toHaveCount(0);
    await expect(attendee.page.getByText(LINK_NOTE)).toBeVisible();
  } finally {
    await visitor.context.close();
    await attendee.context.close();
  }
});

test("an event that is happening now stays open to people going and closed to others", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-live-${stamp}`;
  const name = `Live Briefing ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, mode: "Online" });

  const going = await openAttendee(browser, stamp);
  const late = await openAttendee(browser, stamp + 1);
  const visitor = await openVisitor(browser);
  try {
    const joined = await going.page.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(joined.status()).toBe(201);
    await backdateEvent(page, uid, STARTED_RECENTLY);

    await going.page.goto(`/events/${uid}`);
    await expect(
      going.page.getByText("Happening now", { exact: true }).first(),
    ).toBeVisible();
    // The phone bar repeats this line, hidden at desktop width.
    await expect(
      going.page.getByText("You are going", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      going.page.getByRole("link", { name: "Join online" }),
    ).toHaveAttribute("href", MEETING_LINK);
    await expect(
      going.page.getByRole("button", { name: "Leave event" }),
    ).toHaveCount(0);
    await expect(
      going.page.getByText("Completed", { exact: true }),
    ).toHaveCount(0);
    await expect(
      going.page.getByRole("link", { name: "Add to Google Calendar" }),
    ).toBeVisible();

    await late.page.goto(`/events/${uid}`);
    await expect(late.page.getByText(CLOSED)).toBeVisible();
    await expect(
      late.page.getByRole("button", { name: "Join this event" }),
    ).toHaveCount(0);
    await expect(joinLink(late.page)).toHaveCount(0);
    await expect(
      late.page.getByRole("link", { name: "Join online" }),
    ).toHaveCount(0);
    const refused = await late.page.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(refused.status()).toBe(409);

    // A signed-out person who joined earlier can still get in.
    await visitor.page.goto(`/events/${uid}`);
    await expect(joinLink(visitor.page)).toHaveCount(0);
    await visitor.page
      .getByRole("button", { name: "Already joined? Sign in" })
      .click();
    await expect(visitor.page).toHaveURL(/\/auth\/signin$/);

    // Still under Upcoming, in the directory and on My Events.
    await late.page.goto("/events");
    await late.page
      .getByRole("searchbox", { name: "Search events" })
      .fill(String(stamp));
    const card = late.page.getByRole("article").filter({ hasText: name });
    await expect(card).toContainText("Happening now");

    await going.page.goto("/events/mine");
    await expect(
      going.page.getByRole("link", { name: new RegExp(name) }),
    ).toContainText("Happening now");
  } finally {
    await going.context.close();
    await late.context.close();
    await visitor.context.close();
  }
});

test("a signed-out visitor who presses Join signs up and returns to the event", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-return-signup-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name: `Tree Planting ${stamp}` });

  const { context, page: visitor } = await openVisitor(browser);
  try {
    await visitor.goto(`/events/${uid}`);
    await visitor.getByRole("button", { name: "Join this event" }).click();
    await expect(visitor).toHaveURL(/\/auth\/signin$/);

    await visitor
      .locator('input[name="email"]')
      .fill(`events-return-${stamp}@example.com`);
    await visitor
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await visitor.locator('input[name="name"]').fill("Event Attendee");
    await visitor.locator('input[name="new-password"]').fill(ATTENDEE_PASSWORD);
    await visitor.getByRole("button", { name: "Sign Up", exact: true }).click();

    await expect(visitor).toHaveURL(new RegExp(`/events/${uid}$`));
    await visitor.getByRole("button", { name: "Join this event" }).click();
    await expect(
      visitor.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("on a phone, the bottom bar sends a signed-out visitor to sign in and back", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-return-signin-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Soup Kitchen ${stamp}`,
    access: "approval",
  });
  const account = await openAttendee(browser, stamp);
  await account.context.close();

  const { context, page: visitor } = await openVisitor(browser);
  try {
    await visitor.setViewportSize({ width: 375, height: 640 });
    await visitor.goto(`/events/${uid}`);
    // Scroll the panel off screen, which is what brings the bar up.
    await visitor
      .locator("#details")
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    // The bar's short label; the panel's own button says "Request to join".
    await visitor.getByRole("button", { name: "Request", exact: true }).click();
    // Signing in comes first: no note dialog for a visitor.
    await expect(visitor).toHaveURL(/\/auth\/signin$/);

    await visitor.locator('input[name="email"]').fill(account.email);
    await visitor
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await visitor.locator('input[name="password"]').fill(ATTENDEE_PASSWORD);
    await visitor.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(visitor).toHaveURL(new RegExp(`/events/${uid}$`));
    await expect(
      visitor.getByRole("button", { name: "Request to join" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a request carries an optional note to the organizer", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-note-${stamp}`;
  const note = `I can bring a van ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Food Drive ${stamp}`,
    access: "approval",
  });

  const attendee = await openAttendee(browser, stamp);
  try {
    await attendee.page.goto(`/events/${uid}`);
    const request = attendee.page.getByRole("button", {
      name: "Request to join",
    });
    const dialog = attendee.page.getByRole("dialog");
    const field = dialog.getByLabel("Note for the organizer (optional)");

    // The note field takes focus, and Escape sends nothing.
    await request.click();
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute("maxlength", "300");
    await attendee.page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(request).toBeVisible();

    await request.click();
    await field.fill(note);
    await expect(
      dialog.getByText(`${note.length} of 300 characters`),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Send request" }).click();
    await expect(
      attendee.page.getByText("Request sent", { exact: true }),
    ).toBeVisible();

    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByRole("tab", { name: /Requests/ }).click();
    await expect(page.getByText(note)).toBeVisible();
  } finally {
    await attendee.context.close();
  }
});

test("My Events lists an invitation until it is accepted", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-invited-tab-${stamp}`;
  const name = `Members Evening ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, access: "invite" });

  const visitor = await openVisitor(browser);
  const guest = await openAttendee(browser, stamp);
  try {
    // Signed out, an invitee is offered the way in.
    await visitor.page.goto(`/events/${uid}`);
    await visitor.page
      .getByRole("button", { name: "Invited? Sign in" })
      .click();
    await expect(visitor.page).toHaveURL(/\/auth\/signin$/);

    await guest.page.goto("/events/mine");
    await guest.page.getByRole("tab", { name: "Invited" }).click();
    await expect(guest.page.getByText("No invitations")).toBeVisible();

    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByLabel("Email addresses").fill(guest.email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("1 invitation sent")).toBeVisible();

    await guest.page.reload();
    await guest.page.getByRole("tab", { name: "Invited" }).click();
    const entry = guest.page.getByRole("link", { name: new RegExp(name) });
    await expect(entry).toContainText("Invited");
    await entry.click();

    await guest.page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      guest.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();

    await guest.page.goto("/events/mine");
    await expect(
      guest.page.getByRole("link", { name: new RegExp(name) }),
    ).toContainText("You're going");
    await guest.page.getByRole("tab", { name: "Invited" }).click();
    await expect(guest.page.getByText("No invitations")).toBeVisible();
  } finally {
    await guest.context.close();
    await visitor.context.close();
  }
});

test("a draft with only a name and dates opens cleanly for its organization", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await signedInHost(page, stamp);
  await page.setViewportSize(DESKTOP);

  const start = new Date(Date.now() + 72 * HOUR_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  const createDraft = async (uid: string, mode: "Offline" | "Hybrid") => {
    const response = await page.request.post(`${E2E_API_URL}/events/create`, {
      data: {
        uid,
        name: `Early Idea ${uid}`,
        mode,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "draft",
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
  };

  const hybrid = `evt-e2e-bare-hybrid-${stamp}`;
  await createDraft(hybrid, "Hybrid");
  await page.goto(`/events/${hybrid}`);
  await expect(
    page.getByRole("heading", { level: 1, name: `Early Idea ${hybrid}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "How to join" }),
  ).toBeVisible();
  await expect(
    page.getByText("No meeting link has been added yet."),
  ).toBeVisible();
  await expect(page.getByText("Open in maps")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("undefined");

  const offline = `evt-e2e-bare-offline-${stamp}`;
  await createDraft(offline, "Offline");
  await page.goto(`/events/${offline}`);
  await expect(
    page.getByRole("heading", { level: 1, name: `Early Idea ${offline}` }),
  ).toBeVisible();
  await expect(page.locator("#location")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("undefined");
});

test("a signed-out invitee of a full event with no waitlist can sign in", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-full-invitee-${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, {
    uid,
    name: `Small Workshop ${stamp}`,
    capacity: 1,
    waitlistEnabled: false,
  });

  const first = await openAttendee(browser, stamp);
  const visitor = await openVisitor(browser);
  try {
    const joined = await first.page.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(joined.status()).toBe(201);

    await visitor.page.goto(`/events/${uid}`);
    await expect(
      visitor.page.getByRole("button", { name: "Event is full" }),
    ).toBeDisabled();
    await visitor.page
      .getByRole("button", { name: "Invited? Sign in" })
      .click();
    await expect(visitor.page).toHaveURL(/\/auth\/signin$/);
  } finally {
    await first.context.close();
    await visitor.context.close();
  }
});

test("an organization's own profile labels a draft and gives it no time state", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-profile-draft-${stamp}`;
  const name = `Unannounced Walk ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, status: "draft" });
  await backdateEvent(page, uid, STARTED_RECENTLY);
  const mine = await page.request.get(`${E2E_API_URL}/organizations/me`);
  expect(mine.ok(), await mine.text()).toBeTruthy();
  const { handle } = (await mine.json()) as { handle: string };

  await page.goto(`/organization/${handle}`);
  const row = page.getByRole("link", { name: new RegExp(name) });
  await expect(row).toContainText("Draft");
  await expect(row).not.toContainText("Happening now");
  await expect(
    page.getByRole("heading", { level: 3, name: "Drafts" }),
  ).toBeVisible();
  await expect(page.getByText("Most recently:")).toHaveCount(0);
});
