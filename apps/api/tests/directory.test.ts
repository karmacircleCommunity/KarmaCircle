import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

async function signUp(email: string, userType?: "organization") {
  const body: Record<string, unknown> = { email, password: "hunter2" };
  if (userType) {
    body.userType = userType;
    body.name = `Org ${email}`;
  }
  const res = await request(app).post("/auth/signup").send(body);
  expect(res.status).toBe(201);
  return res.body.user;
}

/**
 * directory.controller.ts goes straight through userService.findAll/
 * findByType — the same raw User query /organizations' own service builds
 * a draft/live filter on top of. These endpoints have no such filter, so
 * (unlike GET /organizations) a draft organization is visible here. That's
 * existing, documented behavior (see directory.md), not something these
 * tests are trying to change — just pin it down.
 */
describe("Directory", () => {
  describe("GET /display/users", () => {
    it("paginates every user regardless of type, via PUBLIC_FIELDS only", async () => {
      await signUp("individual@example.com");
      await signUp("org@example.com", "organization");

      const res = await request(app).get("/display/users");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      for (const user of res.body.data) {
        expect(user.password).toBeUndefined();
      }
    });

    it("honors page and limit query params", async () => {
      for (let i = 0; i < 3; i += 1) {
        await signUp(`user${i}@example.com`);
      }

      const res = await request(app).get("/display/users").query({ page: 2, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it("rejects a limit above the max of 100 with 400", async () => {
      const res = await request(app).get("/display/users").query({ limit: 101 });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /display/organizations", () => {
    it("lists organization accounts only, including drafts", async () => {
      await signUp("individual@example.com");
      const org = await signUp("org@example.com", "organization");

      const res = await request(app).get("/display/organizations");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userName).toBe(org.userName);
    });

    it("returns an empty page when no organizations exist", async () => {
      await signUp("individual@example.com");

      const res = await request(app).get("/display/organizations");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });
});
