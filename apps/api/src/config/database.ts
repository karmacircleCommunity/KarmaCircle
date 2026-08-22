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
