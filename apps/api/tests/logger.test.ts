import express from "express";
import { Writable } from "node:stream";
import pino from "pino";
import pinoHttp from "pino-http";
import request from "supertest";
import { REDACTED_LOG_PATHS, loggerOptions } from "../src/config/logger";

/**
 * S-1: the request logger used to print every request header, including the
 * `Cookie` that holds the login token, and every `Set-Cookie`. These tests run
 * the real `pino-http` with the app's own logger options and read what it wrote.
 */
function loggedLinesFor(
  handle: (req: express.Request, res: express.Response) => void,
  send: (agent: request.Agent) => request.Test,
) {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  // The shared options silence the logger under test and pretty-print in
  // development; neither belongs here, only `redact` does.
  const logger = pino(
    { ...loggerOptions, level: "info", transport: undefined },
    stream,
  );
  const app = express();
  app.use(pinoHttp({ logger }));
  app.get("/", handle);

  return send(request.agent(app)).then(() => lines.join(""));
}

describe("request logging", () => {
  it("never writes the cookie or authorization headers", async () => {
    const output = await loggedLinesFor(
      (_req, res) => res.send("ok"),
      (agent) =>
        agent
          .get("/")
          .set("Cookie", "Token=secret-session-token; theme=dark")
          .set("Authorization", "Bearer secret-bearer-token"),
    );

    expect(output).not.toContain("secret-session-token");
    expect(output).not.toContain("secret-bearer-token");
    expect(output).toContain("[redacted]");
  });

  it("never writes the Set-Cookie that issues a session", async () => {
    const output = await loggedLinesFor(
      (_req, res) => {
        res.cookie("Token", "issued-session-token", { httpOnly: true });
        res.send("ok");
      },
      (agent) => agent.get("/"),
    );

    expect(output).not.toContain("issued-session-token");
  });

  it("still logs the rest of the request", async () => {
    const output = await loggedLinesFor(
      (_req, res) => res.send("ok"),
      (agent) => agent.get("/").set("User-Agent", "log-test-agent"),
    );

    expect(output).toContain('"method":"GET"');
    expect(output).toContain("log-test-agent");
    expect(output).toContain('"statusCode":200');
  });

  it("lists exactly the sensitive headers", () => {
    expect(REDACTED_LOG_PATHS).toEqual([
      "req.headers.cookie",
      "req.headers.authorization",
      'res.headers["set-cookie"]',
    ]);
  });
});
