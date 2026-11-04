import path from "path";
import process from "node:process";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for pure functions (`pnpm test:unit`).
 *
 * Deliberately separate from `vite.config.mjs`: unit tests do not need the
 * PWA, SVGR, React or Tailwind plugins, and keeping them out makes the run
 * fast and free of build side effects. It is also separate from
 * `playwright.config.ts`: Playwright owns `e2e/`, Vitest owns only
 * `src/**` `*.test.ts` files, so neither runner can pick up the other's specs.
 *
 * The path aliases below mirror `vite.config.mjs` and `tsconfig.json` - keep
 * all three in sync when an alias is added.
 */

// Pin the zone and locale before any worker starts (workers inherit this
// environment) so date and currency formatting assertions are deterministic
// on every machine and in CI, regardless of the developer's own settings.
process.env.TZ = "UTC";
process.env.LC_ALL = "en_US.UTF-8";
process.env.LANG = "en_US.UTF-8";

export default defineConfig({
  resolve: {
    alias: {
      "@app": path.resolve(import.meta.dirname, "./src/app"),
      "@features": path.resolve(import.meta.dirname, "./src/features"),
      "@components": path.resolve(import.meta.dirname, "./src/components"),
      "@services": path.resolve(import.meta.dirname, "./src/services"),
      "@statics": path.resolve(import.meta.dirname, "./src/statics"),
      "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
      "@utils": path.resolve(import.meta.dirname, "./src/utils"),
      "@styles": path.resolve(import.meta.dirname, "./src/styles"),
      "@assets": path.resolve(import.meta.dirname, "./src/assets"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
  },
});
