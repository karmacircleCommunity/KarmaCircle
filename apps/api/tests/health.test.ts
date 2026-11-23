import * as database from "../src/config/database";
import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

describe("GET /health (O-5)", () => {
  it("answers 200 while the database is connected", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", mongo: "connected" });
  });

  it("answers 503 when the database is not connected", async () => {
    const state = jest
      .spyOn(database, "isDatabaseConnected")
      .mockReturnValue(false);

    const res = await request(app).get("/health");
    state.mockRestore();

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable", mongo: "disconnected" });
  });
});
