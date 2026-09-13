import { expect, test } from "@playwright/test";

/**
 * Home.tsx's page structure below the hero, and the footer's newsletter
 * form. Basic navbar-link navigation (Organizations/Events) is already
 * covered by ../smoke.spec.ts and isn't repeated here.
 *
 * The three marketing sections (HowItWorks, DrivesRail, OpenSource) are
 * static, illustrative content — no API calls, no data-dependent branching
 * — so these are presence checks, not behavioral tests. See
 * docs/specs/landing-home.md for why each section looks the way it does.
 */

test("renders the hero and all three marketing sections in order", async ({ page }) => {
  await page.goto("/");

  const headings = [
    page.getByRole("heading", { name: /we connect ngos/i }),
    page.locator("#how-it-works-heading"),
    page.locator("#drives-heading"),
    page.locator("#open-source-heading"),
  ];

  for (const heading of headings) {
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }
});

test("the drives rail's funding bars are real progressbars", async ({ page }) => {
  await page.goto("/");
  await page.locator("#drives-heading").scrollIntoViewIfNeeded();

  // "Illustrative sample content, not live data" per landing-home.md —
  // this only checks the cards render with the shape a real drive record
  // would have, not that any particular drive appears.
  const bars = page.getByRole("progressbar");
  await expect(bars.first()).toBeVisible();
  expect(await bars.count()).toBeGreaterThan(0);
});

test("the newsletter form shows an acknowledgment and clears on submit", async ({ page }) => {
  await page.goto("/");
  const emailField = page.getByPlaceholder("Enter your email");
  await emailField.scrollIntoViewIfNeeded();

  await emailField.fill("interested@example.com");
  await page.getByRole("button", { name: "Subscribe" }).click();

  // There is no newsletter endpoint anywhere in this app (see
  // known-issues.md) — the acknowledgment is honest about not claiming to
  // have captured anything, and the field clearing is the only other
  // observable effect worth asserting on.
  await expect(
    page.getByText("Thanks for the interest, newsletter signups are coming soon!"),
  ).toBeVisible();
  await expect(emailField).toHaveValue("");
});

test("submitting the newsletter form with no email is a no-op", async ({ page }) => {
  await page.goto("/");
  const emailField = page.getByPlaceholder("Enter your email");
  await emailField.scrollIntoViewIfNeeded();

  // type="email" + required means the browser's own validation blocks
  // submission before handleSubscribe's `if (!email.trim()) return` guard
  // is ever reached — either way, no toast should appear.
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(
    page.getByText("Thanks for the interest, newsletter signups are coming soon!"),
  ).toHaveCount(0);
});
