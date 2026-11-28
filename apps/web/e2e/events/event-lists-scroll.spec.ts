import { expect, test } from "@playwright/test";
import { isPage, mockPagedList } from "../mock-pages";
import {
  createEvent,
  signUpIndividual,
  signUpOrganization,
  uniqueStamp,
} from "./event-helpers";

/**
 * My Events' Attending list and an event's attendee list load their next page
 * as the reader scrolls. The pages are served by `mockPagedList`, so neither
 * test needs dozens of real registrations.
 */

const DESKTOP = { width: 1280, height: 800 };
const DAY_MS = 24 * 60 * 60 * 1000;

test("the events a person is attending load as they scroll", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await signUpIndividual(page, uniqueStamp());
  const start = Date.now() + 3 * DAY_MS;
  const list = await mockPagedList(page, {
    path: "/events/mine",
    items: Array.from({ length: 25 }, (_, index) => ({
      _id: `id-${index}`,
      uid: `joined-${index}`,
      name: `Joined Drive number ${index}`,
      hostName: "Mock Host",
      mode: "Online",
      platform: "Zoom Meeting",
      startTime: new Date(start + index * DAY_MS).toISOString(),
      endTime: new Date(start + index * DAY_MS + 3_600_000).toISOString(),
      registrationStatus: "going",
    })),
  });
  const release = list.hold(isPage(2));

  await page.goto("/events/mine");
  const rows = page.getByRole("link", { name: /Joined Drive number/ });
  await expect(rows).toHaveCount(20);
  await expect(page.getByRole("button", { name: /load more/i })).toHaveCount(0);

  await rows.last().scrollIntoViewIfNeeded();
  await expect(page.getByTestId("event-row-skeleton")).toHaveCount(3);

  release();
  await expect(rows).toHaveCount(25);
  await expect(page.getByTestId("event-row-skeleton")).toHaveCount(0);
  await expect(page.getByText("That's all 25 events.")).toBeVisible();
});

test("an attendee list loads as the organizer scrolls, and a failed page keeps the list", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  const stamp = uniqueStamp();
  const uid = `evt-e2e-attendee-scroll-${stamp}`;
  await signUpOrganization(page, stamp);
  await createEvent(page, { uid, name: `Crowded Drive ${stamp}` });
  const list = await mockPagedList(page, {
    path: `/events/${uid}/attendees`,
    items: Array.from({ length: 60 }, (_, index) => ({
      id: `person-${index}`,
      name: `Person number ${index}`,
      email: `person-${index}@example.com`,
      status: "going",
      joinedAt: new Date().toISOString(),
      checkedIn: false,
    })),
    extra: {
      event: {
        uid,
        name: `Crowded Drive ${stamp}`,
        status: "published",
        access: "open",
        waitlistEnabled: false,
      },
      summary: {
        registered: 60,
        checkedIn: 0,
        pending: 0,
        waitlisted: 0,
        declined: 0,
      },
    },
  });
  list.fail(isPage(2));

  await page.goto(`/organization/events/${uid}/attendees`);
  const checkIns = page.getByRole("button", { name: /^Check in / });
  await expect(checkIns).toHaveCount(50);

  // The failure is reported under the list, which stays.
  await checkIns.last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toContainText(
    "Could not load more attendees.",
  );
  await expect(checkIns).toHaveCount(50);

  list.recover();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(checkIns).toHaveCount(60);
  await expect(page.getByText("That's all 60 people.")).toBeVisible();

  // A new search keeps the page and the focus while its rows load.
  const release = list.hold((url) => url.searchParams.has("search"));
  const search = page.getByRole("searchbox", { name: "Search attendees" });
  await search.fill("person");
  await expect(page.getByTestId("attendee-skeleton")).toHaveCount(3);
  await expect(search).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: `Crowded Drive ${stamp}` }),
  ).toBeVisible();
  release();
  await expect(page.getByTestId("attendee-skeleton")).toHaveCount(0);
});
