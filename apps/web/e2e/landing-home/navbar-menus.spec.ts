import { expect, test, type Page } from "@playwright/test";
import { signUpOrganization, uniqueStamp } from "../events/event-helpers";

/**
 * The shared navbar's two signed-in menus, used with a keyboard: the desktop
 * "Profile" dropdown and the small-screen dialog. Both have to open, reach
 * every entry (Logout included) and close again without a mouse.
 *
 * A freshly signed up organization is a draft, so both menus also carry
 * "Finish setting up".
 */

const ORGANIZATION_LINKS = ["Finish setting up", "Dashboard", "My Events"];

/** Safari tabs between form controls only; Option+Tab reaches links too. */
const tabKey = (browserName: string) =>
  browserName === "webkit" ? "Alt+Tab" : "Tab";

async function signedInOrganization(page: Page, width: number) {
  await page.setViewportSize({ width, height: 812 });
  await signUpOrganization(page, uniqueStamp());
  await page.goto("/events");
}

test("the desktop account dropdown works from the keyboard and closes by itself", async ({
  page,
  browserName,
}) => {
  const tab = tabKey(browserName);
  await signedInOrganization(page, 1280);

  const navigation = page.getByRole("navigation");
  const trigger = navigation.getByRole("button", {
    name: "Profile",
    exact: true,
  });
  const dashboard = navigation.getByRole("link", { name: "Dashboard" });
  const logout = navigation.getByRole("button", { name: "Logout" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(dashboard).toBeHidden();

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  // The draft state loads after the page does; tab only once its link is in.
  await expect(
    navigation.getByRole("link", { name: "Finish setting up" }),
  ).toBeVisible();
  for (const name of ORGANIZATION_LINKS) {
    await page.keyboard.press(tab);
    await expect(navigation.getByRole("link", { name })).toBeFocused();
  }
  await page.keyboard.press(tab);
  await expect(logout).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dashboard).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dashboard).toBeVisible();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(dashboard).toBeHidden();

  await trigger.click();
  await logout.focus();
  await page.keyboard.press(tab);
  await expect(dashboard).toBeHidden();

  await trigger.click();
  await logout.focus();
  await page.keyboard.press("Enter");
  await expect(navigation.getByText("Sign Up", { exact: true })).toBeVisible();
});

test("the small-screen menu holds focus, closes on Escape and reaches every entry", async ({
  page,
  browserName,
}) => {
  const tab = tabKey(browserName);
  await signedInOrganization(page, 375);

  const trigger = page.getByRole("button", { name: "Open account menu" });
  const menu = page.getByRole("dialog", { name: "Menu" });
  const close = menu.getByRole("button", { name: "Close menu" });
  const logout = menu.getByRole("button", { name: "Logout" });

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();

  // Reopened at once, which must not be undone by the earlier close.
  await page.keyboard.press("Enter");
  await expect(close).toBeFocused();
  await expect(
    menu.getByRole("link", { name: "Finish setting up" }),
  ).toBeVisible();
  for (const name of ["Organizations", "Events", ...ORGANIZATION_LINKS]) {
    await page.keyboard.press(tab);
    await expect(menu.getByRole("link", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press(tab);
  await expect(logout).toBeFocused();

  // Tabbing on never lands on the page behind the menu.
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press(tab);
    const stayedOffThePage = await page.evaluate(() => {
      const active = document.activeElement;
      return active === document.body || Boolean(active?.closest("dialog"));
    });
    expect(stayedOffThePage).toBe(true);
  }

  await menu.getByRole("link", { name: "My Events" }).click();
  await expect(page).toHaveURL(/\/events\/mine$/);
  await expect(menu).toHaveCount(0);

  // My Events needs a session, so logging out there leads to sign-in. Log out
  // from a public page to check the menu that is left behind.
  await page.goto("/events");
  await trigger.click();
  await logout.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Open menu", exact: true }),
  ).toBeVisible();
  await expect(menu).toHaveCount(0);
});
