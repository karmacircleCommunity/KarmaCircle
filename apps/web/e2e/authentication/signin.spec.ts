import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E_API_URL } from "../env";

/**
 * The "signin" branch of Auth.tsx, plus the DonotRenderWhenLoggedIn route
 * guard. Each test seeds its own account directly against the e2e API
 * (not through the UI) — signing up is signup.spec.ts's job, this file
 * assumes an account already exists and starts from there.
 */

const PASSWORD = "Abcdefgh1234!";

function uniqueEmail(label: string): string {
  return `signin-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

async function seedAccount(request: APIRequestContext, email: string) {
  const res = await request.post(`${E2E_API_URL}/auth/signup`, {
    data: { email, password: PASSWORD },
  });
  expect(res.status()).toBe(201);
}

test("an existing email routes to the signin step, email locked in", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("routes");
  await seedAccount(request, email);

  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('input[name="email"]')).toHaveValue(email);
  await expect(page.locator('input[name="email"]')).toBeDisabled();
});

test("the wrong password shows an error and does not navigate", async ({ page, request }) => {
  const email = uniqueEmail("wrongpw");
  await seedAccount(request, email);

  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });

  await page.locator('input[name="password"]').fill("not-the-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test("the correct password signs in and lands on /", async ({ page, request }) => {
  const email = uniqueEmail("correctpw");
  await seedAccount(request, email);

  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });

  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByRole("navigation").getByText("Profile", { exact: true })).toBeVisible();
});

test("Back on the password step returns to the email step and clears it", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("back");
  await seedAccount(request, email);

  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });

  await page.locator('input[name="password"]').fill("something-typed");
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("tablist", { name: "Account type" })).toBeVisible();
  // handleBack clears the password too, so a Continue back to "signin"
  // doesn't silently resubmit whatever was typed before Back was pressed.
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('input[name="password"]')).toHaveValue("");
});

test("a signed-in visitor is redirected away from /auth/signin", async ({ page, request }) => {
  const email = uniqueEmail("guard");
  await seedAccount(request, email);

  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  // DonotRenderWhenLoggedIn reads isLoggedIn once, at mount — a fresh
  // navigation to the guarded route is exactly the case it's meant to
  // catch (an already-authenticated visitor arriving on it directly).
  await page.goto("/auth/signin");
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
});
