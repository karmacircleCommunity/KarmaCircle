import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import * as mailer from "../src/config/mailer";

const app = buildTestApp();

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const sendPasswordResetEmail = mailer.sendPasswordResetEmail as jest.Mock;

/**
 * requestPasswordReset only ever hands the raw token to the mocked mailer
 * (it's never returned in any API response) — extract it from whichever
 * reset URL the mock was called with, the way a real user would from the
 * email itself.
 */
function extractTokenFromLastResetEmail(): string {
  const resetUrl = sendPasswordResetEmail.mock.calls.at(-1)?.[1] as string;
  return resetUrl.split("/").pop() as string;
}

describe("Auth", () => {
  const credentials = { email: "jane@example.com", password: "hunter2" };

  it("signs up a new user and returns a Token cookie", async () => {
    const res = await request(app).post("/auth/signup").send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(credentials.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^Token=/);
  });

  it("rejects a duplicate signup with 409", async () => {
    await request(app).post("/auth/signup").send(credentials);
    const res = await request(app).post("/auth/signup").send(credentials);

    expect(res.status).toBe(409);
  });

  it("rejects signup with an invalid email via validation", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "not-an-email", password: "hunter2" });

    expect(res.status).toBe(400);
  });

  it("signs in an existing user", async () => {
    await request(app).post("/auth/signup").send(credentials);
    const res = await request(app).post("/auth/signin").send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(credentials.email);
  });

  it("rejects signin with the wrong password with 401", async () => {
    await request(app).post("/auth/signup").send(credentials);
    const res = await request(app)
      .post("/auth/signin")
      .send({ email: credentials.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("rejects signin for an unknown email with 401", async () => {
    const res = await request(app)
      .post("/auth/signin")
      .send({ email: "nobody@example.com", password: "hunter2" });

    expect(res.status).toBe(401);
  });

  describe("GET /auth/check-email", () => {
    it("reports exists: true for a registered email", async () => {
      await request(app).post("/auth/signup").send(credentials);
      const res = await request(app)
        .get("/auth/check-email")
        .query({ email: credentials.email });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exists: true });
    });

    it("reports exists: false for an unregistered email", async () => {
      const res = await request(app)
        .get("/auth/check-email")
        .query({ email: "nobody@example.com" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exists: false });
    });

    it("rejects a malformed email with 400", async () => {
      const res = await request(app)
        .get("/auth/check-email")
        .query({ email: "not-an-email" });

      expect(res.status).toBe(400);
    });
  });

  describe("password update", () => {
    it("changes the password without wiping the rest of the profile", async () => {
      await request(app)
        .post("/auth/signup")
        .send({ ...credentials, name: "Jane Doe" });

      const updateRes = await request(app).post("/auth/update").send({
        email: credentials.email,
        oldPassword: credentials.password,
        newPassword: "new-password-1",
      });
      expect(updateRes.status).toBe(201);

      const oldSignin = await request(app)
        .post("/auth/signin")
        .send(credentials);
      expect(oldSignin.status).toBe(401);

      const newSignin = await request(app)
        .post("/auth/signin")
        .send({ email: credentials.email, password: "new-password-1" });
      expect(newSignin.status).toBe(200);
      expect(newSignin.body.user.name).toBe("Jane Doe");
      expect(newSignin.body.user.userName).toBeDefined();
    });

    it("rejects the wrong old password with 401", async () => {
      await request(app).post("/auth/signup").send(credentials);

      const res = await request(app).post("/auth/update").send({
        email: credentials.email,
        oldPassword: "not-the-real-password",
        newPassword: "new-password-1",
      });

      expect(res.status).toBe(401);
    });

    it("rejects an unknown email with 404", async () => {
      const res = await request(app).post("/auth/update").send({
        email: "nobody@example.com",
        oldPassword: "whatever",
        newPassword: "new-password-1",
      });

      expect(res.status).toBe(404);
    });

    it("rejects a new password under 5 characters with 400", async () => {
      await request(app).post("/auth/signup").send(credentials);

      const res = await request(app).post("/auth/update").send({
        email: credentials.email,
        oldPassword: credentials.password,
        newPassword: "abcd",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("forgot password", () => {
    describe("POST /auth/forgot-password", () => {
      it("emails a reset link for a registered email", async () => {
        await request(app).post("/auth/signup").send(credentials);

        const res = await request(app)
          .post("/auth/forgot-password")
          .send({ email: credentials.email });

        expect(res.status).toBe(200);
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(
          credentials.email,
          expect.stringContaining("/auth/reset-password/"),
        );
      });

      it("responds identically for an unregistered email, without emailing anything", async () => {
        const res = await request(app)
          .post("/auth/forgot-password")
          .send({ email: "nobody@example.com" });

        expect(res.status).toBe(200);
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it("rejects a malformed email with 400", async () => {
        const res = await request(app)
          .post("/auth/forgot-password")
          .send({ email: "not-an-email" });

        expect(res.status).toBe(400);
      });
    });

    describe("POST /auth/reset-password", () => {
      it("resets the password and signs out every existing session", async () => {
        const signupRes = await request(app)
          .post("/auth/signup")
          .send(credentials);
        const cookie = signupRes.headers["set-cookie"][0];

        await request(app)
          .post("/auth/forgot-password")
          .send({ email: credentials.email });
        const token = extractTokenFromLastResetEmail();

        const resetRes = await request(app)
          .post("/auth/reset-password")
          .send({ token, newPassword: "new-password-1" });
        expect(resetRes.status).toBe(200);

        const oldSignin = await request(app)
          .post("/auth/signin")
          .send(credentials);
        expect(oldSignin.status).toBe(401);

        const newSignin = await request(app)
          .post("/auth/signin")
          .send({ email: credentials.email, password: "new-password-1" });
        expect(newSignin.status).toBe(200);

        const staleSession = await request(app)
          .get("/organizations/dashboard")
          .set("Cookie", cookie);
        expect(staleSession.status).toBe(401);
      });

      it("rejects a garbage token with 400", async () => {
        const res = await request(app)
          .post("/auth/reset-password")
          .send({ token: "not-a-real-token", newPassword: "new-password-1" });

        expect(res.status).toBe(400);
      });

      it("rejects reusing an already-consumed token with 400", async () => {
        await request(app).post("/auth/signup").send(credentials);
        await request(app)
          .post("/auth/forgot-password")
          .send({ email: credentials.email });
        const token = extractTokenFromLastResetEmail();

        const firstUse = await request(app)
          .post("/auth/reset-password")
          .send({ token, newPassword: "new-password-1" });
        expect(firstUse.status).toBe(200);

        const secondUse = await request(app)
          .post("/auth/reset-password")
          .send({ token, newPassword: "new-password-2" });
        expect(secondUse.status).toBe(400);
      });

      it("rejects an expired token with 400", async () => {
        await request(app).post("/auth/signup").send(credentials);
        await request(app)
          .post("/auth/forgot-password")
          .send({ email: credentials.email });
        const token = extractTokenFromLastResetEmail();

        const { User } = await import("../src/modules/users/user.model");
        await User.updateOne(
          { email: credentials.email },
          { resetPasswordExpires: new Date(Date.now() - 1000) },
        );

        const res = await request(app)
          .post("/auth/reset-password")
          .send({ token, newPassword: "new-password-1" });
        expect(res.status).toBe(400);
      });

      it("rejects a new password under 5 characters with 400", async () => {
        await request(app).post("/auth/signup").send(credentials);
        await request(app)
          .post("/auth/forgot-password")
          .send({ email: credentials.email });
        const token = extractTokenFromLastResetEmail();

        const res = await request(app)
          .post("/auth/reset-password")
          .send({ token, newPassword: "abcd" });
        expect(res.status).toBe(400);
      });
    });
  });

  describe("session revocation", () => {
    it("invalidates a previously-issued token after a password change", async () => {
      const signupRes = await request(app)
        .post("/auth/signup")
        .send(credentials);
      const cookie = signupRes.headers["set-cookie"][0];

      const before = await request(app)
        .get("/organizations/dashboard")
        .set("Cookie", cookie);
      expect(before.status).toBe(200);

      await request(app).post("/auth/update").send({
        email: credentials.email,
        oldPassword: credentials.password,
        newPassword: "new-password-1",
      });

      const after = await request(app)
        .get("/organizations/dashboard")
        .set("Cookie", cookie);
      expect(after.status).toBe(401);
    });

    it("invalidates a previously-issued token after logout", async () => {
      const signupRes = await request(app)
        .post("/auth/signup")
        .send(credentials);
      const cookie = signupRes.headers["set-cookie"][0];

      const before = await request(app)
        .get("/organizations/dashboard")
        .set("Cookie", cookie);
      expect(before.status).toBe(200);

      const logoutRes = await request(app)
        .get("/auth/logout")
        .set("Cookie", cookie);
      expect(logoutRes.status).toBe(200);

      const after = await request(app)
        .get("/organizations/dashboard")
        .set("Cookie", cookie);
      expect(after.status).toBe(401);
    });

    it("does not error when logging out with no cookie at all", async () => {
      const res = await request(app).get("/auth/logout");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /auth/login/success", () => {
    // Was previously unreachable for any real caller: its old req.user
    // check could only ever pass inside the single request Passport's
    // callback itself handled, never this separate follow-up request.
    // It's now requireAuth-gated instead, so a valid Token cookie (the
    // same kind googleCallback sets on its redirect response) is enough
    // to reach it — see auth.controller.ts's loginSuccess/issueOAuthSession.
    it("returns the caller's own user data given a valid Token cookie", async () => {
      const signupRes = await request(app)
        .post("/auth/signup")
        .send(credentials);
      const cookie = signupRes.headers["set-cookie"][0];

      const res = await request(app)
        .get("/auth/login/success")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(credentials.email);
    });

    it("rejects a request with no Token cookie with 401", async () => {
      const res = await request(app).get("/auth/login/success");
      expect(res.status).toBe(401);
    });
  });

  describe("userType discriminator", () => {
    it("signing up with userType 'organization' is not listed via GET /user, and stays out of the directory until its profile is complete", async () => {
      const organization = {
        email: "organization@example.com",
        password: "hunter2",
        name: "Helping Hands",
        userType: "organization",
      };
      const signupRes = await request(app).post("/auth/signup").send(organization);
      expect(signupRes.status).toBe(201);

      // The signup created a draft organization record alongside the
      // login — draft records are invisible to visitors, so the public
      // directory is still empty. See modules/organizations.
      const organizationList = await request(app).get("/organizations");
      expect(
        organizationList.body.data.map((o: { name: string }) => o.name),
      ).not.toContain(organization.name);

      const individualList = await request(app).get("/user");
      expect(
        individualList.body.data.map((u: { email: string }) => u.email),
      ).not.toContain(organization.email);
    });

    it("signing up with no userType defaults to an individual, listed via GET /user", async () => {
      const individual = { email: "solo@example.com", password: "hunter2" };
      const signupRes = await request(app)
        .post("/auth/signup")
        .send(individual);
      expect(signupRes.status).toBe(201);

      const individualList = await request(app).get("/user");
      expect(
        individualList.body.data.map((u: { email: string }) => u.email),
      ).toContain(individual.email);
    });
  });
});
