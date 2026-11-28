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
  if (!cookie) throw new Error("signup failed: " + res.status);
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
const draft = (cookie: string, uid: string, overrides = {}) =>
  create(cookie, uid, { status: "draft", ...overrides });
const as = (
  cookie: string | undefined,
  method: "get" | "post" | "delete",
  url: string,
) => {
  const req = request(app)[method](url);
  if (cookie) req.set("Cookie", cookie);
  return req;
};
const stored = async (uid: string) => (await Event.findOne({ uid }).lean())!;
const uidsOf = (res: request.Response) =>
  res.body.data.map((e: { uid: string }) => e.uid).sort();

describe("Drafts and unpublishing (PG-15)", () => {
  describe("saving a draft", () => {
    it("creates a draft that is not public", async () => {
      const host = await signupHost();
      const res = await draft(host, "draft-basic");
      expect(res.status).toBe(201);
      expect(res.body.savedEvent.status).toBe("draft");
      expect((await stored("draft-basic")).status).toBe("draft");
    });

    it("publishes straight away when no status is sent, or published is", async () => {
      const host = await signupHost();
      await create(host, "pub-default").expect(201);
      await create(host, "pub-explicit", { status: "published" }).expect(201);
      expect((await stored("pub-default")).status).toBe("published");
      expect((await stored("pub-explicit")).status).toBe("published");
    });

    it("refuses to create an event already cancelled, or any other status", async () => {
      const host = await signupHost();
      expect(
        (await create(host, "bad-status", { status: "cancelled" })).status,
      ).toBe(400);
      expect(
        (await create(host, "bad-status", { status: "postponed" })).status,
      ).toBe(400);
    });

    it("holds a draft to the same date rules as a published event", async () => {
      const host = await signupHost();
      const past = new Date(Date.now() - DAY_MS).toISOString();
      const res = await draft(host, "draft-past", { startTime: past });
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("startTime");
      const backwards = await draft(host, "draft-backwards", {
        endTime: new Date(Date.now() + HOUR_MS).toISOString(),
      });
      expect(backwards.status).toBe(400);
      expect(backwards.body.errors[0].path).toBe("endTime");
    });
  });

  describe("who can see a draft", () => {
    it("keeps it out of the public list and the directory filters", async () => {
      const host = await signupHost();
      await draft(host, "vis-draft", { eventType: "workshop" }).expect(201);
      await create(host, "vis-live", { eventType: "workshop" }).expect(201);

      expect(uidsOf(await request(app).get("/events"))).toEqual(["vis-live"]);
      const filtered = await request(app).get("/events").query({
        type: "workshop",
        mode: "Online",
        period: "upcoming",
        search: "beach",
      });
      expect(uidsOf(filtered)).toEqual(["vis-live"]);
      expect(filtered.body.pagination.total).toBe(1);
    });

    it("answers 404 to a visitor, and to another organization, for the draft's own page", async () => {
      const host = await signupHost();
      await draft(host, "vis-page").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");

      expect((await as(undefined, "get", "/events?uid=vis-page")).status).toBe(
        404,
      );
      expect((await as(rival, "get", "/events?uid=vis-page")).status).toBe(404);
    });

    it("lets the hosting organization open its own draft", async () => {
      const host = await signupHost();
      await draft(host, "vis-owner").expect(201);

      const res = await as(host, "get", "/events?uid=vis-owner");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("draft");
    });

    it("lists a host's drafts for that host only", async () => {
      const host = await signupHost();
      await draft(host, "host-draft").expect(201);
      await create(host, "host-live").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");
      const handle = (await stored("host-live")).organizerHandle!;

      expect(uidsOf(await as(host, "get", `/events?host=${handle}`))).toEqual([
        "host-draft",
        "host-live",
      ]);
      expect(
        uidsOf(await as(undefined, "get", `/events?host=${handle}`)),
      ).toEqual(["host-live"]);
      expect(uidsOf(await as(rival, "get", `/events?host=${handle}`))).toEqual([
        "host-live",
      ]);
    });

    it("does not show a host's drafts when it lists someone else's events", async () => {
      const host = await signupHost();
      await draft(host, "own-draft").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");
      await create(rival, "rival-live").expect(201);
      const rivalHandle = (await stored("rival-live")).organizerHandle!;

      const res = await as(host, "get", `/events?host=${rivalHandle}`);
      expect(uidsOf(res)).toEqual(["rival-live"]);
    });

    it("treats a signed-out or invalid cookie as a visitor, not an error", async () => {
      const host = await signupHost();
      await draft(host, "cookie-draft").expect(201);

      const res = await request(app)
        .get("/events?uid=cookie-draft")
        .set("Cookie", "Token=not-a-real-token");
      expect(res.status).toBe(404);
      expect((await request(app).get("/events")).status).toBe(200);
    });

    it("cannot be joined, left or checked, by anyone", async () => {
      const host = await signupHost();
      await draft(host, "act-draft").expect(201);
      const person = await signup("person@example.com", "Plain Person");

      expect((await as(person, "post", "/events/act-draft/join")).status).toBe(
        404,
      );
      expect(
        (await as(person, "get", "/events/act-draft/registration")).status,
      ).toBe(404);
      expect(
        (await as(person, "delete", "/events/act-draft/registration")).status,
      ).toBe(404);
      expect(await EventRegistration.countDocuments({})).toBe(0);
    });

    it("is not counted on the organization dashboard", async () => {
      const host = await signupHost();
      await draft(host, "dash-draft").expect(201);
      await create(host, "dash-live").expect(201);

      const res = await as(host, "get", "/organizations/dashboard");
      expect(res.status).toBe(200);
      expect(
        res.body.events.map(
          (e: { uid?: string; slug?: string }) => e.uid ?? e.slug,
        ),
      ).not.toContain("dash-draft");
      expect(JSON.stringify(res.body)).not.toContain("dash-draft");
    });
  });

  describe("editing a draft", () => {
    it("can be edited and stays a draft", async () => {
      const host = await signupHost();
      await draft(host, "edit-draft").expect(201);

      const res = await request(app)
        .patch("/events/edit-draft")
        .set("Cookie", host)
        .send({ name: "A renamed draft event" });
      expect(res.status).toBe(200);
      expect(res.body.event.status).toBe("draft");
    });

    it("cannot be moved by an edit body", async () => {
      const host = await signupHost();
      await draft(host, "edit-status").expect(201);
      const res = await request(app)
        .patch("/events/edit-status")
        .set("Cookie", host)
        .send({ status: "published" });
      expect(res.status).toBe(400);
      expect((await stored("edit-status")).status).toBe("draft");
    });
  });

  describe("POST /events/:uid/publish", () => {
    it("makes a draft public", async () => {
      const host = await signupHost();
      await draft(host, "publish-ok").expect(201);

      const res = await as(host, "post", "/events/publish-ok/publish");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Event Published");
      expect(res.body.event.status).toBe("published");
      expect(uidsOf(await request(app).get("/events"))).toEqual(["publish-ok"]);
      expect((await request(app).get("/events?uid=publish-ok")).status).toBe(
        200,
      );
    });

    it("refuses a draft whose start has passed since it was saved", async () => {
      const host = await signupHost();
      await draft(host, "publish-stale").expect(201);
      const past = new Date(Date.now() - 2 * HOUR_MS);
      await Event.updateOne(
        { uid: "publish-stale" },
        {
          startTime: past,
          startDate: past,
          endTime: new Date(Date.now() + HOUR_MS),
        },
      );

      const res = await as(host, "post", "/events/publish-stale/publish");
      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("startTime");
      expect((await stored("publish-stale")).status).toBe("draft");
    });

    it("answers 409 for an event that is already published, or cancelled", async () => {
      const host = await signupHost();
      await create(host, "publish-twice").expect(201);
      expect(
        (await as(host, "post", "/events/publish-twice/publish")).status,
      ).toBe(409);

      await create(host, "publish-cancelled").expect(201);
      await as(host, "post", "/events/publish-cancelled/cancel").expect(200);
      const res = await as(host, "post", "/events/publish-cancelled/publish");
      expect(res.status).toBe(409);
    });

    it("is host only", async () => {
      const host = await signupHost();
      await draft(host, "publish-guard").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");
      const person = await signup("person@example.com", "Plain Person");

      expect(
        (await as(undefined, "post", "/events/publish-guard/publish")).status,
      ).toBe(401);
      expect(
        (await as(person, "post", "/events/publish-guard/publish")).status,
      ).toBe(403);
      expect(
        (await as(rival, "post", "/events/publish-guard/publish")).status,
      ).toBe(403);
      expect((await as(host, "post", "/events/no-such/publish")).status).toBe(
        404,
      );
      expect((await stored("publish-guard")).status).toBe("draft");
    });
  });

  describe("POST /events/:uid/unpublish", () => {
    it("takes a published event with no registrations back to a draft", async () => {
      const host = await signupHost();
      await create(host, "unpub-ok").expect(201);

      const res = await as(host, "post", "/events/unpub-ok/unpublish");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Event Unpublished");
      expect(res.body.event.status).toBe("draft");
      expect(uidsOf(await request(app).get("/events"))).toEqual([]);
      expect((await request(app).get("/events?uid=unpub-ok")).status).toBe(404);
    });

    it("can be published again afterwards", async () => {
      const host = await signupHost();
      await create(host, "unpub-again").expect(201);
      await as(host, "post", "/events/unpub-again/unpublish").expect(200);
      await as(host, "post", "/events/unpub-again/publish").expect(200);
      expect((await stored("unpub-again")).status).toBe("published");
    });

    it("refuses once someone has registered, and says to cancel instead", async () => {
      const host = await signupHost();
      await create(host, "unpub-regs").expect(201);
      const person = await signup("person@example.com", "Plain Person");
      await as(person, "post", "/events/unpub-regs/join").expect(201);

      const res = await as(host, "post", "/events/unpub-regs/unpublish");
      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "1 person has already registered, so this event cannot go back to a draft. Cancel it instead.",
      );
      expect((await stored("unpub-regs")).status).toBe("published");
    });

    it("answers 409 for a draft, a cancelled event and an ended event", async () => {
      const host = await signupHost();
      await draft(host, "unpub-draft").expect(201);
      expect(
        (await as(host, "post", "/events/unpub-draft/unpublish")).status,
      ).toBe(409);

      await create(host, "unpub-cancelled").expect(201);
      await as(host, "post", "/events/unpub-cancelled/cancel").expect(200);
      expect(
        (await as(host, "post", "/events/unpub-cancelled/unpublish")).status,
      ).toBe(409);

      await create(host, "unpub-ended").expect(201);
      const longAgo = new Date(Date.now() - 2 * DAY_MS);
      await Event.updateOne(
        { uid: "unpub-ended" },
        {
          startTime: longAgo,
          startDate: longAgo,
          endTime: new Date(longAgo.getTime() + HOUR_MS),
          endDate: longAgo,
        },
      );
      const ended = await as(host, "post", "/events/unpub-ended/unpublish");
      expect(ended.status).toBe(409);
      expect(ended.body.message).toBe(
        "An event that has already ended cannot go back to a draft.",
      );
    });

    it("is host only", async () => {
      const host = await signupHost();
      await create(host, "unpub-guard").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");

      expect(
        (await as(undefined, "post", "/events/unpub-guard/unpublish")).status,
      ).toBe(401);
      expect(
        (await as(rival, "post", "/events/unpub-guard/unpublish")).status,
      ).toBe(403);
      expect((await stored("unpub-guard")).status).toBe("published");
    });
  });

  describe("DELETE /events/:uid", () => {
    it("deletes a draft for good", async () => {
      const host = await signupHost();
      await draft(host, "del-ok").expect(201);

      const res = await as(host, "delete", "/events/del-ok");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Draft Deleted");
      expect(await Event.exists({ uid: "del-ok" })).toBeNull();
      // The page address is free to use again.
      await create(host, "del-ok").expect(201);
    });

    it("refuses a published or cancelled event", async () => {
      const host = await signupHost();
      await create(host, "del-live").expect(201);
      const res = await as(host, "delete", "/events/del-live");
      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "Only a draft can be deleted. Cancel a published event instead.",
      );

      await create(host, "del-cancelled").expect(201);
      await as(host, "post", "/events/del-cancelled/cancel").expect(200);
      expect((await as(host, "delete", "/events/del-cancelled")).status).toBe(
        409,
      );
      expect(await Event.countDocuments({})).toBe(2);
    });

    it("is host only", async () => {
      const host = await signupHost();
      await draft(host, "del-guard").expect(201);
      const rival = await signupHost("rival@example.com", "Rival Org");
      const person = await signup("person@example.com", "Plain Person");

      expect((await as(undefined, "delete", "/events/del-guard")).status).toBe(
        401,
      );
      expect((await as(person, "delete", "/events/del-guard")).status).toBe(
        403,
      );
      expect((await as(rival, "delete", "/events/del-guard")).status).toBe(403);
      expect((await as(host, "delete", "/events/no-such")).status).toBe(404);
      expect(await Event.exists({ uid: "del-guard" })).not.toBeNull();
    });
  });

  it("cannot cancel a draft, since it was never published", async () => {
    const host = await signupHost();
    await draft(host, "cancel-draft").expect(201);

    const res = await as(host, "post", "/events/cancel-draft/cancel");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "A draft has not been published, so there is nothing to cancel. Delete it instead.",
    );
  });
});
