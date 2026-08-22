import "dotenv/config";
import { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { connectToMongo } from "../src/config/database";

const app = createApp();

let connectionPromise: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!connectionPromise) {
    connectionPromise = connectToMongo();
  }
  await connectionPromise;

  app(req, res);
}
