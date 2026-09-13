import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

const report = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  reportmessage: "The events page 404s on Safari.",
};

describe("Reports", () => {
  describe("POST /user/report", () => {
    it("accepts a well-formed report", async () => {
      const res = await request(app).post("/user/report").send(report);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("rejects a missing required field with 400", async () => {
      const { reportmessage: _reportmessage, ...incomplete } = report;
      const res = await request(app).post("/user/report").send(incomplete);

      expect(res.status).toBe(400);
    });

    it("rejects a malformed email with 400", async () => {
      const res = await request(app)
        .post("/user/report")
        .send({ ...report, email: "not-an-email" });

      expect(res.status).toBe(400);
    });

    // reportmessage isn't reused across cases above — a shared email would
    // trip the cooldown this test is deliberately exercising, and cases
    // aren't guaranteed to run in file order.
    it("rate-limits a second report from the same email within the cooldown with 429", async () => {
      const first = await request(app)
        .post("/user/report")
        .send({ ...report, email: "cooldown@example.com" });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/user/report")
        .send({ ...report, email: "cooldown@example.com" });

      expect(second.status).toBe(429);
      expect(second.body.success).toBe(false);
    });

    it("allows a different email through even while another is on cooldown", async () => {
      await request(app)
        .post("/user/report")
        .send({ ...report, email: "first@example.com" });

      const res = await request(app)
        .post("/user/report")
        .send({ ...report, email: "second@example.com" });

      expect(res.status).toBe(200);
    });
  });
});
