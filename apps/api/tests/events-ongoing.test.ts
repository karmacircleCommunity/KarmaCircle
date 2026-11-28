import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import { DAY_MS, HOUR_MS, eventApi } from "./helpers/events";
import {
  Event,
  EventInvite,
  EventRegistration,
} from "../src/modules/events/event.model";
import { User } from "../src/modules/users/user.model";

const app = buildTestApp();
const api = eventApi(app);

/** Written through the model: the create route refuses a past start. */
async function seed(uid: string, startsInMs: number, endsInMs: number) {
  const startTime = new Date(Date.now() + startsInMs);
  const endTime = new Date(Date.now() + endsInMs);
  await Event.create({
    uid,
    name: `Event ${uid}`,
    description: "A fixture for the upcoming and past split",
    hostUsername: "seed-host",
    hostName: "Seed Host",
    organizerHandle: "seed-host",
    mode: "Online",
    startTime,
    endTime,
    startDate: startTime,
    endDate: endTime,
  });
}

const uidsOf = (res: request.Response) =>
  res.body.data.map((event: { uid: string }) => event.uid);

describe("An event that is running", () => {
  beforeEach(async () => {
    await seed("ended-long-ago", -3 * DAY_MS, -3 * DAY_MS + HOUR_MS);
    // Started before `running` did, but has ended.
    await seed("just-ended", -2 * HOUR_MS, -1_000);
    // A three-day event in its second day.
    await seed("long-running", -DAY_MS, 2 * DAY_MS);
    await seed("running", -HOUR_MS, HOUR_MS);
    await seed("ahead", DAY_MS, DAY_MS + HOUR_MS);
  });

  it.each(["/events", "/events?host=seed-host"])(
    "is upcoming on %s until it ends, ordered by start time",
    async (url) => {
      const join = url.includes("?") ? "&" : "?";
      const upcoming = await request(app).get(`${url}${join}period=upcoming`);
      expect(uidsOf(upcoming)).toEqual(["long-running", "running", "ahead"]);
      expect(upcoming.body.pagination.total).toBe(3);

      const past = await request(app).get(`${url}${join}period=past`);
      expect(uidsOf(past)).toEqual(["just-ended", "ended-long-ago"]);
      expect(past.body.pagination.total).toBe(2);
    },
  );

  it("splits My Events the same way", async () => {
    const cookie = await api.signup("goer@example.com", "Goer");
    const user = (await User.findOne({ email: "goer@example.com" }))!;
    for (const uid of [
      "ended-long-ago",
      "just-ended",
      "long-running",
      "running",
      "ahead",
    ]) {
      await EventRegistration.create({
        eventUid: uid,
        userId: user._id,
        attendeeEmail: user.email,
        attendeeName: "Goer",
      });
    }

    const upcoming = await api.as(cookie, "get", "/events/mine");
    expect(uidsOf(upcoming)).toEqual(["long-running", "running", "ahead"]);
    const past = await api.as(cookie, "get", "/events/mine?period=past");
    expect(uidsOf(past)).toEqual(["just-ended", "ended-long-ago"]);
  });

  it("is still closed to joining and leaving once it has started", async () => {
    const cookie = await api.signup("late@example.com", "Late Person");

    const joined = await api.join(cookie, "running");
    expect(joined.status).toBe(409);
    expect(joined.body.message).toBe("This event has already started.");

    const user = (await User.findOne({ email: "late@example.com" }))!;
    await EventRegistration.create({
      eventUid: "running",
      userId: user._id,
      attendeeEmail: user.email,
      attendeeName: "Late Person",
    });
    const left = await api.as(cookie, "delete", "/events/running/registration");
    expect(left.status).toBe(409);
  });

  it("is no longer on the invitations list, which closes at the start", async () => {
    const cookie = await api.signup("guest@example.com", "Guest");
    for (const uid of ["running", "ahead"]) {
      await EventInvite.create({
        eventUid: uid,
        email: "guest@example.com",
        invitedBy: "host@example.com",
      });
    }

    const res = await api.as(cookie, "get", "/events/invitations");
    expect(uidsOf(res)).toEqual(["ahead"]);
  });

  it("lists an invitation to an event saved before it had a status", async () => {
    const cookie = await api.signup("guest@example.com", "Guest");
    await Event.collection.updateOne(
      { uid: "ahead" },
      { $unset: { status: 1 } },
    );
    await EventInvite.create({
      eventUid: "ahead",
      email: "guest@example.com",
      invitedBy: "host@example.com",
    });

    const res = await api.as(cookie, "get", "/events/invitations");
    expect(uidsOf(res)).toEqual(["ahead"]);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
