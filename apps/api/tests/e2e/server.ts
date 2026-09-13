/**
 * A real, listening instance of the API for Playwright's UI E2E suite
 * (apps/web/playwright.config.ts) to drive apps/web against.
 *
 * Not used by Jest — Jest drives the same createApp() in-process via
 * Supertest with nothing actually listening (see ../helpers/test-app.ts).
 * This script exists because a real browser driven by Playwright makes
 * real HTTP requests to VITE_API_URL and needs something actually bound to
 * that port.
 *
 * Backed by mongodb-memory-server, same as Jest's own
 * ../helpers/jest.setup.ts, so a Playwright run never touches a real
 * MongoDB and needs nothing running locally beyond `pnpm install`. Unlike
 * Jest (a fresh in-memory Mongo per test *file*, wiped after each test via
 * `afterEach`), this process stays up for the whole Playwright run —
 * isolation between spec files instead comes from POSTing
 * /__test__/reset (see ../../src/app.ts), which apps/web's Playwright
 * config calls between spec files.
 *
 * Started by `pnpm --filter karmacircle-api run test:e2e-server`, or
 * automatically by Playwright's own `webServer` config — see
 * docs/specs/testing.md (apps/web) for the full picture.
 */
import "./env.setup";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../../src/app";

async function main() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = createApp();
  const port = Number(process.env.PORT);

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console -- a standalone script, not a request handler; nothing else logs startup here
    console.log(`[e2e] API listening on ${port}, backed by an in-memory MongoDB`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console -- see above
    console.log(`[e2e] ${signal} received, shutting down`);
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((error) => {
  // eslint-disable-next-line no-console -- see above
  console.error("[e2e] Failed to start API test server", error);
  process.exit(1);
});
