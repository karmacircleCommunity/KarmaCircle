import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import Redis from "ioredis";

/**
 * A real Redis for tests that need one. Uses `REDIS_TEST_URL` when it is set
 * (CI starts a Redis service and sets it), otherwise starts a throwaway
 * `redis-server` on a free port, if one is installed. Returns null when
 * neither is available, so the tests that need it can say they were skipped.
 */
export interface TestRedis {
  url: string;
  /** False when Redis is an external one this process did not start. */
  owned: boolean;
  stop: () => Promise<void>;
  /** Starts it again on the same port after `stop`. Only when owned. */
  start: () => Promise<void>;
}

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const waitUntilReady = async (url: string) => {
  const client = new Redis(url, {
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  client.on("error", () => undefined);
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await client.connect();
      await client.ping();
      client.disconnect();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  client.disconnect();
  throw new Error("redis-server did not become ready");
};

export async function startTestRedis(): Promise<TestRedis | null> {
  if (process.env.REDIS_TEST_URL) {
    return {
      url: process.env.REDIS_TEST_URL,
      owned: false,
      stop: async () => undefined,
      start: async () => undefined,
    };
  }
  if (spawnSync("redis-server", ["--version"]).status !== 0) return null;

  const port = await freePort();
  const url = `redis://127.0.0.1:${port}`;
  let child: ChildProcess | null = null;

  const start = async () => {
    child = spawn(
      "redis-server",
      [
        "--port",
        String(port),
        "--bind",
        "127.0.0.1",
        "--save",
        "",
        "--appendonly",
        "no",
      ],
      { stdio: "ignore" },
    );
    await waitUntilReady(url);
  };
  const stop = async () => {
    const running = child;
    child = null;
    if (!running) return;
    await new Promise<void>((resolve) => {
      running.once("exit", () => resolve());
      running.kill("SIGKILL");
    });
  };

  await start();
  return { url, owned: true, stop, start };
}
