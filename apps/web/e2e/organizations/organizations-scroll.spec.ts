import { expect, test } from "@playwright/test";
import { isPage, mockPagedList } from "../mock-pages";

/**
 * The organizations directory loads its next page as the reader scrolls. The
 * pages are served by `mockPagedList`, so the test does not need to publish
 * dozens of organizations.
 */

test("the organizations directory loads its next page by itself and can retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const list = await mockPagedList(page, {
    path: "/organizations",
    items: Array.from({ length: 14 }, (_, index) => ({
      id: `mock-${index}`,
      handle: `mock-org-${index}`,
      name: `Mock Org number ${index}`,
      domains: ["Food and hunger"],
      description: "A mock organization.",
      location: { city: "Kolkata" },
      gallery: [],
      followers: 0,
      verified: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    })),
  });
  list.fail(isPage(2));

  await page.goto("/organizations");
  const cards = page.getByRole("heading", {
    level: 2,
    name: /Mock Org number/,
  });
  await expect(cards).toHaveCount(12);

  await cards.last().scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toContainText(
    "Could not load more organizations.",
  );
  await expect(cards).toHaveCount(12);

  list.recover();
  const release = list.hold(isPage(2));
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("organization-card-skeleton")).toHaveCount(2);

  release();
  await expect(cards).toHaveCount(14);
  await expect(page.getByText("That's all 14 organizations.")).toBeVisible();
});

test("a directory that cannot load says so instead of looking empty", async ({
  page,
}) => {
  const list = await mockPagedList(page, { path: "/organizations", items: [] });
  list.fail(() => true);

  await page.goto("/organizations");
  await expect(
    page.getByRole("heading", { name: "Could not load organizations" }),
  ).toBeVisible();
  await expect(page.getByText("No organizations here yet")).toHaveCount(0);
});
