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

const venue = {
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  address: "Juhu Beach, gate 2",
};
const stream = {
  platform: "Zoom Meeting",
  platformLink: "https://zoom.example.com/j/123",
};

function eventBody(uid: string, overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + DAY_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  return {
    uid,
    name: "Beach clean-up drive",
    description: "Join us to clean the beach and sort the waste together",
    coverImage: "https://example.com/cover.png",
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
const errorPaths = (res: request.Response) =>
  res.body.errors.map((e: { path: string }) => e.path);

describe("Hybrid events (PG-10)", () => {
  describe("creating", () => {
    it("saves a Hybrid event that has a venue and a way to join online", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-ok", {
        mode: "Hybrid",
        ...venue,
        ...stream,
      });
      expect(res.status).toBe(201);
      const event = await stored("hybrid-ok");
      expect(event.mode).toBe("Hybrid");
      expect(event.city).toBe("Mumbai");
      expect(event.platformLink).toBe("https://zoom.example.com/j/123");
    });

    it("lists every missing in-person field when the venue is missing", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-no-venue", {
        mode: "Hybrid",
        ...stream,
      });
      expect(res.status).toBe(400);
      expect(errorPaths(res)).toEqual(
        expect.arrayContaining(["city", "state", "country", "address"]),
      );
      expect(errorPaths(res)).not.toContain("platform");
    });

    it("lists the online fields when the stream is missing", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-no-stream", {
        mode: "Hybrid",
        ...venue,
      });
      expect(res.status).toBe(400);
      expect(errorPaths(res)).toEqual(
        expect.arrayContaining(["platform", "platformLink"]),
      );
      expect(errorPaths(res)).not.toContain("city");
    });

    it("needs both sets at once, and says so for every missing field", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-neither", { mode: "Hybrid" });
      expect(res.status).toBe(400);
      expect(errorPaths(res)).toEqual(
        expect.arrayContaining([
          "city",
          "state",
          "country",
          "address",
          "platform",
          "platformLink",
        ]),
      );
    });

    it("rejects a join link that is not http or https, like an Online event", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-bad-link", {
        mode: "Hybrid",
        ...venue,
        platform: "Zoom Meeting",
        platformLink: "ftp://example.com/room",
      });
      expect(res.status).toBe(400);
      expect(errorPaths(res)).toEqual(["platformLink"]);
    });

    it("keeps the directions and the link notes together", async () => {
      const host = await signupHost();
      await create(host, "hybrid-notes", {
        mode: "Hybrid",
        ...venue,
        ...stream,
        gettingThere: "Use the north gate",
        linkDelivery: "Emailed the evening before",
        joinRequirements: "A working microphone",
      }).expect(201);

      const event = await stored("hybrid-notes");
      expect(event.gettingThere).toBe("Use the north gate");
      expect(event.linkDelivery).toBe("Emailed the evening before");
      expect(event.joinRequirements).toBe("A working microphone");
    });

    it("still rejects an unknown mode", async () => {
      const host = await signupHost();
      const res = await create(host, "hybrid-unknown", {
        mode: "Both",
        ...venue,
        ...stream,
      });
      expect(res.status).toBe(400);
      expect(errorPaths(res)).toEqual(["mode"]);
    });
  });

  describe("editing", () => {
    it("turns an Online event into Hybrid once a venue is added", async () => {
      const host = await signupHost();
      await create(host, "hybrid-from-online", {
        mode: "Online",
        ...stream,
      }).expect(201);

      const refused = await patch(host, "hybrid-from-online", {
        mode: "Hybrid",
      });
      expect(refused.status).toBe(400);
      expect(errorPaths(refused)).toEqual(
        expect.arrayContaining(["city", "state", "country", "address"]),
      );

      const ok = await patch(host, "hybrid-from-online", {
        mode: "Hybrid",
        ...venue,
      });
      expect(ok.status).toBe(200);
      const event = await stored("hybrid-from-online");
      expect(event.mode).toBe("Hybrid");
      expect(event.platform).toBe("Zoom Meeting");
      expect(event.city).toBe("Mumbai");
    });

    it("turns an Offline event into Hybrid once a stream is added", async () => {
      const host = await signupHost();
      await create(host, "hybrid-from-offline", {
        mode: "Offline",
        ...venue,
      }).expect(201);

      const refused = await patch(host, "hybrid-from-offline", {
        mode: "Hybrid",
      });
      expect(refused.status).toBe(400);
      expect(errorPaths(refused)).toEqual(
        expect.arrayContaining(["platform", "platformLink"]),
      );

      await patch(host, "hybrid-from-offline", {
        mode: "Hybrid",
        ...stream,
      }).expect(200);
      const event = await stored("hybrid-from-offline");
      expect(event.address).toBe("Juhu Beach, gate 2");
      expect(event.platformLink).toBe("https://zoom.example.com/j/123");
    });

    it("drops the venue and its directions when a Hybrid event becomes Online", async () => {
      const host = await signupHost();
      await create(host, "hybrid-to-online", {
        mode: "Hybrid",
        ...venue,
        ...stream,
        gettingThere: "Use the north gate",
        linkDelivery: "Emailed the evening before",
      }).expect(201);

      await patch(host, "hybrid-to-online", { mode: "Online" }).expect(200);

      const event = await stored("hybrid-to-online");
      expect(event.address).toBeUndefined();
      expect(event.city).toBeUndefined();
      expect(event.gettingThere).toBeUndefined();
      expect(event.platformLink).toBe("https://zoom.example.com/j/123");
      expect(event.linkDelivery).toBe("Emailed the evening before");
    });

    it("drops the stream and its notes when a Hybrid event becomes Offline", async () => {
      const host = await signupHost();
      await create(host, "hybrid-to-offline", {
        mode: "Hybrid",
        ...venue,
        ...stream,
        gettingThere: "Use the north gate",
        linkDelivery: "Emailed the evening before",
      }).expect(201);

      await patch(host, "hybrid-to-offline", { mode: "Offline" }).expect(200);

      const event = await stored("hybrid-to-offline");
      expect(event.platform).toBeUndefined();
      expect(event.platformLink).toBeUndefined();
      expect(event.linkDelivery).toBeUndefined();
      expect(event.city).toBe("Mumbai");
      expect(event.gettingThere).toBe("Use the north gate");
    });

    it("keeps everything when a Hybrid event is edited without changing its mode", async () => {
      const host = await signupHost();
      await create(host, "hybrid-rename", {
        mode: "Hybrid",
        ...venue,
        ...stream,
      }).expect(201);

      await patch(host, "hybrid-rename", {
        name: "Renamed clean-up drive",
      }).expect(200);

      const event = await stored("hybrid-rename");
      expect(event.city).toBe("Mumbai");
      expect(event.platformLink).toBe("https://zoom.example.com/j/123");
    });
  });

  describe("listing", () => {
    it("filters the directory by Hybrid, Online and Offline separately", async () => {
      const host = await signupHost();
      await create(host, "list-hybrid", {
        mode: "Hybrid",
        ...venue,
        ...stream,
      }).expect(201);
      await create(host, "list-online", { mode: "Online", ...stream }).expect(
        201,
      );
      await create(host, "list-offline", { mode: "Offline", ...venue }).expect(
        201,
      );

      const uids = async (mode: string) =>
        (await request(app).get("/events").query({ mode })).body.data.map(
          (e: { uid: string }) => e.uid,
        );

      expect(await uids("Hybrid")).toEqual(["list-hybrid"]);
      expect(await uids("Online")).toEqual(["list-online"]);
      expect(await uids("Offline")).toEqual(["list-offline"]);
    });

    it("rejects an unknown mode filter", async () => {
      const res = await request(app).get("/events").query({ mode: "Both" });
      expect(res.status).toBe(400);
    });
  });
});
