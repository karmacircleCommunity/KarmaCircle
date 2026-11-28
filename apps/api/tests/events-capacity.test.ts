import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { Event, EventRegistration } from "../src/modules/events/event.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
  sendEventCancellations: jest.fn().mockResolvedValue(1),
  sendEventUpdates: jest.fn().mockResolvedValue(1),
  sendEventDecline: jest.fn().mockResolvedValue(true),
  sendEventRequestOrganizerNotice: jest.fn().mockResolvedValue(true),
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

const signupHost = () =>
  signup("host@example.com", "Test Host", "organization");

let attendeeCount = 0;
const signupAttendee = () => {
  attendeeCount += 1;
  return signup(
    `attendee${attendeeCount}@example.com`,
    `Attendee ${attendeeCount}`,
  );
};

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
}

const join = (cookie: string, uid: string) =>
  request(app).post(`/events/${uid}/join`).set("Cookie", cookie);
const leave = (cookie: string | undefined, uid: string) => {
  const req = request(app).delete(`/events/${uid}/registration`);
  if (cookie) req.set("Cookie", cookie);
  return req;
};
const patch = (cookie: string, uid: string, body: unknown) =>
  request(app)
    .patch(`/events/${uid}`)
    .set("Cookie", cookie)
    .send(body as object);
const stored = async (uid: string) => (await Event.findOne({ uid }))!;

beforeEach(() => {
  attendeeCount = 0;
});

describe("Leaving an event (PG-3)", () => {
  it("removes the registration and the event no longer shows in My Events", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-basic");
    const attendee = await signupAttendee();
    await join(attendee, "leave-basic").expect(201);

    const res = await leave(attendee, "leave-basic");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "You left this event.",
      joined: false,
    });

    expect(await EventRegistration.countDocuments({})).toBe(0);
    const status = await request(app)
      .get("/events/leave-basic/registration")
      .set("Cookie", attendee);
    expect(status.body).toEqual({
      joined: false,
      status: "none",
      invited: false,
    });
    const mine = await request(app).get("/events/mine").set("Cookie", attendee);
    expect(mine.body.data).toEqual([]);
  });

  it("lets the same person join again afterwards", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-rejoin");
    const attendee = await signupAttendee();
    await join(attendee, "leave-rejoin").expect(201);
    await leave(attendee, "leave-rejoin").expect(200);

    const again = await join(attendee, "leave-rejoin");
    expect(again.status).toBe(201);
    expect(await EventRegistration.countDocuments({})).toBe(1);
  });

  it("only removes the caller's own registration", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-isolated");
    const alice = await signupAttendee();
    const bob = await signupAttendee();
    await join(alice, "leave-isolated").expect(201);
    await join(bob, "leave-isolated").expect(201);

    await leave(alice, "leave-isolated").expect(200);

    expect(await EventRegistration.countDocuments({})).toBe(1);
    const bobStatus = await request(app)
      .get("/events/leave-isolated/registration")
      .set("Cookie", bob);
    expect(bobStatus.body).toEqual({
      joined: true,
      status: "going",
      invited: false,
    });
  });

  it("returns 404 when the attendee was not registered", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-never-joined");
    const attendee = await signupAttendee();

    const res = await leave(attendee, "leave-never-joined");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("You are not registered for this event.");
  });

  it("returns 404 for an unknown event", async () => {
    const attendee = await signupAttendee();
    expect((await leave(attendee, "no-such-event")).status).toBe(404);
  });

  it("requires sign-in", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-auth");
    expect((await leave(undefined, "leave-auth")).status).toBe(401);
  });

  it("returns 409 once the event has started and keeps the registration", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-started");
    const attendee = await signupAttendee();
    await join(attendee, "leave-started").expect(201);
    const startedAt = new Date(Date.now() - HOUR_MS);
    await Event.updateOne(
      { uid: "leave-started" },
      {
        startTime: startedAt,
        startDate: startedAt,
        endTime: new Date(Date.now() + HOUR_MS),
      },
    );

    const res = await leave(attendee, "leave-started");
    expect(res.status).toBe(409);
    expect(await EventRegistration.countDocuments({})).toBe(1);
  });

  it("can still leave a cancelled event", async () => {
    const host = await signupHost();
    await createEvent(host, "leave-cancelled");
    const attendee = await signupAttendee();
    await join(attendee, "leave-cancelled").expect(201);
    await request(app)
      .post("/events/leave-cancelled/cancel")
      .set("Cookie", host)
      .expect(200);

    await leave(attendee, "leave-cancelled").expect(200);
    expect(await EventRegistration.countDocuments({})).toBe(0);
  });
});

describe("Capacity (PG-5)", () => {
  it("is optional, and an event with none has no limit", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-none");
    expect((await stored("cap-none")).capacity).toBeUndefined();

    for (let i = 0; i < 4; i += 1) {
      await join(await signupAttendee(), "cap-none").expect(201);
    }
    expect(await EventRegistration.countDocuments({})).toBe(4);
  });

  it("accepts a whole number from 1 to 100000 on create", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-valid", { capacity: 25 });
    expect((await stored("cap-valid")).capacity).toBe(25);
    await createEvent(host, "cap-null", { capacity: null });
    expect((await stored("cap-null")).capacity).toBeUndefined();
  });

  it.each([0, -3, 1.5, 100_001, "ten"])(
    "rejects capacity %p on create",
    async (capacity) => {
      const host = await signupHost();
      const res = await request(app)
        .post("/events/create")
        .set("Cookie", host)
        .send(eventBody("cap-invalid", { capacity }));
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("capacity");
    },
  );

  it("counts joins, and refuses a join once the event is full (waitlist off)", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-full", { capacity: 2, waitlistEnabled: false });

    await join(await signupAttendee(), "cap-full").expect(201);
    await join(await signupAttendee(), "cap-full").expect(201);
    expect((await stored("cap-full")).registrationCount).toBe(2);

    const late = await join(await signupAttendee(), "cap-full");
    expect(late.status).toBe(409);
    expect(late.body.message).toBe("This event is full.");
    expect(await EventRegistration.countDocuments({})).toBe(2);
    expect((await stored("cap-full")).registrationCount).toBe(2);
  });

  it("does not count a repeat join twice, and a full event still says 'already joined' to its own attendees", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-repeat", { capacity: 1 });
    const attendee = await signupAttendee();

    await join(attendee, "cap-repeat").expect(201);
    const again = await join(attendee, "cap-repeat");
    expect(again.status).toBe(200);
    expect(again.body.alreadyJoined).toBe(true);
    expect((await stored("cap-repeat")).registrationCount).toBe(1);
  });

  it("gives the last spot to exactly one of many people joining at once", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-race", { capacity: 2, waitlistEnabled: false });
    const cookies = await Promise.all(
      Array.from({ length: 8 }, () => signupAttendee()),
    );

    const results = await Promise.all(cookies.map((c) => join(c, "cap-race")));
    const statuses = results.map((r) => r.status).sort();

    expect(statuses.filter((s) => s === 201)).toHaveLength(2);
    expect(statuses.filter((s) => s === 409)).toHaveLength(6);
    expect(await EventRegistration.countDocuments({})).toBe(2);
    expect((await stored("cap-race")).registrationCount).toBe(2);
  });

  it("frees a spot when someone leaves, and the next person can take it", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-leave", { capacity: 1, waitlistEnabled: false });
    const first = await signupAttendee();
    const second = await signupAttendee();
    await join(first, "cap-leave").expect(201);
    expect((await join(second, "cap-leave")).status).toBe(409);

    await leave(first, "cap-leave").expect(200);
    expect((await stored("cap-leave")).registrationCount).toBe(0);

    await join(second, "cap-leave").expect(201);
    expect((await stored("cap-leave")).registrationCount).toBe(1);
  });

  it("never lets the counter go below zero", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-floor", { capacity: 3 });
    const attendee = await signupAttendee();
    await join(attendee, "cap-floor").expect(201);
    // Simulate drift: the counter was reset while a registration still exists.
    await Event.updateOne({ uid: "cap-floor" }, { registrationCount: 0 });

    await leave(attendee, "cap-floor").expect(200);
    expect((await stored("cap-floor")).registrationCount).toBe(0);
  });

  it("is returned with the event so the page can show spots left", async () => {
    const host = await signupHost();
    await createEvent(host, "cap-public", { capacity: 5 });
    await join(await signupAttendee(), "cap-public").expect(201);

    const res = await request(app).get("/events").query({ uid: "cap-public" });
    expect(res.body.capacity).toBe(5);
    expect(res.body.registrationCount).toBe(1);
  });

  describe("editing", () => {
    it("sets a capacity and recounts the people already registered", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-set", { waitlistEnabled: false });
      await join(await signupAttendee(), "cap-edit-set").expect(201);
      await join(await signupAttendee(), "cap-edit-set").expect(201);
      // An event from before the counter existed has registrations but no count.
      await Event.collection.updateOne(
        { uid: "cap-edit-set" },
        { $unset: { registrationCount: "" } },
      );

      const res = await patch(host, "cap-edit-set", { capacity: 3 });
      expect(res.status).toBe(200);
      expect(res.body.event.capacity).toBe(3);
      expect(res.body.event.registrationCount).toBe(2);

      await join(await signupAttendee(), "cap-edit-set").expect(201);
      expect((await join(await signupAttendee(), "cap-edit-set")).status).toBe(
        409,
      );
    });

    it("refuses a capacity below the number already going", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-low", { capacity: 5 });
      await join(await signupAttendee(), "cap-edit-low").expect(201);
      await join(await signupAttendee(), "cap-edit-low").expect(201);

      const res = await patch(host, "cap-edit-low", { capacity: 1 });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "Capacity cannot be lower than the 2 people already going.",
      );
      expect((await stored("cap-edit-low")).capacity).toBe(5);
    });

    it("allows a capacity equal to the number registered (the event becomes full)", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-equal", { waitlistEnabled: false });
      await join(await signupAttendee(), "cap-edit-equal").expect(201);

      await patch(host, "cap-edit-equal", { capacity: 1 }).expect(200);
      expect(
        (await join(await signupAttendee(), "cap-edit-equal")).status,
      ).toBe(409);
    });

    it("removes the limit when capacity is null", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-clear", { capacity: 1 });
      await join(await signupAttendee(), "cap-edit-clear").expect(201);

      const res = await patch(host, "cap-edit-clear", { capacity: null });
      expect(res.status).toBe(200);
      expect((await stored("cap-edit-clear")).capacity).toBeUndefined();
      await join(await signupAttendee(), "cap-edit-clear").expect(201);
    });

    it("rejects an invalid capacity on edit", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-bad");
      const res = await patch(host, "cap-edit-bad", { capacity: 0 });
      expect(res.status).toBe(400);
    });

    it("does not touch capacity when the body does not mention it", async () => {
      const host = await signupHost();
      await createEvent(host, "cap-edit-keep", { capacity: 4 });
      await patch(host, "cap-edit-keep", {
        name: "Renamed clean-up drive",
      }).expect(200);
      expect((await stored("cap-edit-keep")).capacity).toBe(4);
    });
  });
});
