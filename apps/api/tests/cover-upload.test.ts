import jwt from "jsonwebtoken";
import request from "supertest";
import {
  COVER_MAX_BYTES,
  COVER_TOKEN_AUDIENCE,
  COVER_TOKEN_ISSUER,
  COVER_TOKEN_PURPOSE,
  COVER_TOKEN_TTL_SECONDS,
  signCoverUploadToken,
} from "../src/modules/events/cover-upload.service";
import { buildTestApp } from "./helpers/test-app";

/**
 * Event covers go to the image service (apps/image-service), which accepts a
 * short-lived token signed here. The claims below are the contract with the
 * Go side.
 */

const SECRET = "a-shared-secret-of-at-least-32-chars!!";

describe("signCoverUploadToken", () => {
  const now = new Date("2026-11-18T12:00:00Z");

  it("signs the claims the image service checks", () => {
    const { token, expiresAt } = signCoverUploadToken(
      "host@example.com",
      SECRET,
      now,
    );

    const claims = jwt.verify(token, SECRET, {
      algorithms: ["HS256"],
      issuer: COVER_TOKEN_ISSUER,
      audience: COVER_TOKEN_AUDIENCE,
      clockTimestamp: Math.floor(now.getTime() / 1000),
    }) as jwt.JwtPayload;

    expect(claims.purpose).toBe(COVER_TOKEN_PURPOSE);
    expect(claims.exp! - claims.iat!).toBe(COVER_TOKEN_TTL_SECONDS);
    expect(expiresAt.getTime()).toBe((claims.exp as number) * 1000);
  });

  it("lives five minutes, no more", () => {
    expect(COVER_TOKEN_TTL_SECONDS).toBe(300);
  });

  it("does not put the email address in the token", () => {
    const { token } = signCoverUploadToken("Host@Example.com", SECRET, now);
    const payload = Buffer.from(token.split(".")[1], "base64url").toString();

    expect(payload).not.toContain("example.com");
    expect(payload).not.toContain("Host");
  });

  it("gives the same caller the same subject, whatever the letter case", () => {
    const a = jwt.decode(
      signCoverUploadToken("host@example.com", SECRET, now).token,
    ) as jwt.JwtPayload;
    const b = jwt.decode(
      signCoverUploadToken(" Host@Example.com ", SECRET, now).token,
    ) as jwt.JwtPayload;
    const c = jwt.decode(
      signCoverUploadToken("other@example.com", SECRET, now).token,
    ) as jwt.JwtPayload;

    expect(a.sub).toBe(b.sub);
    expect(a.sub).not.toBe(c.sub);
  });

  it("is refused by anyone holding a different secret", () => {
    const { token } = signCoverUploadToken("host@example.com", SECRET, now);

    expect(() =>
      jwt.verify(token, "not-the-shared-secret-at-all-1234567890"),
    ).toThrow();
  });
});

describe("POST /events/cover-upload", () => {
  const app = buildTestApp();

  it("needs a signed-in user", async () => {
    const res = await request(app).post("/events/cover-upload");

    expect(res.status).toBe(401);
  });

  it("gives an organization account an upload url and a token", async () => {
    const signup = await request(app).post("/auth/signup").send({
      email: "covers@example.com",
      password: "hunter2",
      name: "Cover Host",
      userType: "organization",
    });
    const cookie = signup.headers["set-cookie"]?.[0];
    if (!cookie) throw new Error("signup did not return a Token cookie");

    const res = await request(app)
      .post("/events/cover-upload")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBe("http://127.0.0.1:8080/v1/images");
    expect(res.body.maxBytes).toBe(COVER_MAX_BYTES);
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(() =>
      jwt.verify(res.body.token, process.env.IMAGE_SERVICE_SECRET as string, {
        algorithms: ["HS256"],
        issuer: COVER_TOKEN_ISSUER,
        audience: COVER_TOKEN_AUDIENCE,
      }),
    ).not.toThrow();
  });

  it("refuses an individual account, like creating an event does", async () => {
    const signup = await request(app).post("/auth/signup").send({
      email: "person@example.com",
      password: "hunter2",
      name: "Just A Person",
    });
    const cookie = signup.headers["set-cookie"]?.[0];
    if (!cookie) throw new Error("signup did not return a Token cookie");

    const res = await request(app)
      .post("/events/cover-upload")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
  });
});
