import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E_API_URL } from "../env";

/**
 * ForgotPassword.tsx + ResetPassword.tsx, the two-step reset flow.
 *
 * The e2e API never calls a real mail provider (see
 * apps/api/src/config/mailer.ts's test-only outbox) — the actual reset
 * URL Resend would have emailed is instead readable back via
 * GET /__test__/last-reset-url, which is what `fetchResetUrl` below uses.
 * This is the one place in this suite that reaches past the browser to
 * pull data the UI itself has no way to show.
 */

const PASSWORD = "Abcdefgh1234!";
const NEW_PASSWORD = "Zyxwvuts9876!";

function uniqueEmail(label: string): string {
  return `reset-${label}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}

async function seedAccount(request: APIRequestContext, email: string) {
  const res = await request.post(`${E2E_API_URL}/auth/signup`, {
    data: { email, password: PASSWORD },
  });
  expect(res.status()).toBe(201);
}

async function fetchResetUrl(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(
    `${E2E_API_URL}/__test__/last-reset-url?email=${encodeURIComponent(email)}`,
  );
  expect(res.status()).toBe(200);
  const { resetUrl } = await res.json();
  return resetUrl;
}

test("requesting a reset shows the same confirmation regardless of the address", async ({
  page,
}) => {
  // Deliberately an address with no account — ForgotPassword.tsx always
  // shows the same "check your inbox" copy either way (see the backend's
  // own doc on why: not revealing which emails have accounts).
  await page.goto("/auth/forgot-password");
  await page.locator('input[name="email"]').fill("nobody-has-this@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({
    timeout: 10_000,
  });
});

test("the full round trip: request, reset via the emailed link, sign in with the new password", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("roundtrip");
  await seedAccount(request, email);

  await page.goto("/auth/forgot-password");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({
    timeout: 10_000,
  });

  const resetUrl = await fetchResetUrl(request, email);
  // The URL the mailer built points at the e2e web server's own origin
  // (ORIGIN_URL is overridden for exactly this — see
  // apps/api/tests/e2e/env.setup.ts) — navigate with just the path so
  // Playwright's baseURL handling doesn't care which origin it names.
  await page.goto(new URL(resetUrl).pathname);

  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.locator('input[name="new-password"]').fill(NEW_PASSWORD);
  await page.locator('input[name="confirm-new-password"]').fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByRole("heading", { name: "Password reset" })).toBeVisible({
    timeout: 10_000,
  });
  // ResetPassword.tsx navigates to /auth/signin itself after ~1.5s.
  await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10_000 });

  // Prove the round trip actually worked, not just that the form said so:
  // sign in with the *new* password.
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your password" })).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('input[name="password"]').fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  await expect(page.getByRole("navigation").getByText("Profile", { exact: true })).toBeVisible();
});

test("mismatched confirm-password blocks submission with an inline error", async ({
  page,
  request,
}) => {
  const email = uniqueEmail("mismatch");
  await seedAccount(request, email);

  await page.goto("/auth/forgot-password");
  await page.locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({
    timeout: 10_000,
  });

  const resetUrl = await fetchResetUrl(request, email);
  await page.goto(new URL(resetUrl).pathname);

  await page.locator('input[name="new-password"]').fill(NEW_PASSWORD);
  await page.locator('input[name="confirm-new-password"]').fill("SomethingElse1!");
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(page.getByText("Passwords don't match")).toBeVisible();
  // Still on the reset screen — no navigation happened.
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
});

test("an invalid or expired token shows an error banner with a way to request a new link", async ({
  page,
}) => {
  await page.goto("/auth/reset-password/this-token-does-not-exist");

  await page.locator('input[name="new-password"]').fill(NEW_PASSWORD);
  await page.locator('input[name="confirm-new-password"]').fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Reset password" }).click();

  await expect(
    page.getByText("This password reset link is invalid or has expired."),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
    "href",
    "/auth/forgot-password",
  );
});
