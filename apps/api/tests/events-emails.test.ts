import { buildTestApp } from "./helpers/test-app";
import { DAY_MS, HOUR_MS, eventApi, eventTimes, venue } from "./helpers/events";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import {
  EventRecipient,
  sendEventCancellations,
  sendEventDecline,
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
  sendEventRequestOrganizerNotice,
  sendEventUpdates,
} from "../src/config/mailer";

jest.mock("../src/config/mailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendOrganizationSetupReminder: jest.fn().mockResolvedValue(true),
  sendEventJoinConfirmation: jest.fn(),
  sendEventJoinOrganizerNotice: jest.fn(),
  sendEventInvitation: jest.fn(),
  sendEventCancellations: jest.fn(),
  sendEventUpdates: jest.fn(),
  sendEventDecline: jest.fn(),
  sendEventRequestOrganizerNotice: jest.fn(),
}));

const app = buildTestApp();
const api = eventApi(app);

const singleSends = [
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
  sendEventDecline,
  sendEventRequestOrganizerNotice,
].map((send) => jest.mocked(send));
const batchedSends = [sendEventCancellations, sendEventUpdates].map((send) =>
  jest.mocked(send),
);
const mocks = [...singleSends, ...batchedSends];

beforeEach(() => {
  for (const send of singleSends) send.mockReset().mockResolvedValue(true);
  for (const send of batchedSends) send.mockReset().mockResolvedValue(1);
});

/** Every address the batched sends were given, over all calls. */
const recipients = (
  send: typeof sendEventCancellations | typeof sendEventUpdates,
) =>
  jest
    .mocked(send)
    .mock.calls.flatMap((call) => call[0] as EventRecipient[])
    .map(({ email }) => email)
    .sort();

/**
 * An approval event with one spot: one person going, one pending, one
 * waitlisted and one declined.
 */
async function seed(uid = "mail-event", overrides = {}) {
  const host = await api.signupHost();
  await api
    .create(host, uid, { access: "approval", capacity: 1, ...overrides })
    .expect(201);
  const cookies: Record<string, string> = {};
  for (const who of ["going", "pending", "declined", "waiting"]) {
    cookies[who] = await api.signup(`${who}@example.com`, `${who} person`);
  }
  for (const who of ["going", "pending", "declined"]) {
    await api.join(cookies[who], uid).expect(201);
  }
  await api.decide(host, uid, "declined@example.com", "decline");
  await api.decide(host, uid, "going@example.com", "approve");
  await api.join(cookies.waiting, uid).expect(201);
  for (const send of mocks) send.mockClear();
  return { host, cookies, uid };
}

describe("Cancelling an event", () => {
  it("emails everyone going, pending or waitlisted, once each", async () => {
    const { host, uid } = await seed();

    await api.as(host, "post", `/events/${uid}/cancel`).expect(200);

    expect(recipients(sendEventCancellations)).toEqual([
      "going@example.com",
      "pending@example.com",
      "waiting@example.com",
    ]);
    expect(sendEventCancellations).toHaveBeenCalledTimes(1);
    expect(sendEventCancellations).toHaveBeenCalledWith(
      expect.arrayContaining([
        { email: "going@example.com", name: "going person" },
      ]),
      expect.objectContaining({ uid, status: "cancelled" }),
    );
  });

  it("includes a registration saved before statuses existed", async () => {
    const { host, uid } = await seed();
    await EventRegistration.collection.updateOne(
      { attendeeEmail: "going@example.com" },
      { $unset: { status: 1 } },
    );

    await api.as(host, "post", `/events/${uid}/cancel`).expect(200);
    expect(recipients(sendEventCancellations)).toContain("going@example.com");
  });

  it("sends nothing more for a second cancel, even a simultaneous one", async () => {
    const { host, uid } = await seed();

    const both = await Promise.all([
      api.as(host, "post", `/events/${uid}/cancel`),
      api.as(host, "post", `/events/${uid}/cancel`),
    ]);
    expect(both.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(sendEventCancellations).toHaveBeenCalledTimes(1);

    await api.as(host, "post", `/events/${uid}/cancel`).expect(409);
    expect(sendEventCancellations).toHaveBeenCalledTimes(1);
  });

  it("still cancels when the emails fail", async () => {
    const { host, uid } = await seed();
    jest
      .mocked(sendEventCancellations)
      .mockRejectedValueOnce(new Error("mail is down"));

    const res = await api.as(host, "post", `/events/${uid}/cancel`);

    expect(res.status).toBe(200);
    expect((await api.stored(uid)).status).toBe("cancelled");
  });

  it("hands a long list over in one go, for the mailer to batch", async () => {
    const host = await api.signupHost();
    await api.create(host, "big-event").expect(201);
    await EventRegistration.insertMany(
      Array.from({ length: 230 }, (_, i) => ({
        eventUid: "big-event",
        userId: new EventRegistration()._id,
        attendeeEmail: `many${i}@example.com`,
        attendeeName: `Many ${i}`,
        status: "going",
      })),
    );

    await api.as(host, "post", "/events/big-event/cancel").expect(200);

    expect(sendEventCancellations).toHaveBeenCalledTimes(1);
    expect(recipients(sendEventCancellations)).toHaveLength(230);
  });
});

describe("Editing a published event", () => {
  const none = { time: false, mode: false, venue: false, meetingLink: false };
  const later = () => eventTimes(3 * DAY_MS);

  it.each([
    ["a new start and end", later(), { time: true }],
    [
      "a new end time",
      { endTime: new Date(Date.now() + 2 * DAY_MS).toISOString() },
      { time: true },
    ],
    [
      "a new meeting link",
      { platformLink: "https://meet.example.com/new" },
      { meetingLink: true },
    ],
    [
      "a move to a venue",
      { mode: "Offline", ...venue },
      { mode: true, venue: true },
    ],
    [
      "a venue added beside the link",
      { mode: "Hybrid", ...venue },
      { mode: true, venue: true },
    ],
  ])("tells only the people going about %s", async (_label, body, changed) => {
    const { host, uid } = await seed();

    await api.patch(host, uid, body).expect(200);

    expect(recipients(sendEventUpdates)).toEqual(["going@example.com"]);
    expect(sendEventUpdates).toHaveBeenCalledWith(
      [{ email: "going@example.com", name: "going person" }],
      expect.objectContaining({ uid }),
      { ...none, ...changed },
    );
  });

  it.each(["address", "city", "state", "country"])(
    "tells the people going about a new %s",
    async (field) => {
      const { host, uid } = await seed("venue-event", {
        mode: "Offline",
        ...venue,
      });

      await api.patch(host, uid, { [field]: "Somewhere else" }).expect(200);

      expect(sendEventUpdates).toHaveBeenCalledWith(
        [{ email: "going@example.com", name: "going person" }],
        expect.anything(),
        { ...none, venue: true },
      );
    },
  );

  it("reports a hybrid event going online as a change of format only", async () => {
    const { host, uid } = await seed("hybrid-event", {
      mode: "Hybrid",
      ...venue,
    });

    await api.patch(host, uid, { mode: "Online" }).expect(200);
    expect(jest.mocked(sendEventUpdates).mock.calls[0][2]).toEqual({
      ...none,
      mode: true,
    });
  });

  it("says nothing when nothing an attendee plans around changed", async () => {
    const { host, uid } = await seed();
    const saved = await api.stored(uid);

    for (const body of [
      { name: "A renamed clean-up drive" },
      { description: "A different description of the same drive" },
      { coverImage: "https://example.com/other.png" },
      { platform: "Google Meet" },
      { capacity: 5 },
      { timezone: "Asia/Kolkata" },
      // Sent again, unchanged.
      {
        mode: saved.mode,
        platformLink: saved.platformLink,
        startTime: saved.startTime.toISOString(),
        endTime: saved.endTime.toISOString(),
      },
      // A venue field an online event ignores.
      { city: "Pune" },
    ]) {
      await api.patch(host, uid, body).expect(200);
    }
    expect(sendEventUpdates).not.toHaveBeenCalled();
  });

  it("ignores a difference of seconds", async () => {
    const start = new Date(Date.now() + DAY_MS);
    start.setSeconds(10, 0);
    const end = new Date(start.getTime() + 2 * HOUR_MS);
    const { host, uid } = await seed("seconds-event", {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });

    await api
      .patch(host, uid, {
        startTime: new Date(start.getTime() + 5_000).toISOString(),
      })
      .expect(200);
    expect(sendEventUpdates).not.toHaveBeenCalled();
  });

  it("says nothing about a draft, or an edit that was refused", async () => {
    const host = await api.signupHost();
    await api.create(host, "quiet-draft", { status: "draft" }).expect(201);
    await api.patch(host, "quiet-draft", later()).expect(200);

    await api.create(host, "refused-edit").expect(201);
    const person = await api.signup("person@example.com", "Person");
    await api.join(person, "refused-edit").expect(201);
    await api
      .patch(host, "refused-edit", { ...later(), platformLink: "" })
      .expect(400);

    expect(sendEventUpdates).not.toHaveBeenCalled();
  });

  it("still saves when the email fails", async () => {
    const { host, uid } = await seed();
    jest.mocked(sendEventUpdates).mockRejectedValue(new Error("mail is down"));

    const res = await api.patch(host, uid, {
      platformLink: "https://meet.example.com/new",
    });

    expect(res.status).toBe(200);
    expect(res.body.event.platformLink).toBe("https://meet.example.com/new");
  });
});

describe("Declining a person", () => {
  it.each([
    ["pending", false],
    ["waiting", false],
    ["going", true],
  ])("emails the %s person once", async (who, wasGoing) => {
    const { host, uid } = await seed();
    const email = `${who}@example.com`;

    await api.decide(host, uid, email, "decline");
    const again = await api.decide(host, uid, email, "decline");

    expect(again.status).toBe(200);
    expect(sendEventDecline).toHaveBeenCalledTimes(1);
    expect(sendEventDecline).toHaveBeenCalledWith(
      email,
      `${who} person`,
      expect.objectContaining({ uid }),
      wasGoing,
    );
  });

  it("says nothing when the person was already declined", async () => {
    const { host, uid } = await seed();
    await api.decide(host, uid, "declined@example.com", "decline");
    expect(sendEventDecline).not.toHaveBeenCalled();
  });

  it("says nothing when the decline is refused", async () => {
    const { host, uid } = await seed();
    await api
      .as(
        host,
        "post",
        `/events/${uid}/attendees/0123456789abcdef01234567/decline`,
      )
      .expect(404);
    expect(sendEventDecline).not.toHaveBeenCalled();
  });

  it("still declines when the email fails", async () => {
    const { host, uid } = await seed();
    jest.mocked(sendEventDecline).mockRejectedValue(new Error("mail is down"));

    const res = await api.decide(host, uid, "pending@example.com", "decline");

    expect(res.status).toBe(200);
    expect(res.body.attendee.status).toBe("declined");
  });
});

describe("A new request", () => {
  async function open(uid: string, overrides: Record<string, unknown>) {
    const host = await api.signupHost();
    await api.create(host, uid, overrides).expect(201);
    return {
      first: await api.signup("first@example.com", "First Person"),
      second: await api.signup("second@example.com", "Second Person"),
    };
  }

  it("emails the organizer about a pending request, once", async () => {
    const { first } = await open("ask", { access: "approval" });

    await api.join(first, "ask", { note: "Please" }).expect(201);
    await api.join(first, "ask").expect(200);

    expect(sendEventRequestOrganizerNotice).toHaveBeenCalledTimes(1);
    expect(sendEventRequestOrganizerNotice).toHaveBeenCalledWith(
      "host@example.com",
      expect.objectContaining({ uid: "ask" }),
      "First Person",
      "pending",
    );
    expect(sendEventJoinOrganizerNotice).not.toHaveBeenCalled();
    expect(sendEventJoinConfirmation).not.toHaveBeenCalled();
  });

  it.each(["open", "approval"])(
    "emails the organizer about the waitlist of a full %s event",
    async (access) => {
      const { first, second } = await open("full", { access, capacity: 1 });
      if (access === "approval") {
        // Fill the one spot, so the next person is waitlisted.
        await Event.updateOne({ uid: "full" }, { registrationCount: 1 });
      } else {
        await api.join(first, "full").expect(201);
        expect(sendEventRequestOrganizerNotice).not.toHaveBeenCalled();
      }

      await api.join(second, "full").expect(201);

      expect(sendEventRequestOrganizerNotice).toHaveBeenCalledTimes(1);
      expect(sendEventRequestOrganizerNotice).toHaveBeenCalledWith(
        "host@example.com",
        expect.anything(),
        "Second Person",
        "waitlisted",
      );
    },
  );

  it("sends no request notice for a person who goes straight in", async () => {
    const { first } = await open("straight", {});
    await api.join(first, "straight").expect(201);

    expect(sendEventRequestOrganizerNotice).not.toHaveBeenCalled();
    expect(sendEventJoinOrganizerNotice).toHaveBeenCalledTimes(1);
  });

  it("still saves the request when the notice fails", async () => {
    const { first } = await open("ask", { access: "approval" });
    jest
      .mocked(sendEventRequestOrganizerNotice)
      .mockRejectedValue(new Error("mail is down"));

    const res = await api.join(first, "ask");

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
  });
});

describe("What a join says about its confirmation email", () => {
  async function openEvent() {
    const host = await api.signupHost();
    await api.create(host, "confirm").expect(201);
    return api.signup("joiner@example.com", "Joiner Person");
  }

  it("reports an email that went out", async () => {
    const joiner = await openEvent();

    const res = await api.join(joiner, "confirm").expect(201);

    expect(res.body).toMatchObject({ emailSent: true, emailFailed: false });
  });

  it("reports a failed send, and keeps the registration", async () => {
    const joiner = await openEvent();
    jest
      .mocked(sendEventJoinConfirmation)
      .mockRejectedValue(new Error("mail is down"));

    const res = await api.join(joiner, "confirm").expect(201);

    expect(res.body).toMatchObject({
      joined: true,
      emailSent: false,
      emailFailed: true,
    });
  });

  it("does not call a send that was skipped a failure", async () => {
    // What the mailer answers outside production.
    const joiner = await openEvent();
    jest.mocked(sendEventJoinConfirmation).mockResolvedValue(false);

    const res = await api.join(joiner, "confirm").expect(201);

    expect(res.body).toMatchObject({ emailSent: false, emailFailed: false });
  });

  it("does not call a second join a failure", async () => {
    const joiner = await openEvent();
    await api.join(joiner, "confirm").expect(201);

    const res = await api.join(joiner, "confirm").expect(200);

    expect(res.body).toMatchObject({ emailSent: false, emailFailed: false });
  });
});
