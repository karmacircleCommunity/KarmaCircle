import { expect, test } from "@playwright/test";

/**
 * The "email" step and the "signup" branch of Auth.tsx — the single page
 * mounted at both /auth/signin and /auth/signup (see
 * docs/specs/authentication.md). Sign-in is covered separately in
 * signin.spec.ts; this file only exercises paths that land on "signup".
 *
 * Every test uses its own unique email (Date.now()-based) — this suite
 * runs fully parallel and there's no reset between spec files (see
 * ../README.md and docs/specs/testing.md).
 */

function uniqueEmail(label: string): string {
  return `signup-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

test.describe("the email step", () => {
  test("Individual is selected by default", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("tab", { name: "Individual" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Continue is disabled for an empty or malformed email", async ({ page }) => {
    await page.goto("/auth/signup");
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });

    await expect(continueButton).toBeDisabled();

    // No TLD — validateEmail() rejects this, so Continue must stay
    // disabled rather than letting the click-through happen and only
    // failing server-side.
    await page.locator('input[name="email"]').fill("tamal@semen333");
    await expect(continueButton).toBeDisabled();
  });

  test("a brand-new email routes to the signup step", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.locator('input[name="email"]').fill(uniqueEmail("new"));
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "What's your name?" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Organization tab asks for an organization name instead", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByRole("tab", { name: "Organization" }).click();
    await page.locator('input[name="email"]').fill(uniqueEmail("neworg"));
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "What's your organization called?" }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("the signup step", () => {
  async function reachSignupStep(page: import("@playwright/test").Page, email: string) {
    await page.goto("/auth/signup");
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible({
      timeout: 10_000,
    });
  }

  test("the name field strips digits and punctuation as it's typed", async ({ page }) => {
    await reachSignupStep(page, uniqueEmail("sanitize"));

    await page.locator('input[name="name"]').pressSequentially("J4ne D0e!!");
    await expect(page.locator('input[name="name"]')).toHaveValue("Jne De");
  });

  test("the password strength meter reflects what's typed", async ({ page }) => {
    await reachSignupStep(page, uniqueEmail("strength"));
    const password = page.locator('input[name="new-password"]');

    // Below passwordRegex's own minimum (8 chars, upper+lower+digit) —
    // "Weak", plus the hint text explaining what's missing.
    await password.fill("abc");
    await expect(page.getByText("Weak")).toBeVisible();
    await expect(
      page.getByText("Use 8+ characters with an uppercase letter"),
    ).toBeVisible();

    // Meets the minimum but isn't 12+ chars with a symbol yet — "Medium".
    await password.fill("Abcdefg1");
    await expect(page.getByText("Medium")).toBeVisible();

    // 12+ chars and a symbol — "Strong".
    await password.fill("Abcdefgh1234!");
    await expect(page.getByText("Strong")).toBeVisible();
  });

  test("Sign Up is disabled until both name and password are filled", async ({ page }) => {
    await reachSignupStep(page, uniqueEmail("disabled"));
    const signUp = page.getByRole("button", { name: "Sign Up", exact: true });

    await expect(signUp).toBeDisabled();
    await page.locator('input[name="name"]').fill("Jane Doe");
    await expect(signUp).toBeDisabled();
    await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
    await expect(signUp).toBeEnabled();
  });

  test("a successful signup logs the visitor in and lands on /", async ({ page }) => {
    await reachSignupStep(page, uniqueEmail("happy"));

    await page.locator('input[name="name"]').fill("Jane Doe");
    await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    // Navbar.tsx swaps its "Sign Up" button for a "Profile" control once
    // isLoggedIn is true — the one on-page signal a signup actually
    // succeeded, short of inspecting Redux/cookies directly.
    await expect(page.getByRole("navigation").getByText("Profile", { exact: true })).toBeVisible();
  });

  test("a successful organization signup lands on /organization/setup instead", async ({
    page,
  }) => {
    await page.goto("/auth/signup");
    await page.getByRole("tab", { name: "Organization" }).click();
    await page.locator('input[name="email"]').fill(uniqueEmail("orghappy"));
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "What's your organization called?" }),
    ).toBeVisible({ timeout: 10_000 });
    await page.locator('input[name="name"]').fill("Test Org");
    await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // A fresh organization is a draft, invisible everywhere until its
    // profile is complete — the setup wizard itself is organization-setup
    // spec's job (../organizations/organization-setup.spec.ts); this test
    // only checks that signup routes there.
    await expect(page).toHaveURL(/\/organization\/setup/, { timeout: 10_000 });
  });
});
