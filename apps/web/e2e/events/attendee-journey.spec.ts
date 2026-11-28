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
  openMyEventsFromMenu,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * The attendee side of events: opening a detail page, joining, the
 * "You are going" state, the My Events page, the invite-only state and the
 * completed (past) state. See docs/specs/events.md ("Event lifecycle") for the
 * behavior this follows.
 *
 * Each test builds its own organization, event and attendee from a unique
 * stamp, because spec files run in parallel against one shared database.
 * The organization signs up in the test's own `page` and publishes events with
 * that session. The attendee signs up in a second browser context so the two
 * sessions never share cookies.
 *
 * A past event cannot be created through the public API (it rejects a start
 * time in the past) and a started event cannot be joined. Tests that need one
 * publish a future event, optionally join it, then move it into the past with
 * `backdateEvent`, the E2E server's test-only route.
 *
 * The signed-out Join click, the meeting link, an event that is happening now,
 * the request note and the Invited tab are in
 * `event-attendee-states.spec.ts`.
 */

const DESKTOP = { width: 1280, height: 900 };

interface Attendee {
  context: BrowserContext;
  page: Page;
}

/** Signs a new attendee up in an isolated browser context at desktop width. */
async function openAttendee(
  browser: Browser,
  stamp: number,
): Promise<Attendee> {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  await signUpIndividual(page, stamp);
  return { context, page };
}

test("an attendee finds an event, joins it, sees 'You are going' and finds it in My Events", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-journey-${stamp}`;
  const name = `Riverbank Cleanup ${stamp}`;
  const organizer = await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    // Find the event in the directory and open its detail page from the card.
    await attendee.goto("/events");
    await attendee
      .getByRole("searchbox", { name: "Search events" })
      .fill(String(stamp));
    await attendee
      .getByRole("heading", { level: 2, name })
      .getByRole("link")
      .click();
    await expect(attendee).toHaveURL(new RegExp(`/events/${uid}$`));
    await expect(
      attendee.getByRole("heading", { level: 1, name }),
    ).toBeVisible();

    // An open event offers Join, and no "going" state yet.
    const join = attendee.getByRole("button", { name: "Join this event" });
    await expect(join).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toHaveCount(0);

    await join.click();
    const going = attendee.getByRole("button", { name: "You are going" });
    await expect(going).toBeVisible();
    await expect(going).toHaveAttribute("aria-pressed", "true");
    await expect(attendee.getByText(/registered for this event/)).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Join this event" }),
    ).toHaveCount(0);

    // The registration is saved on the account, not only in the page: a full
    // reload asks the API again and still shows the going state.
    await attendee.reload();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Join this event" }),
    ).toHaveCount(0);

    // My Events, reached from the account menu, lists it under Upcoming.
    await openMyEventsFromMenu(attendee);
    await expect(
      attendee.getByRole("heading", { level: 1, name: "My events" }),
    ).toBeVisible();
    await expect(
      attendee.getByRole("tab", { name: "Upcoming" }),
    ).toHaveAttribute("aria-selected", "true");
    const entry = attendee.getByRole("link", { name: new RegExp(name) });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText(`Hosted by ${organizer.name}`);
    await expect(entry).toContainText("You're going");

    // Nothing has happened yet, so the Past tab is empty.
    await attendee.getByRole("tab", { name: "Past" }).click();
    await expect(attendee.getByText("No past events")).toBeVisible();

    // The entry links back to the same detail page, still in the going state.
    await attendee.getByRole("tab", { name: "Upcoming" }).click();
    await entry.click();
    await expect(attendee).toHaveURL(new RegExp(`/events/${uid}$`));
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("My Events starts empty for a new attendee and points to the directory", async ({
  browser,
}) => {
  const { context, page } = await openAttendee(browser, uniqueStamp());
  try {
    await openMyEventsFromMenu(page);

    await expect(page.getByText("No upcoming events")).toBeVisible();
    await expect(
      page.getByText("Events you join will show up here."),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Past" }).click();
    await expect(page.getByRole("tab", { name: "Past" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("No past events")).toBeVisible();
    await expect(
      page.getByText("Your completed event visits will show up here."),
    ).toBeVisible();
    // The "Explore events" shortcut belongs to the Upcoming tab only.
    await expect(
      page.getByRole("link", { name: "Explore events" }),
    ).toHaveCount(0);

    await page.getByRole("tab", { name: "Upcoming" }).click();
    await page.getByRole("link", { name: "Explore events" }).click();
    await expect(page).toHaveURL(/\/events$/);
  } finally {
    await context.close();
  }
});

test("an invite-only event shows the ask-the-organizer state and refuses a join", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-invite-only-${stamp}`;
  const name = `Founders Preview ${stamp}`;
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name, access: "invite" });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    // The event stays public: it opens, it is labelled, and it explains why
    // there is no way to join from the page.
    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByRole("heading", { level: 1, name }),
    ).toBeVisible();
    // The label appears in the hero badge and again in the details list.
    await expect(
      attendee.getByText("Invite only", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      attendee.getByText(
        /This event is invite-only. Only people the organizer invited/,
      ),
    ).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Join this event" }),
    ).toHaveCount(0);
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toHaveCount(0);

    // The API enforces the same rule for a signed-in attendee who skips the UI.
    const response = await attendee.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(response.status()).toBe(403);

    // The refused join left no registration behind.
    await attendee.goto("/events/mine");
    await expect(attendee.getByText("No upcoming events")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a completed event shows the past state with no Join action and refuses a join", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-completed-${stamp}`;
  const name = `Winter Blanket Drive ${stamp}`;
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name, startsInDays: 2 });
  await backdateEvent(page, uid, 3);

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByRole("heading", { level: 1, name }),
    ).toBeVisible();

    // The completed wrap-up replaces the cost, spots and Join control.
    await expect(
      attendee.getByText("This event has already taken place"),
    ).toBeVisible();
    // The badge appears in the hero and again in the join panel.
    await expect(
      attendee.getByText("Completed", { exact: true }).first(),
    ).toBeVisible();
    await expect(attendee.getByText(/^Took place/)).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Join this event" }),
    ).toHaveCount(0);
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toHaveCount(0);
    await expect(attendee.getByText("Free to attend")).toHaveCount(0);

    // Share stays available after the event, as the panel's own docs promise.
    await expect(
      attendee.getByRole("button", { name: "Share", exact: true }),
    ).toBeVisible();

    // The API refuses a join once the event has started.
    const response = await attendee.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(response.status()).toBe(409);
  } finally {
    await context.close();
  }
});

test("an event the attendee joined moves from Upcoming to Past once it has happened", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-moves-to-past-${stamp}`;
  const name = `Community Iftar ${stamp}`;
  const organizer = await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name, startsInDays: 2 });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    // Join while the event is still ahead.
    const joined = await attendee.request.post(
      `${E2E_API_URL}/events/${uid}/join`,
    );
    expect(joined.status()).toBe(201);

    await attendee.goto("/events/mine");
    await expect(
      attendee.getByRole("link", { name: new RegExp(name) }),
    ).toBeVisible();

    // Time passes: the event starts and ends.
    await backdateEvent(page, uid, 3);

    await attendee.reload();
    await expect(attendee.getByText("No upcoming events")).toBeVisible();
    await expect(
      attendee.getByRole("link", { name: new RegExp(name) }),
    ).toHaveCount(0);

    await attendee.getByRole("tab", { name: "Past" }).click();
    const entry = attendee.getByRole("link", { name: new RegExp(name) });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText(`Hosted by ${organizer.name}`);

    // Its detail page now shows the completed state, not "You are going".
    await entry.click();
    await expect(attendee).toHaveURL(new RegExp(`/events/${uid}$`));
    await expect(
      attendee.getByText("This event has already taken place"),
    ).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});
