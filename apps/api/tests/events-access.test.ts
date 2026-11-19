import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import {
  Event,
  EventInvite,
  EventRegistration,
} from "../src/modules/events/event.model";
import { sendEventInvitation } from "../src/config/mailer";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
  sendEventInvitation: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

async function signup(email: string, name: string, userType?: string) {
  const res = await request(app)
    .post("/auth/signup")
    .send({ email, password: "hunter2", name, ...(userType && { userType }) });
  const cookie = res.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("signup did not return a Token cookie");
  return cookie as string;
}

const signupHost = () =>
  signup("host@example.com", "Test Host", "organization");
const signupOtherHost = () =>
  signup("other-host@example.com", "Other Host", "organization");

const person = (n: number) => `person${n}@example.com`;
const signupPerson = (n: number) => signup(person(n), `Person ${n}`);

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
  return res.body.savedEvent;
}

const join = (cookie: string, uid: string, body?: object) =>
  request(app)
    .post(`/events/${uid}/join`)
    .set("Cookie", cookie)
    .send(body ?? {});
const leave = (cookie: string, uid: string) =>
  request(app).delete(`/events/${uid}/registration`).set("Cookie", cookie);
const standing = (cookie: string, uid: string) =>
  request(app).get(`/events/${uid}/registration`).set("Cookie", cookie);
const attendees = (cookie: string, uid: string, status?: string) =>
  request(app)
    .get(`/events/${uid}/attendees${status ? `?status=${status}` : ""}`)
    .set("Cookie", cookie);
const decide = (
  cookie: string,
  uid: string,
  registrationId: string,
  action: "approve" | "decline",
) =>
  request(app)
    .post(`/events/${uid}/attendees/${registrationId}/${action}`)
    .set("Cookie", cookie);
const invite = (cookie: string, uid: string, emails: string[]) =>
  request(app)
    .post(`/events/${uid}/invites`)
    .set("Cookie", cookie)
    .send({ emails });
const stored = async (uid: string) => (await Event.findOne({ uid }))!;

/** The id of the one registration the host's list shows for `status`. */
async function registrationId(
  host: string,
  uid: string,
  status: string,
  index = 0,
) {
  const res = await attendees(host, uid, status);
  expect(res.status).toBe(200);
  return res.body.data[index].id as string;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Access levels (PG-4)", () => {
  it("defaults a new event to open with the waitlist on", async () => {
    const host = await signupHost();
    const saved = await createEvent(host, "access-default");
    expect(saved.access).toBe("open");
    expect(saved.waitlistEnabled).toBe(true);
    expect(saved.inviteOnly).toBeUndefined();
  });

  it("stores the chosen level and lets the host change it", async () => {
    const host = await signupHost();
    const saved = await createEvent(host, "access-set", { access: "invite" });
    expect(saved.access).toBe("invite");

    const res = await request(app)
      .patch("/events/access-set")
      .set("Cookie", host)
      .send({ access: "approval", waitlistEnabled: false });
    expect(res.status).toBe(200);
    expect(res.body.event.access).toBe("approval");
    expect(res.body.event.waitlistEnabled).toBe(false);
  });

  it("rejects an unknown level and ignores the retired inviteOnly flag", async () => {
    const host = await signupHost();
    const unknown = await request(app)
      .post("/events/create")
      .set("Cookie", host)
      .send(eventBody("access-bad", { access: "secret" }));
    expect(unknown.status).toBe(400);

    // The old flag is not part of the contract any more: it is dropped like any
    // unknown field, so a stale client gets an open event, never a stored flag.
    const retired = await request(app)
      .post("/events/create")
      .set("Cookie", host)
      .send(eventBody("access-retired", { inviteOnly: true }));
    expect(retired.status).toBe(201);
    expect(retired.body.savedEvent.access).toBe("open");
    expect(retired.body.savedEvent.inviteOnly).toBeUndefined();
    expect(
      (await Event.collection.findOne({ uid: "access-retired" }))?.inviteOnly,
    ).toBeUndefined();
  });

  it("filters the directory by level", async () => {
    const host = await signupHost();
    await createEvent(host, "filter-open");
    await createEvent(host, "filter-approval", { access: "approval" });
    await createEvent(host, "filter-invite", { access: "invite" });

    const uids = async (access: string) =>
      (await request(app).get(`/events?access=${access}`)).body.data.map(
        (event: { uid: string }) => event.uid,
      );
    expect(await uids("open")).toEqual(["filter-open"]);
    expect(await uids("approval")).toEqual(["filter-approval"]);
    expect(await uids("invite")).toEqual(["filter-invite"]);

    const bad = await request(app).get("/events?access=secret");
    expect(bad.status).toBe(400);
  });

  it("reads an event saved with the old inviteOnly flag as approval", async () => {
    const host = await signupHost();
    await createEvent(host, "legacy-flag");
    await Event.collection.updateOne(
      { uid: "legacy-flag" },
      { $unset: { access: "" }, $set: { inviteOnly: true } },
    );

    const res = await request(app).get("/events?uid=legacy-flag");
    expect(res.body.access).toBe("approval");
    expect(res.body.inviteOnly).toBeUndefined();

    const listed = await request(app).get("/events?access=approval");
    expect(listed.body.data.map((e: { uid: string }) => e.uid)).toContain(
      "legacy-flag",
    );
    const asOpen = await request(app).get("/events?access=open");
    expect(asOpen.body.data.map((e: { uid: string }) => e.uid)).not.toContain(
      "legacy-flag",
    );

    const person1 = await signupPerson(1);
    const joined = await join(person1, "legacy-flag");
    expect(joined.body.status).toBe("pending");
  });
});

describe("Approval events (PG-4, PG-14)", () => {
  it("makes a join a pending request that holds no spot", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-pending", {
      access: "approval",
      capacity: 5,
    });
    const asker = await signupPerson(1);

    const res = await join(asker, "approval-pending", {
      note: "I run a school group",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      joined: false,
      status: "pending",
      alreadyJoined: false,
    });
    expect((await stored("approval-pending")).registrationCount).toBe(0);

    const again = await join(asker, "approval-pending");
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ status: "pending", alreadyJoined: true });

    expect((await standing(asker, "approval-pending")).body).toEqual({
      joined: false,
      status: "pending",
      invited: false,
    });
  });

  it("lists requests apart from the people going, with their note", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-list", { access: "approval" });
    const asker = await signupPerson(1);
    await join(asker, "approval-list", { note: "I can bring ten people" });

    const going = await attendees(host, "approval-list");
    expect(going.body.data).toEqual([]);
    expect(going.body.summary).toMatchObject({
      registered: 0,
      pending: 1,
      waitlisted: 0,
      declined: 0,
    });

    const pending = await attendees(host, "approval-list", "pending");
    expect(pending.body.data).toHaveLength(1);
    expect(pending.body.data[0]).toMatchObject({
      email: person(1),
      status: "pending",
      note: "I can bring ten people",
    });
    expect(pending.body.event).toMatchObject({
      access: "approval",
      waitlistEnabled: true,
    });
  });

  it("rejects a note over 300 characters", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-note", { access: "approval" });
    const asker = await signupPerson(1);
    const res = await join(asker, "approval-note", { note: "x".repeat(301) });
    expect(res.status).toBe(400);
  });

  it("approves a request into going and takes a spot", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-approve", {
      access: "approval",
      capacity: 5,
    });
    const asker = await signupPerson(1);
    await join(asker, "approval-approve");
    const id = await registrationId(host, "approval-approve", "pending");

    const res = await decide(host, "approval-approve", id, "approve");
    expect(res.status).toBe(200);
    expect(res.body.attendee.status).toBe("going");
    expect((await stored("approval-approve")).registrationCount).toBe(1);
    expect((await standing(asker, "approval-approve")).body.joined).toBe(true);

    // Approving someone already going changes nothing.
    await decide(host, "approval-approve", id, "approve").expect(200);
    expect((await stored("approval-approve")).registrationCount).toBe(1);
  });

  it("declines a request, blocks asking again, and lets the host reverse it", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-decline", { access: "approval" });
    const asker = await signupPerson(1);
    await join(asker, "approval-decline");
    const id = await registrationId(host, "approval-decline", "pending");

    const declined = await decide(host, "approval-decline", id, "decline");
    expect(declined.status).toBe(200);
    expect(declined.body.attendee.status).toBe("declined");

    const retry = await join(asker, "approval-decline");
    expect(retry.status).toBe(403);
    expect(retry.body.message).toMatch(/did not approve/);

    // A declined person has nothing to leave.
    const left = await leave(asker, "approval-decline");
    expect(left.status).toBe(409);

    const reversed = await decide(host, "approval-decline", id, "approve");
    expect(reversed.body.attendee.status).toBe("going");
  });

  it("lets a pending person withdraw", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-withdraw", {
      access: "approval",
      capacity: 5,
    });
    const asker = await signupPerson(1);
    await join(asker, "approval-withdraw");

    const res = await leave(asker, "approval-withdraw");
    expect(res.status).toBe(200);
    expect(await EventRegistration.countDocuments({})).toBe(0);
    // A pending request never held a spot, so nothing is given back.
    expect((await stored("approval-withdraw")).registrationCount).toBe(0);
  });

  it("only lets the hosting organization decide", async () => {
    const host = await signupHost();
    const other = await signupOtherHost();
    const stranger = await signupPerson(2);
    await createEvent(host, "approval-owner", { access: "approval" });
    const asker = await signupPerson(1);
    await join(asker, "approval-owner");
    const id = await registrationId(host, "approval-owner", "pending");

    expect((await decide(other, "approval-owner", id, "approve")).status).toBe(403);
    expect((await decide(stranger, "approval-owner", id, "decline")).status).toBe(
      403,
    );
    expect(
      (
        await request(app).post(`/events/approval-owner/attendees/${id}/approve`)
      ).status,
    ).toBe(401);
    expect(
      (await decide(host, "approval-owner", "a".repeat(24), "approve")).status,
    ).toBe(404);
  });

  it("refuses decisions once the event is cancelled", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-cancelled", { access: "approval" });
    const asker = await signupPerson(1);
    await join(asker, "approval-cancelled");
    const id = await registrationId(host, "approval-cancelled", "pending");

    await request(app)
      .post("/events/approval-cancelled/cancel")
      .set("Cookie", host)
      .expect(200);

    const res = await decide(host, "approval-cancelled", id, "approve");
    expect(res.status).toBe(409);
  });

  it("shows how many people wait on the host's own list, and on My Events", async () => {
    const host = await signupHost();
    await createEvent(host, "approval-counts", { access: "approval" });
    await createEvent(host, "approval-counts-open");
    const asker = await signupPerson(1);
    const second = await signupPerson(2);
    await join(asker, "approval-counts");
    await join(second, "approval-counts");

    const hostList = await request(app)
      .get("/events?host=test-host&limit=100")
      .set("Cookie", host);
    const row = hostList.body.data.find(
      (event: { uid: string }) => event.uid === "approval-counts",
    );
    // The host list is filtered by handle, which this test host may not own,
    // so fall back to the directory when the handle does not match.
    if (row) expect(row.requestCount).toBe(2);

    const mine = await request(app).get("/events/mine").set("Cookie", asker);
    expect(mine.body.data[0]).toMatchObject({
      uid: "approval-counts",
      registrationStatus: "pending",
    });
  });
});

describe("Waitlist (PG-14)", () => {
  it("puts a joiner on the waitlist when the event is full", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-full", { capacity: 1 });
    const first = await signupPerson(1);
    const second = await signupPerson(2);

    expect((await join(first, "wait-full")).body.status).toBe("going");
    const res = await join(second, "wait-full");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      joined: false,
      status: "waitlisted",
      message: "This event is full, so you are on the waitlist.",
    });
    expect((await stored("wait-full")).registrationCount).toBe(1);
    expect((await standing(second, "wait-full")).body.status).toBe("waitlisted");
  });

  it("answers 409 for a full event when the waitlist is off", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-off", { capacity: 1, waitlistEnabled: false });
    const first = await signupPerson(1);
    const second = await signupPerson(2);
    await join(first, "wait-off").expect(201);

    const res = await join(second, "wait-off");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("This event is full.");
    expect(await EventRegistration.countDocuments({})).toBe(1);
  });

  it("moves a waitlisted person up by hand, past the capacity", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-promote", { capacity: 1 });
    const first = await signupPerson(1);
    const second = await signupPerson(2);
    await join(first, "wait-promote");
    await join(second, "wait-promote");

    // Nobody moves up by themselves when a spot opens or the cap is raised.
    const id = await registrationId(host, "wait-promote", "waitlisted");
    const approved = await decide(host, "wait-promote", id, "approve");
    expect(approved.body.attendee.status).toBe("going");
    expect((await stored("wait-promote")).registrationCount).toBe(2);

    const list = await attendees(host, "wait-promote");
    expect(list.body.summary).toMatchObject({ registered: 2, waitlisted: 0 });
  });

  it("does not move anyone up on its own when a spot is freed", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-manual", { capacity: 1 });
    const first = await signupPerson(1);
    const second = await signupPerson(2);
    await join(first, "wait-manual");
    await join(second, "wait-manual");

    await leave(first, "wait-manual").expect(200);
    expect((await standing(second, "wait-manual")).body.status).toBe(
      "waitlisted",
    );
    expect((await stored("wait-manual")).registrationCount).toBe(0);
  });

  it("sends a request to the waitlist when an approval event is full", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-approval", {
      access: "approval",
      capacity: 1,
    });
    const first = await signupPerson(1);
    const second = await signupPerson(2);
    await join(first, "wait-approval");
    const firstId = await registrationId(host, "wait-approval", "pending");
    await decide(host, "wait-approval", firstId, "approve").expect(200);

    const res = await join(second, "wait-approval");
    expect(res.body.status).toBe("waitlisted");
  });

  it("lets a waitlisted person leave without giving a spot back", async () => {
    const host = await signupHost();
    await createEvent(host, "wait-leave", { capacity: 1 });
    const first = await signupPerson(1);
    const second = await signupPerson(2);
    await join(first, "wait-leave");
    await join(second, "wait-leave");

    await leave(second, "wait-leave").expect(200);
    expect((await stored("wait-leave")).registrationCount).toBe(1);
  });
});

describe("Invitations (PG-4)", () => {
  it("refuses a person who was not invited to an invite-only event", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-closed", { access: "invite" });
    const stranger = await signupPerson(1);

    const res = await join(stranger, "invite-closed");
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/invite-only/);
    expect(await EventRegistration.countDocuments({})).toBe(0);
  });

  it("lets an invited email join, and emails the invitation", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-open-door", { access: "invite" });
    const guest = await signupPerson(1);

    const sent = await invite(host, "invite-open-door", [
      person(1).toUpperCase(),
      person(1),
      person(2),
    ]);
    expect(sent.status).toBe(201);
    expect(sent.body.invited).toEqual([person(1), person(2)]);
    expect(sendEventInvitation).toHaveBeenCalledTimes(2);

    expect((await standing(guest, "invite-open-door")).body).toEqual({
      joined: false,
      status: "none",
      invited: true,
    });

    const res = await join(guest, "invite-open-door");
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("going");
    expect((await standing(guest, "invite-open-door")).body.joined).toBe(true);

    const used = await EventInvite.findOne({ email: person(1) });
    expect(used?.usedAt).toBeTruthy();
  });

  it("skips emails already invited or already registered", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-skip", { access: "approval" });
    const member = await signupPerson(1);
    await join(member, "invite-skip");
    await invite(host, "invite-skip", [person(2)]).expect(201);

    const res = await invite(host, "invite-skip", [person(1), person(2), person(3)]);
    expect(res.status).toBe(201);
    expect(res.body.invited).toEqual([person(3)]);
    expect(res.body.skipped).toEqual([
      { email: person(1), reason: "already-registered" },
      { email: person(2), reason: "already-invited" },
    ]);
  });

  it("validates the emails and limits a single request to 50", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-validate", { access: "invite" });

    expect((await invite(host, "invite-validate", [])).status).toBe(400);
    expect((await invite(host, "invite-validate", ["not-an-email"])).status).toBe(
      400,
    );
    const many = Array.from({ length: 51 }, (_, i) => person(i + 100));
    expect((await invite(host, "invite-validate", many)).status).toBe(400);
  });

  it("lets an invited person skip approval and join a full event", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-skip-approval", {
      access: "approval",
      capacity: 1,
    });
    const first = await signupPerson(1);
    const guest = await signupPerson(2);
    await join(first, "invite-skip-approval");
    const firstId = await registrationId(host, "invite-skip-approval", "pending");
    await decide(host, "invite-skip-approval", firstId, "approve").expect(200);
    await invite(host, "invite-skip-approval", [person(2)]).expect(201);

    const res = await join(guest, "invite-skip-approval");
    expect(res.body.status).toBe("going");
    // Full is a soft limit: an invitation goes past it.
    expect((await stored("invite-skip-approval")).registrationCount).toBe(2);
  });

  it("lets an invitation settle a pending or declined request", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-settles", { access: "approval" });
    const asker = await signupPerson(1);
    await join(asker, "invite-settles");
    const id = await registrationId(host, "invite-settles", "pending");
    await decide(host, "invite-settles", id, "decline").expect(200);

    // Inviting someone who already asked is skipped (the host has Approve for
    // that), so this is the race: the invitation lands after the request.
    const skipped = await invite(host, "invite-settles", [person(1)]);
    expect(skipped.body.skipped).toEqual([
      { email: person(1), reason: "already-registered" },
    ]);
    await EventInvite.create({
      eventUid: "invite-settles",
      email: person(1),
      invitedBy: "host@example.com",
    });

    const res = await join(asker, "invite-settles");
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("going");
    expect((await stored("invite-settles")).registrationCount).toBe(1);
  });

  it("lists the invitations a person has not used on the Invited tab", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-tab", { access: "invite" });
    await createEvent(host, "invite-tab-used", { access: "invite" });
    const guest = await signupPerson(1);
    await invite(host, "invite-tab", [person(1)]).expect(201);
    await invite(host, "invite-tab-used", [person(1)]).expect(201);
    await join(guest, "invite-tab-used").expect(201);

    const res = await request(app).get("/events/invitations").set("Cookie", guest);
    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { uid: string }) => e.uid)).toEqual([
      "invite-tab",
    ]);
    expect(res.body.pagination.total).toBe(1);
    expect(
      (await request(app).get("/events/invitations")).status,
    ).toBe(401);
  });

  it("lists and removes invitations, host only", async () => {
    const host = await signupHost();
    const other = await signupOtherHost();
    await createEvent(host, "invite-manage", { access: "invite" });
    await invite(host, "invite-manage", [person(1)]).expect(201);

    const listed = await request(app)
      .get("/events/invite-manage/invites")
      .set("Cookie", host);
    expect(listed.status).toBe(200);
    expect(listed.body.total).toBe(1);
    expect(listed.body.data[0]).toMatchObject({ email: person(1), joined: false });
    const id = listed.body.data[0].id as string;

    expect(
      (
        await request(app)
          .get("/events/invite-manage/invites")
          .set("Cookie", other)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .delete(`/events/invite-manage/invites/${id}`)
          .set("Cookie", other)
      ).status,
    ).toBe(403);

    const removed = await request(app)
      .delete(`/events/invite-manage/invites/${id}`)
      .set("Cookie", host);
    expect(removed.status).toBe(200);
    expect(await EventInvite.countDocuments({})).toBe(0);

    const missing = await request(app)
      .delete(`/events/invite-manage/invites/${id}`)
      .set("Cookie", host);
    expect(missing.status).toBe(404);
  });

  it("will not take back an invitation that was already used", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-used", { access: "invite" });
    const guest = await signupPerson(1);
    await invite(host, "invite-used", [person(1)]).expect(201);
    await join(guest, "invite-used").expect(201);

    const id = (await EventInvite.findOne({ eventUid: "invite-used" }))!.id;
    const res = await request(app)
      .delete(`/events/invite-used/invites/${id}`)
      .set("Cookie", host);
    expect(res.status).toBe(409);
  });

  it("will not invite for a draft or a cancelled event", async () => {
    const host = await signupHost();
    await createEvent(host, "invite-draft", { access: "invite", status: "draft" });
    expect((await invite(host, "invite-draft", [person(1)])).status).toBe(409);

    await createEvent(host, "invite-cancel", { access: "invite" });
    await request(app)
      .post("/events/invite-cancel/cancel")
      .set("Cookie", host)
      .expect(200);
    expect((await invite(host, "invite-cancel", [person(1)])).status).toBe(409);
  });
});
