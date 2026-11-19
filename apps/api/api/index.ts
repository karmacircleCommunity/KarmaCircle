import "dotenv/config";
import { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { createConnectionGate } from "../src/config/database";

const app = createApp();

const ensureConnected = createConnectionGate();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await ensureConnected();
  } catch {
    // The failure is already logged by `connectToMongo`. Answer this request
    // plainly and let the next one try the connection again.
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Service temporarily unavailable" }));
    return;
  }

  app(req, res);
}
