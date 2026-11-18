import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let client: Redis | null | undefined;

/**
 * The shared Redis connection, or null when `REDIS_URL` is not set. Created
 * once per server instance and reused by every request on it.
 *
 * It never takes the API down: a command that cannot finish gives up after a
 * second, the client keeps trying to reconnect in the background, and
 * connection errors are logged instead of thrown (an `error` event with no
 * listener would crash the process).
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  if (!env.REDIS_URL) {
    client = null;
    return client;
  }

  client = new Redis(env.REDIS_URL, {
    connectTimeout: 2000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1,
    // Reconnect quickly at first, then at most every 5 seconds.
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
  });
  client.on("error", (error) => {
    logger.warn({ err: error }, "Redis connection problem");
  });
  return client;
}

/** Closes the connection. For tests and graceful shutdown. */
export async function closeRedis(): Promise<void> {
  const current = client;
  client = undefined;
  if (current) await current.quit().catch(() => current.disconnect());
}
