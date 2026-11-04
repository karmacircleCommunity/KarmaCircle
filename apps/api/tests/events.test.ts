import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { sendEventJoinConfirmation } from "../src/config/mailer";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import { User } from "../src/modules/users/user.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();

// Organization, not individual - `event.service.ts#createEvent` rejects a
// non-organization host outright (September 2026: every event on the
// circle is an NGO-run drive), so this is the only account type any of
// these tests can successfully create an event with. See the dedicated
// "rejects event creation from an individual host" test below for the
// rejection path itself.
async function signupAndGetCookie() {
  const res = await request(app).post("/auth/signup").send({
    email: "host@example.com",
    password: "hunter2",
    name: "Test Host",
    userType: "organization",
  });

  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) {
    throw new Error("signup did not return a Token cookie");
  }
  return cookie;
}

// Creation rejects a start time in the past, so the fixture is always
// "tomorrow" relative to when the suite runs.
const DAY_MS = 86_400_000;
const startsAt = new Date(Date.now() + DAY_MS);
const endsAt = new Date(startsAt.getTime() + 2 * 3_600_000);
const startOfDay = new Date(startsAt);
startOfDay.setUTCHours(0, 0, 0, 0);

const validOnlineEvent = {
  uid: "test-event-1",
  name: "Test Event",
  description: "A test event for the suite",
  coverImage: "https://example.com/cover.png",
  mode: "Online",
  startTime: startsAt.toISOString(),
  endTime: endsAt.toISOString(),
  startDate: startOfDay.toISOString(),
  endDate: startOfDay.toISOString(),
  platform: "Zoom Meeting",
  platformLink: "https://zoom.example.com/j/123",
};

describe("Events", () => {
  it("requires sign-in to join an event", async () => {
    const res = await request(app).post("/events/missing-event/join");
    expect(res.status).toBe(401);
  });

  it("requires sign-in to list an attendee's events", async () => {
    const res = await request(app).get("/events/mine");
    expect(res.status).toBe(401);
  });

  it("saves an attendee registration and emails one confirmation", async () => {
    const hostCookie = await signupAndGetCookie();
    const startsAt = new Date(Date.now() + 86_400_000);
    const created = await request(app)
      .post("/events/create")
      .set("Cookie", hostCookie)
      .send({
        ...validOnlineEvent,
        uid: "join-confirmation-event",
        startDate: startsAt.toISOString(),
        startTime: startsAt.toISOString(),
        endDate: new Date(startsAt.getTime() + 86_400_000).toISOString(),
        endTime: new Date(startsAt.getTime() + 86_400_000).toISOString(),
      });
    expect(created.status).toBe(201);

    const attendee = await request(app).post("/auth/signup").send({
      email: "attendee@example.com",
      password: "hunter2",
      name: "Test Attendee",
    });
    const attendeeCookie = attendee.headers["set-cookie"][0];

    const joined = await request(app)
      .post("/events/join-confirmation-event/join")
      .set("Cookie", attendeeCookie);
    expect(joined.status).toBe(201);
    expect(joined.body.joined).toBe(true);
    expect(joined.body.emailSent).toBe(true);
    expect(sendEventJoinConfirmation).toHaveBeenCalledTimes(1);
    expect(sendEventJoinConfirmation).toHaveBeenCalledWith(
      "attendee@example.com",
      "Test Attendee",
      expect.objectContaining({ uid: "join-confirmation-event" }),
    );

    const registrationStatus = await request(app)
      .get("/events/join-confirmation-event/registration")
      .set("Cookie", attendeeCookie);
    expect(registrationStatus.status).toBe(200);
    expect(registrationStatus.body).toEqual({ joined: true });

    const myEvents = await request(app)
      .get("/events/mine")
      .query({ period: "upcoming" })
      .set("Cookie", attendeeCookie);
    expect(myEvents.status).toBe(200);
    expect(
      myEvents.body.data.map((event: { uid: string }) => event.uid),
    ).toEqual(["join-confirmation-event"]);
    expect(myEvents.body.data[0]).not.toHaveProperty("attendeeEmail");

    const anotherAttendee = await request(app).post("/auth/signup").send({
      email: "another-attendee@example.com",
      password: "hunter2",
      name: "Another Attendee",
    });
    const anotherCookie = anotherAttendee.headers["set-cookie"][0];
    const theirEvents = await request(app)
      .get("/events/mine")
      .set("Cookie", anotherCookie);
    expect(theirEvents.status).toBe(200);
    expect(theirEvents.body.data).toHaveLength(0);

    const duplicate = await request(app)
      .post("/events/join-confirmation-event/join")
      .set("Cookie", attendeeCookie);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.alreadyJoined).toBe(true);
    expect(sendEventJoinConfirmation).toHaveBeenCalledTimes(1);

    await Event.updateOne(
      { uid: "join-confirmation-event" },
      { $set: { startTime: new Date(Date.now() - 1_000) } },
    );
    const pastEvents = await request(app)
      .get("/events/mine")
      .query({ period: "past" })
      .set("Cookie", attendeeCookie);
    expect(pastEvents.status).toBe(200);
    expect(
      pastEvents.body.data.map((event: { uid: string }) => event.uid),
    ).toEqual(["join-confirmation-event"]);
  });
  it("rejects event creation without authentication", async () => {
    const res = await request(app)
      .post("/events/create")
      .send(validOnlineEvent);
    expect(res.status).toBe(401);
  });

  it("creates an event for the authenticated host", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    expect(res.status).toBe(201);
    expect(res.body.savedEvent.uid).toBe(validOnlineEvent.uid);
    expect(res.body.savedEvent.hostUsername).toBeDefined();
  });

  it("filters the list to one host's own events with ?host=", async () => {
    const cookie = await signupAndGetCookie();

    const created = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "host-filter-event" });
    expect(created.status).toBe(201);

    const host = created.body.savedEvent.hostUsername;

    const mine = await request(app).get("/events").query({ host });
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThan(0);
    expect(
      mine.body.data.every(
        (event: { hostUsername: string }) => event.hostUsername === host,
      ),
    ).toBe(true);
    expect(mine.body.pagination.total).toBe(mine.body.data.length);

    // Someone else's handle returns an empty page, not everyone's events.
    const theirs = await request(app)
      .get("/events")
      .query({ host: "nobody-by-that-name" });
    expect(theirs.status).toBe(200);
    expect(theirs.body.data).toHaveLength(0);
  });

  it("sets organizerHandle from the host's organization record, not the request body", async () => {
    const signup = await request(app).post("/auth/signup").send({
      email: "org-host@example.com",
      password: "hunter2",
      name: "Org Host",
      userType: "organization",
    });
    const cookie = signup.headers["set-cookie"][0];
    const orgHandle = signup.body.user.userName;

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      // A client-supplied organizerHandle must be ignored — the value only
      // ever comes from the authenticated host's own organization record.
      .send({
        ...validOnlineEvent,
        uid: "org-hosted-event",
        organizerHandle: "someone-else",
      });

    expect(res.status).toBe(201);
    expect(res.body.savedEvent.organizerHandle).toBe(orgHandle);

    // The real link also answers ?host= alongside the legacy hostUsername
    // match, with no backfill needed for events that predate this field.
    const byHost = await request(app).get("/events").query({ host: orgHandle });
    expect(byHost.body.data.map((e: { uid: string }) => e.uid)).toContain(
      "org-hosted-event",
    );
  });

  it("rejects event creation from an individual (non-organization) host", async () => {
    const signup = await request(app).post("/auth/signup").send({
      email: "individual-host@example.com",
      password: "hunter2",
      name: "Individual Host",
    });
    const cookie = signup.headers["set-cookie"][0];

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "individual-hosted-event" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("This account is not an organization !");
  });

  it("rejects an Offline event missing location fields with 400", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "test-event-2", mode: "Offline" });

    expect(res.status).toBe(400);
  });

  it("creates an Offline event with its address and no obsolete map embed", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({
        ...validOnlineEvent,
        uid: "offline-with-address",
        mode: "Offline",
        address: "12 River Road",
        city: "Guwahati",
        state: "Assam",
        country: "India",
      });

    expect(res.status).toBe(201);
    expect(res.body.savedEvent.mapIframe).toBeUndefined();
  });

  it("rejects an Online event without its platform and join link", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({
        ...validOnlineEvent,
        uid: "online-missing-join-link",
        platformLink: "",
      });

    expect(res.status).toBe(400);
  });

  it.each(["ftp://zoom.example.com/j/123", "zoom.example.com/j/123"])(
    "rejects an Online event meeting link without HTTP or HTTPS (%s)",
    async (platformLink) => {
      const cookie = await signupAndGetCookie();

      const res = await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send({
          ...validOnlineEvent,
          uid: "invalid-meeting-link",
          platformLink,
        });

      expect(res.status).toBe(400);
    },
  );

  it("requires the event page address to be a URL-safe slug", async () => {
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "Event name with spaces" });

    expect(res.status).toBe(400);
  });

  it("lists all events, paginated", async () => {
    const cookie = await signupAndGetCookie();
    await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    const res = await request(app).get("/events");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("paginates across multiple pages with skip/limit math", async () => {
    const cookie = await signupAndGetCookie();
    for (const uid of ["multi-1", "multi-2", "multi-3"]) {
      await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send({ ...validOnlineEvent, uid });
    }

    const page1 = await request(app).get("/events?page=1&limit=2");
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const page2 = await request(app).get("/events?page=2&limit=2");
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const uidsSeen = new Set(
      [...page1.body.data, ...page2.body.data].map(
        (e: { uid: string }) => e.uid,
      ),
    );
    expect(uidsSeen.size).toBe(3);
  });

  it("rejects an out-of-range limit with 400", async () => {
    const res = await request(app).get("/events?limit=101");
    expect(res.status).toBe(400);
  });

  it("finds a single event by uid", async () => {
    const cookie = await signupAndGetCookie();
    await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send(validOnlineEvent);

    const res = await request(app).get(`/events?uid=${validOnlineEvent.uid}`);

    expect(res.status).toBe(200);
    expect(res.body.uid).toBe(validOnlineEvent.uid);
  });

  it("returns 404 for an unknown event uid", async () => {
    const res = await request(app).get("/events?uid=does-not-exist");
    expect(res.status).toBe(404);
  });

  it("defaults inviteOnly/isGovernmentSponsored to false and lets the client set inviteOnly", async () => {
    const cookie = await signupAndGetCookie();

    const defaulted = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({ ...validOnlineEvent, uid: "invite-default-event" });
    expect(defaulted.body.savedEvent.inviteOnly).toBe(false);
    expect(defaulted.body.savedEvent.isGovernmentSponsored).toBe(false);

    const inviteOnly = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({
        ...validOnlineEvent,
        uid: "invite-only-event",
        inviteOnly: true,
      });
    expect(inviteOnly.status).toBe(201);
    expect(inviteOnly.body.savedEvent.inviteOnly).toBe(true);
  });

  it("silently strips a client-supplied isGovernmentSponsored rather than persisting it", async () => {
    // Same trust rule as `Organization.verified` — a self-declared
    // government backing would be trivially fake-able, so createEventSchema
    // never accepts this field at all; Zod strips it rather than the
    // service having to remember to overwrite it.
    const cookie = await signupAndGetCookie();

    const res = await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({
        ...validOnlineEvent,
        uid: "govt-spoof-event",
        isGovernmentSponsored: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.savedEvent.isGovernmentSponsored).toBe(false);
  });

  it("includes the detail-page fields on a single-event fetch", async () => {
    const cookie = await signupAndGetCookie();
    await request(app)
      .post("/events/create")
      .set("Cookie", cookie)
      .send({
        ...validOnlineEvent,
        uid: "detail-fields-event",
        inviteOnly: true,
      });

    const res = await request(app).get("/events?uid=detail-fields-event");

    expect(res.status).toBe(200);
    expect(res.body.inviteOnly).toBe(true);
    expect(res.body.isGovernmentSponsored).toBe(false);
  });

  describe("create validation", () => {
    let cookie: string;

    beforeEach(async () => {
      cookie = await signupAndGetCookie();
    });

    async function createWith(overrides: Record<string, unknown>) {
      return request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send({ ...validOnlineEvent, ...overrides });
    }

    function issuePaths(res: request.Response): string[] {
      return (res.body.errors ?? []).map((e: { path: string }) => e.path);
    }

    // V-1
    it("rejects an end time that is before the start time", async () => {
      const res = await createWith({
        endTime: new Date(startsAt.getTime() - 3_600_000).toISOString(),
      });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("endTime");
    });

    it("rejects an end time equal to the start time", async () => {
      const res = await createWith({ endTime: startsAt.toISOString() });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("endTime");
    });

    it("accepts an end time after the start time", async () => {
      const res = await createWith({
        endTime: new Date(startsAt.getTime() + 1_000).toISOString(),
      });
      expect(res.status).toBe(201);
    });

    // V-2
    it("rejects a start time in the past", async () => {
      const past = new Date(Date.now() - 3_600_000);
      const res = await createWith({
        startTime: past.toISOString(),
        endTime: new Date(Date.now() + 3_600_000).toISOString(),
      });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("startTime");
    });

    // V-3
    it.each([
      ["too short", "x".repeat(9), 400],
      ["at the minimum", "x".repeat(10), 201],
      ["at the maximum", "x".repeat(80), 201],
      ["too long", "x".repeat(81), 400],
    ])("enforces the name length (%s)", async (_label, name, status) => {
      const res = await createWith({ name });
      expect(res.status).toBe(status);
      if (status === 400) expect(issuePaths(res)).toContain("name");
    });

    it.each([
      ["too short", "x".repeat(19), 400],
      ["at the minimum", "x".repeat(20), 201],
      ["at the maximum", "x".repeat(200), 201],
      ["too long", "x".repeat(201), 400],
    ])(
      "enforces the description length (%s)",
      async (_label, description, status) => {
        const res = await createWith({ description });
        expect(res.status).toBe(status);
        if (status === 400) expect(issuePaths(res)).toContain("description");
      },
    );

    // V-4
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    it.each([
      ["an https link", "https://example.com/cover.webp"],
      ["a PNG data URL", tinyPng],
      ["a JPEG data URL", "data:image/jpeg;base64,/9j/4AAQSkZJRg=="],
      ["a WebP data URL", "data:image/webp;base64,UklGRg=="],
      ["a GIF data URL", "data:image/gif;base64,R0lGODlhAQABAAAAACw="],
    ])("accepts %s as the cover image", async (_label, coverImage) => {
      const res = await createWith({ coverImage });
      expect(res.status).toBe(201);
    });

    it.each([
      ["an http link", "http://example.com/cover.png"],
      ["a javascript: URL", "javascript:alert(1)"],
      ["plain text", "not a url"],
      ["an SVG data URL", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
      ["a non-image data URL", "data:text/html;base64,PGgxPmhpPC9oMT4="],
      ["a data URL that is not base64", "data:image/png,rawbytes"],
      ["a data URL with a broken payload", "data:image/png;base64,@@@@"],
      ["a file: URL", "file:///etc/passwd"],
    ])("rejects %s as the cover image", async (_label, coverImage) => {
      const res = await createWith({ coverImage });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("coverImage");
    });

    it("rejects a data URL image larger than 5 MB", async () => {
      const oversized = `data:image/png;base64,${"A".repeat(
        Math.ceil((5 * 1024 * 1024 + 3) / 3) * 4,
      )}`;
      const res = await createWith({ coverImage: oversized });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("coverImage");
    });

    it("accepts a data URL image at exactly 5 MB", async () => {
      // Built from a real buffer so base64 adds its own padding.
      const exact = Buffer.alloc(5 * 1024 * 1024).toString("base64");
      const res = await createWith({
        coverImage: `data:image/png;base64,${exact}`,
      });
      expect(res.status).toBe(201);
    });

    // V-5
    it.each(["mine", "new", "create", "edit", "admin", "api"])(
      "rejects the reserved page address %s",
      async (uid) => {
        const res = await createWith({ uid });
        expect(res.status).toBe(400);
        expect(issuePaths(res)).toContain("uid");
      },
    );

    it("allows a page address that only contains a reserved word", async () => {
      const res = await createWith({ uid: "mine-sweeper-cleanup" });
      expect(res.status).toBe(201);
    });

    // V-6
    it.each([
      ["city", 100],
      ["state", 100],
      ["country", 100],
      ["address", 200],
    ])("caps %s at %i characters", async (field, max) => {
      const offline = {
        mode: "Offline",
        city: "Guwahati",
        state: "Assam",
        country: "India",
        address: "12 River Road",
      };
      const atMax = await createWith({
        ...offline,
        uid: "offline-at-max",
        [field]: "x".repeat(max),
      });
      expect(atMax.status).toBe(201);

      const overMax = await createWith({
        ...offline,
        uid: "offline-over-max",
        [field]: "x".repeat(max + 1),
      });
      expect(overMax.status).toBe(400);
      expect(issuePaths(overMax)).toContain(field);
    });

    it("caps the platform at 60 characters", async () => {
      const res = await createWith({ platform: "x".repeat(61) });
      expect(res.status).toBe(400);
      expect(issuePaths(res)).toContain("platform");
    });

    it("caps the meeting link at 2048 characters", async () => {
      const atMax = await createWith({
        platformLink: `https://zoom.example.com/${"x".repeat(2048 - 25)}`,
      });
      expect(atMax.status).toBe(201);

      const overMax = await createWith({
        uid: "link-over-max",
        platformLink: `https://zoom.example.com/${"x".repeat(2048 - 24)}`,
      });
      expect(overMax.status).toBe(400);
      expect(issuePaths(overMax)).toContain("platformLink");
    });

    // CH-7
    it("returns 409 when the page address is already taken", async () => {
      const first = await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send(validOnlineEvent);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send(validOnlineEvent);
      expect(second.status).toBe(409);
      expect(second.body.message).toBe(
        "Please choose another unique event uid !",
      );
    });

    it("turns a unique-index violation at save time into the same 409", async () => {
      // Simulates the race: the friendly pre-check sees nothing, then the
      // other organizer's insert lands first and the index rejects ours.
      await Event.init();
      const first = await request(app)
        .post("/events/create")
        .set("Cookie", cookie)
        .send(validOnlineEvent);
      expect(first.status).toBe(201);

      const preCheck = jest.spyOn(Event, "exists").mockResolvedValueOnce(null);
      try {
        const second = await request(app)
          .post("/events/create")
          .set("Cookie", cookie)
          .send(validOnlineEvent);
        expect(preCheck).toHaveBeenCalledTimes(1);
        expect(second.status).toBe(409);
        expect(second.body.message).toBe(
          "Please choose another unique event uid !",
        );
      } finally {
        preCheck.mockRestore();
      }
      expect(await Event.countDocuments({ uid: validOnlineEvent.uid })).toBe(1);
    });
  });

  // T-1 and T-2. The create route rejects a past start time, so every event
  // in this block is written straight through the model, which lets a test
  // pick any start time (including one that already passed).
  describe("join rules and My Events", () => {
    const HOUR_MS = 3_600_000;

    async function signupAttendee(email: string) {
      const res = await request(app)
        .post("/auth/signup")
        .send({ email, password: "hunter2", name: `Attendee ${email}` });
      const cookie = res.headers["set-cookie"]?.[0];
      if (!cookie) throw new Error("signup did not return a Token cookie");
      return cookie as string;
    }

    async function insertEvent(
      uid: string,
      startsInMs: number,
      overrides: Record<string, unknown> = {},
    ) {
      const start = new Date(Date.now() + startsInMs);
      return Event.create({
        uid,
        name: `Event ${uid}`,
        description: "A seeded event for the join and My Events tests",
        hostUsername: "seed-host",
        hostName: "Seed Host",
        organizerHandle: "seed-host",
        coverImage: "https://example.com/cover.png",
        mode: "Online",
        platform: "Zoom Meeting",
        platformLink: "https://zoom.example.com/j/123",
        startTime: start,
        endTime: new Date(start.getTime() + 2 * HOUR_MS),
        startDate: start,
        endDate: start,
        ...overrides,
      });
    }

    async function registerDirectly(email: string, uid: string) {
      const user = await User.findOne({ email });
      if (!user) throw new Error(`no user for ${email}`);
      await EventRegistration.create({
        eventUid: uid,
        userId: user._id,
        attendeeEmail: user.email,
        attendeeName: user.name || "Attendee",
      });
    }

    function uidsOf(res: request.Response): string[] {
      return res.body.data.map((event: { uid: string }) => event.uid);
    }

    describe("joining", () => {
      it("rejects joining an invite-only event with 403 and saves nothing", async () => {
        await insertEvent("invite-only-join", DAY_MS, { inviteOnly: true });
        const cookie = await signupAttendee("invitee@example.com");

        const res = await request(app)
          .post("/events/invite-only-join/join")
          .set("Cookie", cookie);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe("This event is invite-only.");
        expect(sendEventJoinConfirmation).not.toHaveBeenCalled();
        expect(await EventRegistration.countDocuments({})).toBe(0);
      });

      it("rejects joining an event that already started with 409 and saves nothing", async () => {
        await insertEvent("already-started-join", -HOUR_MS);
        const cookie = await signupAttendee("late@example.com");

        const res = await request(app)
          .post("/events/already-started-join/join")
          .set("Cookie", cookie);

        expect(res.status).toBe(409);
        expect(res.body.message).toBe("This event has already started.");
        expect(sendEventJoinConfirmation).not.toHaveBeenCalled();
        expect(await EventRegistration.countDocuments({})).toBe(0);
      });

      it("returns 404 when joining an unknown event", async () => {
        const cookie = await signupAttendee("lost@example.com");

        const res = await request(app)
          .post("/events/no-such-event/join")
          .set("Cookie", cookie);

        expect(res.status).toBe(404);
        expect(await EventRegistration.countDocuments({})).toBe(0);
      });
    });

    describe("registration check", () => {
      it("returns 404 for an unknown event", async () => {
        const cookie = await signupAttendee("checker@example.com");

        const res = await request(app)
          .get("/events/no-such-event/registration")
          .set("Cookie", cookie);

        expect(res.status).toBe(404);
      });

      it("reports joined: false for a known event the attendee has not joined", async () => {
        await insertEvent("not-joined-yet", DAY_MS);
        const cookie = await signupAttendee("browser@example.com");

        const res = await request(app)
          .get("/events/not-joined-yet/registration")
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ joined: false });
      });

      it("requires sign-in", async () => {
        await insertEvent("registration-auth", DAY_MS);
        const res = await request(app).get(
          "/events/registration-auth/registration",
        );
        expect(res.status).toBe(401);
      });
    });

    describe("GET /events/mine", () => {
      it("defaults to upcoming and returns it soonest first", async () => {
        await insertEvent("mine-later", 3 * DAY_MS);
        await insertEvent("mine-soon", DAY_MS);
        await insertEvent("mine-middle", 2 * DAY_MS);
        await insertEvent("mine-past", -DAY_MS);
        const email = "sorted@example.com";
        const cookie = await signupAttendee(email);
        for (const uid of ["mine-later", "mine-soon", "mine-middle"]) {
          const joined = await request(app)
            .post(`/events/${uid}/join`)
            .set("Cookie", cookie);
          expect(joined.status).toBe(201);
        }
        await registerDirectly(email, "mine-past");

        const res = await request(app)
          .get("/events/mine")
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(uidsOf(res)).toEqual(["mine-soon", "mine-middle", "mine-later"]);
        expect(res.body.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        });
      });

      it("splits upcoming from past and returns past most recent first", async () => {
        await insertEvent("split-upcoming", DAY_MS);
        await insertEvent("split-past-old", -3 * DAY_MS);
        await insertEvent("split-past-recent", -HOUR_MS);
        const email = "splitter@example.com";
        const cookie = await signupAttendee(email);
        const joined = await request(app)
          .post("/events/split-upcoming/join")
          .set("Cookie", cookie);
        expect(joined.status).toBe(201);
        await registerDirectly(email, "split-past-old");
        await registerDirectly(email, "split-past-recent");

        const upcoming = await request(app)
          .get("/events/mine")
          .query({ period: "upcoming" })
          .set("Cookie", cookie);
        expect(upcoming.status).toBe(200);
        expect(uidsOf(upcoming)).toEqual(["split-upcoming"]);

        const past = await request(app)
          .get("/events/mine")
          .query({ period: "past" })
          .set("Cookie", cookie);
        expect(past.status).toBe(200);
        expect(uidsOf(past)).toEqual(["split-past-recent", "split-past-old"]);
        expect(past.body.pagination.total).toBe(2);
      });

      it("rejects an unknown period with 400", async () => {
        const cookie = await signupAttendee("badperiod@example.com");
        const res = await request(app)
          .get("/events/mine")
          .query({ period: "someday" })
          .set("Cookie", cookie);
        expect(res.status).toBe(400);
      });

      it("returns an empty page when the attendee joined nothing", async () => {
        await insertEvent("unjoined-event", DAY_MS);
        const cookie = await signupAttendee("empty@example.com");

        const res = await request(app)
          .get("/events/mine")
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.total).toBe(0);
      });

      it("paginates upcoming events with page and limit", async () => {
        const uids = ["page-1", "page-2", "page-3", "page-4", "page-5"];
        const email = "pager@example.com";
        const cookie = await signupAttendee(email);
        for (const [index, uid] of uids.entries()) {
          await insertEvent(uid, (index + 1) * DAY_MS);
          await registerDirectly(email, uid);
        }

        const first = await request(app)
          .get("/events/mine")
          .query({ limit: 2, page: 1 })
          .set("Cookie", cookie);
        expect(first.status).toBe(200);
        expect(uidsOf(first)).toEqual(["page-1", "page-2"]);
        expect(first.body.pagination).toEqual({
          page: 1,
          limit: 2,
          total: 5,
          totalPages: 3,
        });

        const second = await request(app)
          .get("/events/mine")
          .query({ limit: 2, page: 2 })
          .set("Cookie", cookie);
        expect(uidsOf(second)).toEqual(["page-3", "page-4"]);
        expect(second.body.pagination.page).toBe(2);

        const last = await request(app)
          .get("/events/mine")
          .query({ limit: 2, page: 3 })
          .set("Cookie", cookie);
        expect(uidsOf(last)).toEqual(["page-5"]);

        const beyond = await request(app)
          .get("/events/mine")
          .query({ limit: 2, page: 4 })
          .set("Cookie", cookie);
        expect(beyond.status).toBe(200);
        expect(beyond.body.data).toEqual([]);
        expect(beyond.body.pagination.total).toBe(5);
      });

      it("paginates past events most recent first", async () => {
        const email = "pastpager@example.com";
        const cookie = await signupAttendee(email);
        for (const [index, uid] of ["old-1", "old-2", "old-3"].entries()) {
          await insertEvent(uid, -(index + 1) * DAY_MS);
          await registerDirectly(email, uid);
        }

        const first = await request(app)
          .get("/events/mine")
          .query({ period: "past", limit: 2, page: 1 })
          .set("Cookie", cookie);
        expect(uidsOf(first)).toEqual(["old-1", "old-2"]);
        expect(first.body.pagination.totalPages).toBe(2);

        const second = await request(app)
          .get("/events/mine")
          .query({ period: "past", limit: 2, page: 2 })
          .set("Cookie", cookie);
        expect(uidsOf(second)).toEqual(["old-3"]);
      });

      it("rejects an out-of-range limit with 400", async () => {
        const cookie = await signupAttendee("biglimit@example.com");
        const res = await request(app)
          .get("/events/mine")
          .query({ limit: 101 })
          .set("Cookie", cookie);
        expect(res.status).toBe(400);
      });

      it("never lists another attendee's registrations", async () => {
        await insertEvent("shared-event", DAY_MS);
        await insertEvent("alice-only", 2 * DAY_MS);
        await insertEvent("bob-only", 3 * DAY_MS);
        await insertEvent("alice-past-only", -DAY_MS);
        const aliceCookie = await signupAttendee("alice@example.com");
        const bobCookie = await signupAttendee("bob@example.com");

        for (const uid of ["shared-event", "alice-only"]) {
          const joined = await request(app)
            .post(`/events/${uid}/join`)
            .set("Cookie", aliceCookie);
          expect(joined.status).toBe(201);
        }
        await registerDirectly("alice@example.com", "alice-past-only");
        for (const uid of ["shared-event", "bob-only"]) {
          const joined = await request(app)
            .post(`/events/${uid}/join`)
            .set("Cookie", bobCookie);
          expect(joined.status).toBe(201);
        }

        const alice = await request(app)
          .get("/events/mine")
          .set("Cookie", aliceCookie);
        expect(uidsOf(alice)).toEqual(["shared-event", "alice-only"]);
        expect(alice.body.pagination.total).toBe(2);

        const alicePast = await request(app)
          .get("/events/mine")
          .query({ period: "past" })
          .set("Cookie", aliceCookie);
        expect(uidsOf(alicePast)).toEqual(["alice-past-only"]);

        const bob = await request(app)
          .get("/events/mine")
          .set("Cookie", bobCookie);
        expect(uidsOf(bob)).toEqual(["shared-event", "bob-only"]);
        expect(bob.body.pagination.total).toBe(2);

        const bobPast = await request(app)
          .get("/events/mine")
          .query({ period: "past" })
          .set("Cookie", bobCookie);
        expect(bobPast.body.data).toEqual([]);
      });
    });
  });
});
