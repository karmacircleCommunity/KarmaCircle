import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event, EventRegistration } from "../src/modules/events/event.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

async function signup(email: string, name: string, userType?: string) {
  const res = await request(app)
    .post("/auth/signup")
    .send({ email, password: "hunter2", name, ...(userType && { userType }) });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("signup did not return a Token cookie: " + res.status + " " + JSON.stringify(res.body));
  return cookie as string;
}

const signupOrganization = (email = "host@example.com", name = "Test Host") =>
  signup(email, name, "organization");

function eventBody(uid: string, overrides: Record<string, unknown> = {}) {
  const start = new Date(Date.now() + DAY_MS);
  const end = new Date(start.getTime() + 2 * HOUR_MS);
  return {
    uid,
    name: "Beach clean-up drive",
    description: "Join us to clean the beach and sort the waste together",
    coverImage: "https://example.com/cover.png",
    mode: "Online",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    platform: "Zoom Meeting",
    platformLink: "https://zoom.example.com/j/123",
    ...overrides,
  };
}

async function createEvent(
  cookie: string,
  uid: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post("/events/create")
    .set("Cookie", cookie)
    .send(eventBody(uid, overrides));
  expect(res.status).toBe(201);
  return res.body.savedEvent as { uid: string; startTime: string };
}

const patch = (cookie: string | undefined, uid: string, body: unknown) => {
  const req = request(app).patch(`/events/${uid}`);
  if (cookie) req.set("Cookie", cookie);
  return req.send(body as object);
};

const cancel = (cookie: string | undefined, uid: string) => {
  const req = request(app).post(`/events/${uid}/cancel`);
  if (cookie) req.set("Cookie", cookie);
  return req;
};

describe("Editing and cancelling events", () => {
  describe("a new event", () => {
    it("is published and has no cancellation time", async () => {
      const cookie = await signupOrganization();
      const saved = await createEvent(cookie, "fresh-event");

      const res = await request(app).get("/events").query({ uid: saved.uid });
      expect(res.body.status).toBe("published");
      expect(res.body.cancelledAt).toBeUndefined();
    });
  });

  describe("PATCH /events/:uid", () => {
    it("changes the fields that were sent and leaves the rest alone", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-basics");

      const res = await patch(cookie, "edit-basics", {
        name: "Beach clean-up drive, new date",
        inviteOnly: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Event Updated");
      expect(res.body.event.name).toBe("Beach clean-up drive, new date");
      expect(res.body.event.inviteOnly).toBe(true);
      expect(res.body.event.description).toBe(
        "Join us to clean the beach and sort the waste together",
      );
      expect(res.body.event.uid).toBe("edit-basics");

      const stored = await Event.findOne({ uid: "edit-basics" });
      expect(stored?.name).toBe("Beach clean-up drive, new date");
      expect(stored?.hostUsername).toBeTruthy();
    });

    it("keeps the cover image when none is sent and replaces it when one is", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-cover");

      await patch(cookie, "edit-cover", { name: "A renamed event for you" });
      expect((await Event.findOne({ uid: "edit-cover" }))?.coverImage).toBe(
        "https://example.com/cover.png",
      );

      const res = await patch(cookie, "edit-cover", {
        coverImage: "https://example.com/new-cover.png",
      });
      expect(res.status).toBe(200);
      expect(res.body.event.coverImage).toBe(
        "https://example.com/new-cover.png",
      );
    });

    it("applies the same cover image rules as create", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-bad-cover");

      const res = await patch(cookie, "edit-bad-cover", {
        coverImage: "http://example.com/insecure.png",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("coverImage");
    });

    it("rejects the page address with 400 because it never changes", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-uid");

      const res = await patch(cookie, "edit-uid", { uid: "another-address" });
      expect(res.status).toBe(400);
      expect(await Event.exists({ uid: "another-address" })).toBeNull();
    });

    it("rejects an unknown key such as isGovernmentSponsored with 400", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-govt");

      const res = await patch(cookie, "edit-govt", {
        isGovernmentSponsored: true,
      });
      expect(res.status).toBe(400);
      expect((await Event.findOne({ uid: "edit-govt" }))?.isGovernmentSponsored)
        .toBe(false);
    });

    it("rejects an empty body", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-empty");

      const res = await patch(cookie, "edit-empty", {});
      expect(res.status).toBe(400);
    });

    it("enforces the same name and description lengths as create", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-lengths");

      const res = await patch(cookie, "edit-lengths", {
        name: "Too short",
        description: "short",
      });
      expect(res.status).toBe(400);
      const paths = res.body.errors.map((e: { path: string }) => e.path);
      expect(paths).toEqual(expect.arrayContaining(["name", "description"]));
    });

    it("rejects an end time that is not after the stored start time", async () => {
      const cookie = await signupOrganization();
      const saved = await createEvent(cookie, "edit-end-before-start");

      const res = await patch(cookie, "edit-end-before-start", {
        endTime: saved.startTime,
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([
        { path: "endTime", message: "End time must be after the start time" },
      ]);
    });

    it("rejects a new start time in the past", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-past-start");

      const res = await patch(cookie, "edit-past-start", {
        startTime: new Date(Date.now() - HOUR_MS).toISOString(),
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([
        { path: "startTime", message: "Start time must be in the future" },
      ]);
    });

    it("moves the date and time together when both are sent", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-reschedule");
      const start = new Date(Date.now() + 5 * DAY_MS);
      const end = new Date(start.getTime() + 3 * HOUR_MS);

      const res = await patch(cookie, "edit-reschedule", {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(new Date(res.body.event.startTime).getTime()).toBe(start.getTime());
      expect(new Date(res.body.event.endTime).getTime()).toBe(end.getTime());
    });

    it("lets an event that is already running fix a typo without moving its start", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-running");
      const startedAt = new Date(Date.now() - HOUR_MS);
      await Event.updateOne(
        { uid: "edit-running" },
        {
          startTime: startedAt,
          startDate: startedAt,
          endTime: new Date(Date.now() + HOUR_MS),
        },
      );

      const res = await patch(cookie, "edit-running", {
        name: "Fixed the typo in this title",
      });
      expect(res.status).toBe(200);
      expect(res.body.event.name).toBe("Fixed the typo in this title");
    });

    it("needs the mode's own fields when the mode changes", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-mode-missing");

      const res = await patch(cookie, "edit-mode-missing", { mode: "Offline" });
      expect(res.status).toBe(400);
      const paths = res.body.errors.map((e: { path: string }) => e.path);
      expect(paths).toEqual(
        expect.arrayContaining(["city", "state", "country", "address"]),
      );
    });

    it("drops the old mode's fields when switching from Online to Offline", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-to-offline");

      const res = await patch(cookie, "edit-to-offline", {
        mode: "Offline",
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        address: "Juhu Beach, gate 2",
      });
      expect(res.status).toBe(200);

      const stored = (await Event.findOne({ uid: "edit-to-offline" }))!;
      expect(stored.mode).toBe("Offline");
      expect(stored.city).toBe("Pune");
      expect(stored.platform).toBeUndefined();
      expect(stored.platformLink).toBeUndefined();
    });

    it("drops the old mode's fields when switching from Offline to Online", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-to-online", {
        mode: "Offline",
        platform: undefined,
        platformLink: undefined,
        city: "Pune",
        state: "Maharashtra",
        country: "India",
        address: "Juhu Beach, gate 2",
      });

      const res = await patch(cookie, "edit-to-online", {
        mode: "Online",
        platform: "Google Meet",
        platformLink: "https://meet.example.com/abc",
      });
      expect(res.status).toBe(200);

      const stored = (await Event.findOne({ uid: "edit-to-online" }))!;
      expect(stored.mode).toBe("Online");
      expect(stored.address).toBeUndefined();
      expect(stored.city).toBeUndefined();
      expect(stored.platform).toBe("Google Meet");
    });

    it("rejects a meeting link that is not http or https", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-bad-link");

      const res = await patch(cookie, "edit-bad-link", {
        platformLink: "ftp://example.com/room",
      });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("platformLink");
    });

    it("keeps existing registrations", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "edit-registrations");
      const attendee = await signup("fan@example.com", "Fan Attendee");
      await request(app)
        .post("/events/edit-registrations/join")
        .set("Cookie", attendee)
        .expect(201);

      const res = await patch(hostCookie, "edit-registrations", {
        name: "Beach clean-up drive, new venue",
      });
      expect(res.status).toBe(200);
      expect(await EventRegistration.countDocuments({})).toBe(1);
    });

    it("requires sign-in", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-auth");

      const res = await patch(undefined, "edit-auth", { name: "No sign in here" });
      expect(res.status).toBe(401);
    });

    it("returns 404 for an unknown event", async () => {
      const cookie = await signupOrganization();
      const res = await patch(cookie, "no-such-event", {
        name: "Does not exist at all",
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 to a personal account", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "edit-personal");
      const personal = await signup("person@example.com", "Plain Person");

      const res = await patch(personal, "edit-personal", {
        name: "A person tries this",
      });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("This account is not an organization !");
    });

    it("returns 403 to another organization and changes nothing", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "edit-not-yours");
      const rival = await signupOrganization("rival@example.com", "Rival Org");

      const res = await patch(rival, "edit-not-yours", {
        name: "Rival renames the event",
      });
      expect(res.status).toBe(403);
      expect((await Event.findOne({ uid: "edit-not-yours" }))?.name).toBe(
        "Beach clean-up drive",
      );
    });

    it("returns 409 for a cancelled event", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-cancelled");
      await cancel(cookie, "edit-cancelled").expect(200);

      const res = await patch(cookie, "edit-cancelled", {
        name: "Renaming a cancelled event",
      });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("A cancelled event cannot be edited.");
    });

    it("returns 409 for an event that has already ended", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "edit-ended");
      const longAgo = new Date(Date.now() - 2 * DAY_MS);
      await Event.updateOne(
        { uid: "edit-ended" },
        {
          startTime: longAgo,
          startDate: longAgo,
          endTime: new Date(longAgo.getTime() + HOUR_MS),
          endDate: longAgo,
        },
      );

      const res = await patch(cookie, "edit-ended", {
        name: "Renaming a finished event",
      });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "An event that has already ended cannot be edited.",
      );
    });

    it("lets the host edit an event saved before organizerHandle existed", async () => {
      const cookie = await signupOrganization();
      const saved = await createEvent(cookie, "edit-legacy");
      await Event.updateOne(
        { uid: saved.uid },
        { $unset: { organizerHandle: 1 } },
      );

      const res = await patch(cookie, "edit-legacy", {
        name: "Legacy event, edited fine",
      });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /events/:uid/cancel", () => {
    it("marks the event cancelled and keeps it public", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "cancel-basic");

      const res = await cancel(cookie, "cancel-basic");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Event Cancelled");
      expect(res.body.event.status).toBe("cancelled");
      expect(res.body.event.cancelledAt).toBeTruthy();

      const single = await request(app)
        .get("/events")
        .query({ uid: "cancel-basic" });
      expect(single.status).toBe(200);
      expect(single.body.status).toBe("cancelled");

      const list = await request(app)
        .get("/events")
        .query({ period: "upcoming" });
      expect(
        list.body.data.map((event: { uid: string; status: string }) => [
          event.uid,
          event.status,
        ]),
      ).toEqual([["cancel-basic", "cancelled"]]);
    });

    it("keeps existing registrations and still lists the event in My Events", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "cancel-registered");
      const attendee = await signup("goer@example.com", "Goer Attendee");
      await request(app)
        .post("/events/cancel-registered/join")
        .set("Cookie", attendee)
        .expect(201);

      await cancel(hostCookie, "cancel-registered").expect(200);

      expect(await EventRegistration.countDocuments({})).toBe(1);
      const mine = await request(app)
        .get("/events/mine")
        .set("Cookie", attendee);
      expect(mine.body.data[0]).toMatchObject({
        uid: "cancel-registered",
        status: "cancelled",
      });
    });

    it("refuses new joins with 409 and saves no registration", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "cancel-no-join");
      await cancel(hostCookie, "cancel-no-join").expect(200);
      const attendee = await signup("late@example.com", "Late Attendee");

      const res = await request(app)
        .post("/events/cancel-no-join/join")
        .set("Cookie", attendee);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("This event was cancelled.");
      expect(await EventRegistration.countDocuments({})).toBe(0);
    });

    it("answers 409 to a second cancel", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "cancel-twice");
      await cancel(cookie, "cancel-twice").expect(200);

      const res = await cancel(cookie, "cancel-twice");
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("This event is already cancelled.");
    });

    it("answers 409 for an event that has already ended", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "cancel-ended");
      const longAgo = new Date(Date.now() - 2 * DAY_MS);
      await Event.updateOne(
        { uid: "cancel-ended" },
        {
          startTime: longAgo,
          startDate: longAgo,
          endTime: new Date(longAgo.getTime() + HOUR_MS),
          endDate: longAgo,
        },
      );

      const res = await cancel(cookie, "cancel-ended");
      expect(res.status).toBe(409);
      expect((await Event.findOne({ uid: "cancel-ended" }))?.status).toBe(
        "published",
      );
    });

    it("requires sign-in", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "cancel-auth");

      const res = await cancel(undefined, "cancel-auth");
      expect(res.status).toBe(401);
    });

    it("returns 404 for an unknown event", async () => {
      const cookie = await signupOrganization();
      const res = await cancel(cookie, "no-such-event");
      expect(res.status).toBe(404);
    });

    it("returns 403 to a personal account", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "cancel-personal");
      const personal = await signup("person@example.com", "Plain Person");

      const res = await cancel(personal, "cancel-personal");
      expect(res.status).toBe(403);
    });

    it("returns 403 to another organization and leaves the event published", async () => {
      const hostCookie = await signupOrganization();
      await createEvent(hostCookie, "cancel-not-yours");
      const rival = await signupOrganization("rival@example.com", "Rival Org");

      const res = await cancel(rival, "cancel-not-yours");
      expect(res.status).toBe(403);
      expect((await Event.findOne({ uid: "cancel-not-yours" }))?.status).toBe(
        "published",
      );
    });

    it("reads an event with no stored status as published", async () => {
      const cookie = await signupOrganization();
      await createEvent(cookie, "cancel-legacy");
      await Event.collection.updateOne(
        { uid: "cancel-legacy" },
        { $unset: { status: "" } },
      );

      const single = await request(app)
        .get("/events")
        .query({ uid: "cancel-legacy" });
      // The raw document has no status; the model default fills it on read.
      expect(single.body.status).toBe("published");

      await cancel(cookie, "cancel-legacy").expect(200);
    });
  });
});
