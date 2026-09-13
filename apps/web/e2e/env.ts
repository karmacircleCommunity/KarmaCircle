/**
 * Ports dedicated to the Playwright E2E stack, deliberately different from
 * local dev's 3000 (web) / 5050 (api) — see
 * apps/api/tests/e2e/server.ts — so a suite run never collides with, or
 * reads/writes, a developer's real local dev servers and their real
 * MongoDB data. playwright.config.ts's `webServer` entries boot dedicated
 * instances on these ports; nothing here assumes anything is already
 * running.
 */
export const E2E_WEB_PORT = 3001;
export const E2E_API_PORT = 5051;

export const E2E_WEB_URL = `http://localhost:${E2E_WEB_PORT}`;
export const E2E_API_URL = `http://localhost:${E2E_API_PORT}`;
