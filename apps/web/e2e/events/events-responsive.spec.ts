import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";
import { chooseFilter, chooseKind } from "./event-helpers";

/**
 * Responsive/behavior coverage for `/events` (September 2026 rewrite —
 * see `docs/specs/events.md`): live `GET /events` data instead of the
 * `constants/eventDirectory.ts` fixture, an Upcoming/Past filter instead
 * of a cause taxonomy (a live event has no cause field at all), a second
 * invite/mode `TypeFilter`, and one flat grid rather than same-day grouped
 * sections (grouping removed the same month it shipped, once the seed
 * data's real date spread showed most day-sections holding one event).
 *
 * Directory fixtures use direct authenticated API calls so each browser
 * test controls exact dates and filters.
 * The final test exercises the organizer's full-page publishing flow.
 */

type EventMode = "Online" | "Offline";

async function signUpOrganization(page: Page, stamp: number) {
  const suffix = String(stamp)
    .split("")
    .map((digit) => "ABCDEFGHIJ"[Number(digit)])
    .join("");
  const email = `events-host-${stamp}@example.com`;
  const password = `Testing${stamp}a`;

  await page.goto("/auth/signup");
  await page.getByRole("tab", { name: "Organization" }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="name"]').fill(`Events Host ${suffix}`);
  await page.locator('input[name="new-password"]').fill(password);
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/organization\/setup/, { timeout: 15_000 });

  return { name: `Events Host ${suffix}` };
}

/**
 * The directory loads 12 cards at a time and searches on the API, so a test
 * that shares the E2E database with other specs narrows to its own events
 * by the unique stamp in their names instead of hoping they land on page one.
 */
async function searchDirectory(page: Page, text: string) {
  await page.getByRole("searchbox", { name: "Search events" }).fill(text);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Publishes an event through the API. The API rejects a start in the past and
 * an end that is not after the start, so a future `startDate` is used as given
 * (ending two hours later), and a past one is created in the future and then
 * moved into the past with the E2E-only backdate route
 * (`apps/api/tests/e2e/test-routes.ts`), which is how a real event reaches
 * that state.
 */
async function createEvent(
  page: Page,
  opts: {
    uid: string;
    name: string;
    description: string;
    mode: EventMode;
    startDate: Date;
    city?: string;
    access?: "open" | "approval" | "invite";
  },
) {
  const isPast = opts.startDate.getTime() <= Date.now();
  const start = isPast ? new Date(Date.now() + DAY_MS) : opts.startDate;
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  const res = await page.request.post(`${E2E_API_URL}/events/create`, {
    data: {
      uid: opts.uid,
      name: opts.name,
      description: opts.description,
      coverImage: `https://picsum.photos/seed/${opts.uid}/800/450`,
      mode: opts.mode,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      access: opts.access,
      ...(opts.mode === "Offline"
        ? {
            city: opts.city ?? "Guwahati",
            state: "Assam",
            country: "India",
            address: "Fancy Bazaar",
            mapIframe: "https://maps.example.com",
          }
        : { platform: "Zoom", platformLink: "https://zoom.example.com/j/1" }),
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();

  if (isPast) {
    const daysAgo = Math.max(
      1,
      Math.round((Date.now() - opts.startDate.getTime()) / DAY_MS),
    );
    const backdate = await page.request.post(
      `${E2E_API_URL}/__test__/events/${opts.uid}/backdate`,
      { data: { daysAgo } },
    );
    expect(backdate.status(), await backdate.text()).toBe(204);
  }
}

/** Same guarantee as organizations-responsive.spec.ts's own version — see
 *  that file's comment on why this beats a raw `scrollWidth` comparison
 *  (`body { overflow-x: hidden }` in index.css is a deliberate, standing
 *  safety net that a naive `scrollWidth` check would flag as a false
 *  positive). */
async function expectNoHorizontalOverflow(page: Page) {
  const scrollX = await page.evaluate(() => {
    window.scrollTo(9999, window.scrollY);
    return window.scrollX;
  });
  expect(scrollX, "the page itself must not be horizontally scrollable").toBe(
    0,
  );
}

test("the directory renders both an upcoming and a past event, filterable by time, with no horizontal overflow at mobile or desktop", async ({
  page,
}) => {
  const stamp = Date.now() + Math.floor(Math.random() * 1_000_000);
  await signUpOrganization(page, stamp);

  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await createEvent(page, {
    uid: `evt-e2e-upcoming-${stamp}`,
    name: `Riverbank Cleanup ${stamp}`,
    description: "A future, offline, regression-test event.",
    mode: "Offline",
    startDate: future,
    city: "Guwahati",
  });
  await createEvent(page, {
    uid: `evt-e2e-past-${stamp}`,
    name: `Past Fundraiser ${stamp}`,
    description: "A past, online, regression-test event.",
    mode: "Online",
    startDate: past,
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/events");

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await searchDirectory(page, String(stamp));

  // Default filter is Upcoming — the future event shows, the past one
  // doesn't.
  await expect(page.getByText(`Riverbank Cleanup ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Past Fundraiser ${stamp}`)).toHaveCount(0);

  // The time filter is a group inside the one "Filters" panel.
  await chooseFilter(page, "Past");
  await expect(page.getByText(`Past Fundraiser ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Riverbank Cleanup ${stamp}`)).toHaveCount(0);

  // The navbar's left edge should be within the documented ~64px of this
  // max-w-7xl page's content edge — see
  // organizations-responsive.spec.ts's file-level comment for why that
  // gap is real and intentional (the navbar's own shell is max-w-6xl).
  const logoBox = await page.locator('nav a[href="/"]').boundingBox();
  const headingBox = await heading.boundingBox();
  expect(logoBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(Math.abs(logoBox!.x - headingBox!.x)).toBeLessThanOrEqual(70);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  const mobileLogoBox = await page.locator('nav a[href="/"]').boundingBox();
  const mobileHeadingBox = await heading.boundingBox();
  expect(mobileLogoBox).not.toBeNull();
  expect(mobileHeadingBox).not.toBeNull();
  expect(Math.abs(mobileLogoBox!.x - mobileHeadingBox!.x)).toBeLessThanOrEqual(
    1,
  );
});

test("the toolbar keeps every control on screen between phone and desktop widths", async ({
  page,
}) => {
  // A signed-in organization sees the widest toolbar: "Filters" and
  // "Create an event".
  await signUpOrganization(page, Date.now() + Math.floor(Math.random() * 1e6));
  await page.goto("/events");

  const filters = page.getByRole("button", { name: /^Filters/ });
  const controls = [
    page.getByRole("searchbox", { name: "Search events" }),
    filters,
    page.getByRole("link", { name: "Create an event" }),
  ];

  // `body` hides horizontal overflow, so a control that does not fit is cut
  // off rather than scrollable: measure each one against the screen.
  for (const width of [640, 700, 768, 834, 900, 1024, 3840]) {
    await page.setViewportSize({ width, height: 900 });
    for (const control of controls) {
      await expect(async () => {
        const box = await control.boundingBox();
        expect(box, `a control is missing at ${width}px`).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }).toPass();
    }

    // The panel opens on screen wherever its button wrapped to.
    await filters.click();
    const panel = page.getByRole("dialog", { name: "Filters" });
    await expect(async () => {
      const box = await panel.boundingBox();
      expect(box, `filter panel at ${width}px`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }).toPass();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(filters).toBeFocused();
  }
});

test("filters are fetched once, only when they are applied", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const requests: URL[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/events" && url.searchParams.has("period")) {
      requests.push(url);
    }
  });
  await page.goto("/events");
  await expect(page.getByText("Loading events")).toHaveCount(0);

  const filters = page.getByRole("button", { name: /^Filters/ });
  await expect(filters).toHaveAccessibleName("Filters");
  await filters.click();
  const panel = page.getByRole("dialog", { name: "Filters" });
  const before = requests.length;

  const choose = async () => {
    await panel.getByRole("radio", { name: "Past" }).check();
    await panel.getByRole("radio", { name: "Online" }).check();
    await panel.getByRole("radio", { name: "Fundraiser" }).check();
  };

  // Closing without applying throws the choices away.
  await choose();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(filters).toHaveAccessibleName("Filters");
  await filters.click();
  await expect(panel.getByRole("radio", { name: "Upcoming" })).toBeChecked();
  expect(requests).toHaveLength(before);

  await choose();
  expect(requests).toHaveLength(before);
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect(panel).toHaveCount(0);
  await expect(filters).toHaveAccessibleName("Filters, 3 active");
  await expect.poll(() => requests.length).toBe(before + 1);
  const applied = requests[before].searchParams;
  expect(applied.get("period")).toBe("past");
  expect(applied.get("mode")).toBe("Online");
  expect(applied.get("type")).toBe("fundraiser");

  // "Clear all" is a choice like any other: it waits to be applied.
  await filters.click();
  await panel.getByRole("button", { name: "Clear all" }).click();
  for (const name of ["Upcoming", "All formats", "All kinds"]) {
    await expect(panel.getByRole("radio", { name })).toBeChecked();
  }
  await expect(filters).toHaveAccessibleName("Filters, 3 active");
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect(filters).toHaveAccessibleName("Filters");
});

test("a phone opens the filters as a bottom sheet and shows a long event name in full", async ({
  page,
}) => {
  const stamp = Date.now() + Math.floor(Math.random() * 1e6);
  await signUpOrganization(page, stamp);
  const name = `Flood Preparedness Volunteer Training ${stamp}`;
  await createEvent(page, {
    uid: `evt-e2e-long-name-${stamp}`,
    name,
    description: "A long-named regression-test event.",
    mode: "Offline",
    startDate: new Date(Date.now() + 7 * DAY_MS),
  });

  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/events");
    await searchDirectory(page, String(stamp));

    const title = page.getByRole("link", { name });
    await expect(title).toBeVisible();
    // Two lines hold the whole name, give or take a long stamp on 320px.
    const lines = await title.evaluate(
      (link) =>
        link.getBoundingClientRect().height /
        parseFloat(getComputedStyle(link).lineHeight),
    );
    expect(Math.round(lines)).toBe(2);

    const filters = page.getByRole("button", { name: /^Filters/ });
    await filters.click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    // Full width, against the bottom edge.
    await expect(async () => {
      const box = await sheet.boundingBox();
      expect(box, `filter sheet at ${width}px`).not.toBeNull();
      expect(Math.round(box!.x)).toBe(0);
      expect(Math.round(box!.width)).toBe(width);
      expect(Math.round(box!.y + box!.height)).toBe(812);
    }).toPass();
    const apply = sheet.getByRole("button", { name: "Apply filters" });
    await expect(apply).toBeInViewport();
    await apply.click();
    await expect(sheet).toHaveCount(0);
    await expect(filters).toBeFocused();
  }
});

test("the directory holds its shape while loading and never counts a failed load", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === "/events" && url.searchParams.has("period"),
    async (route) => {
      await held;
      await route.abort();
    },
  );

  await page.goto("/events");
  await expect(page.getByTestId("event-card-skeleton")).toHaveCount(6);
  await expect(page.getByText("Loading events")).toBeVisible();

  release();
  await expect(
    page.getByRole("heading", { name: "Could not load events" }),
  ).toBeVisible();
  await expect(page.getByText("0 events")).toHaveCount(0);
});

test("search narrows the directory by city", async ({ page }) => {
  const stamp = Date.now() + Math.floor(Math.random() * 1_000_000);
  await signUpOrganization(page, stamp);

  await createEvent(page, {
    uid: `evt-e2e-mumbai-${stamp}`,
    name: `Mumbai Drive ${stamp}`,
    description: "Offline event in Mumbai.",
    mode: "Offline",
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    city: `Mumbai ${stamp}`,
  });
  await createEvent(page, {
    uid: `evt-e2e-delhi-${stamp}`,
    name: `Delhi Drive ${stamp}`,
    description: "Offline event in Delhi.",
    mode: "Offline",
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    city: `Delhi ${stamp}`,
  });

  await page.goto("/events");
  await searchDirectory(page, String(stamp));
  await expect(page.getByText(`Mumbai Drive ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Delhi Drive ${stamp}`)).toBeVisible();

  // The city is matched by the API, not by the browser.
  await searchDirectory(page, `Mumbai ${stamp}`);
  await expect(page.getByText(`Mumbai Drive ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Delhi Drive ${stamp}`)).toHaveCount(0);
});

test("the type filter narrows by who can join and by online/offline", async ({
  page,
}) => {
  const stamp = Date.now() + Math.floor(Math.random() * 1_000_000);
  await signUpOrganization(page, stamp);

  const soon = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await createEvent(page, {
    uid: `evt-e2e-invite-${stamp}`,
    name: `Founders Preview ${stamp}`,
    description: "Offline, invite-only regression-test event.",
    mode: "Offline",
    startDate: soon(3),
    city: "Pune",
    access: "invite",
  });
  await createEvent(page, {
    uid: `evt-e2e-open-online-${stamp}`,
    name: `Open Webinar ${stamp}`,
    description: "Online, open-to-all regression-test event.",
    mode: "Online",
    startDate: soon(4),
    access: "open",
  });

  await page.goto("/events");
  await searchDirectory(page, String(stamp));
  await expect(page.getByText(`Founders Preview ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Open Webinar ${stamp}`)).toBeVisible();

  await chooseFilter(page, "Invite only");
  await expect(page.getByText(`Founders Preview ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Open Webinar ${stamp}`)).toHaveCount(0);

  await chooseFilter(page, "Online");
  await expect(page.getByText(`Open Webinar ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Founders Preview ${stamp}`)).toHaveCount(0);
});

test("an organization publishes an in-person event from the full-page form", async ({
  page,
}) => {
  const stamp = `${Date.now()}${process.pid}`;
  await signUpOrganization(page, Number(stamp.slice(-12)));
  const publishedProfile = await page.request.patch(
    `${E2E_API_URL}/organizations/me`,
    {
      data: {
        description:
          "We bring local communities together through practical support and shared events.",
        tag: "NGO",
        domains: ["Disaster relief"],
        teamSize: 12,
        city: "Guwahati",
        state: "Assam",
      },
    },
  );
  expect(publishedProfile.ok(), await publishedProfile.text()).toBeTruthy();

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/organization/events/new");
  await expect(
    page.getByRole("heading", { name: "Bring people together" }),
  ).toBeVisible();
  await expect(page.getByText("Live preview")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const eventName = `Riverbank Cleanup ${stamp.slice(-8)}`;
  const eventSlug = eventName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  await expect(page.getByText("0 / 80")).toBeVisible();
  await expect(page.getByLabel("About this event")).toHaveAttribute(
    "placeholder",
    /What will people do together/,
  );
  await page.getByLabel("Event name").fill(eventName);
  await expect(page.getByText(`${eventName.length} / 80`)).toBeVisible();
  await expect(page.getByLabel("Event page address")).toHaveValue(eventSlug);
  await page
    .getByLabel("About this event")
    .fill(
      "Join our community team to clear the riverbank and prepare the neighborhood for the rainy season.",
    );
  await expect(page.getByText("97 / 200")).toBeVisible();
  await page.locator("#coverImage").setInputFiles({
    name: "riverbank.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lqUAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await chooseKind(page, "volunteering");
  await page.getByRole("button", { name: /Online/ }).click();
  await page.getByLabel("Meeting link").fill("zoom.example.com/j/123");
  await page.getByRole("button", { name: "Publish event" }).click();
  await expect(
    page.getByText("Enter a complete link starting with http:// or https://", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /In person/ }).click();
  await page.getByLabel("Street address").fill("12 River Road");
  await page.getByLabel("City").fill("Guwahati");
  await page.getByLabel("State or region").fill("Assam");
  await page.getByRole("button", { name: "Publish event" }).click();

  await expect(page).toHaveURL(new RegExp(`/events/${eventSlug}$`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { level: 1, name: eventName }),
  ).toBeVisible();
  await expect(page.getByText("Hosted by", { exact: true })).toBeVisible();
  await page.goto("/events/mine?tab=hosting");
  // Anchored: the row's "Edit <name>" link also contains the event name.
  await expect(
    page.getByRole("link", { name: new RegExp(`^${eventName}`) }),
  ).toBeVisible();
});
