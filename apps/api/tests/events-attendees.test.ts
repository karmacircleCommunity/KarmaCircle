import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import {
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
} from "../src/config/mailer";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import { User } from "../src/modules/users/user.model";

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

const signupHost = (email = "host@example.com", name = "Test Host") =>
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
  await request(app)
    .post("/events/create")
    .set("Cookie", cookie)
    .send(eventBody(uid, overrides))
    .expect(201);
}

/** Signs an attendee up and registers them for `uid`; returns their cookie. */
async function joinAs(email: string, name: string, uid: string) {
  const cookie = await signup(email, name);
  await request(app)
    .post(`/events/${uid}/join`)
    .set("Cookie", cookie)
    .expect(201);
  return cookie;
}

const attendeesOf = (cookie: string | undefined, uid: string, query = {}) => {
  const req = request(app).get(`/events/${uid}/attendees`).query(query);
  if (cookie) req.set("Cookie", cookie);
  return req;
};
const checkIn = (
  cookie: string | undefined,
  uid: string,
  registrationId: string,
  body: unknown,
) => {
  const req = request(app).patch(`/events/${uid}/attendees/${registrationId}`);
  if (cookie) req.set("Cookie", cookie);
  return req.send(body as object);
};
const idOf = async (email: string) => {
  const user = await User.findOne({ email });
  const registration = await EventRegistration.findOne({ userId: user!._id });
  return String(registration!._id);
};

describe("Organizer attendee list and check-in (PG-6)", () => {
  describe("GET /events/:uid/attendees", () => {
    it("lists who joined, oldest first, with totals", async () => {
      const host = await signupHost();
      await createEvent(host, "att-list");
      await joinAs("ann@example.com", "Ann Attendee", "att-list");
      await joinAs("bob@example.com", "Bob Attendee", "att-list");

      const res = await attendeesOf(host, "att-list");

      expect(res.status).toBe(200);
      expect(res.body.event).toMatchObject({
        uid: "att-list",
        name: "Beach clean-up drive",
        status: "published",
      });
      expect(res.body.data.map((a: { name: string }) => a.name)).toEqual([
        "Ann Attendee",
        "Bob Attendee",
      ]);
      expect(res.body.data[0]).toMatchObject({
        email: "ann@example.com",
        checkedIn: false,
        checkedInAt: null,
      });
      expect(res.body.data[0].id).toMatch(/^[a-f\d]{24}$/);
      expect(res.body.data[0].joinedAt).toBeTruthy();
      expect(res.body.summary).toEqual({
        registered: 2,
        checkedIn: 0,
        pending: 0,
        waitlisted: 0,
        declined: 0,
      });
      expect(res.body.pagination).toMatchObject({ page: 1, total: 2 });
    });

    it("is empty for an event nobody joined", async () => {
      const host = await signupHost();
      await createEvent(host, "att-empty");

      const res = await attendeesOf(host, "att-empty");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.summary).toEqual({
        registered: 0,
        checkedIn: 0,
        pending: 0,
        waitlisted: 0,
        declined: 0,
      });
    });

    it("pages the list and still reports the overall total", async () => {
      const host = await signupHost();
      await createEvent(host, "att-paged");
      for (const n of [1, 2, 3]) {
        await joinAs(`p${n}@example.com`, `Person ${n}`, "att-paged");
      }

      const second = await attendeesOf(host, "att-paged", {
        page: 2,
        limit: 2,
      });
      expect(second.body.data.map((a: { name: string }) => a.name)).toEqual([
        "Person 3",
      ]);
      expect(second.body.pagination).toMatchObject({
        page: 2,
        total: 3,
        totalPages: 2,
      });
      expect(second.body.summary.registered).toBe(3);
    });

    it("searches the name or email literally and case-insensitively", async () => {
      const host = await signupHost();
      await createEvent(host, "att-search");
      await joinAs("ann@example.com", "Ann Attendee", "att-search");
      await joinAs("bob@sample.org", "Bob Attendee", "att-search");

      const byName = await attendeesOf(host, "att-search", { search: "ANN" });
      expect(byName.body.data.map((a: { email: string }) => a.email)).toEqual([
        "ann@example.com",
      ]);
      const byEmail = await attendeesOf(host, "att-search", {
        search: "sample.org",
      });
      expect(byEmail.body.data).toHaveLength(1);
      expect(byEmail.body.pagination.total).toBe(1);
      expect(byEmail.body.summary.registered).toBe(2);

      const regex = await attendeesOf(host, "att-search", { search: ".*" });
      expect(regex.body.data).toEqual([]);
    });

    it("counts people who were checked in", async () => {
      const host = await signupHost();
      await createEvent(host, "att-count");
      await joinAs("ann@example.com", "Ann Attendee", "att-count");
      await joinAs("bob@example.com", "Bob Attendee", "att-count");
      await checkIn(host, "att-count", await idOf("ann@example.com"), {
        checkedIn: true,
      }).expect(200);

      const res = await attendeesOf(host, "att-count");
      expect(res.body.summary).toEqual({
        registered: 2,
        checkedIn: 1,
        pending: 0,
        waitlisted: 0,
        declined: 0,
      });
      expect(res.body.data[0].checkedIn).toBe(true);
    });

    it("requires sign-in", async () => {
      const host = await signupHost();
      await createEvent(host, "att-auth");
      expect((await attendeesOf(undefined, "att-auth")).status).toBe(401);
    });

    it("returns 404 for an unknown event", async () => {
      const host = await signupHost();
      expect((await attendeesOf(host, "no-such-event")).status).toBe(404);
    });

    it("returns 403 to a personal account and to another organization", async () => {
      const host = await signupHost();
      await createEvent(host, "att-private");
      await joinAs("ann@example.com", "Ann Attendee", "att-private");

      const personal = await signup("person@example.com", "Plain Person");
      expect((await attendeesOf(personal, "att-private")).status).toBe(403);
      const rival = await signupHost("rival@example.com", "Rival Org");
      const res = await attendeesOf(rival, "att-private");
      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain("ann@example.com");
    });

    it("never appears on the public event routes", async () => {
      const host = await signupHost();
      await createEvent(host, "att-public");
      await joinAs("ann@example.com", "Ann Attendee", "att-public");

      const single = await request(app)
        .get("/events")
        .query({ uid: "att-public" });
      expect(JSON.stringify(single.body)).not.toContain("ann@example.com");
      const list = await request(app).get("/events");
      expect(JSON.stringify(list.body)).not.toContain("ann@example.com");
    });

    it("rejects a bad limit", async () => {
      const host = await signupHost();
      await createEvent(host, "att-limit");
      expect(
        (await attendeesOf(host, "att-limit", { limit: 101 })).status,
      ).toBe(400);
    });
  });

  describe("PATCH /events/:uid/attendees/:registrationId", () => {
    it("checks an attendee in, keeps the first time on a repeat, and undoes it", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-basic");
      await joinAs("ann@example.com", "Ann Attendee", "ci-basic");
      const id = await idOf("ann@example.com");

      const first = await checkIn(host, "ci-basic", id, { checkedIn: true });
      expect(first.status).toBe(200);
      expect(first.body.attendee).toMatchObject({ id, checkedIn: true });
      const firstTime = first.body.attendee.checkedInAt;
      expect(firstTime).toBeTruthy();

      const again = await checkIn(host, "ci-basic", id, { checkedIn: true });
      expect(again.body.attendee.checkedInAt).toBe(firstTime);

      const undone = await checkIn(host, "ci-basic", id, { checkedIn: false });
      expect(undone.body.attendee).toMatchObject({
        checkedIn: false,
        checkedInAt: null,
      });
      expect(
        (await EventRegistration.findById(id))?.checkedInAt,
      ).toBeUndefined();
    });

    it("rejects a bad id, a bad body and an unknown key", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-invalid");
      await joinAs("ann@example.com", "Ann Attendee", "ci-invalid");
      const id = await idOf("ann@example.com");

      expect(
        (await checkIn(host, "ci-invalid", "not-an-id", { checkedIn: true }))
          .status,
      ).toBe(400);
      expect(
        (await checkIn(host, "ci-invalid", id, { checkedIn: "yes" })).status,
      ).toBe(400);
      expect((await checkIn(host, "ci-invalid", id, {})).status).toBe(400);
      expect(
        (
          await checkIn(host, "ci-invalid", id, {
            checkedIn: true,
            attendeeEmail: "x@y.z",
          })
        ).status,
      ).toBe(400);
    });

    it("returns 404 for a registration that belongs to another event", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-one");
      await createEvent(host, "ci-two");
      await joinAs("ann@example.com", "Ann Attendee", "ci-one");
      const id = await idOf("ann@example.com");

      const res = await checkIn(host, "ci-two", id, { checkedIn: true });
      expect(res.status).toBe(404);
      expect(
        (await EventRegistration.findById(id))?.checkedInAt,
      ).toBeUndefined();
    });

    it("returns 404 for a registration id that does not exist", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-missing");
      const res = await checkIn(host, "ci-missing", "a".repeat(24), {
        checkedIn: true,
      });
      expect(res.status).toBe(404);
    });

    it("returns 409 for a cancelled event", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-cancelled");
      await joinAs("ann@example.com", "Ann Attendee", "ci-cancelled");
      const id = await idOf("ann@example.com");
      await request(app)
        .post("/events/ci-cancelled/cancel")
        .set("Cookie", host)
        .expect(200);

      const res = await checkIn(host, "ci-cancelled", id, { checkedIn: true });
      expect(res.status).toBe(409);
    });

    it("requires sign-in and refuses another organization and a personal account", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-guard");
      await joinAs("ann@example.com", "Ann Attendee", "ci-guard");
      const id = await idOf("ann@example.com");

      expect(
        (await checkIn(undefined, "ci-guard", id, { checkedIn: true })).status,
      ).toBe(401);
      const personal = await signup("person@example.com", "Plain Person");
      expect(
        (await checkIn(personal, "ci-guard", id, { checkedIn: true })).status,
      ).toBe(403);
      const rival = await signupHost("rival@example.com", "Rival Org");
      expect(
        (await checkIn(rival, "ci-guard", id, { checkedIn: true })).status,
      ).toBe(403);
      expect(
        (await EventRegistration.findById(id))?.checkedInAt,
      ).toBeUndefined();
    });

    it("lets an attendee who was checked in still leave before the event starts", async () => {
      const host = await signupHost();
      await createEvent(host, "ci-leave");
      const ann = await joinAs("ann@example.com", "Ann Attendee", "ci-leave");
      await checkIn(host, "ci-leave", await idOf("ann@example.com"), {
        checkedIn: true,
      }).expect(200);

      await request(app)
        .delete("/events/ci-leave/registration")
        .set("Cookie", ann)
        .expect(200);
      expect((await attendeesOf(host, "ci-leave")).body.data).toEqual([]);
    });
  });

  describe("GET /events/:uid/attendees/export", () => {
    it("downloads every attendee as CSV", async () => {
      const host = await signupHost();
      await createEvent(host, "csv-basic");
      await joinAs("ann@example.com", "Ann Attendee", "csv-basic");
      await joinAs("bob@example.com", "Bob Attendee", "csv-basic");
      await checkIn(host, "csv-basic", await idOf("ann@example.com"), {
        checkedIn: true,
      });

      const res = await request(app)
        .get("/events/csv-basic/attendees/export")
        .set("Cookie", host);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toBe(
        'attachment; filename="csv-basic-attendees.csv"',
      );
      const lines = res.text.trim().split("\r\n");
      expect(lines[0]).toBe(
        '"Name","Email","Registered at","Checked in","Checked in at","Status","Note"',
      );
      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('"Ann Attendee","ann@example.com"');
      expect(lines[1]).toContain('"Yes"');
      expect(lines[1]).toContain('"going"');
      expect(lines[2]).toContain('"Bob Attendee","bob@example.com"');
      expect(lines[2]).toContain('"No",""');
    });

    it("neutralizes cells a spreadsheet would run as a formula and escapes quotes", async () => {
      const host = await signupHost();
      await createEvent(host, "csv-safe");
      const user = await User.create({
        email: "evil@example.com",
        password: "x",
        name: "x",
        userName: "evil-user",
      });
      await EventRegistration.create({
        eventUid: "csv-safe",
        userId: user._id,
        attendeeEmail: "evil@example.com",
        attendeeName: '=HYPERLINK("http://evil.example","Click")',
      });
      await EventRegistration.create({
        eventUid: "csv-safe",
        userId: (
          await User.create({
            email: "q@example.com",
            password: "x",
            name: "x",
            userName: "q-user",
          })
        )._id,
        attendeeEmail: "q@example.com",
        attendeeName: 'Quote "Q" Person',
      });

      const res = await request(app)
        .get("/events/csv-safe/attendees/export")
        .set("Cookie", host);
      expect(res.text).toContain(
        `"'=HYPERLINK(""http://evil.example"",""Click"")"`,
      );
      expect(res.text).toContain('"Quote ""Q"" Person"');
      expect(res.text).not.toContain(',"=HYPERLINK');
    });

    it("is host only", async () => {
      const host = await signupHost();
      await createEvent(host, "csv-guard");
      const rival = await signupHost("rival@example.com", "Rival Org");

      expect(
        (await request(app).get("/events/csv-guard/attendees/export")).status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .get("/events/csv-guard/attendees/export")
            .set("Cookie", rival)
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get("/events/no-such/attendees/export")
            .set("Cookie", host)
        ).status,
      ).toBe(404);
    });
  });

  describe("telling the organizer when someone joins", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("sends the organization owner a notice for each new registration", async () => {
      const host = await signupHost();
      await createEvent(host, "notice-basic");

      await joinAs("ann@example.com", "Ann Attendee", "notice-basic");

      expect(sendEventJoinOrganizerNotice).toHaveBeenCalledTimes(1);
      expect(sendEventJoinOrganizerNotice).toHaveBeenCalledWith(
        "host@example.com",
        expect.objectContaining({
          uid: "notice-basic",
          name: "Beach clean-up drive",
        }),
        "Ann Attendee",
      );
    });

    it("does not send one for a repeat join or a refused join", async () => {
      const host = await signupHost();
      await createEvent(host, "notice-repeat", {
        capacity: 1,
        waitlistEnabled: false,
      });
      const ann = await joinAs(
        "ann@example.com",
        "Ann Attendee",
        "notice-repeat",
      );
      jest.clearAllMocks();

      await request(app)
        .post("/events/notice-repeat/join")
        .set("Cookie", ann)
        .expect(200);
      const bob = await signup("bob@example.com", "Bob Attendee");
      await request(app)
        .post("/events/notice-repeat/join")
        .set("Cookie", bob)
        .expect(409);

      expect(sendEventJoinOrganizerNotice).not.toHaveBeenCalled();
    });

    it("still registers the attendee when the notice fails", async () => {
      const host = await signupHost();
      await createEvent(host, "notice-fail");
      (sendEventJoinOrganizerNotice as jest.Mock).mockRejectedValueOnce(
        new Error("mail provider down"),
      );
      const ann = await signup("ann@example.com", "Ann Attendee");

      const res = await request(app)
        .post("/events/notice-fail/join")
        .set("Cookie", ann);

      expect(res.status).toBe(201);
      expect(await EventRegistration.countDocuments({})).toBe(1);
      expect(sendEventJoinConfirmation).toHaveBeenCalledTimes(1);
    });

    it("finds the organizer by host username for an event with no organizerHandle", async () => {
      const host = await signupHost();
      await createEvent(host, "notice-legacy");
      await Event.updateOne(
        { uid: "notice-legacy" },
        { $unset: { organizerHandle: 1 } },
      );

      await joinAs("ann@example.com", "Ann Attendee", "notice-legacy");

      expect(sendEventJoinOrganizerNotice).toHaveBeenCalledWith(
        "host@example.com",
        expect.anything(),
        "Ann Attendee",
      );
    });
  });
});
