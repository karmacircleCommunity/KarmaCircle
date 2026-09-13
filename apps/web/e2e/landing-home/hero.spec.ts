import { expect, test } from "@playwright/test";

/**
 * Landing.tsx's hero — specifically the one thing about it that actually
 * branches on data (isLoggedIn from Redux), not the animation/parallax
 * layer (HeroScene, the GSAP entrance/scroll tweens), which this suite
 * doesn't attempt to assert on. See docs/specs/landing-home.md.
 */

test("a logged-out visitor sees the sign-up CTA", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /we connect ngos/i })).toBeVisible();
  const cta = page.getByRole("link", { name: "Sign up Today !" });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/auth/signup");
});

test("the sign-up CTA actually leads to the signup flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign up Today !" }).click();
  await expect(page).toHaveURL(/\/auth\/signup/);
});

test("a signed-in visitor sees the organizations CTA instead", async ({ page }) => {
  // Redux's isLoggedIn (and the redux-persist copy in localStorage) only
  // get set by the app's own login action — seeding an account directly
  // against the API (as signin.spec.ts/signup.spec.ts do for their own
  // tests) wouldn't touch client state at all. Going through the real
  // signup flow, which lands on "/" on success, is the actual trigger.
  const email = `landing-hero-${Date.now()}@example.com`;
  await page.goto("/auth/signup");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('input[name="name"]').fill("Landing Hero");
  await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  const cta = page.getByRole("link", { name: "Explore our organizations" });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/organizations");
  await expect(page.getByRole("link", { name: "Sign up Today !" })).toHaveCount(0);
});
