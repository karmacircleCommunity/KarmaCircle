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
import passport from "./config/passport";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import routes from "./routes/index";

export function createApp(): Express {
  const app = express();

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
      mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
