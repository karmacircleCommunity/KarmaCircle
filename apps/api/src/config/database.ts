import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

export async function connectToMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error({ err: error }, "Error connecting to MongoDB");
    throw error;
  }
}

let pendingConnection: Promise<void> | null = null;

/**
 * Connects once and lets every caller share that attempt.
 *
 * The serverless entry (`api/index.ts`) keeps a warm instance for many
 * requests, so it must not reconnect on each one. But it also must not keep a
 * failed attempt: a rejected promise stored forever would make every later
 * request on that instance fail even after MongoDB is reachable again. On
 * failure the stored attempt is cleared, so the next request tries again.
 */
export function ensureMongoConnection(): Promise<void> {
  if (!pendingConnection) {
    pendingConnection = connectToMongo().catch((error) => {
      pendingConnection = null;
      throw error;
    });
  }
  return pendingConnection;
}
