import type { Connection } from "mongoose";
import mongoose from "mongoose";

export type MongoStatus = "connected" | "disconnected" | "unreachable";

export interface HealthReport {
  status: "ok" | "degraded";
  mongo: MongoStatus;
  /** Round trip of a `ping` to MongoDB, only when it answered. */
  mongoLatencyMs?: number;
  uptimeSeconds: number;
  release?: string;
}

const PING_TIMEOUT_MS = 2000;

/**
 * Asks MongoDB itself, instead of trusting the driver's connection flag.
 * The flag can say "connected" while the server no longer answers, which is
 * exactly what an uptime monitor needs to catch.
 */
export async function checkHealth(
  connection: Pick<Connection, "readyState" | "db"> = mongoose.connection,
  timeoutMs = PING_TIMEOUT_MS,
): Promise<HealthReport> {
  const base = {
    uptimeSeconds: Math.round(process.uptime()),
    release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
  };

  if (connection.readyState !== 1 || !connection.db) {
    return { status: "degraded", mongo: "disconnected", ...base };
  }

  const startedAt = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      connection.db.admin().ping(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("ping timed out")),
          timeoutMs,
        );
      }),
    ]);
    return {
      status: "ok",
      mongo: "connected",
      mongoLatencyMs: Date.now() - startedAt,
      ...base,
    };
  } catch {
    return { status: "degraded", mongo: "unreachable", ...base };
  } finally {
    clearTimeout(timer);
  }
}
