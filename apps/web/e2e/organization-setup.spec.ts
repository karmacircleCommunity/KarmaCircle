import { expect, test, type Page } from "@playwright/test";
import { E2E_API_URL } from "./env";

/**
 * Off by default: the flow is a regression test first, and a screenshot on
 * every run is noise. Run with `CAPTURE_TOUR=1 pnpm test` to also save the
 * screens of the journey into test-results/tour/.
 */
async function tour(page: Page, name: string) {
  if (process.env.CAPTURE_TOUR === "1") {
    await page.screenshot({ path: `test-results/tour/${name}.png` });
  }
}

/**
 * The organization lifecycle, end to end, exactly as an organization hits
 * it: sign up, be invisible, fill the required details, appear.
 *
 * A fresh email per run — signup is a real write against the e2e API's
 * in-memory database, and a fixed address would 409 on a second run in the
 * same suite (Playwright runs spec files in parallel, and the global
 * reset in e2e/global-setup.ts only runs once for the whole suite, not
 * between files). No credentials are hardcoded: the password is generated
 * here and never reused anywhere else.
 */
const stamp = Date.now();

// The organization-name field strips anything that isn't a letter or a
// space as you type (Auth.tsx), so the run's unique suffix has to be
// letters — a timestamp typed in here would silently vanish and every run
// would share one name.
const suffix = String(stamp)
  .split("")
  .map((digit) => "ABCDEFGHIJ"[Number(digit)])
  .join("");

const org = {
  name: `Riverbank Relief ${suffix}`,
  email: `riverbank-${stamp}@example.com`,
  password: `Testing${stamp}a`,
};

test("an organization signs up, stays hidden, then appears once its profile is complete", async ({
  page,
  request,
}) => {
  await test.step("sign up", async () => {
    await page.goto("/auth/signup");
    // The account-type switch is a `role="tab"` underline pair, not
    // boxed buttons — see Auth.tsx's own comment on that choice.
    await page.getByRole("tab", { name: "Organization" }).click();
    await page.locator('input[name="email"]').fill(org.email);
    // exact: true — "Continue with Google" is a second, separate button
    // on the same screen and would otherwise also match "Continue".
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.locator('input[name="name"]').fill(org.name);
    await page.locator('input[name="new-password"]').fill(org.password);
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // Signup drops a new organization on its setup page — but the page
    // *asks* rather than assumes: setting the profile up is optional, and
    // "Maybe later" is a real answer that leaves for the home page.
    await expect(page).toHaveURL(/\/organization\/setup/, { timeout: 15_000 });
    await expect(page.getByText("Draft — not visible yet")).toBeVisible();
    await tour(page, "1-setup-intro");

    await page.locator('[data-cy="setup-later"]').click();
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/`);
  });

  await test.step("invisible while in draft", async () => {
    const res = await request.get(`${E2E_API_URL}/organizations`);
    const names = (await res.json()).data.map((item: { name: string }) => item.name);
    expect(names).not.toContain(org.name);

    await page.goto("/organizations");
    await expect(page.getByText(org.name, { exact: true })).toHaveCount(0);
    await tour(page, "2-directory-without-the-draft");
  });

  await test.step("every way back in", async () => {
    // The dashboard doesn't pretend to work for a draft: it says what is
    // missing and links back into setup.
    await page.goto("/dashboard");
    await expect(page.locator('[data-cy="gate-step-about"]')).toHaveAttribute(
      "data-done",
      "false",
    );
    await page.locator('[data-cy="gate-resume"]').click();
    await expect(page).toHaveURL(/step=about/);
  });

  await test.step("four questions, one screen each", async () => {
    // Q1 — the name, already filled in at signup.
    await expect(page.locator('[data-cy="org-name"]')).toHaveValue(org.name);
    await page.locator('[data-cy="org-save"]').click();

    // Q2 — what they do. Continue refuses to leave a required question
    // blank: the flow can be *left* at any time, but not walked past.
    // Today that refusal is a disabled button with a tooltip, not the
    // clickable-with-a-red-note design docs/specs/organizations.md
    // describes — see known-issues.md's "Smaller one-off issues" for the
    // drift this test surfaced. Assert what's actually true, not the
    // stale design doc.
    await expect(page).toHaveURL(/q=2/);
    await expect(page.locator('[data-cy="org-save"]')).toBeDisabled();

    await page
      .locator('[data-cy="org-description"]')
      .fill(
        "We clear and rebuild riverbank homes after the monsoon, and run a year-round flood-readiness drive with local schools.",
      );
    await tour(page, "3-setup-question");
    await expect(page.locator('[data-cy="org-save"]')).toBeEnabled();
    await page.locator('[data-cy="org-save"]').click();

    // Q3 — a single-choice question. Selecting an option just marks it
    // picked; Continue still needs its own click.
    await expect(page).toHaveURL(/q=3/);
    await page.locator('[data-cy="org-tag-NGO"]').click();
    await page.locator('[data-cy="org-save"]').click();
    await expect(page).toHaveURL(/q=4/, { timeout: 10_000 });

    // Q4 — the causes, and the last question of the step: this Continue is
    // the one that saves.
    await page.locator('[data-cy="org-domain-Disaster relief"]').click();
    await page.locator('[data-cy="org-save"]').click();

    // Crossing into step two is what wrote step one — leaving now would
    // keep every answer above.
    await expect(page).toHaveURL(/step=reach/, { timeout: 15_000 });
    await page.reload();
    await expect(page.locator('[data-cy="org-teamsize"]')).toBeVisible();
  });

  await test.step("team size, location and contact — then live", async () => {
    await page.locator('[data-cy="org-teamsize"]').fill("34");
    await page.locator('[data-cy="org-save"]').click();

    // The city field suggests from the list that ships with the app —
    // pressSequentially (real per-character keystrokes) rather than fill,
    // because the suggestion dropdown is driven by keystroke events the
    // same way a real user's typing would be. A pick answers both halves
    // of the question: the state is a fact about the city, so nobody
    // should have to supply it twice.
    await page.locator('[data-cy="org-city"]').pressSequentially("Guwah");
    await page.locator('[data-cy="org-city-option-Guwahati"]').click({ timeout: 15_000 });
    await expect(page.locator('[data-cy="org-city"]')).toHaveValue("Guwahati");
    await expect(page.locator('[data-cy="org-state"]')).toHaveValue("Assam");
    await tour(page, "4-setup-grouped-question");
    await page.locator('[data-cy="org-save"]').click();

    // Typed without a scheme on purpose — the form normalizes it rather
    // than 400ing on the backend's URL validation.
    await page.locator('[data-cy="org-website"]').fill("riverbank.example.org");
    await page.locator('[data-cy="org-contact-email"]').fill(org.email);
    await page.locator('[data-cy="org-save"]').click();

    await page.locator('[data-cy="org-funds-raised"]').fill("450000");
    await page.locator('[data-cy="org-save"]').click();

    // Completing the required list publishes the organization, and the
    // page hands the owner straight to the profile it just created.
    await expect(page).toHaveURL(/\/organization\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: org.name })).toBeVisible();
    await tour(page, "5-public-profile");

    // Step one's answers survived the two separate saves. .first() because
    // "Guwahati" also appears inside the "Guwahati, Assam" location line —
    // Playwright's strict mode (unlike Cypress's cy.contains) errors on an
    // ambiguous match rather than silently taking the first one.
    await expect(page.getByText("Disaster relief").first()).toBeVisible();
    await expect(page.getByText("Guwahati").first()).toBeVisible();
  });

  await test.step("in the directory", async () => {
    await page.goto("/organizations");
    await expect(page.getByText(org.name, { exact: true })).toBeVisible({ timeout: 15_000 });
    await tour(page, "6-directory-with-the-organization");

    // The directory's own filters find it, server-side.
    await page.locator('input[type="search"], input[type="text"]').first().fill("Guwahati");
    await expect(page.getByText(org.name, { exact: true })).toBeVisible();

    // The resume link now skips the step that is already done. Scoped to
    // the heading role — "Your events" also appears in the navbar link
    // ("Your Events") and, transiently, a "Loading your events…" line.
    await page.goto("/organization/events");
    await expect(page.getByRole("heading", { name: "Your events" })).toBeVisible();
  });

  await test.step("coming back to edit", async () => {
    // A live organization skips the intro and lands on the first question.
    // exact: true — the auth/setup layout's testimonial quote rotates and
    // can itself contain the substring "live" ("What do we live for…"),
    // which a non-exact match would occasionally collide with.
    await page.goto("/organization/setup");
    await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-cy="org-name"]')).toHaveValue(org.name);

    // Back from the first question is meant to reach the intro
    // (useOrganizationSetup's back() calls goToIntro()) — but for a live
    // organization the page's own `stage` fallback immediately overrides
    // that back to the first question, so this is currently a no-op, not
    // a navigation. See known-issues.md's "Smaller one-off issues" for the
    // drift this test surfaced; assert what's actually true, not the
    // originally-intended behavior.
    await page.locator('[data-cy="setup-back"]').click();
    await expect(page.locator('[data-cy="org-name"]')).toBeVisible();
    await expect(page.locator('[data-cy="setup-start"]')).toHaveCount(0);
  });
});
