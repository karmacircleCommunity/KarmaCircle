import mongoose from "mongoose";
import request from "supertest";
import { buildTestApp } from "./helpers/test-app";
import {
  DAY_MS,
  MEETING_LINK,
  eventApi,
  eventBody,
  eventTimes,
  venue,
} from "./helpers/events";
import { Event, EventRegistration } from "../src/modules/events/event.model";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOrganizationSetupReminder: jest.fn().mockResolvedValue(true),
  sendEventJoinConfirmation: jest.fn().mockResolvedValue(true),
  sendEventJoinOrganizerNotice: jest.fn().mockResolvedValue(true),
  sendEventInvitation: jest.fn().mockResolvedValue(true),
  sendEventCancellations: jest.fn().mockResolvedValue(1),
  sendEventUpdates: jest.fn().mockResolvedValue(1),
  sendEventDecline: jest.fn().mockResolvedValue(true),
  sendEventRequestOrganizerNotice: jest.fn().mockResolvedValue(true),
}));

const app = buildTestApp();
const api = eventApi(app);

type Listed = { uid: string; platformLink?: string };

/** `uid` as a list response carries it. */
function row(res: request.Response, uid: string): Listed {
  const found = (res.body.data as Listed[]).find((event) => event.uid === uid);
  if (!found) throw new Error(`${uid} is not in the list`);
  return found;
}

function expectHidden(res: request.Response) {
  expect(res.status).toBe(200);
  expect(JSON.stringify(res.body)).not.toContain(MEETING_LINK);
  expect(JSON.stringify(res.body)).not.toContain("platformLink");
}

/**
 * One approval event with a single spot and the waitlist on, with a person in
 * every standing, plus another organization.
 */
async function seedEveryStanding(uid = "private-link") {
  const host = await api.signupHost();
  await api
    .create(host, uid, {
      access: "approval",
      capacity: 1,
      linkDelivery: "We email it the day before",
      joinRequirements: "A working microphone",
    })
    .expect(201);

  const going = await api.signup("going@example.com", "Going Person");
  const pending = await api.signup("pending@example.com", "Pending Person");
  const declined = await api.signup("declined@example.com", "Declined Person");
  const waitlisted = await api.signup("waiting@example.com", "Waiting Person");

  await api.join(pending, uid).expect(201);
  await api.join(declined, uid).expect(201);
  await api.join(going, uid).expect(201);
  expect(
    (await api.decide(host, uid, "declined@example.com", "decline")).status,
  ).toBe(200);
  expect(
    (await api.decide(host, uid, "going@example.com", "approve")).status,
  ).toBe(200);
  // The one spot is taken, so this person is waitlisted.
  expect((await api.join(waitlisted, uid)).body.status).toBe("waitlisted");

  const stranger = await api.signup("stranger@example.com", "Stranger");
  const rival = await api.signupHost("rival@example.com", "Rival Org");
  const handle = (await api.stored(uid)).organizerHandle!;

  return {
    uid,
    handle,
    host,
    going,
    outsiders: {
      "a signed-out visitor": undefined,
      "a signed-in person who did not join": stranger,
      "a pending person": pending,
      "a waitlisted person": waitlisted,
      "a declined person": declined,
      "another organization": rival,
    } as Record<string, string | undefined>,
  };
}

describe("Meeting link privacy", () => {
  it("never serializes the link unless it is asked for", async () => {
    const event = new Event({ uid: "plain", platformLink: MEETING_LINK });
    expect(event.toJSON()).not.toHaveProperty("platformLink");
    expect(JSON.stringify(event)).not.toContain(MEETING_LINK);
  });

  it("hides the link on every public read from everyone but the host and the people going", async () => {
    const { uid, handle, outsiders } = await seedEveryStanding();

    for (const cookie of Object.values(outsiders)) {
      for (const url of [
        `/events?uid=${uid}`,
        `/events?slug=${uid}`,
        "/events",
        "/events?period=upcoming&mode=Online&search=beach",
        `/events?host=${handle}`,
      ]) {
        expectHidden(await api.as(cookie, "get", url));
      }
    }
  });

  it("hides the link on My Events from pending, waitlisted and declined people", async () => {
    const { uid, outsiders } = await seedEveryStanding();

    for (const who of [
      "a pending person",
      "a waitlisted person",
      "a declined person",
    ]) {
      const mine = await api.as(outsiders[who], "get", "/events/mine");
      expect(row(mine, uid)).toBeDefined();
      expectHidden(mine);
    }
  });

  it("keeps the platform and the joining notes public", async () => {
    const { uid } = await seedEveryStanding();

    const res = await request(app).get(`/events?uid=${uid}`);
    expect(res.body).toMatchObject({
      platform: "Zoom Meeting",
      linkDelivery: "We email it the day before",
      joinRequirements: "A working microphone",
    });
  });

  it.each(["host", "going"] as const)(
    "shows the link to the %s",
    async (who) => {
      const seeded = await seedEveryStanding();
      const { uid, handle } = seeded;
      const cookie = seeded[who];

      for (const url of [`/events?uid=${uid}`, `/events?slug=${uid}`]) {
        expect((await api.as(cookie, "get", url)).body.platformLink).toBe(
          MEETING_LINK,
        );
      }
      for (const url of ["/events", `/events?host=${handle}`]) {
        expect(row(await api.as(cookie, "get", url), uid).platformLink).toBe(
          MEETING_LINK,
        );
      }
      if (who === "going") {
        const mine = await api.as(cookie, "get", "/events/mine");
        expect(row(mine, uid).platformLink).toBe(MEETING_LINK);
        expect(row(mine, uid)).toHaveProperty("registrationStatus", "going");
      }
    },
  );

  it("keeps the request counts on the host's own list beside the link", async () => {
    const { uid, handle, host } = await seedEveryStanding();

    const listed = row(
      await api.as(host, "get", `/events?host=${handle}`),
      uid,
    );
    expect(listed).toMatchObject({
      platformLink: MEETING_LINK,
      requestCount: 2,
    });
  });

  it("shows a link only for the events the person is going to", async () => {
    const host = await api.signupHost();
    await api.create(host, "joined-one").expect(201);
    await api
      .create(host, "other-one", { mode: "Hybrid", ...venue })
      .expect(201);
    const person = await api.signup("person@example.com", "Person");
    await api.join(person, "joined-one").expect(201);

    const list = await api.as(person, "get", "/events");
    expect(row(list, "joined-one").platformLink).toBe(MEETING_LINK);
    expect(row(list, "other-one")).not.toHaveProperty("platformLink");
  });

  it("counts a registration saved before statuses existed as going", async () => {
    const host = await api.signupHost();
    await api.create(host, "legacy-going").expect(201);
    const person = await api.signup("legacy@example.com", "Legacy Person");
    await api.join(person, "legacy-going").expect(201);
    await EventRegistration.collection.updateMany(
      {},
      { $unset: { status: 1 } },
    );

    const res = await api.as(person, "get", "/events?uid=legacy-going");
    expect(res.body.platformLink).toBe(MEETING_LINK);
  });

  it("takes the link away again when the person leaves or is removed", async () => {
    const host = await api.signupHost();
    await api.create(host, "come-and-go").expect(201);
    const leaver = await api.signup("leaver@example.com", "Leaver");
    const removed = await api.signup("removed@example.com", "Removed");
    await api.join(leaver, "come-and-go").expect(201);
    await api.join(removed, "come-and-go").expect(201);

    await api
      .as(leaver, "delete", "/events/come-and-go/registration")
      .expect(200);
    await api.decide(host, "come-and-go", "removed@example.com", "decline");

    for (const cookie of [leaver, removed]) {
      expectHidden(await api.as(cookie, "get", "/events?uid=come-and-go"));
    }
  });

  it("treats a signed-out session's old cookie as a visitor", async () => {
    const host = await api.signupHost();
    await api.create(host, "old-cookie").expect(201);
    await api.as(host, "get", "/auth/logout");

    expectHidden(await api.as(host, "get", "/events?uid=old-cookie"));
  });

  it("matches a legacy event to its host by hostUsername", async () => {
    const host = await api.signupHost();
    await api.create(host, "legacy-host").expect(201);
    await Event.collection.updateOne(
      { uid: "legacy-host" },
      { $unset: { organizerHandle: 1 } },
    );

    const res = await api.as(host, "get", "/events?uid=legacy-host");
    expect(res.body.platformLink).toBe(MEETING_LINK);
  });

  it("hides the link from someone invited who has not joined, then shows it", async () => {
    const host = await api.signupHost();
    await api.create(host, "invite-link", { access: "invite" }).expect(201);
    await api
      .as(host, "post", "/events/invite-link/invites")
      .send({ emails: ["guest@example.com"] })
      .expect(201);
    const guest = await api.signup("guest@example.com", "Guest");

    const invitations = await api.as(guest, "get", "/events/invitations");
    expect(row(invitations, "invite-link")).toBeDefined();
    expectHidden(invitations);

    await api.join(guest, "invite-link").expect(201);
    const after = await api.as(guest, "get", "/events?uid=invite-link");
    expect(after.body.platformLink).toBe(MEETING_LINK);
  });

  it("shows an organization its own link on its invitations too", async () => {
    // An organization can invite its own address; it hosts the event, so the
    // link is its to see.
    const host = await api.signupHost();
    await api.create(host, "self-invite").expect(201);
    await api
      .as(host, "post", "/events/self-invite/invites")
      .send({ emails: ["host@example.com"] })
      .expect(201);

    const res = await api.as(host, "get", "/events/invitations");
    expect(row(res, "self-invite").platformLink).toBe(MEETING_LINK);
  });

  it("returns the link in every response to the host's own changes", async () => {
    const host = await api.signupHost();
    const created = await api.create(host, "host-writes", { status: "draft" });
    expect(created.body.savedEvent.platformLink).toBe(MEETING_LINK);

    const edited = await api.patch(host, "host-writes", {
      name: "A renamed clean-up drive",
    });
    expect(edited.body.event.platformLink).toBe(MEETING_LINK);

    for (const action of ["publish", "unpublish", "publish", "cancel"]) {
      const res = await api.as(host, "post", `/events/host-writes/${action}`);
      expect(res.status).toBe(200);
      expect(res.body.event.platformLink).toBe(MEETING_LINK);
    }
  });

  it("never puts the link on the organization dashboard", async () => {
    const host = await api.signupHost();
    await api.create(host, "dash-link").expect(201);

    const res = await api.as(host, "get", "/organizations/dashboard");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(MEETING_LINK);
  });

  it("costs the same number of queries for one event as for many", async () => {
    const host = await api.signupHost();
    const person = await api.signup("busy@example.com", "Busy Person");
    const addJoinedEvent = async (uid: string) => {
      await Event.create({
        ...eventBody(uid, eventTimes(DAY_MS)),
        hostUsername: "someone",
        hostName: "Someone",
        organizerHandle: "someone",
      });
      await api.join(person, uid).expect(201);
    };
    const countQueries = async (url: string, cookie: string) => {
      let queries = 0;
      mongoose.set("debug", () => {
        queries += 1;
      });
      try {
        await api.as(cookie, "get", url).expect(200);
      } finally {
        mongoose.set("debug", false);
      }
      return queries;
    };

    await addJoinedEvent("count-1");
    const urls = ["/events", "/events/mine", "/events/invitations"];
    const one: number[] = [];
    for (const url of urls) one.push(await countQueries(url, person));
    const hostOne = await countQueries("/events", host);

    for (let n = 2; n <= 8; n += 1) await addJoinedEvent(`count-${n}`);
    const many: number[] = [];
    for (const url of urls) many.push(await countQueries(url, person));

    expect(one[0]).toBeGreaterThan(0);
    expect(many).toEqual(one);
    expect(await countQueries("/events", host)).toBe(hostOne);
  });
});
