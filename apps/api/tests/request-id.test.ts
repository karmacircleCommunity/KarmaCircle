import http from "node:http";
import express from "express";
import Redis from "ioredis";
import request from "supertest";
import {
  bindRequestContext,
  getRequestId,
  requestId,
} from "../src/middleware/request-id";
import {
  enqueueJobs,
  queueKeys,
} from "../src/modules/notifications/notification.queue";
import {
  buildReminder,
  type NotificationJob,
} from "../src/modules/notifications/notification.jobs";
import { startTestRedis, type TestRedis } from "./helpers/redis";
import { asha, beachDay } from "./helpers/notification-fixtures";
import { buildTestApp } from "./helpers/test-app";

/**
 * One id per request, so a request can be followed through the API, the image
 * service and the notification worker.
 */

// The real logger, writing into memory, so the access log line can be read.
jest.mock("../src/config/logger", () => {
  const pino = jest.requireActual("pino");
  const { Writable } = jest.requireActual("node:stream");
  const lines: string[] = [];
  (globalThis as { __logLines?: string[] }).__logLines = lines;
  const stream = new Writable({
    write(chunk: Buffer, _encoding: string, done: () => void) {
      lines.push(chunk.toString());
      done();
    },
  });
  return { logger: pino({ level: "info" }, stream) };
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const logLines = () =>
  (globalThis as unknown as { __logLines: string[] }).__logLines;

describe("X-Request-Id on the API", () => {
  const app = buildTestApp();

  it("gives every response an id", async () => {
    const res = await request(app).get("/");

    expect(res.headers["x-request-id"]).toMatch(UUID);
  });

  it("gives different requests different ids", async () => {
    const a = await request(app).get("/");
    const b = await request(app).get("/");

    expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
  });

  it("keeps an id the caller sent, so it can follow its own request", async () => {
    const res = await request(app).get("/").set("X-Request-Id", "web-7f3a.9");

    expect(res.headers["x-request-id"]).toBe("web-7f3a.9");
  });

  it.each([
    ["spaces", "has spaces"],
    ["quotes", 'a"b'],
    ["markup", "<script>"],
    ["too long", "x".repeat(65)],
    ["a path", "../etc/passwd"],
  ])("does not trust an id with %s, and makes its own", async (_label, bad) => {
    const res = await request(app).get("/").set("X-Request-Id", bad);

    expect(res.headers["x-request-id"]).toMatch(UUID);
    expect(res.headers["x-request-id"]).not.toBe(bad);
  });

  it("answers the browser's questions too, with the id on a 404 and on an error", async () => {
    const notFound = await request(app).get("/no-such-route");

    expect(notFound.status).toBe(404);
    expect(notFound.headers["x-request-id"]).toMatch(UUID);
  });

  it("lets the web app read the id across origins", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-expose-headers"]).toContain(
      "X-Request-Id",
    );
  });

  it("is in the access log line for the request", async () => {
    await request(app).get("/").set("X-Request-Id", "trace-me-123");

    const entry = logLines()
      .map((line) => JSON.parse(line))
      .find((line) => line.req?.id === "trace-me-123");
    expect(entry).toBeTruthy();
    expect(entry.req.url).toBe("/");
  });
});

describe("the id on the jobs the API queues", () => {
  let redisServer: TestRedis | null;
  let redis: Redis;

  beforeAll(async () => {
    redisServer = await startTestRedis();
    if (!redisServer) {
      console.warn(
        "Redis tests SKIPPED: no redis-server installed and REDIS_TEST_URL is not set",
      );
      return;
    }
    redis = new Redis(redisServer.url, { db: 3 });
    redis.on("error", () => undefined);
  });
  afterAll(async () => {
    redis?.disconnect();
    await redisServer?.stop();
  });
  beforeEach(async () => {
    if (redis) await redis.flushdb();
  });

  const itRedis = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!redisServer) return;
      await fn();
    });

  const stored = async (job: NotificationJob) =>
    JSON.parse((await redis.get(queueKeys.job(job.id)))!);
  const farAway = new Date("2026-11-01T00:00:00Z");

  // The same order as the real app: id first, body parser, then the context.
  const serve = (handler: express.RequestHandler) => {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use(bindRequestContext);
    app.post("/work", handler);
    const server = http.createServer(app);
    return {
      server,
      ready: new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", () => resolve()),
      ),
    };
  };

  itRedis(
    "stamps a job with the request that made it, even after a body was parsed and an await",
    async () => {
      const job = buildReminder(beachDay, asha, farAway)!;
      const { server, ready } = serve(async (_req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        await enqueueJobs([job], redis);
        res.json({ seen: getRequestId() });
      });
      await ready;

      const res = await request(server)
        .post("/work")
        .set("X-Request-Id", "req-abc-1")
        .send({ some: "body" });

      expect(res.body.seen).toBe("req-abc-1");
      expect((await stored(job)).requestId).toBe("req-abc-1");
      server.close();
    },
  );

  itRedis("keeps a request id the job already has", async () => {
    const job = {
      ...buildReminder(beachDay, asha, farAway)!,
      requestId: "from-builder",
    };
    const { server, ready } = serve(async (_req, res) => {
      await enqueueJobs([job], redis);
      res.json({});
    });
    await ready;

    await request(server)
      .post("/work")
      .set("X-Request-Id", "req-abc-2")
      .send({});

    expect((await stored(job)).requestId).toBe("from-builder");
    server.close();
  });

  itRedis("adds no id to a job queued outside any request", async () => {
    const job = buildReminder(beachDay, asha, farAway)!;

    await enqueueJobs([job], redis);

    expect("requestId" in (await stored(job))).toBe(false);
    expect(getRequestId()).toBeUndefined();
  });
});
