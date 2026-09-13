import { expect, test } from "@playwright/test";
import { E2E_API_URL } from "./env";

test.describe("Backend reachability", () => {
  test("serves the organizations directory", async ({ request }) => {
    const res = await request.get(`${E2E_API_URL}/organizations`);

    expect(res.status()).toBe(200);
    expect(await res.json()).toHaveProperty("data");
  });

  test("serves the tag and domain taxonomy the setup form renders", async ({ request }) => {
    const res = await request.get(`${E2E_API_URL}/organizations/taxonomy`);
    const body = await res.json();

    expect(body.tags).toContain("NGO");
    expect(body.domains).toContain("Animal welfare");
  });
});

test.describe("Navigation", () => {
  test("reaches the organizations directory from the navbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByText("Organizations").click();
    await expect(page).toHaveURL(/\/organizations/);
  });

  test("reaches the events directory from the navbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByText("Events").click();
    await expect(page).toHaveURL(/\/events/);
  });
});
