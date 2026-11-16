import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event } from "../src/modules/events/event.model";

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
const uidsOf = (res: request.Response) =>
  res.body.data.map((e: { uid: string }) => e.uid).sort();

describe("Event type and tags (PG-9)", () => {
  describe("creating", () => {
    it("saves a type and tags, lower-cased, trimmed and de-duplicated", async () => {
      const host = await signupHost();
      const res = await create(host, "type-create", {
        eventType: "volunteering",
        tags: ["  Beach ", "clean-up", "beach", "Plastic Free"],
      });
      expect(res.status).toBe(201);

      const event = await stored("type-create");
      expect(event.eventType).toBe("volunteering");
      expect(event.tags).toEqual(["beach", "clean-up", "plastic free"]);
    });

    it("is optional: an event with neither stays valid", async () => {
      const host = await signupHost();
      await create(host, "type-none").expect(201);
      const event = await stored("type-none");
      expect(event.eventType).toBeUndefined();
      expect(event.tags).toEqual([]);
    });

    it.each([
      ["eventType", "hackathon"],
      ["eventType", ""],
      ["eventType", "Volunteering"],
      ["tags", Array.from({ length: 9 }, (_, i) => `tag${i}`)],
      ["tags", [""]],
      ["tags", ["   "]],
      ["tags", ["x".repeat(31)]],
      ["tags", "beach"],
    ])("rejects an invalid %s (case %#)", async (field, value) => {
      const host = await signupHost();
      const res = await create(host, "type-invalid", { [field]: value });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path.split(".")[0]).toBe(field);
    });

    it("accepts every listed type", async () => {
      const host = await signupHost();
      for (const type of [
        "volunteering",
        "fundraiser",
        "workshop",
        "awareness",
        "meetup",
        "cultural",
        "other",
      ]) {
        await create(host, `type-${type}`, { eventType: type }).expect(201);
      }
    });

    it("allows eight tags, and refuses a ninth even when it repeats one", async () => {
      const host = await signupHost();
      const eight = Array.from({ length: 8 }, (_, i) => `tag${i}`);
      await create(host, "type-eight", { tags: eight }).expect(201);
      await create(host, "type-dupes", { tags: [...eight, "TAG0"] }).expect(
        400,
      );
    });
  });

  describe("editing", () => {
    it("changes the type and the tags", async () => {
      const host = await signupHost();
      await create(host, "type-edit", {
        eventType: "workshop",
        tags: ["a"],
      }).expect(201);

      const res = await patch(host, "type-edit", {
        eventType: "fundraiser",
        tags: ["Gala", "dinner"],
      });
      expect(res.status).toBe(200);
      const event = await stored("type-edit");
      expect(event.eventType).toBe("fundraiser");
      expect(event.tags).toEqual(["gala", "dinner"]);
    });

    it("clears the tags with an empty array and leaves the type alone", async () => {
      const host = await signupHost();
      await create(host, "type-clear", {
        eventType: "meetup",
        tags: ["a", "b"],
      }).expect(201);

      await patch(host, "type-clear", { tags: [] }).expect(200);
      const event = await stored("type-clear");
      expect(event.tags).toEqual([]);
      expect(event.eventType).toBe("meetup");
    });

    it("keeps both when the body does not mention them", async () => {
      const host = await signupHost();
      await create(host, "type-keep", {
        eventType: "cultural",
        tags: ["music"],
      }).expect(201);

      await patch(host, "type-keep", { name: "Renamed clean-up drive" }).expect(
        200,
      );
      const event = await stored("type-keep");
      expect(event.eventType).toBe("cultural");
      expect(event.tags).toEqual(["music"]);
    });

    it("gives an event that had no type one", async () => {
      const host = await signupHost();
      await create(host, "type-late").expect(201);
      await patch(host, "type-late", { eventType: "awareness" }).expect(200);
      expect((await stored("type-late")).eventType).toBe("awareness");
    });

    it("rejects an unknown type on edit", async () => {
      const host = await signupHost();
      await create(host, "type-edit-bad", { eventType: "workshop" }).expect(
        201,
      );
      expect(
        (await patch(host, "type-edit-bad", { eventType: "party" })).status,
      ).toBe(400);
      expect((await stored("type-edit-bad")).eventType).toBe("workshop");
    });
  });

  describe("listing", () => {
    async function seed() {
      const host = await signupHost();
      await create(host, "list-vol", {
        eventType: "volunteering",
        tags: ["beach"],
      }).expect(201);
      await create(host, "list-fund", {
        eventType: "fundraiser",
        tags: ["gala"],
      }).expect(201);
      await create(host, "list-fund-offline", {
        eventType: "fundraiser",
        mode: "Offline",
        platform: undefined,
        platformLink: undefined,
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        address: "FC Road",
      }).expect(201);
      await create(host, "list-untyped").expect(201);
    }

    it("returns the type and tags with the event", async () => {
      const host = await signupHost();
      await create(host, "list-public", {
        eventType: "workshop",
        tags: ["first-aid"],
      }).expect(201);
      const res = await request(app)
        .get("/events")
        .query({ uid: "list-public" });
      expect(res.body.eventType).toBe("workshop");
      expect(res.body.tags).toEqual(["first-aid"]);
    });

    it("filters by type", async () => {
      await seed();
      const res = await request(app)
        .get("/events")
        .query({ type: "fundraiser" });
      expect(uidsOf(res)).toEqual(["list-fund", "list-fund-offline"]);
      expect(res.body.pagination.total).toBe(2);
    });

    it("combines the type with the mode", async () => {
      await seed();
      const res = await request(app)
        .get("/events")
        .query({ type: "fundraiser", mode: "Offline" });
      expect(uidsOf(res)).toEqual(["list-fund-offline"]);
    });

    it("leaves untyped events out of a type filter but in the unfiltered list", async () => {
      await seed();
      const all = await request(app).get("/events");
      expect(uidsOf(all)).toContain("list-untyped");
      const typed = await request(app)
        .get("/events")
        .query({ type: "volunteering" });
      expect(uidsOf(typed)).toEqual(["list-vol"]);
    });

    it("rejects an unknown type filter", async () => {
      expect(
        (await request(app).get("/events").query({ type: "party" })).status,
      ).toBe(400);
    });

    it("finds an event by one of its tags in the search", async () => {
      await seed();
      const res = await request(app).get("/events").query({ search: "gala" });
      expect(uidsOf(res)).toEqual(["list-fund"]);
    });
  });
});
