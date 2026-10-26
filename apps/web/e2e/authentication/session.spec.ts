import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "../env";

const PASSWORD = "Abcdefgh1234!";

async function signIn(page: Page) {
  const email = `session-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const account = await page.request.post(`${E2E_API_URL}/auth/signup`, {
    data: { email, password: PASSWORD, name: "Session Test" },
  });
  expect(account.status()).toBe(201);
  await page.goto("/auth/signin");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Enter your password" }),
  ).toBeVisible();
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("navigation").getByText("Profile", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const persisted = JSON.parse(
          localStorage.getItem("persist:root") ?? "{}",
        );
        return JSON.parse(persisted.user ?? "{}").isLoggedIn;
      }),
    )
    .toBe(true);
}

test("signed-out visitors cannot open profile setup directly", async ({
  page,
}) => {
  await page.goto("/user/setup");
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('[data-cy="profile-setup-start"]')).toHaveCount(0);
});

test("expired saved login removes Profile from navbar and allows sign-in", async ({
  page,
  context,
}) => {
  await signIn(page);
  await context.clearCookies();
  await page.goto("/organizations");
  const navigation = page.getByRole("navigation");
  await expect(navigation.getByText("Profile", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Sign Up", { exact: true })).toBeVisible();
  await page.goto("/auth/signin");
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/signin$/);
});

test("expired saved login redirects profile setup to sign-in", async ({
  page,
  context,
}) => {
  await signIn(page);
  await context.clearCookies();
  await page.goto("/user/setup");
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
});

test("valid httpOnly session survives reload and still guards sign-in", async ({
  page,
  context,
}) => {
  await signIn(page);
  const token = (await context.cookies()).find(
    (cookie) => cookie.name === "Token",
  );
  expect(token).toBeDefined();
  await context.addCookies([{ ...token!, httpOnly: true }]);
  await page.goto("/user/setup");
  await expect(page.locator('[data-cy="profile-setup-start"]')).toBeVisible();
  await page.goto("/auth/signin");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("navigation").getByText("Profile", { exact: true }),
  ).toBeVisible();
});

test("session expiring during editing redirects on rejected save", async ({
  page,
  context,
}) => {
  await signIn(page);
  await page.goto("/user/setup?step=about&q=3");
  await expect(
    page.getByRole("heading", { name: "Add your address" }),
  ).toBeVisible();
  await context.clearCookies();
  const rejected = page.waitForResponse(
    (response) =>
      response.url() === `${E2E_API_URL}/user/update` &&
      response.status() === 401,
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await rejected;
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
});

test("session expiring during editing redirects on rejected close", async ({
  page,
  context,
}) => {
  await signIn(page);
  await page.goto("/user/setup?step=about&q=3");
  await expect(
    page.getByRole("heading", { name: "Add your address" }),
  ).toBeVisible();
  await context.clearCookies();
  const rejected = page.waitForResponse(
    (response) =>
      response.url() === `${E2E_API_URL}/user/update` &&
      response.status() === 401,
  );
  await page
    .getByRole("button", { name: "Save and finish later", exact: true })
    .click();
  await rejected;
  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.locator('input[name="email"]')).toBeVisible();
});

test("profile server errors offer retry without signing out", async ({
  page,
}) => {
  await signIn(page);
  let unavailable = true;
  await page.route(`${E2E_API_URL}/user/profile`, async (route) => {
    if (unavailable)
      await route.fulfill({
        status: 503,
        json: { message: "Temporary outage" },
      });
    else await route.continue();
  });
  await page.goto("/user/setup");
  await expect(
    page.getByText("Could not load your profile. Please try again."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/user\/setup$/);
  unavailable = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator('[data-cy="profile-setup-start"]')).toBeVisible();
  await page.goto("/organizations");
  await expect(
    page.getByRole("navigation").getByText("Profile", { exact: true }),
  ).toBeVisible();
});

test("failed close save keeps profile answers available for retry", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/user/setup?step=about&q=1");
  const description = page.locator('[data-cy="profile-description"]');
  await description.fill("Keep this unsaved answer");
  await page.route(`${E2E_API_URL}/user/update`, (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Could not save, try again" },
    }),
  );
  await page
    .getByRole("button", { name: "Save and finish later", exact: true })
    .click();
  await expect(page.getByText("Could not save, try again")).toBeVisible();
  await expect(page).toHaveURL(/\/user\/setup\?step=about&q=1$/);
  await expect(description).toHaveValue("Keep this unsaved answer");
});
