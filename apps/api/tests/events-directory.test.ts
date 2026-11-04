import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event } from "../src/modules/events/event.model";

const app = buildTestApp();

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

interface SeedOptions {
  uid: string;
  name?: string;
  city?: string;
  hostName?: string;
  mode?: "Online" | "Offline";
  inviteOnly?: boolean;
  startTime: Date;
}

/**
 * Inserted straight through the model, not `POST /events/create`: creation
 * rejects a start time in the past, and these tests need past events and
 * exact control over `startTime`, including ties.
 */
async function seed(options: SeedOptions) {
  const { startTime } = options;
  const endTime = new Date(startTime.getTime() + 2 * HOUR_MS);
  return Event.create({
    uid: options.uid,
    name: options.name ?? `Event ${options.uid}`,
    description: "A directory listing fixture event",
    hostUsername: "seed-host",
    hostName: options.hostName ?? "Seed Host",
    organizerHandle: "seed-host",
    mode: options.mode ?? "Offline",
    city: options.city ?? "Guwahati",
    inviteOnly: options.inviteOnly,
    startTime,
    endTime,
    startDate: startTime,
    endDate: endTime,
  });
}

const inDays = (days: number) => new Date(Date.now() + days * DAY_MS);

async function list(query: Record<string, string | number> = {}) {
  const res = await request(app).get("/events").query(query);
  expect(res.status).toBe(200);
  return res;
}

const uidsOf = (res: { body: { data: { uid: string }[] } }) =>
  res.body.data.map((event) => event.uid);

describe("Events directory listing", () => {
  describe("period", () => {
    beforeEach(async () => {
      await seed({ uid: "past-old", startTime: inDays(-20) });
      await seed({ uid: "past-recent", startTime: inDays(-2) });
      await seed({ uid: "soon", startTime: inDays(2) });
      await seed({ uid: "later", startTime: inDays(20) });
    });

    it("returns only upcoming events, soonest first", async () => {
      const res = await list({ period: "upcoming" });
      expect(uidsOf(res)).toEqual(["soon", "later"]);
      expect(res.body.pagination.total).toBe(2);
    });

    it("returns only past events, most recent first", async () => {
      const res = await list({ period: "past" });
      expect(uidsOf(res)).toEqual(["past-recent", "past-old"]);
      expect(res.body.pagination.total).toBe(2);
    });

    it("returns every event, soonest first, when period is left out", async () => {
      const res = await list();
      expect(uidsOf(res)).toEqual(["past-old", "past-recent", "soon", "later"]);
      expect(res.body.pagination.total).toBe(4);
    });

    it("rejects an unknown period with 400", async () => {
      const res = await request(app).get("/events?period=someday");
      expect(res.status).toBe(400);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await seed({
        uid: "beach",
        name: "Beach Cleanup Drive",
        city: "Mumbai",
        hostName: "Green Waves",
        startTime: inDays(3),
      });
      await seed({
        uid: "books",
        name: "Book Donation Camp",
        city: "Guwahati",
        hostName: "Reading Circle",
        startTime: inDays(4),
      });
      await seed({
        uid: "planting",
        name: "Tree Planting Day",
        city: "Pune",
        hostName: "Green Waves",
        startTime: inDays(5),
      });
    });

    it("matches the event name, ignoring case", async () => {
      const res = await list({ search: "beach cleanup" });
      expect(uidsOf(res)).toEqual(["beach"]);
    });

    it("matches the city", async () => {
      const res = await list({ search: "guwa" });
      expect(uidsOf(res)).toEqual(["books"]);
    });

    it("matches the host name", async () => {
      const res = await list({ search: "green waves" });
      expect(uidsOf(res)).toEqual(["beach", "planting"]);
      expect(res.body.pagination.total).toBe(2);
    });

    it("treats the text literally, not as a pattern", async () => {
      expect((await list({ search: ".*" })).body.data).toHaveLength(0);
      expect((await list({ search: "(" })).body.data).toHaveLength(0);
    });

    it("treats a blank search as no search", async () => {
      const res = await list({ search: "   " });
      expect(res.body.pagination.total).toBe(3);
    });

    it("returns an empty page with a zero total when nothing matches", async () => {
      const res = await list({ search: "nothing like this" });
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it("combines search with the period split", async () => {
      await seed({
        uid: "beach-past",
        name: "Beach Cleanup Last Year",
        startTime: inDays(-300),
      });
      expect(
        uidsOf(await list({ search: "beach", period: "upcoming" })),
      ).toEqual(["beach"]);
      expect(uidsOf(await list({ search: "beach", period: "past" }))).toEqual([
        "beach-past",
      ]);
    });

    it("rejects an over-long search with 400", async () => {
      const res = await request(app)
        .get("/events")
        .query({ search: "a".repeat(101) });
      expect(res.status).toBe(400);
    });
  });

  describe("mode and audience", () => {
    beforeEach(async () => {
      await seed({
        uid: "online-open",
        mode: "Online",
        startTime: inDays(1),
      });
      await seed({
        uid: "offline-invite",
        mode: "Offline",
        inviteOnly: true,
        startTime: inDays(2),
      });
      await seed({
        uid: "offline-open",
        mode: "Offline",
        inviteOnly: false,
        startTime: inDays(3),
      });
    });

    it("filters by mode", async () => {
      expect(uidsOf(await list({ mode: "Online" }))).toEqual(["online-open"]);
      expect(uidsOf(await list({ mode: "Offline" }))).toEqual([
        "offline-invite",
        "offline-open",
      ]);
    });

    it("filters to invite-only events", async () => {
      expect(uidsOf(await list({ inviteOnly: "true" }))).toEqual([
        "offline-invite",
      ]);
    });

    it("filters to events open to everyone, including ones with no stored flag", async () => {
      // Written below the model so the field is truly absent, like events
      // saved before `inviteOnly` existed.
      await Event.collection.updateOne(
        { uid: "online-open" },
        { $unset: { inviteOnly: "" } },
      );
      expect(uidsOf(await list({ inviteOnly: "false" }))).toEqual([
        "online-open",
        "offline-open",
      ]);
    });

    it("rejects a non-boolean inviteOnly with 400", async () => {
      const res = await request(app).get("/events?inviteOnly=maybe");
      expect(res.status).toBe(400);
    });
  });

  describe("pagination and order", () => {
    it("never repeats or skips an event across pages when start times tie", async () => {
      const sameMoment = inDays(7);
      const uids = Array.from({ length: 7 }, (_, i) => `tie-${i}`);
      for (const uid of uids) {
        await seed({ uid, startTime: sameMoment });
      }

      const seen: string[] = [];
      for (const page of [1, 2, 3, 4]) {
        const res = await list({ period: "upcoming", page, limit: 2 });
        expect(res.body.pagination).toEqual({
          page,
          limit: 2,
          total: 7,
          totalPages: 4,
        });
        seen.push(...uidsOf(res));
      }

      expect(seen).toHaveLength(7);
      expect(new Set(seen)).toEqual(new Set(uids));
    });

    it("orders tied events by insertion order, the same on every request", async () => {
      const sameMoment = inDays(7);
      for (const uid of ["a", "b", "c"]) {
        await seed({ uid, startTime: sameMoment });
      }
      const first = uidsOf(await list({ period: "upcoming" }));
      const second = uidsOf(await list({ period: "upcoming" }));
      expect(first).toEqual(["a", "b", "c"]);
      expect(second).toEqual(first);
    });

    it("reverses tied events too for the past list", async () => {
      const sameMoment = inDays(-7);
      for (const uid of ["a", "b", "c"]) {
        await seed({ uid, startTime: sameMoment });
      }
      expect(uidsOf(await list({ period: "past" }))).toEqual(["c", "b", "a"]);
    });

    it("counts every matching event in total, not just the page", async () => {
      for (let i = 0; i < 5; i += 1) {
        await seed({ uid: `many-${i}`, startTime: inDays(i + 1) });
      }
      const res = await list({ period: "upcoming", page: 2, limit: 2 });
      expect(uidsOf(res)).toEqual(["many-2", "many-3"]);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it("returns an empty page past the last page", async () => {
      await seed({ uid: "only", startTime: inDays(1) });
      const res = await list({ page: 3, limit: 5 });
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(1);
    });

    it("holds the page size to a hard maximum of 100", async () => {
      expect((await request(app).get("/events?limit=101")).status).toBe(400);
      expect((await request(app).get("/events?limit=100")).status).toBe(200);
    });

    it("keeps the host filter working alongside the new filters", async () => {
      await seed({ uid: "mine-upcoming", startTime: inDays(2) });
      await Event.create({
        uid: "other-host",
        name: "Other host event",
        description: "A directory listing fixture event",
        hostUsername: "someone-else",
        hostName: "Someone Else",
        organizerHandle: "someone-else",
        mode: "Online",
        startTime: inDays(2),
        endTime: inDays(3),
        startDate: inDays(2),
        endDate: inDays(3),
      });
      const res = await list({ host: "seed-host", period: "upcoming" });
      expect(uidsOf(res)).toEqual(["mine-upcoming"]);
    });
  });

  describe("one host's whole list", () => {
    // 21 events, one more than the default page size of 20, spread from 10
    // days ago to 10 days ahead.
    beforeEach(async () => {
      for (let offset = -10; offset <= 10; offset += 1) {
        await seed({
          uid: `host-event-${offset + 10}`,
          startTime: inDays(offset),
        });
      }
    });

    it("lists a host's events newest first when no period is given", async () => {
      const res = await list({ host: "seed-host" });
      expect(res.body.pagination.total).toBe(21);
      // Page one of the default size holds the 20 newest, so the single
      // oldest event is the one left off - not an upcoming one.
      expect(res.body.data).toHaveLength(20);
      expect(uidsOf(res)[0]).toBe("host-event-20");
      expect(uidsOf(res)).not.toContain("host-event-0");
    });

    it("returns all 21 in one request at the maximum page size, newest first", async () => {
      const res = await list({ host: "seed-host", limit: 100 });
      expect(res.body.pagination.total).toBe(21);
      expect(uidsOf(res)).toEqual(
        Array.from({ length: 21 }, (_, index) => `host-event-${20 - index}`),
      );
    });

    it("still orders upcoming soonest first once a period is given", async () => {
      const res = await list({
        host: "seed-host",
        period: "upcoming",
        limit: 3,
      });
      expect(uidsOf(res)).toEqual([
        "host-event-11",
        "host-event-12",
        "host-event-13",
      ]);
    });
  });
});
