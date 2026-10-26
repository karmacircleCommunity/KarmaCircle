import { expect, test } from "@playwright/test";
import { E2E_API_URL } from "../env";

async function signUpIndividual(
  page: import("@playwright/test").Page,
  label: string,
): Promise<{ email: string; userName: string }> {
  const email = `profile-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  await page.goto("/auth/signup");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What's your name?" }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('input[name="name"]').fill(`Profile Test ${label}`);
  await page.locator('input[name="new-password"]').fill("Abcdefgh1234!");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });

  const response = await page.request.get(`${E2E_API_URL}/user/profile`);
  expect(response.ok()).toBeTruthy();
  const { user } = await response.json();
  return { email, userName: user.userName };
}

async function openProfileMenu(
  page: import("@playwright/test").Page,
  width: number,
) {
  if (width === 375) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  } else {
    await page
      .getByRole("navigation")
      .getByText("Profile", { exact: true })
      .click();
  }
}

for (const width of [1280, 375]) {
  test(`navbar opens profile editor directly at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await signUpIndividual(page, `nav-${width}`);
    await openProfileMenu(page, width);
    await page.getByRole("link", { name: "Edit profile", exact: true }).click();
    await expect(page).toHaveURL(/\/user\/setup$/);
    await expect(page.locator('[data-cy="profile-setup-start"]')).toBeVisible();
    await page
      .getByRole("button", { name: "Close profile setup", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("removed profile URL shows page not found for owner and visitor", async ({
  page,
  browser,
}) => {
  const { userName } = await signUpIndividual(page, "removed");
  await page.goto(`/user/${userName}`);
  await expect(
    page.getByRole("heading", { name: "This page isn't here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit profile", exact: true }),
  ).toHaveCount(0);
  const visitor = await browser.newContext();
  try {
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(`/user/${userName}`);
    await expect(
      visitorPage.getByRole("heading", { name: "This page isn't here." }),
    ).toBeVisible();
  } finally {
    await visitor.close();
  }
});

test("profile saves return home and saved answers survive reopening", async ({
  page,
}) => {
  await signUpIndividual(page, "save");
  await page.goto("/user/setup?step=about&q=1");
  await page
    .locator('[data-cy="profile-description"]')
    .fill("Helping my community.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const saved = page.waitForResponse(
    (response) =>
      response.url() === `${E2E_API_URL}/user/update` &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await saved;
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/user/setup?step=about&q=1");
  await expect(page.locator('[data-cy="profile-description"]')).toHaveValue(
    "Helping my community.",
  );
});

test("navbar logout remains available after removing profile page", async ({
  page,
}) => {
  await signUpIndividual(page, "logout");
  await page
    .getByRole("navigation")
    .getByText("Profile", { exact: true })
    .click();
  await page.getByText("Logout", { exact: true }).click();
  await expect(
    page.getByRole("navigation").getByText("Sign Up", { exact: true }),
  ).toBeVisible();
  await page.goto("/user/setup");
  await expect(page).toHaveURL(/\/auth\/signin$/);
});
