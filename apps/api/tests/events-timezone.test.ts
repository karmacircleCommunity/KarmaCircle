import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event } from "../src/modules/events/event.model";
import { isValidTimeZone } from "../src/modules/events/event.validation";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

async function signupHost() {
  const res = await request(app).post("/auth/signup").send({
    email: "host@example.com",
    password: "hunter2",
    name: "Test Host",
    userType: "organization",
  });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("signup failed: " + res.status);
  return cookie as string;
}

function eventBody(uid: string, overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + DAY_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  return {
    uid,
    name: "Beach clean-up drive",
    description: "Join us to clean the beach and sort the waste together",
    coverImage: "https://example.com/cover.png",
    mode: "Online",
    platform: "Zoom Meeting",
    platformLink: "https://zoom.example.com/j/123",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ...overrides,
  };
}

const create = (cookie: string, uid: string, overrides = {}) =>
  request(app)
    .post("/events/create")
    .set("Cookie", cookie)
    .send(eventBody(uid, overrides));
const patch = (cookie: string, uid: string, body: unknown) =>
  request(app)
    .patch(`/events/${uid}`)
    .set("Cookie", cookie)
    .send(body as object);
const stored = async (uid: string) => (await Event.findOne({ uid }).lean())!;

describe("isValidTimeZone", () => {
  it("accepts real IANA zones", () => {
    for (const zone of [
      "Asia/Kolkata",
      "America/New_York",
      "Europe/London",
      "Australia/Lord_Howe",
      "UTC",
    ]) {
      expect(isValidTimeZone(zone)).toBe(true);
    }
  });

  it("refuses anything else", () => {
    for (const zone of [
      "Mars/Base",
      "India Standard Time",
      "IST",
      "",
      "Asia/",
      "../etc",
    ]) {
      expect(isValidTimeZone(zone)).toBe(false);
    }
  });
});

describe("Event timezone (PG-11)", () => {
  it("saves the timezone the organizer chose, and returns it with the event", async () => {
    const host = await signupHost();
    await create(host, "tz-create", { timezone: "Asia/Kolkata" }).expect(201);

    expect((await stored("tz-create")).timezone).toBe("Asia/Kolkata");
    const res = await request(app).get("/events").query({ uid: "tz-create" });
    expect(res.body.timezone).toBe("Asia/Kolkata");
  });

  it("does not move the start and end: they stay the exact instants that were sent", async () => {
    const host = await signupHost();
    const start = new Date(Date.now() + 3 * DAY_MS);
    const end = new Date(start.getTime() + 2 * HOUR_MS);
    await create(host, "tz-instants", {
      timezone: "Pacific/Auckland",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }).expect(201);

    const event = await stored("tz-instants");
    expect(event.startTime.getTime()).toBe(start.getTime());
    expect(event.endTime.getTime()).toBe(end.getTime());
  });

  it("is optional, so an event with none (or an older client) stays valid", async () => {
    const host = await signupHost();
    await create(host, "tz-none").expect(201);
    expect((await stored("tz-none")).timezone).toBeUndefined();
  });

  it.each([
    "Mars/Base",
    "India Standard Time",
    "IST",
    "",
    "   ",
    "x".repeat(65),
    123,
  ])("rejects the timezone %p on create", async (timezone) => {
    const host = await signupHost();
    const res = await create(host, "tz-invalid", { timezone });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].path).toBe("timezone");
  });

  it("trims the name before checking it", async () => {
    const host = await signupHost();
    await create(host, "tz-trim", { timezone: "  Europe/London  " }).expect(
      201,
    );
    expect((await stored("tz-trim")).timezone).toBe("Europe/London");
  });

  describe("editing", () => {
    it("changes the timezone and leaves the rest alone", async () => {
      const host = await signupHost();
      await create(host, "tz-edit", { timezone: "Asia/Kolkata" }).expect(201);
      const before = await stored("tz-edit");

      await patch(host, "tz-edit", { timezone: "America/New_York" }).expect(
        200,
      );

      const after = await stored("tz-edit");
      expect(after.timezone).toBe("America/New_York");
      expect(after.startTime.getTime()).toBe(before.startTime.getTime());
      expect(after.name).toBe(before.name);
    });

    it("gives an older event (with none) a timezone", async () => {
      const host = await signupHost();
      await create(host, "tz-legacy").expect(201);
      await patch(host, "tz-legacy", { timezone: "Asia/Tokyo" }).expect(200);
      expect((await stored("tz-legacy")).timezone).toBe("Asia/Tokyo");
    });

    it("keeps the timezone when the body does not mention it", async () => {
      const host = await signupHost();
      await create(host, "tz-keep", { timezone: "Asia/Kolkata" }).expect(201);
      await patch(host, "tz-keep", { name: "Renamed clean-up drive" }).expect(
        200,
      );
      expect((await stored("tz-keep")).timezone).toBe("Asia/Kolkata");
    });

    it("rejects an invalid timezone and null (there is no 'no timezone' to go back to)", async () => {
      const host = await signupHost();
      await create(host, "tz-edit-bad", { timezone: "Asia/Kolkata" }).expect(
        201,
      );

      expect(
        (await patch(host, "tz-edit-bad", { timezone: "Mars/Base" })).status,
      ).toBe(400);
      expect(
        (await patch(host, "tz-edit-bad", { timezone: null })).status,
      ).toBe(400);
      expect((await stored("tz-edit-bad")).timezone).toBe("Asia/Kolkata");
    });
  });
});
