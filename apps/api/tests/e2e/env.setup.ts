/**
 * Mirrors ../helpers/env.setup.ts (Jest's setupFiles entry) — same
 * placeholder values, so this process passes the same Zod validation in
 * src/config/env.ts. Re-exported rather than duplicated so the two lists
 * of placeholders can't drift apart.
 *
 * The one addition: PORT. Jest's app is driven in-process by Supertest and
 * never listens on anything, so it never needed one; this script does
 * (see ./server.ts).
 */
import "../helpers/env.setup";

// A dedicated port, deliberately different from the real local dev API's
// 5050 — this process must never collide with (and can safely run
// alongside) a developer's actual `pnpm dev` session.
process.env.PORT = process.env.PORT ?? "5051";

// The e2e web server (apps/web/playwright.config.ts) runs on its own
// dedicated port 3001, separate from local dev's 3000, for the same
// reason — override the inherited ORIGIN_URL (3000) so CORS actually
// allows it.
process.env.ORIGIN_URL = "http://localhost:3001";
