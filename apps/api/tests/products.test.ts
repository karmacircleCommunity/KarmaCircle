import request from "supertest";
import { buildTestApp } from "./helpers/test-app";

const app = buildTestApp();

async function signup(email: string) {
  const res = await request(app)
    .post("/auth/signup")
    .send({ email, password: "hunter2", name: "Test User" });

  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error("signup did not return a Token cookie");
  }
  return { cookie, userName: res.body.user.userName as string };
}

describe("Products — cart", () => {
  it("rejects adding to a cart without authentication", async () => {
    const res = await request(app)
      .post("/product/cart/add")
      .send({ productId: "prod-1" });
    expect(res.status).toBe(401);
  });

  it("adds a product to the authenticated caller's own cart", async () => {
    const { cookie, userName } = await signup("cart-owner@example.com");

    const res = await request(app)
      .post("/product/cart/add")
      .set("Cookie", cookie)
      .send({ productId: "prod-1" });

    expect(res.status).toBe(200);

    const profile = await request(app).get(`/user?userName=${userName}`);
    expect(profile.body.cart.map((item: { id: string }) => item.id)).toEqual([
      "prod-1",
    ]);
  });

  it("cannot be used to write into another user's cart — there is no email field to target one", async () => {
    await signup("victim@example.com");
    const { cookie: attackerCookie, userName: attackerUserName } = await signup(
      "attacker@example.com",
    );

    // Same request shape a caller would have used pre-fix to target "victim@example.com" —
    // there is no longer a body field that can name a different account at all.
    const res = await request(app)
      .post("/product/cart/add")
      .set("Cookie", attackerCookie)
      .send({ email: "victim@example.com", productId: "prod-1" });

    expect(res.status).toBe(200);

    // The item lands on the authenticated caller's own cart, not the named "victim" account.
    const attackerProfile = await request(app).get(
      `/user?userName=${attackerUserName}`,
    );
    expect(
      attackerProfile.body.cart.map((item: { id: string }) => item.id),
    ).toEqual(["prod-1"]);

    const victimProfile = await request(app).get("/user?userName=victim");
    expect(victimProfile.body.cart).toEqual([]);
  });
});
