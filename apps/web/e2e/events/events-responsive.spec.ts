import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";

/**
 * Responsive/behavior coverage for `/events` (September 2026 rewrite —
 * see `docs/specs/events.md`): live `GET /events` data instead of the
 * `constants/eventDirectory.ts` fixture, an Upcoming/Past filter instead
 * of a cause taxonomy (a live event has no cause field at all), a second
 * invite/mode `TypeFilter`, and one flat grid rather than same-day grouped
 * sections (grouping removed the same month it shipped, once the seed
 * data's real date spread showed most day-sections holding one event).
 *
 * Test events are created via a direct authenticated `POST /events/create`
 * call, not through either "create event" UI component — both are
 * documented as broken/unreachable (`known-issues.md`), and
 * `createEvent()`'s own required-field contract (`event.validation.ts`)
 * doesn't require the host organization to be "live"/complete the way
 * viewing an organization's *profile* does, so signup alone is enough.
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

async function createEvent(
  page: Page,
  opts: {
    uid: string;
    name: string;
    description: string;
    mode: EventMode;
    startDate: Date;
    city?: string;
    inviteOnly?: boolean;
  },
) {
  const res = await page.request.post(`${E2E_API_URL}/events/create`, {
    data: {
      uid: opts.uid,
      name: opts.name,
      description: opts.description,
      coverImage: `https://picsum.photos/seed/${opts.uid}/800/450`,
      mode: opts.mode,
      startDate: opts.startDate.toISOString(),
      endDate: opts.startDate.toISOString(),
      startTime: opts.startDate.toISOString(),
      endTime: opts.startDate.toISOString(),
      inviteOnly: opts.inviteOnly,
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
  expect(scrollX, "the page itself must not be horizontally scrollable").toBe(0);
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

  // Default filter is Upcoming — the future event shows, the past one
  // doesn't.
  await expect(page.getByText(`Riverbank Cleanup ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Past Fundraiser ${stamp}`)).toHaveCount(0);

  // The time filter is a dropdown (`FilterDropdown`), not a bare chip — its
  // trigger always shows the current selection ("Upcoming" here) as its own
  // accessible name prefix, so the click target is the "Filter by time"
  // substring rather than the literal option text.
  await page.getByRole("button", { name: "Filter by time" }).click();
  await page.getByRole("option", { name: "Past" }).click();
  await expect(page.getByText(`Past Fundraiser ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Riverbank Cleanup ${stamp}`)).toHaveCount(0);

  // The navbar's left edge should be within the documented ~64px of this
  // max-w-7xl page's content edge — see
  // organizations-responsive.spec.ts's file-level comment for why that
  // gap is real and intentional (the navbar's own shell is max-w-6xl).
  const logoBox = await page.locator('nav a[href="/"]').boundingBox();
  const headingBox = await heading.boundingBox();
  if (logoBox && headingBox) {
    expect(Math.abs(logoBox.x - headingBox.x)).toBeLessThanOrEqual(70);
  }
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  const mobileLogoBox = await page.locator('nav a[href="/"]').boundingBox();
  const mobileHeadingBox = await heading.boundingBox();
  if (mobileLogoBox && mobileHeadingBox) {
    expect(Math.abs(mobileLogoBox.x - mobileHeadingBox.x)).toBeLessThanOrEqual(1);
  }
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
    city: "Mumbai",
  });
  await createEvent(page, {
    uid: `evt-e2e-delhi-${stamp}`,
    name: `Delhi Drive ${stamp}`,
    description: "Offline event in Delhi.",
    mode: "Offline",
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    city: "Delhi",
  });

  await page.goto("/events");
  await expect(page.getByText(`Mumbai Drive ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Delhi Drive ${stamp}`)).toBeVisible();

  await page.getByRole("searchbox", { name: "Search events" }).fill("Mumbai");
  await expect(page.getByText(`Mumbai Drive ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Delhi Drive ${stamp}`)).toHaveCount(0);
});

test("the type filter narrows by invite-only/open-to-all and online/offline", async ({
  page,
}) => {
  const stamp = Date.now() + Math.floor(Math.random() * 1_000_000);
  await signUpOrganization(page, stamp);

  const soon = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await createEvent(page, {
    uid: `evt-e2e-invite-${stamp}`,
    name: `Founders Preview ${stamp}`,
    description: "Offline, invite-only regression-test event.",
    mode: "Offline",
    startDate: soon(3),
    city: "Pune",
    inviteOnly: true,
  });
  await createEvent(page, {
    uid: `evt-e2e-open-online-${stamp}`,
    name: `Open Webinar ${stamp}`,
    description: "Online, open-to-all regression-test event.",
    mode: "Online",
    startDate: soon(4),
    inviteOnly: false,
  });

  await page.goto("/events");
  await expect(page.getByText(`Founders Preview ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Open Webinar ${stamp}`)).toBeVisible();

  // Same dropdown pattern as "Filter by time" - the trigger's own text is
  // the current selection ("All" by default).
  await page.getByRole("button", { name: "Filter by type" }).click();
  await page.getByRole("option", { name: "Invite only" }).click();
  await expect(page.getByText(`Founders Preview ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Open Webinar ${stamp}`)).toHaveCount(0);

  await page.getByRole("button", { name: "Filter by type" }).click();
  await page.getByRole("option", { name: "Online" }).click();
  await expect(page.getByText(`Open Webinar ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Founders Preview ${stamp}`)).toHaveCount(0);
});
