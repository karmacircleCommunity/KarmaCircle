import { E2E_API_URL } from "./env";

/**
 * Runs once, before the whole Playwright suite, after playwright.config.ts's
 * `webServer` entries have already brought the e2e API and web servers up.
 * Wipes every collection in the e2e API's in-memory MongoDB via the
 * test-only /__test__/reset route (apps/api/src/app.ts, gated to
 * NODE_ENV==="test") so the suite always starts from an empty database,
 * the same guarantee Jest's own beforeAll/afterEach gets for a fresh
 * mongodb-memory-server per test file.
 *
 * Individual spec files don't reset between each other — Playwright runs
 * spec files in parallel by default, so a mid-suite reset would race other
 * files' tests. Instead, each spec generates its own unique data (a
 * `Date.now()` suffix on emails/names), the same isolation pattern the
 * Cypress specs this suite replaced already used.
 */
export default async function globalSetup() {
  const res = await fetch(`${E2E_API_URL}/__test__/reset`, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      `Playwright global setup: POST ${E2E_API_URL}/__test__/reset returned ${res.status}`,
    );
  }
}
