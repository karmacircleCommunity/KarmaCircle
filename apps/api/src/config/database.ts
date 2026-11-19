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

/**
 * Connects at most once at a time, and retries after a failure.
 *
 * The serverless handler (`api/index.ts`) keeps one gate per instance. Holding
 * on to a rejected attempt would make every later request on that instance fail
 * until it restarts, so a failed attempt is forgotten and the next request tries
 * again. Requests that arrive during an attempt share it.
 */
export function createConnectionGate(
  connect: () => Promise<void> = connectToMongo,
): () => Promise<void> {
  let attempt: Promise<void> | null = null;

  return () => {
    if (!attempt) {
      attempt = connect().catch((error: unknown) => {
        attempt = null;
        throw error;
      });
    }
    return attempt;
  };
}
