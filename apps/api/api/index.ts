import "dotenv/config";
import { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { ensureMongoConnection } from "../src/config/database";
import { STATUS_CODE, STATUS_MESSAGE } from "../src/constants/http-status";

const app = createApp();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    await ensureMongoConnection();
  } catch {
    // The failure is already logged by connectToMongo. Answer cleanly and let
    // the next request retry, instead of throwing out of the handler.
    res.statusCode = STATUS_CODE.SERVICE_UNAVAILABLE;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Retry-After", "5");
    res.end(JSON.stringify({ message: STATUS_MESSAGE.SERVICE_UNAVAILABLE }));
    return;
  }

  app(req, res);
}
