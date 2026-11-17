import http from "node:http";
import { Writable } from "node:stream";
import express from "express";
import pinoHttp from "pino-http";
import request from "supertest";
import { createLogger } from "../src/config/logger";

const SESSION_JWT = "eyJhbGciOiJIUzI1NiJ9.super-secret-session-token.sig";

/** The real logger config (redaction included) writing into memory. */
function captureLogs() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const logger = createLogger(stream, { level: "info" });
  return { logger, output: () => lines.join("") };
}

async function callWithCredentials() {
  const { logger, output } = captureLogs();
  const app = express();
  app.use(pinoHttp({ logger }));
  app.get("/ping", (_req, res) => {
    res.cookie("Token", SESSION_JWT, { httpOnly: true });
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  try {
    await request(server)
      .get("/ping")
      .set("Cookie", `Token=${SESSION_JWT}; other=value`)
      .set("Authorization", `Bearer ${SESSION_JWT}`)
      .set("User-Agent", "logger-test");
    // pino-http writes the line when the response finishes.
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return output();
}

describe("request logger redaction (S-1)", () => {
  it("never writes the session token from request or response headers", async () => {
    const logged = await callWithCredentials();

    expect(logged).not.toBe("");
    expect(logged).not.toContain(SESSION_JWT);
    expect(logged).not.toContain("super-secret-session-token");
  });

  it("replaces the cookie, authorization and set-cookie headers with a marker", async () => {
    const entry = JSON.parse(
      (await callWithCredentials()).trim().split("\n")[0],
    );

    expect(entry.req.headers.cookie).toBe("[Redacted]");
    expect(entry.req.headers.authorization).toBe("[Redacted]");
    expect(entry.res.headers["set-cookie"]).toBe("[Redacted]");
  });

  it("still logs the harmless request details", async () => {
    const entry = JSON.parse(
      (await callWithCredentials()).trim().split("\n")[0],
    );

    expect(entry.req.method).toBe("GET");
    expect(entry.req.url).toBe("/ping");
    expect(entry.req.headers["user-agent"]).toBe("logger-test");
    expect(entry.res.statusCode).toBe(200);
  });
});
