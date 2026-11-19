import "dotenv/config";
import { createApp } from "./app";
import { connectToMongo } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function main() {
  await connectToMongo();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API is running on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
