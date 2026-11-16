import { expect, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";

/**
 * Shared setup for the events attendee and online-publishing specs.
 *
 * Everything here talks to the isolated E2E API (port 5051) and the E2E web
 * dev server (port 3001) only. Each test builds its own accounts and events
 * from a unique stamp, because spec files run in parallel and the database is
 * not reset between them (see docs/specs/testing.md).
 *
 * Two kinds of account are involved. An organization signs up through the
 * real UI in one browser context and publishes events with that session's
 * cookie. An attendee signs up through the real UI in a second, separate
 * browser context, so the two never share a session.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A 1x1 PNG, accepted by the API as an uploaded cover image. It avoids any
 *  request to a third-party image host from a test run. */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lqUAAAAASUVORK5CYII=";

export function uniqueStamp(): number {
  return Date.now() + Math.floor(Math.random() * 1_000_000);
}

/** Digits are stripped from names by the sign-up form, so a stamp becomes
 *  letters before it is used inside a person's or organization's name. */
export function stampToLetters(stamp: number): string {
  return String(stamp)
    .split("")
    .map((digit) => "ABCDEFGHIJ"[Number(digit)])
    .join("");
}

/** Signs an organization up through the real UI and leaves `page` signed in.
 *  Resolves once the browser has landed on the organization setup page. */
export async function signUpOrganization(page: Page, stamp: number) {
  const name = `Events Host ${stampToLetters(stamp)}`;
  const email = `events-host-${stamp}@example.com`;

  await page.goto("/auth/signup");
  await page.getByRole("tab", { name: "Organization" }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="new-password"]').fill(`Testing${stamp}a`);
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/organization\/setup/, { timeout: 15_000 });

  return { name, email };
}

/** Fills in the organization's public profile through the API so the signed
 *  in organization can open the publishing form. */
export async function publishOrganizationProfile(page: Page) {
  const response = await page.request.patch(`${E2E_API_URL}/organizations/me`, {
    data: {
      description:
        "We bring local communities together through practical support and shared events.",
      tag: "NGO",
      domains: ["Disaster relief"],
      teamSize: 12,
      city: "Guwahati",
      state: "Assam",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Signs an individual attendee up through the real UI and leaves `page`
 *  signed in on the home page. */
export async function signUpIndividual(page: Page, stamp: number) {
  const email = `events-attendee-${stamp}@example.com`;

  await page.goto("/auth/signup");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible({ timeout: 10_000 });
  await page.locator('input[name="name"]').fill("Event Attendee");
  await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  return { email };
}

export interface SeedEventOptions {
  /** The event page address: `/events/<uid>`. Lowercase letters, digits, hyphens. */
  uid: string;
  name: string;
  /** Days from now that the event starts. Must be positive: the API rejects
   *  an event that starts in the past (use `backdateEvent` afterwards). */
  startsInDays?: number;
  inviteOnly?: boolean;
  mode?: "Online" | "Offline";
  /** Most people who can join; leave out for no limit. */
  capacity?: number;
}

/** Publishes an event as the organization signed in on `page`. The API only
 *  accepts a start time in the future and an end after the start. */
export async function createEvent(page: Page, options: SeedEventOptions) {
  const { uid, name, startsInDays = 3, inviteOnly = false, capacity } = options;
  const mode = options.mode ?? "Offline";
  const start = new Date(Date.now() + startsInDays * DAY_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);

  const response = await page.request.post(`${E2E_API_URL}/events/create`, {
    data: {
      uid,
      name,
      description: "A regression-test event created by the Playwright suite.",
      coverImage: `data:image/png;base64,${TINY_PNG_BASE64}`,
      mode,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      inviteOnly,
      ...(capacity === undefined ? {} : { capacity }),
      ...(mode === "Offline"
        ? {
            city: "Guwahati",
            state: "Assam",
            country: "India",
            address: "Fancy Bazaar",
          }
        : {
            platform: "Zoom Meeting",
            platformLink: "https://zoom.example.com/j/1",
          }),
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Moves an existing event into the past through the E2E server's test-only
 *  route (`apps/api/tests/e2e/test-routes.ts`). Registrations are kept. */
export async function backdateEvent(page: Page, uid: string, daysAgo: number) {
  const response = await page.request.post(
    `${E2E_API_URL}/__test__/events/${uid}/backdate`,
    { data: { daysAgo } },
  );
  expect(response.status(), await response.text()).toBe(204);
}

/** Opens the signed-in attendee's account menu and follows "My Events".
 *  Desktop width only: the menu is a different control on a phone. */
export async function openMyEventsFromMenu(page: Page) {
  await page
    .getByRole("navigation")
    .getByText("Profile", { exact: true })
    .click();
  await page.getByRole("link", { name: "My Events", exact: true }).click();
  await expect(page).toHaveURL(/\/events\/mine$/);
}
