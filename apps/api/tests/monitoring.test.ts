import type { Request, Response } from "express";
import { checkHealth } from "../src/config/health";
import { initMonitoring, shutdownMonitoring } from "../src/config/monitoring";
import { AppError, errorHandler } from "../src/middleware/error-handler";

/**
 * O-5: error tracking and the health check. The tracker is started with a
 * fake transport that records what would have been sent, so nothing leaves
 * the machine.
 */

const SESSION = "super-secret-session-token";
const DSN = "https://publickey@o0.ingest.sentry.example/1";

function fakeTransport() {
  const sent: string[] = [];
  const transport = () => ({
    send: async (envelope: unknown) => {
      sent.push(JSON.stringify(envelope));
      return {};
    },
    flush: async () => true,
  });
  return { sent, transport: transport as never };
}

async function runErrorHandler(error: unknown) {
  const req = {
    method: "POST",
    route: { path: "/events/:uid/join" },
    baseUrl: "",
    originalUrl: `/events/private-name?token=${SESSION}`,
    headers: { cookie: `Token=${SESSION}`, authorization: `Bearer ${SESSION}` },
    cookies: { Token: SESSION },
    body: { email: "person@example.com", password: SESSION },
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return errorHandler(error, req, res as unknown as Response, jest.fn()).then(
    () => res,
  );
}

describe("error tracking", () => {
  afterEach(() => shutdownMonitoring());

  it("is off without a DSN and answers 500 as before", async () => {
    expect(initMonitoring()).toBe(false);

    const res = await runErrorHandler(new Error("boom"));

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("reports an unexpected error with its method and route, then answers 500", async () => {
    const { sent, transport } = fakeTransport();
    expect(initMonitoring({ dsn: DSN, transport })).toBe(true);

    const res = await runErrorHandler(new Error("database exploded"));

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = sent.join("");
    expect(payload).toContain("database exploded");
    expect(payload).toContain("/events/:uid/join");
    expect(payload).toContain("POST");
  });

  it("has sent the report before the response goes out", async () => {
    const { sent, transport } = fakeTransport();
    initMonitoring({ dsn: DSN, transport });
    let sentWhenResponded = -1;
    const req = {
      method: "GET",
      route: { path: "/x" },
      baseUrl: "",
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(() => {
        sentWhenResponded = sent.length;
      }),
    };

    await errorHandler(
      new Error("order check"),
      req,
      res as unknown as Response,
      jest.fn(),
    );

    expect(sentWhenResponded).toBeGreaterThan(0);
  });

  it("never sends the session, headers, query string, body or email", async () => {
    const { sent, transport } = fakeTransport();
    initMonitoring({ dsn: DSN, transport });

    await runErrorHandler(new Error("leak check"));

    const payload = sent.join("");
    expect(payload).toContain("leak check");
    expect(payload).not.toContain(SESSION);
    expect(payload).not.toContain("person@example.com");
    expect(payload).not.toContain("private-name");
  });

  it("does not report expected failures", async () => {
    const { sent, transport } = fakeTransport();
    initMonitoring({ dsn: DSN, transport });

    const res = await runErrorHandler(new AppError(404, "Not found"));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(sent).toHaveLength(0);
  });
});

describe("health check", () => {
  const connection = (readyState: number, ping?: () => Promise<unknown>) =>
    ({
      readyState,
      db: ping ? { admin: () => ({ ping }) } : undefined,
    }) as never;

  it("is ok when MongoDB answers a ping", async () => {
    const report = await checkHealth(connection(1, async () => ({ ok: 1 })));

    expect(report).toMatchObject({ status: "ok", mongo: "connected" });
    expect(report.mongoLatencyMs).toEqual(expect.any(Number));
    expect(report.uptimeSeconds).toEqual(expect.any(Number));
  });

  it("is degraded when there is no connection", async () => {
    expect(await checkHealth(connection(0))).toMatchObject({
      status: "degraded",
      mongo: "disconnected",
    });
  });

  it("is degraded when the connection looks open but the ping fails", async () => {
    const report = await checkHealth(
      connection(1, async () => {
        throw new Error("socket closed");
      }),
    );

    expect(report).toMatchObject({ status: "degraded", mongo: "unreachable" });
    expect(report.mongoLatencyMs).toBeUndefined();
  });

  it("is degraded when the ping hangs, and does not hang with it", async () => {
    const started = Date.now();

    const report = await checkHealth(
      connection(1, () => new Promise(() => undefined)),
      50,
    );

    expect(report).toMatchObject({ status: "degraded", mongo: "unreachable" });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
