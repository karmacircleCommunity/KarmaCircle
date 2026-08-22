import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

async function signupAndGetCookie() {
  const res = await request(app)
    .post("/auth/signup")
    .send({ email: "profile@example.com", password: "hunter2", name: "Jane" });

  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error("signup did not return a Token cookie");
  }
  return cookie;
}

describe("Users", () => {
  describe("GET /user/profile", () => {
    it("returns { user } for the authenticated caller", async () => {
      const cookie = await signupAndGetCookie();

      const res = await request(app).get("/user/profile").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("profile@example.com");
      expect(res.body.user.password).toBeUndefined();
    });

    it("rejects an unauthenticated request with 401", async () => {
      const res = await request(app).get("/user/profile");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /user/update", () => {
    it("updates name/description/address, mapping coverImage onto bannerPicture", async () => {
      const cookie = await signupAndGetCookie();

      const updateRes = await request(app)
        .patch("/user/update")
        .set("Cookie", cookie)
        .send({
          name: "Jane Updated",
          description: "A meaningful description",
          coverImage: "https://example.com/cover.png",
          address: { line1: "1 Main St", city: "Springfield" },
        });
      expect(updateRes.status).toBe(200);

      const profileRes = await request(app)
        .get("/user/profile")
        .set("Cookie", cookie);

      expect(profileRes.body.user.name).toBe("Jane Updated");
      expect(profileRes.body.user.description).toBe("A meaningful description");
      expect(profileRes.body.user.bannerPicture).toBe(
        "https://example.com/cover.png",
      );
      expect(profileRes.body.user.address.line1).toBe("1 Main St");
      expect(profileRes.body.user.address.city).toBe("Springfield");
    });

    it("no longer accepts POST (frontend only ever sends PATCH)", async () => {
      const cookie = await signupAndGetCookie();
      const res = await request(app)
        .post("/user/update")
        .set("Cookie", cookie)
        .send({ description: "x" });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /user/complete", () => {
    it("sets config.hasCompletedProfile regardless of what the client sends", async () => {
      const cookie = await signupAndGetCookie();

      const before = await request(app)
        .get("/user/profile")
        .set("Cookie", cookie);
      expect(before.body.user.config.hasCompletedProfile).toBe(false);

      const completeRes = await request(app)
        .patch("/user/complete")
        .set("Cookie", cookie)
        .send({
          description: "A".repeat(120),
          address: { line1: "1 Main St" },
        });
      expect(completeRes.status).toBe(200);

      const after = await request(app)
        .get("/user/profile")
        .set("Cookie", cookie);
      expect(after.body.user.config.hasCompletedProfile).toBe(true);
      expect(after.body.user.description).toBe("A".repeat(120));
    });
  });
});
