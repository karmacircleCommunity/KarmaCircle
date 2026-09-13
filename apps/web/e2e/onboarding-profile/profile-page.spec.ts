import { expect, test } from "@playwright/test";

/**
 * Profile.tsx, routed at /user/:userName — the only part of
 * onboarding-profile actually reachable through normal navigation.
 *
 * ProfileCompletion (the "complete your profile" modal) is mounted
 * nowhere in the current app — Profile.tsx sets the state meant to show
 * it but never reads that state in its JSX, and Dashboard.tsx stopped
 * mounting it in favor of OrganizationSetupGate. There is nothing for
 * Playwright to drive there; see docs/specs/onboarding-profile.md and
 * ../README.md for what that actually means for this folder's coverage.
 *
 * UserProfile.tsx (a second, more developed profile page) has no route at
 * all — also untestable through navigation, also documented in
 * ../README.md rather than silently skipped.
 */

async function signUpIndividual(
  page: import("@playwright/test").Page,
  label: string,
): Promise<{ email: string; userName: string }> {
  const email = `profile-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  await page.goto("/auth/signup");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('input[name="name"]').fill(`Profile Test ${label}`);
  await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  // The userName the backend derived from the email (see auth.md) is the
  // only handle for /user/:userName — read it back off the Navbar's own
  // account-menu link rather than guessing the derivation rule here.
  await page.getByRole("navigation").getByText("Profile", { exact: true }).click();
  const link = page.getByRole("link", { name: "Your Profile" });
  const href = await link.getAttribute("href");
  const userName = href?.replace(/^\/user\//, "") ?? "";
  expect(userName).not.toBe("");

  return { email, userName };
}

test("viewing your own profile shows Edit profile and Logout", async ({ page }) => {
  const { userName } = await signUpIndividual(page, "own");
  await page.goto(`/user/${userName}`);

  await expect(page.getByRole("button", { name: "Edit profile" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Subscribe" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sponsor" })).toHaveCount(0);
});

test("viewing someone else's profile shows Subscribe and Sponsor instead", async ({
  page,
  browser,
}) => {
  // A second, unrelated account, signed up in its own browser context so
  // its session cookie never touches the viewer's — otherwise "viewing
  // someone else's profile" would actually still be logged in as them.
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  const { userName: otherUserName } = await signUpIndividual(otherPage, "other");
  await otherContext.close();

  await signUpIndividual(page, "viewer");
  await page.goto(`/user/${otherUserName}`);

  await expect(page.getByRole("button", { name: "Subscribe" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sponsor" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit profile" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Logout" })).toHaveCount(0);
});

test("clicking Edit profile currently has no visible effect (documented, not fixed)", async ({
  page,
}) => {
  // See docs/specs/onboarding-profile.md: toggleProfileModal() updates
  // state nothing reads. This pins the current, known-broken behavior
  // down as a regression trip-wire — if this test ever starts failing
  // because a modal *does* open, update it (and the docs) rather than
  // treating the failure as a real regression.
  const { userName } = await signUpIndividual(page, "editnoop");
  await page.goto(`/user/${userName}`);

  await page.getByRole("button", { name: "Edit profile" }).first().click();

  // No modal, no navigation — toggleProfileModal() flips state nothing
  // reads (see the comment above), so the only honest assertion is that
  // nothing observably changed. (Not asserting on the <h1> here: a fresh
  // individual signup has no firstName/lastName at all — those are only
  // ever set via the profile-completion flow, itself unreachable through
  // the UI today — so it legitimately renders empty at this point.)
  await expect(page).toHaveURL(new RegExp(`/user/${userName}$`));
  await expect(page.getByRole("button", { name: "Edit profile" }).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Logout actually logs out", async ({ page }) => {
  const { userName } = await signUpIndividual(page, "logout");
  await page.goto(`/user/${userName}`);

  await page.getByRole("button", { name: "Logout" }).first().click();

  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByRole("navigation").getByText("Sign Up")).toBeVisible();
  await expect(page.getByRole("navigation").getByText("Profile", { exact: true })).toHaveCount(0);
});

test("the desktop and mobile button rows are mutually exclusive, not duplicated", async ({
  page,
}) => {
  const { userName } = await signUpIndividual(page, "responsive");
  await page.goto(`/user/${userName}`);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("button", { name: "Edit profile" })).toHaveCount(1);

  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole("button", { name: "Edit profile" })).toHaveCount(1);
});
