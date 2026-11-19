import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { env } from "../src/config/env";

// The test app serves `/uploads/files` from `UPLOADS_DIR`, read when the app is
// built, so the folder is set first.
const uploadsFolder = fs.mkdtempSync(path.join(os.tmpdir(), "kc-uploads-"));
(env as { UPLOADS_DIR?: string }).UPLOADS_DIR = uploadsFolder;

jest.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: jest
    .fn()
    .mockResolvedValue("vercel_blob_client_test_token"),
}));

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { buildTestApp } from "./helpers/test-app";
import {
  createCoverUpload,
  sniffImageType,
  storageDriver,
} from "../src/modules/uploads/upload.service";

const app = buildTestApp();

const mutableEnv = env as {
  NODE_ENV: string;
  BLOB_READ_WRITE_TOKEN?: string;
};

// A real 1x1 PNG, JPEG header, GIF and WebP header: the local driver checks bytes.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF = Buffer.from("GIF89a\x01\x00\x01\x00", "binary");
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
]);

async function signup(email: string, name: string, userType?: string) {
  const res = await request(app)
    .post("/auth/signup")
    .send({ email, password: "hunter2", name, ...(userType && { userType }) });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("signup did not return a Token cookie");
  return cookie as string;
}

// One organization per test (the database is emptied after each one).
let organizationCookie: Promise<string> | undefined;
const signupOrganization = () => {
  organizationCookie ??= signup("org@example.com", "Test Org", "organization");
  return organizationCookie;
};
const signupIndividual = () => signup("person@example.com", "Test Person");

const askForTicket = (cookie: string | undefined, body: unknown) => {
  const req = request(app).post("/uploads/event-covers");
  if (cookie) req.set("Cookie", cookie);
  return req.send(body as object);
};

/** The path and query of a ticket's absolute URL, for the test app. */
const pathOf = (url: string) => {
  const { pathname } = new URL(url);
  return pathname;
};

afterAll(() => {
  fs.rmSync(uploadsFolder, { recursive: true, force: true });
});

afterEach(() => {
  organizationCookie = undefined;
  delete mutableEnv.BLOB_READ_WRITE_TOKEN;
  mutableEnv.NODE_ENV = "test";
  jest.restoreAllMocks();
});

describe("asking for an upload ticket (DB-1)", () => {
  it("requires sign-in and an organization account", async () => {
    const body = { contentType: "image/png", size: 1000 };
    expect((await askForTicket(undefined, body)).status).toBe(401);

    const individual = await signupIndividual();
    const res = await askForTicket(individual, body);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/organization account/);
  });

  it("rejects an unsupported type, an empty file, an oversized file and extra fields", async () => {
    const org = await signupOrganization();
    const send = (body: unknown) => askForTicket(org, body);

    const svg = await send({ contentType: "image/svg+xml", size: 100 });
    expect(svg.status).toBe(400);
    expect(JSON.stringify(svg.body)).toMatch(/PNG, JPEG, WebP or GIF/);
    expect((await send({ contentType: "image/png", size: 0 })).status).toBe(
      400,
    );
    const big = await send({
      contentType: "image/png",
      size: 5 * 1024 * 1024 + 1,
    });
    expect(big.status).toBe(400);
    expect(JSON.stringify(big.body)).toMatch(/5 MB or smaller/);
    expect(
      (await send({ contentType: "image/png", size: 10, path: "../x" })).status,
    ).toBe(400);
    expect((await send({ size: 10 })).status).toBe(400);
  });

  it("without a Blob token (development, test) hands out a signed local ticket", async () => {
    const org = await signupOrganization();
    const res = await askForTicket(org, { contentType: "image/png", size: 68 });

    expect(res.status).toBe(201);
    expect(res.body.strategy).toBe("direct");
    expect(res.body.method).toBe("PUT");
    expect(res.body.uploadUrl).toMatch(/\/uploads\/local\/[\w-]+\.[\w-]+$/);
    expect(res.body.publicUrl).toMatch(
      /\/uploads\/files\/event-covers\/[a-f0-9-]+\.png$/,
    );
  });

  it("with a Blob token hands out a one-file, one-type, size-capped client token", async () => {
    mutableEnv.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_store_secret";
    const org = await signupOrganization();

    const res = await askForTicket(org, {
      contentType: "image/webp",
      size: 500,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      strategy: "vercel-blob",
      clientToken: "vercel_blob_client_test_token",
      pathname: expect.stringMatching(/^event-covers\/[a-f0-9-]+\.webp$/),
    });
    // The server's own read-write token never leaves the server.
    expect(JSON.stringify(res.body)).not.toContain("store_secret");
    const options = (generateClientTokenFromReadWriteToken as jest.Mock).mock
      .calls[0][0];
    expect(options).toMatchObject({
      token: "vercel_blob_rw_store_secret",
      pathname: res.body.pathname,
      allowedContentTypes: ["image/webp"],
      maximumSizeInBytes: 5 * 1024 * 1024,
      allowOverwrite: false,
    });
    expect(options.validUntil).toBeGreaterThan(Date.now());
    expect(options.validUntil).toBeLessThanOrEqual(Date.now() + 11 * 60 * 1000);
  });

  it("is not offered in production without a Blob token", async () => {
    expect(storageDriver()).toBe("local");
    mutableEnv.NODE_ENV = "production";
    expect(storageDriver()).toBe("none");

    const org = await signupOrganization();
    mutableEnv.NODE_ENV = "production";
    await expect(
      createCoverUpload(
        "org@example.com",
        { contentType: "image/png", size: 10 },
        "https://api.example",
      ),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(org).toBeTruthy();

    mutableEnv.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_x";
    expect(storageDriver()).toBe("vercel-blob");
  });
});

describe("the local driver (development and test)", () => {
  async function ticketFor(contentType: string) {
    const org = await signupOrganization();
    const res = await askForTicket(org, { contentType, size: 100 });
    expect(res.status).toBe(201);
    return res.body as { uploadUrl: string; publicUrl: string };
  }

  const put = (ticket: { uploadUrl: string }, type: string, bytes: Buffer) =>
    request(app)
      .put(pathOf(ticket.uploadUrl))
      .set("Content-Type", type)
      .send(bytes);

  it("stores the image and serves it back with the headers a cross-origin page needs", async () => {
    const ticket = await ticketFor("image/png");

    const res = await put(ticket, "image/png", PNG);
    expect(res.status).toBe(200);

    const served = await request(app)
      .get(pathOf(ticket.publicUrl))
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (chunk: Buffer) => chunks.push(chunk));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(served.status).toBe(200);
    expect(Buffer.compare(served.body, PNG)).toBe(0);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(served.headers["cache-control"]).toMatch(/immutable/);
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("accepts each of the four image types", async () => {
    for (const [type, bytes] of [
      ["image/jpeg", JPEG],
      ["image/gif", GIF],
      ["image/webp", WEBP],
    ] as const) {
      const ticket = await ticketFor(type);
      expect((await put(ticket, type, bytes)).status).toBe(200);
    }
  });

  it("uses a ticket once", async () => {
    const ticket = await ticketFor("image/png");
    expect((await put(ticket, "image/png", PNG)).status).toBe(200);
    const again = await put(ticket, "image/png", PNG);
    expect(again.status).toBe(409);
  });

  it("refuses bytes that are not the type the ticket was for", async () => {
    const ticket = await ticketFor("image/png");

    const wrongHeader = await put(ticket, "image/jpeg", JPEG);
    expect(wrongHeader.status).toBe(400);

    const notAnImage = await put(
      ticket,
      "image/png",
      Buffer.from("<script>alert(1)</script>"),
    );
    expect(notAnImage.status).toBe(400);
    expect(notAnImage.body.message).toMatch(/not a valid image/);

    const jpegAsPng = await put(ticket, "image/png", JPEG);
    expect(jpegAsPng.status).toBe(400);
  });

  it("refuses a body that is not an image type, and an empty one", async () => {
    const ticket = await ticketFor("image/png");
    const text = await request(app)
      .put(pathOf(ticket.uploadUrl))
      .set("Content-Type", "text/plain")
      .send("hello");
    expect(text.status).toBe(400);

    const empty = await put(ticket, "image/png", Buffer.alloc(0));
    expect(empty.status).toBe(400);
  });

  it("refuses a file over 5 MB", async () => {
    const ticket = await ticketFor("image/png");
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await put(ticket, "image/png", big);
    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/too large/);
  });

  it("refuses a tampered, malformed or expired ticket", async () => {
    const ticket = await ticketFor("image/png");
    const url = pathOf(ticket.uploadUrl);
    const [body, signature] = url.split("/").pop()!.split(".");

    const swapped = Buffer.from(
      JSON.stringify({
        f: "../../escape.png",
        t: "image/png",
        e: Date.now() + 1e6,
      }),
    ).toString("base64url");
    for (const bad of [
      `${swapped}.${signature}`,
      `${body}.${signature}x`,
      body,
      "garbage",
    ]) {
      const res = await request(app)
        .put(`/uploads/local/${bad}`)
        .set("Content-Type", "image/png")
        .send(PNG);
      expect(res.status).toBe(403);
    }
    expect(fs.existsSync(path.join(uploadsFolder, "escape.png"))).toBe(false);

    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60 * 1000);
    const expired = await put(ticket, "image/png", PNG);
    expect(expired.status).toBe(403);
    expect(expired.body.message).toMatch(/expired/);
  });

  it("is not available once a Blob token is configured", async () => {
    const ticket = await ticketFor("image/png");
    mutableEnv.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_x";
    expect((await put(ticket, "image/png", PNG)).status).toBe(404);
  });

  it("lets the web app's origin send the upload and show the image", async () => {
    const preflight = await request(app)
      .options("/uploads/local/anything")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "PUT")
      .set("Access-Control-Request-Headers", "content-type");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(preflight.headers["access-control-allow-methods"]).toMatch(/PUT/);

    const stranger = await request(app)
      .options("/uploads/local/anything")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "PUT");
    expect(stranger.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("lets an event keep the uploaded image's link as its cover", async () => {
    const org = await signupOrganization();
    const ticketRes = await askForTicket(org, {
      contentType: "image/png",
      size: 100,
    });
    await put(ticketRes.body, "image/png", PNG).expect(200);

    const start = new Date(Date.now() + 86_400_000);
    const end = new Date(start.getTime() + 7_200_000);
    const created = await request(app)
      .post("/events/create")
      .set("Cookie", org)
      .send({
        uid: "uploaded-cover-event",
        name: "Beach clean-up drive",
        description: "Join us to clean the beach and sort the waste together",
        coverImage: ticketRes.body.publicUrl,
        mode: "Online",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        platform: "Zoom Meeting",
        platformLink: "https://zoom.example.com/j/123",
      });

    expect(created.status).toBe(201);
    expect(created.body.savedEvent.coverImage).toBe(ticketRes.body.publicUrl);
    // Only a link is stored, never the image.
    expect(created.body.savedEvent.coverImage.length).toBeLessThan(200);
  });
});

describe("sniffImageType", () => {
  it("names the four image types by their first bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(GIF)).toBe("image/gif");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("returns nothing for anything else", () => {
    expect(sniffImageType(Buffer.from("<svg></svg>"))).toBeUndefined();
    expect(sniffImageType(Buffer.from("%PDF-1.7"))).toBeUndefined();
    expect(sniffImageType(Buffer.alloc(0))).toBeUndefined();
    expect(
      sniffImageType(
        Buffer.concat([
          Buffer.from("RIFF"),
          Buffer.alloc(4),
          Buffer.from("WAVE"),
        ]),
      ),
    ).toBeUndefined();
  });
});
