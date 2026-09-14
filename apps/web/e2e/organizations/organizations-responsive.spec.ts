import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";

/**
 * Responsive/layout coverage for the two most-visited organization surfaces
 * (`/organizations` and `/organization/:handle`) — desktop *and* mobile,
 * neither of which `playwright.config.ts`'s three device projects exercise
 * on their own (all three are desktop viewports; see
 * `e2e/landing-home/README.md`'s own note on this gap). Regression tests
 * for two real bugs found and fixed September 2026:
 *
 * 1. `Navbar.tsx` used a one-off `mx-8 px-28` shell instead of the
 *    documented page shell (`docs/specs/design-system/04-spacing-layout.md`),
 *    so the header's edges drifted away from the page content's edges as
 *    the viewport grew — up to ~214px apart at a 1771px-wide desktop.
 *    `Navbar.tsx` now uses `mx-auto max-w-6xl px-9 sm:px-10 lg:px-12`,
 *    the design system's documented "default content cap" — exactly what
 *    an organization's own profile page (also `max-w-6xl`) uses, so those
 *    two line up pixel-for-pixel. `/organizations` and `/events` are
 *    deliberately wider (`max-w-7xl`, "wide grids only" per the same doc)
 *    to fit a 3-column card grid, so the header sits a documented ~64px
 *    inside their edge at desktop widths — a real, intentional difference
 *    between the two shells, not a bug. All three shells collapse to the
 *    same unwrapped `px-9` padding below their max-width, so mobile is
 *    exact everywhere regardless.
 * 2. The logged-out mobile menu's open/close controls (`GiHamburgerMenu`/
 *    `RxCross2` in `Navbar.tsx`) were bare icons with only an `onClick` —
 *    no role, no accessible name, no keyboard handler — unlike the
 *    logged-in equivalent right next to them in the same file.
 *
 * Functional/business-logic coverage for the organization lifecycle already
 * lives in `organization-setup.spec.ts`; this file is layout-only and
 * deliberately doesn't re-assert things that file already covers (the
 * setup flow, draft visibility, directory search).
 */

type LiveOrganization = { handle: string; name: string; email: string };

/**
 * Signs up a fresh organization, then goes live through the real
 * authenticated `PATCH /organizations/me` the setup wizard itself calls
 * on every "Continue" — bypassing the wizard's own screens entirely.
 *
 * Deliberately *not* clicking through `OrganizationSetup.tsx` the way
 * `organization-setup.spec.ts` does: that wizard is mid-change in this
 * checkout (`organization.model.ts`/`.service.ts`/`.validation.ts`,
 * `SetupQuestion.tsx`, `constants/organizationSetup.ts` are all modified,
 * uncommitted, as of writing this) — it grew to 13 screens including new
 * optional ones, and `organization-setup.spec.ts` itself currently fails
 * against it for the same reason. `missingRequiredFields()`
 * (organization.service.ts) is the actual, stable "is this live" contract
 * — description, tag, domains, teamSize, city — so driving that directly
 * is what keeps this file's *layout* coverage from being coupled to the
 * wizard's still-moving screen count.
 *
 * A fresh, unique identity is generated on *every call* (not a module-level
 * constant reused across tests) — `fullyParallel: true` in
 * playwright.config.ts runs every test in this file concurrently, and two
 * tests signing up with the same hardcoded email raced and 409'd each other
 * the first time this file was written with a shared `org` constant.
 */
async function publishLiveOrganization(page: Page): Promise<LiveOrganization> {
  const stamp = Date.now() + Math.floor(Math.random() * 1_000_000);
  // The name field strips anything that isn't a letter or a space as it's
  // typed (organization-setup.spec.ts's own comment), so the unique suffix
  // has to be letters.
  const suffix = String(stamp)
    .split("")
    .map((digit) => "ABCDEFGHIJ"[Number(digit)])
    .join("");
  const name = `Responsive Relief ${suffix}`;
  const email = `responsive-relief-${stamp}@example.com`;
  const password = `Testing${stamp}a`;

  await page.goto("/auth/signup");
  await page.getByRole("tab", { name: "Organization" }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="new-password"]').fill(password);
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/organization\/setup/, { timeout: 15_000 });

  const patchRes = await page.request.patch(`${E2E_API_URL}/organizations/me`, {
    data: {
      description: "A regression-test organization for the responsive layout suite.",
      tag: "NGO",
      domains: ["Disaster relief"],
      teamSize: 12,
      city: "Guwahati",
      state: "Assam",
    },
  });
  expect(patchRes.ok(), await patchRes.text()).toBeTruthy();
  const { organization: updated } = await patchRes.json();
  expect(updated.isLive, `expected the organization to be live: ${JSON.stringify(updated)}`).toBe(
    true,
  );

  await page.goto(`/organization/${updated.handle}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({ timeout: 15_000 });

  return { handle: updated.handle, name, email };
}

/**
 * No horizontal scrollbar at the current viewport — the mobile-first rule
 * every changed component in this repo must satisfy per CLAUDE.md.
 *
 * Checked by actually trying to scroll the page sideways, not by comparing
 * `documentElement.scrollWidth` to the viewport: `body { overflow-x:
 * hidden }` (index.css) is a deliberate, standing safety net in this app,
 * and `scrollWidth` reports an element's full content extent regardless of
 * whether that overflow is clipped — it flagged `DirectoryToolbar`'s cause
 * filters (an intentional `-mx-9`/`overflow-x-auto` edge-to-edge scroller,
 * contained by that same body rule) as "overflowing" even though nothing
 * is visible or scrollable past the viewport edge. `window.scrollX` after
 * a scroll attempt is what a real user's horizontal swipe/scrollbar would
 * actually observe.
 */
async function expectNoHorizontalOverflow(page: Page) {
  const scrollX = await page.evaluate(() => {
    window.scrollTo(9999, window.scrollY);
    return window.scrollX;
  });
  expect(scrollX, "the page itself must not be horizontally scrollable").toBe(0);
}

/**
 * The navbar's own left edge must be within `maxDriftPx` of `contentEdge`'s
 * left edge — see the file-level comment for why that allowance is 1 on a
 * `max-w-6xl` page (an exact match is expected) but ~64px on a `max-w-7xl`
 * one (the two shells' documented, intentional difference: a wide card
 * grid legitimately extends further left/right than the narrower navbar
 * sitting above it).
 *
 * `contentEdge` must be an element that sits flush against the page
 * shell's own edge, not merely "the first heading" — an organization's own
 * name (`<h1>`) is *not* flush on `/organization/:handle`, it's padded
 * inside the white profile card below it, unlike `/organizations`' `<h1>`
 * which has no such wrapper. Each call site below passes the element that
 * is actually flush on that specific page.
 */
async function expectHeaderAlignedToContent(
  page: Page,
  contentEdge: Locator,
  maxDriftPx: number,
) {
  const logoBox = await page.locator('nav a[href="/"]').boundingBox();
  expect(logoBox, "navbar logo must have a layout box").not.toBeNull();

  const contentBox = await contentEdge.boundingBox();
  expect(contentBox, "content edge element must have a layout box").not.toBeNull();

  if (logoBox && contentBox) {
    const drift = Math.abs(logoBox.x - contentBox.x);
    expect(
      drift,
      `navbar left edge (${logoBox.x}) is ${drift}px from the content left edge (${contentBox.x}), expected at most ${maxDriftPx}px`,
    ).toBeLessThanOrEqual(maxDriftPx);
  }
}

test.describe("Organizations directory — responsive", () => {
  test("renders with no horizontal overflow and an aligned header, at mobile and desktop widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/organizations");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // max-w-7xl body vs. the navbar's max-w-6xl — see file-level comment.
    await expectHeaderAlignedToContent(page, heading, 70);

    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoHorizontalOverflow(page);
    await expectHeaderAlignedToContent(page, heading, 1);
  });

  test("the mobile menu is a real, keyboard-reachable control", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/organizations");

    const openButton = page.getByRole("button", { name: "Open menu" });
    await expect(openButton).toBeVisible();

    await openButton.focus();
    await page.keyboard.press("Enter");

    const closeButton = page.getByRole("button", { name: "Close menu" });
    await expect(closeButton).toBeVisible();
    await expect(page.getByRole("link", { name: "Organizations" }).last()).toBeVisible();

    await closeButton.focus();
    await page.keyboard.press("Enter");
    await expect(closeButton).toBeHidden();
  });
});

test.describe("Organization profile — responsive", () => {
  test("renders with no horizontal overflow and an aligned header, at mobile and desktop widths", async ({
    page,
  }) => {
    const org = await publishLiveOrganization(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/organization/${org.handle}`);
    await expect(page.getByRole("heading", { level: 1, name: org.name })).toBeVisible();
    // The "All organizations" back-link, not the org's own <h1> — that
    // heading is padded inside the white profile card below it, so it
    // isn't flush with the page shell's edge the way this link is.
    const backLink = page.getByRole("link", { name: "All organizations" });
    await expectNoHorizontalOverflow(page);
    // Both the navbar and this page use max-w-6xl — exact match expected.
    await expectHeaderAlignedToContent(page, backLink, 1);

    await page.setViewportSize({ width: 375, height: 812 });
    await expectNoHorizontalOverflow(page);
    await expectHeaderAlignedToContent(page, backLink, 1);
  });

  test("the sponsor modal opens usably on a mobile viewport, with no overflow", async ({
    page,
  }) => {
    const org = await publishLiveOrganization(page);

    // Sponsorship is off by default and has no toggle in the guided setup
    // flow (see organization.model.ts) — flip it on the same way an owner's
    // dashboard would, through the real authenticated PATCH the app itself
    // uses, so this test exercises the real endpoint rather than seeding
    // the database directly. Reuses `page`'s own cookie-bearing context
    // (not a separate `request` fixture) since the auth cookie was set for
    // the API's own origin during signup above.
    const patchRes = await page.request.patch(`${E2E_API_URL}/organizations/me`, {
      data: { sponsorship: { enabled: true } },
    });
    expect(patchRes.ok(), await patchRes.text()).toBeTruthy();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/organization/${org.handle}`);

    const supportButton = page.getByRole("button", { name: `Support ${org.name}` });
    await expect(supportButton).toBeVisible();
    await supportButton.click();

    const modalHeading = page.getByRole("heading", { name: `Support ${org.name}` });
    await expect(modalHeading).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // The whole dialog must actually fit in the 375px-wide viewport, not
    // just avoid a scrollbar — a modal wider than the viewport would still
    // pass the document-level overflow check above.
    const dialogBox = await modalHeading
      .locator("xpath=ancestor::div[@role='dialog']")
      .boundingBox();
    if (dialogBox) {
      expect(dialogBox.width).toBeLessThanOrEqual(375);
    }
  });
});
