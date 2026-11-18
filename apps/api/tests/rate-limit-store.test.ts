import { randomUUID } from "node:crypto";
import http from "node:http";
import express from "express";
import { MemoryStore, type Options, type Store } from "express-rate-limit";
import Redis from "ioredis";
import request from "supertest";
import { createLimiter } from "../src/middleware/rate-limit";
import {
  FailoverStore,
  RedisRateLimitStore,
} from "../src/middleware/rate-limit-store";
import { startTestRedis, type TestRedis } from "./helpers/redis";

/**
 * S-2: rate limits kept in Redis so every server instance shares one count.
 * The Redis tests use a real Redis (see helpers/redis.ts) and say so when one
 * is not available.
 */

// Each run uses its own key names, so a Redis that is not wiped between runs
// (the shared one in CI, or a developer's) cannot carry counts into the next.
const RUN = randomUUID().slice(0, 8);

const options = (windowMs: number) => ({ windowMs }) as Options;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- the failover rules, no Redis needed ------------------------------------

describe("FailoverStore", () => {
  function flaky() {
    const memory = new MemoryStore();
    memory.init(options(60_000));
    const state = { failing: false, calls: 0 };
    const primary: Store = {
      init: () => undefined,
      increment: async (key) => {
        state.calls++;
        if (state.failing) throw new Error("redis is down");
        return memory.increment(key);
      },
      decrement: async (key) => memory.decrement(key),
      resetKey: async (key) => memory.resetKey(key),
    };
    return { primary, state };
  }

  it("uses the shared store while it works", async () => {
    const { primary, state } = flaky();
    const store = new FailoverStore(primary, "test");
    store.init(options(60_000));

    await store.increment("a");
    await store.increment("a");

    expect(state.calls).toBe(2);
  });

  it("keeps counting in memory when the shared store fails, and never throws", async () => {
    const { primary, state } = flaky();
    state.failing = true;
    const store = new FailoverStore(primary, "test");
    store.init(options(60_000));

    const hits = [];
    for (let i = 0; i < 3; i++)
      hits.push((await store.increment("a")).totalHits);

    expect(hits).toEqual([1, 2, 3]);
  });

  it("does not make every request wait on a broken store: one try, then a cooldown", async () => {
    const { primary, state } = flaky();
    state.failing = true;
    let now = 1_000;
    const store = new FailoverStore(primary, "test", 5000, () => now);
    store.init(options(60_000));

    await store.increment("a");
    await store.increment("a");
    await store.increment("a");

    expect(state.calls).toBe(1);

    now += 5000;
    await store.increment("a");
    expect(state.calls).toBe(2);
  });

  it("goes back to the shared store once it works again", async () => {
    const { primary, state } = flaky();
    state.failing = true;
    let now = 0;
    const store = new FailoverStore(primary, "test", 1000, () => now);
    store.init(options(60_000));
    await store.increment("a");

    state.failing = false;
    now += 1000;
    const callsBefore = state.calls;
    const result = await store.increment("a");

    expect(state.calls).toBe(callsBefore + 1);
    expect(result.totalHits).toBe(1);
  });
});

// ---- against a real Redis ---------------------------------------------------

function server(limiter: express.RequestHandler) {
  const app = express();
  app.use(limiter);
  app.get("/", (_req, res) => void res.json({ ok: true }));
  const httpServer = http.createServer(app);
  const ready = new Promise<void>((resolve) =>
    httpServer.listen(0, "127.0.0.1", () => resolve()),
  );
  return { httpServer, ready };
}

describe("RedisRateLimitStore", () => {
  let redis: TestRedis | null;
  const clients: Redis[] = [];
  const servers: http.Server[] = [];

  const client = () => {
    const c = new Redis(redis!.url, {
      maxRetriesPerRequest: 1,
      commandTimeout: 1000,
    });
    c.on("error", () => undefined);
    clients.push(c);
    return c;
  };

  beforeAll(async () => {
    redis = await startTestRedis();
    if (!redis) {
      console.warn(
        "Redis tests SKIPPED: no redis-server installed and REDIS_TEST_URL is not set",
      );
    }
  });
  afterAll(async () => {
    servers.forEach((s) => s.closeAllConnections?.());
    await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
    clients.forEach((c) => c.disconnect());
    await redis?.stop();
  });

  const itRedis = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!redis) return;
      await fn();
    });

  itRedis("counts hits and reports when the window ends", async () => {
    const store = new RedisRateLimitStore(client(), `rl:${RUN}:t1:`);
    store.init(options(60_000));

    const first = await store.increment("ip-1");
    const second = await store.increment("ip-1");

    expect([first.totalHits, second.totalHits]).toEqual([1, 2]);
    const msLeft = second.resetTime!.getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(55_000);
    expect(msLeft).toBeLessThanOrEqual(60_000);
  });

  itRedis("keeps clients apart", async () => {
    const store = new RedisRateLimitStore(client(), `rl:${RUN}:t2:`);
    store.init(options(60_000));

    await store.increment("ip-a");
    await store.increment("ip-a");

    expect((await store.increment("ip-b")).totalHits).toBe(1);
  });

  itRedis("starts counting again when the window is over", async () => {
    const store = new RedisRateLimitStore(client(), `rl:${RUN}:t3:`);
    store.init(options(300));
    await store.increment("ip");
    await store.increment("ip");

    await sleep(450);

    expect((await store.increment("ip")).totalHits).toBe(1);
  });

  itRedis("never leaves a counter without an expiry", async () => {
    const c = client();
    const store = new RedisRateLimitStore(c, `rl:${RUN}:t4:`);
    store.init(options(60_000));

    await store.increment("ip");
    expect(await c.pttl(`rl:${RUN}:t4:ip`)).toBeGreaterThan(0);

    // A counter that lost its expiry (for example after a crash between two
    // commands) is repaired by the next hit instead of living for ever.
    await c.persist(`rl:${RUN}:t4:ip`);
    expect(await c.pttl(`rl:${RUN}:t4:ip`)).toBe(-1);
    await store.increment("ip");
    expect(await c.pttl(`rl:${RUN}:t4:ip`)).toBeGreaterThan(0);
  });

  itRedis(
    "counts every one of many simultaneous hits exactly once",
    async () => {
      const store = new RedisRateLimitStore(client(), `rl:${RUN}:t5:`);
      store.init(options(60_000));

      const results = await Promise.all(
        Array.from({ length: 60 }, () => store.increment("ip")),
      );

      const hits = results.map((r) => r.totalHits).sort((a, b) => a - b);
      expect(hits).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    },
  );

  itRedis(
    "takes a hit back, but never goes below zero from nothing",
    async () => {
      const c = client();
      const store = new RedisRateLimitStore(c, `rl:${RUN}:t6:`);
      store.init(options(60_000));

      await store.decrement("ghost");
      expect(await c.exists(`rl:${RUN}:t6:ghost`)).toBe(0);

      await store.increment("ip");
      await store.increment("ip");
      await store.decrement("ip");
      expect((await store.increment("ip")).totalHits).toBe(2);
    },
  );

  itRedis("resets one client", async () => {
    const store = new RedisRateLimitStore(client(), `rl:${RUN}:t7:`);
    store.init(options(60_000));
    await store.increment("ip");
    await store.increment("ip");

    await store.resetKey("ip");

    expect((await store.increment("ip")).totalHits).toBe(1);
  });

  itRedis(
    "limits one client across two separate servers (the S-2 problem)",
    async () => {
      // Two server instances, each with its own Redis connection and its own
      // limiter, the way two serverless instances are.
      const build = (name: string) => {
        const limiter = createLimiter({
          name,
          windowMs: 60_000,
          limit: 3,
          message: "slow down",
          skip: () => false,
          store: new FailoverStore(
            new RedisRateLimitStore(client(), `rl:${RUN}:${name}:`),
            name,
          ),
        });
        const s = server(limiter);
        servers.push(s.httpServer);
        return s;
      };
      const a = build(`shared-${RUN}`);
      const b = build(`shared-${RUN}`);
      await Promise.all([a.ready, b.ready]);

      const statuses: number[] = [];
      for (const target of [a, b, a, b, a]) {
        statuses.push((await request(target.httpServer).get("/")).status);
      }

      expect(statuses).toEqual([200, 200, 200, 429, 429]);
    },
  );

  itRedis(
    "whereas per-instance memory lets the same client through twice as often",
    async () => {
      const build = () => {
        const limiter = createLimiter({
          name: "memory",
          windowMs: 60_000,
          limit: 3,
          message: "slow down",
          skip: () => false,
          store: new MemoryStore(),
        });
        const s = server(limiter);
        servers.push(s.httpServer);
        return s;
      };
      const a = build();
      const b = build();
      await Promise.all([a.ready, b.ready]);

      const statuses: number[] = [];
      for (const target of [a, b, a, b, a, b]) {
        statuses.push((await request(target.httpServer).get("/")).status);
      }

      expect(statuses).toEqual([200, 200, 200, 200, 200, 200]);
    },
  );

  itRedis("answers 429 with the usual message and headers", async () => {
    const limiter = createLimiter({
      name: "headers",
      windowMs: 60_000,
      limit: 1,
      message: "Too many auth attempts, please try again later.",
      statusCode: 429,
      skip: () => false,
      store: new FailoverStore(
        new RedisRateLimitStore(client(), `rl:${RUN}:headers:`),
        "headers",
      ),
    });
    const s = server(limiter);
    servers.push(s.httpServer);
    await s.ready;

    await request(s.httpServer).get("/");
    const blocked = await request(s.httpServer).get("/");

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      message: "Too many auth attempts, please try again later.",
    });
    expect(blocked.headers["ratelimit-remaining"]).toBe("0");
    expect(Number(blocked.headers["ratelimit-reset"])).toBeGreaterThan(0);
  });

  it("keeps serving, and keeps limiting per instance, when Redis dies, then returns to Redis", async () => {
    if (!redis || !redis.owned) return;
    const c = new Redis(redis.url, {
      maxRetriesPerRequest: 1,
      commandTimeout: 500,
      retryStrategy: () => 200,
    });
    c.on("error", () => undefined);
    clients.push(c);
    const limiter = createLimiter({
      name: "outage",
      windowMs: 60_000,
      limit: 3,
      message: "slow down",
      skip: () => false,
      store: new FailoverStore(
        new RedisRateLimitStore(c, `rl:${RUN}:outage:`),
        "outage",
        300,
      ),
    });
    const s = server(limiter);
    servers.push(s.httpServer);
    await s.ready;
    expect((await request(s.httpServer).get("/")).status).toBe(200);

    await redis.stop();

    const during: number[] = [];
    for (let i = 0; i < 4; i++)
      during.push((await request(s.httpServer).get("/")).status);
    // Never a 5xx. The instance still limits, on its own count.
    expect(during.every((status) => status === 200 || status === 429)).toBe(
      true,
    );
    expect(during).toContain(429);

    await redis.start();
    await sleep(1200);
    const probe = client();
    await request(s.httpServer).get("/");
    await sleep(100);
    expect((await probe.keys(`rl:${RUN}:outage:*`)).length).toBeGreaterThan(0);
  });
});
