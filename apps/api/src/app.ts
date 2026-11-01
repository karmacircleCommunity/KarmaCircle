import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { clearResetOutbox, getLastResetUrl } from "./config/mailer";
import passport from "./config/passport";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import routes from "./routes/index";

export function createApp(): Express {
  const app = express();

  // Vercel (and any reverse proxy) sits in front of this app. Without this,
  // req.ip is the proxy's address, so every client shares one rate-limit
  // bucket: one attacker exhausts authLimiter's 20 attempts for everyone.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());
  app.use(pinoHttp({ logger }));

  /**
   * An explicit allowlist, echoing back the caller's own origin only when it
   * is on the list. The previous version always answered with the single
   * configured ORIGIN_URL regardless of who asked, so the moment a second
   * legitimate origin existed (localhost alongside a deployed frontend) it
   * was blocked, and its IGNORE_ORIGINS escape hatch fixed that locally by
   * allowing *every* origin instead. `credentials: true` means a wildcard is
   * never an option here, so the list has to be real.
   *
   * Requests with no Origin header at all (curl, server-to-server, same-origin
   * navigations) are allowed through: CORS is a browser mechanism and there is
   * nothing to protect when no browser origin is involved.
   */
  const allowedOrigins = new Set([env.ORIGIN_URL, ...env.CORS_ORIGINS]);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, origin ?? true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      allowedHeaders: ["Set-Cookie", "Content-Type"],
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(passport.initialize());

  app.use(apiLimiter);

  app.get("/", (_req, res) => {
    res.send("HELLO FROM API");
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      mongo:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  /**
   * Test-only, gated behind NODE_ENV==="test" so it can never exist in a
   * real deployment. Wipes every collection in the connected Mongo instance
   * — Playwright's global setup calls this between spec files instead of
   * restarting the whole e2e server, the same isolation Jest's own
   * `afterEach` gets for free from an in-process app. See
   * apps/api/tests/e2e/server.ts and docs/specs/testing.md (apps/web).
   * apiLimiter above already `skip`s for NODE_ENV==="test", so this isn't
   * rate-limited either.
   */
  if (env.NODE_ENV === "test") {
    app.post("/__test__/reset", async (_req, res) => {
      const collections = mongoose.connection.collections;
      await Promise.all(
        Object.values(collections).map((collection) =>
          collection.deleteMany({}),
        ),
      );
      clearResetOutbox();
      res.status(204).end();
    });

    /**
     * Reads the captured reset URL so Playwright can complete a full
     * forgot/reset-password journey without a real mail provider.
     */
    app.get("/__test__/last-reset-url", (req, res) => {
      const to = String(req.query.email ?? "");
      const resetUrl = getLastResetUrl(to);
      if (!resetUrl) {
        res
          .status(404)
          .json({ message: "No reset email captured for this address yet." });
        return;
      }
      res.json({ resetUrl });
    });
  }

  // Local development helper for inspecting a captured password-reset link.
  // Keep it loopback-only: reset tokens must not be readable over a network.
  if (env.NODE_ENV === "development") {
    app.get("/__dev__/last-reset-url", (req, res) => {
      const remoteAddress = req.socket.remoteAddress ?? "";
      const isLoopback =
        remoteAddress === "::1" ||
        remoteAddress === "127.0.0.1" ||
        remoteAddress.startsWith("::ffff:127.");

      if (!isLoopback) {
        res.sendStatus(404);
        return;
      }

      const to = String(req.query.email ?? "");
      const resetUrl = getLastResetUrl(to);
      if (!resetUrl) {
        res
          .status(404)
          .json({ message: "No reset email captured for this address yet." });
        return;
      }
      res.json({ resetUrl });
    });
  }

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
