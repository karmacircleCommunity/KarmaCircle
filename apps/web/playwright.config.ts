import { defineConfig, devices } from "@playwright/test";
import { E2E_API_PORT, E2E_API_URL, E2E_WEB_PORT, E2E_WEB_URL } from "./e2e/env";

/**
 * Full-stack E2E: a real browser (via Playwright) driving a real, running
 * apps/web dev server, which itself makes real HTTP requests to a real,
 * running apps/api instance — not a mocked API. See docs/specs/testing.md
 * for the full picture (the two webServer entries below, how isolation
 * from a developer's actual local dev servers is guaranteed, why
 * mongodb-memory-server rather than a real MongoDB, and how this replaced
 * Cypress).
 *
 * Chromium, Firefox, and WebKit all run by default — one of the concrete
 * reasons this suite is Playwright rather than Cypress: Cypress's
 * in-browser architecture doesn't support WebKit or cross-origin flows
 * (this app's Google OAuth popup) the way Playwright's CDP-based one does.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: E2E_WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  /**
   * Both servers are started (and, locally, reused across runs) by
   * Playwright itself — `pnpm test` from a clean checkout needs nothing
   * running beforehand. Dedicated ports (e2e/env.ts) keep this from ever
   * touching a developer's real `pnpm dev` session or its real MongoDB.
   *
   * Each command runs via `npx <bin>` with an explicit `cwd` rather than
   * `pnpm --filter`/`pnpm exec`, because pnpm itself isn't guaranteed to
   * be on PATH in every environment this runs in (this repo's local dev
   * already works around the same gap — see docs/specs/testing.md); `npx`
   * resolves each package's own local devDependency bin from its own
   * node_modules/.bin regardless.
   */
  webServer: [
    {
      command: "npx tsx tests/e2e/server.ts",
      cwd: "../api",
      url: `${E2E_API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { PORT: String(E2E_API_PORT) },
    },
    {
      command: `npx vite --port ${E2E_WEB_PORT} --strictPort`,
      url: E2E_WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_API_URL: E2E_API_URL },
    },
  ],
});
