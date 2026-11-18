import http from "node:http";
import request from "supertest";

/**
 * O-1: the serverless handler (api/index.ts) used to remember its first
 * connection attempt forever. If that attempt failed, every later request on
 * the same warm instance failed too, even after MongoDB came back.
 *
 * Each test loads a fresh copy of the handler (and of mongoose, so the spy and
 * the handler agree on one `mongoose.connect`), the way a fresh cold start does.
 */

async function coldStart(connect: jest.Mock) {
  let handler!: typeof import("../api/index").default;
  await jest.isolateModulesAsync(async () => {
    const { default: mongoose } = await import("mongoose");
    jest.spyOn(mongoose, "connect").mockImplementation(connect as never);
    handler = (await import("../api/index")).default;
  });
  // Vercel turns a handler that throws into a 500, so mirror that here.
  return http.createServer((req, res) => {
    handler(req, res).catch(() => {
      res.statusCode = 500;
      res.end("handler threw");
    });
  });
}

describe("serverless handler database connection (O-1)", () => {
  it("answers 503 when the first connection attempt fails", async () => {
    const connect = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const server = await coldStart(connect);

    const res = await request(server).get("/");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: expect.any(String) });
  });

  it("retries on the next request and recovers once the database is back", async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValue(undefined);
    const server = await coldStart(connect);

    const first = await request(server).get("/");
    const second = await request(server).get("/");

    expect(first.status).toBe(503);
    expect(second.status).toBe(200);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("connects once and reuses the connection while it works", async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const server = await coldStart(connect);

    await request(server).get("/");
    await request(server).get("/");
    await request(server).get("/");

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("shares one attempt between requests that arrive while it is pending", async () => {
    let finish!: () => void;
    const connect = jest.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    ) as jest.Mock;
    const server = await coldStart(connect);

    const inFlight = Promise.all([
      request(server).get("/"),
      request(server).get("/"),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 150));
    finish();
    const results = await inFlight;

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
