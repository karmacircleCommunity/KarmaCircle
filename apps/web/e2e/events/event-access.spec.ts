import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  chooseOption,
  createEvent,
  publishOrganizationProfile,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * Who can join (PG-4) and the waitlist (PG-14): the Approval required level,
 * the organizer's Requests tab, the waitlist on a full event, and invitations.
 * See docs/specs/events.md.
 *
 * Each test signs up its own organization and attendees through the real UI with
 * a unique stamp (spec files run in parallel against one database) and
 * publishes its event through the API. Attendees use their own browser contexts
 * so no two sessions share cookies.
 */

const DESKTOP = { width: 1280, height: 900 };

async function openAttendee(
  browser: Browser,
  stamp: number,
): Promise<{ context: BrowserContext; page: Page; email: string }> {
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  const { email } = await signUpIndividual(page, stamp);
  return { context, page, email };
}

async function signedInHost(page: Page, stamp: number) {
  await signUpOrganization(page, stamp);
  await publishOrganizationProfile(page);
}

test("an approval event: the attendee asks, the organizer approves, the attendee is going", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-approval-${stamp}`;
  const name = `Neighbourhood Meal ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, access: "approval" });

  const { context, page: attendee, email } = await openAttendee(browser, stamp);
  try {
    // The event says it needs approval, and offers a request rather than a join.
    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByText("Approval required", { exact: true }).first(),
    ).toBeVisible();
    await attendee.getByRole("button", { name: "Request to join" }).click();
    await attendee
      .getByRole("dialog")
      .getByRole("button", { name: "Send request" })
      .click();
    await expect(attendee.getByText("Request sent")).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toHaveCount(0);

    // Their own page lists it, labelled as a request.
    await attendee.goto("/events/mine");
    await expect(attendee.getByText("Requested")).toBeVisible();

    // The organizer sees the request on the Requests tab and approves it.
    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByRole("tab", { name: /Requests/ }).click();
    await expect(page.getByText(email)).toBeVisible();
    await page.getByRole("button", { name: /^Approve / }).click();
    await expect(page.getByText("No requests waiting")).toBeVisible();

    // The attendee now holds a place.
    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a declined request cannot ask again, and the organizer can reverse it", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-decline-${stamp}`;
  const name = `Neighbourhood Meal ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, access: "approval" });

  const { context, page: attendee } = await openAttendee(browser, stamp);
  try {
    await attendee.goto(`/events/${uid}`);
    await attendee.getByRole("button", { name: "Request to join" }).click();
    await attendee
      .getByRole("dialog")
      .getByRole("button", { name: "Send request" })
      .click();
    await expect(attendee.getByText("Request sent")).toBeVisible();

    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByRole("tab", { name: /Requests/ }).click();
    await page.getByRole("button", { name: /^Decline / }).click();
    await page.getByRole("tab", { name: /Declined/ }).click();
    await expect(page.getByRole("button", { name: /^Approve / })).toBeVisible();

    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByText(/did not approve your request/),
    ).toBeVisible();
    await expect(
      attendee.getByRole("button", { name: "Request to join" }),
    ).toHaveCount(0);

    // Reversing the decline makes them go.
    await page.getByRole("button", { name: /^Approve / }).click();
    await attendee.goto(`/events/${uid}`);
    await expect(
      attendee.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("a full event offers the waitlist, and the organizer moves the person up", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-waitlist-${stamp}`;
  const name = `Neighbourhood Meal ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, capacity: 1 });

  const first = await openAttendee(browser, stamp);
  const second = await openAttendee(browser, stamp + 1);
  try {
    await first.page.goto(`/events/${uid}`);
    await first.page.getByRole("button", { name: "Join this event" }).click();
    await expect(
      first.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();

    await second.page.goto(`/events/${uid}`);
    await second.page
      .getByRole("button", { name: "Join the waitlist" })
      .click();
    await second.page
      .getByRole("dialog")
      .getByRole("button", { name: "Join waitlist" })
      .click();
    await expect(
      second.page.getByText("On the waitlist", { exact: true }),
    ).toBeVisible();

    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByRole("tab", { name: /Waitlist/ }).click();
    await page.getByRole("button", { name: /^Move up / }).click();
    await expect(page.getByText("Nobody is on the waitlist")).toBeVisible();

    await second.page.goto(`/events/${uid}`);
    await expect(
      second.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();
  } finally {
    await first.context.close();
    await second.context.close();
  }
});

test("an invite-only event lets an invited email in, and only that email", async ({
  page,
  browser,
}) => {
  const stamp = uniqueStamp();
  const uid = `evt-e2e-invited-${stamp}`;
  const name = `Founders Preview ${stamp}`;
  await signedInHost(page, stamp);
  await createEvent(page, { uid, name, access: "invite" });

  const guest = await openAttendee(browser, stamp);
  const stranger = await openAttendee(browser, stamp + 1);
  try {
    await page.goto(`/organization/events/${uid}/attendees`);
    await page.getByLabel("Email addresses").fill(guest.email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText("1 invitation sent")).toBeVisible();
    await expect(page.getByText(guest.email)).toBeVisible();

    // The invited person can accept; the other signed-in person cannot.
    await guest.page.goto(`/events/${uid}`);
    await guest.page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      guest.page.getByRole("button", { name: "You are going" }),
    ).toBeVisible();

    await stranger.page.goto(`/events/${uid}`);
    await expect(
      stranger.page.getByText(/This event is invite-only/),
    ).toBeVisible();
  } finally {
    await guest.context.close();
    await stranger.context.close();
  }
});

test("the organizer chooses who can join in the create form", async ({
  page,
}) => {
  const stamp = uniqueStamp();
  await signedInHost(page, stamp);

  await page.goto("/organization/events/new");
  await chooseOption(page, "Who can join", "Approval required");
  await expect(
    page.getByText(
      "Anyone can ask to join, and you approve or decline each person.",
    ),
  ).toBeVisible();

  // The waitlist switch only appears once a limit is set.
  await expect(page.getByLabel("Allow a waitlist when full")).toHaveCount(0);
  await page.getByLabel("Maximum attendees (optional)").fill("20");
  await expect(page.getByLabel("Allow a waitlist when full")).toBeChecked();
});
