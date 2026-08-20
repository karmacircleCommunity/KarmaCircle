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

  app.use(
    cors({
      origin: (_origin, callback) => {
        if (env.IGNORE_ORIGINS) {
          callback(null, true);
        } else {
          callback(null, env.ORIGIN_URL);
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
