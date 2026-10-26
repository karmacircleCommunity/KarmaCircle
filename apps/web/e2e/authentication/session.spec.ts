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

for (const entry of ["", "?step=about&q=1", "?step=about&q=3"]) {
  test(`close discards edits without saving from setup ${entry || "intro"}`, async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/user/setup${entry}`);
    const close = page.getByRole("button", {
      name: "Close profile setup",
      exact: true,
    });
    await expect(close).toBeVisible();
    const updates: string[] = [];
    page.on("request", (request) => {
      if (request.url() === `${E2E_API_URL}/user/update`)
        updates.push(request.method());
    });
    await close.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Saved", { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-cy="profile-setup-start"]')).toHaveCount(
      0,
    );
    expect(updates).toEqual([]);
    const profile = await page.request.get(`${E2E_API_URL}/user/profile`);
    expect((await profile.json()).user.description ?? "").toBe("");
  });
}

test("closing edited profile discards changes even when update service is unavailable", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/user/setup?step=about&q=1");
  await page
    .locator('[data-cy="profile-description"]')
    .fill("Discard this answer");
  const updates: string[] = [];
  await page.route(`${E2E_API_URL}/user/update`, async (route) => {
    updates.push(route.request().method());
    await route.fulfill({ status: 503, json: { message: "Could not save" } });
  });
  await page
    .getByRole("button", { name: "Close profile setup", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(updates).toEqual([]);
  const profile = await page.request.get(`${E2E_API_URL}/user/profile`);
  expect((await profile.json()).user.description ?? "").toBe("");
  await expect(page.getByText("Saved", { exact: true })).toHaveCount(0);
});

test("closing editor entered from navbar returns home after moving through questions", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/organizations");
  await page
    .getByRole("navigation")
    .getByText("Profile", { exact: true })
    .click();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await expect(page.locator('[data-cy="profile-setup-start"]')).toBeVisible();
  await page.locator('[data-cy="profile-setup-start"]').click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/q=2$/);
  await page
    .getByRole("button", { name: "Close profile setup", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Close profile setup", exact: true }),
  ).toHaveCount(0);
});
