const mockSend = jest.fn().mockResolvedValue({ error: null });
const mockBatchSend = jest.fn().mockResolvedValue({ error: null });

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
    batch: { send: mockBatchSend },
  })),
}));

import { Resend } from "resend";
import { env } from "../src/config/env";
import {
  clearResetOutbox,
  getLastResetUrl,
  EMAIL_BATCH_SIZE,
  RATE_LIMIT_RETRY_DELAYS_MS,
  sendEventCancellations,
  sendEventDecline,
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
  sendEventRequestOrganizerNotice,
  sendEventUpdates,
  sendOrganizationSetupReminder,
  sendPasswordResetEmail,
} from "../src/config/mailer";
import type { IEvent } from "../src/modules/events/event.model";

const originalNodeEnv = env.NODE_ENV;
const mockResend = jest.mocked(Resend);

describe("mailer environment guard", () => {
  beforeEach(() => {
    env.NODE_ENV = "development";
    clearResetOutbox();
    mockResend.mockClear();
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it("captures reset links and suppresses event confirmations in development", async () => {
    const resetUrl = "http://localhost:3000/auth/reset-password/local-token";

    await sendPasswordResetEmail("random@example.test", resetUrl);
    const eventSent = await sendEventJoinConfirmation(
      "random@example.test",
      "Local Tester",
      { uid: "local-event", name: "Local Event" } as IEvent,
    );

    expect(getLastResetUrl("random@example.test")).toBe(resetUrl);
    expect(eventSent).toBe(false);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("suppresses the organizer join notice in development", async () => {
    const sent = await sendEventJoinOrganizerNotice(
      "host@example.test",
      { uid: "local-event", name: "Local Event" } as IEvent,
      "Local Tester",
    );

    expect(sent).toBe(false);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("constructs Resend and sends mail in production", async () => {
    env.NODE_ENV = "production";

    await sendPasswordResetEmail(
      "member@example.com",
      "https://karmacircle.org/auth/reset-password/production-token",
    );

    expect(mockResend).toHaveBeenCalledTimes(1);
  });

  it("sends the organizer join notice through Resend in production", async () => {
    env.NODE_ENV = "production";
    mockSend.mockClear();

    const sent = await sendEventJoinOrganizerNotice(
      "host@example.com",
      {
        uid: "big-drive",
        name: "Big <Drive>",
        capacity: 10,
        registrationCount: 4,
      } as IEvent,
      "Ann <b>Attendee</b>",
    );

    expect(sent).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const message = mockSend.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(message.to).toBe("host@example.com");
    expect(message.html).toContain("Ann &lt;b&gt;Attendee&lt;/b&gt;");
    expect(message.html).toContain("Big &lt;Drive&gt;");
    expect(message.html).toContain("4 of 10 places taken");
    expect(message.html).toContain("/organization/events/big-drive/attendees");
    expect(message.html).not.toContain("@example.com</");
  });

  it("suppresses the organization setup reminder outside production", async () => {
    const sent = await sendOrganizationSetupReminder(
      "org@example.test",
      "Helping Hands",
    );

    expect(sent).toBe(false);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("sends the organization setup reminder in production, escaped, with the setup link", async () => {
    env.NODE_ENV = "production";
    mockSend.mockClear();

    const sent = await sendOrganizationSetupReminder(
      "org@example.com",
      "Helping <Hands>",
    );

    expect(sent).toBe(true);
    const message = mockSend.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(message.to).toBe("org@example.com");
    expect(message.subject).toContain("Finish your KarmaCircle organization");
    expect(message.html).toContain("Helping &lt;Hands&gt;");
    expect(message.html).toContain("/organization/setup");
  });

  it("writes the join confirmation time in the event's own timezone when it has one", async () => {
    env.NODE_ENV = "production";
    mockSend.mockClear();

    await sendEventJoinConfirmation("ann@example.com", "Ann", {
      uid: "kolkata-event",
      name: "Kolkata Event",
      timezone: "Asia/Kolkata",
      startTime: new Date("2030-05-01T04:30:00.000Z"),
    } as IEvent);

    const html = (mockSend.mock.calls[0][0] as { html: string }).html;
    expect(html).toContain("10:00");
    expect(html).toContain("GMT+5:30");
    expect(html).not.toContain("UTC</p>");
  });

  it("still writes UTC for an event with no timezone, and survives a bad stored one", async () => {
    env.NODE_ENV = "production";

    mockSend.mockClear();
    await sendEventJoinConfirmation("ann@example.com", "Ann", {
      uid: "old-event",
      name: "Old Event",
      startTime: new Date("2030-05-01T04:30:00.000Z"),
    } as IEvent);
    expect((mockSend.mock.calls[0][0] as { html: string }).html).toContain(
      "4:30 AM UTC",
    );

    mockSend.mockClear();
    await sendEventJoinConfirmation("ann@example.com", "Ann", {
      uid: "odd-event",
      name: "Odd Event",
      timezone: "Mars/Base",
      startTime: new Date("2030-05-01T04:30:00.000Z"),
    } as IEvent);
    expect((mockSend.mock.calls[0][0] as { html: string }).html).toContain(
      "UTC",
    );
  });
});

describe("event change emails", () => {
  const event = {
    uid: "river-drive",
    name: "River <Drive>",
    hostName: "Helping & Hands",
    mode: "Hybrid",
    timezone: "Asia/Kolkata",
    startTime: new Date("2030-05-01T04:30:00.000Z"),
    endTime: new Date("2030-05-01T06:30:00.000Z"),
    address: "12 <River> Road",
    city: "Guwahati",
    state: "Assam",
    country: "India",
    platformLink: "https://zoom.example.com/j/secret-123",
  } as IEvent;
  const allChanges = {
    time: true,
    mode: true,
    venue: true,
    meetingLink: true,
  };
  const attendee = "Ann <b>Attendee</b>";
  const ann = [{ email: "ann@example.com", name: "Ann" }];
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      email: `person${i}@example.com`,
      name: `Person ${i}`,
    }));

  type Message = { to: string; subject: string; html: string };

  /** News that goes to many people at once. */
  const bulk: [string, (to: typeof ann) => Promise<number>][] = [
    ["cancellation", (to) => sendEventCancellations(to, event)],
    ["update", (to) => sendEventUpdates(to, event, allChanges)],
  ];
  /** Mail to one person. */
  const single: [string, () => Promise<boolean>][] = [
    [
      "decline",
      () => sendEventDecline("ann@example.com", attendee, event, false),
    ],
    [
      "request notice",
      () =>
        sendEventRequestOrganizerNotice(
          "host@example.com",
          event,
          attendee,
          "pending",
        ),
    ],
  ];

  const lastMessage = () =>
    mockSend.mock.calls[mockSend.mock.calls.length - 1][0] as Message;
  const batches = () =>
    mockBatchSend.mock.calls.map((call) => call[0] as Message[]);
  const expectSafe = (html: string) => {
    expect(html).toContain("River &lt;Drive&gt;");
    expect(html).toContain("Ann &lt;b&gt;Attendee&lt;/b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("secret-123");
  };

  beforeEach(() => {
    env.NODE_ENV = "production";
    mockSend.mockClear();
    mockBatchSend.mockReset().mockResolvedValue({ error: null });
    mockResend.mockClear();
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
    jest.useRealTimers();
  });

  it.each(bulk)("sends no %s outside production", async (_label, send) => {
    env.NODE_ENV = "development";
    expect(await send(ann)).toBe(0);
    expect(mockBatchSend).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each(single)("sends no %s outside production", async (_label, send) => {
    env.NODE_ENV = "development";
    expect(await send()).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it.each(bulk)(
    "sends the %s escaped, without the meeting link",
    async (_label, send) => {
      expect(
        await send([{ email: "ann@example.com", name: attendee }]),
      ).toBe(1);
      expectSafe(batches()[0][0].html);
    },
  );

  it.each(single)(
    "sends the %s escaped, without the meeting link",
    async (_label, send) => {
      expect(await send()).toBe(true);
      expectSafe(lastMessage().html);
    },
  );

  it.each(single)("throws when the %s cannot be sent", async (_label, send) => {
    mockSend.mockResolvedValueOnce({ error: { message: "rejected" } });
    await expect(send()).rejects.toThrow();
  });

  it.each(bulk)(
    "sends the %s in batches of one message per person",
    async (_label, send) => {
      const people = many(2 * EMAIL_BATCH_SIZE + 50);

      expect(await send(people)).toBe(people.length);

      expect(batches().map((batch) => batch.length)).toEqual([100, 100, 50]);
      const messages = batches().flat();
      // Each address has its own message: never a shared list.
      expect(messages.map((message) => message.to)).toEqual(
        people.map((person) => person.email),
      );
      expect(messages[7].html).toContain("Hi Person 7,");
      expect(messages[7].html).not.toContain("Person 8");
      expect(mockSend).not.toHaveBeenCalled();
    },
  );

  it.each(bulk)("sends no %s to nobody", async (_label, send) => {
    expect(await send([])).toBe(0);
    expect(mockResend).not.toHaveBeenCalled();
    expect(mockBatchSend).not.toHaveBeenCalled();
  });

  describe("when a batch fails", () => {
    const rateLimited = {
      data: null,
      error: { name: "rate_limit_exceeded", message: "Too many requests" },
    };

    it("tries a rate-limited batch again, waiting longer each time", async () => {
      jest.useFakeTimers();
      mockBatchSend
        .mockResolvedValueOnce(rateLimited)
        .mockResolvedValueOnce(rateLimited);

      const sending = sendEventCancellations(ann, event);
      await jest.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_DELAYS_MS[0] - 1);
      expect(mockBatchSend).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      expect(mockBatchSend).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_DELAYS_MS[1] - 1);
      expect(mockBatchSend).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1);

      await expect(sending).resolves.toBe(1);
      expect(mockBatchSend).toHaveBeenCalledTimes(3);
      expect(batches()[2]).toEqual(batches()[0]);
    });

    it("gives up on it after the last wait and sends the next one", async () => {
      jest.useFakeTimers();
      const tries = RATE_LIMIT_RETRY_DELAYS_MS.length + 1;
      for (let i = 0; i < tries; i += 1) {
        mockBatchSend.mockResolvedValueOnce(rateLimited);
      }

      const sending = sendEventCancellations(many(150), event);
      await jest.runAllTimersAsync();

      await expect(sending).resolves.toBe(50);
      expect(mockBatchSend).toHaveBeenCalledTimes(tries + 1);
    });

    it.each([
      [
        "refused",
        () =>
          mockBatchSend.mockResolvedValueOnce({
            data: null,
            error: { name: "validation_error", message: "Bad request" },
          }),
      ],
      [
        "thrown",
        () => mockBatchSend.mockRejectedValueOnce(new Error("socket hang up")),
      ],
    ])(
      "does not retry a %s batch, and still sends the next one",
      async (_label, fail) => {
        fail();

        await expect(sendEventCancellations(many(150), event)).resolves.toBe(
          50,
        );
        expect(mockBatchSend).toHaveBeenCalledTimes(2);
      },
    );
  });

  it("says who cancelled and when it was, linking to the event", async () => {
    await sendEventCancellations(ann, event);

    const { to, subject, html } = batches()[0][0];
    expect(to).toBe("ann@example.com");
    expect(subject).toBe("River <Drive> was cancelled");
    expect(html).toContain("Helping &amp; Hands");
    expect(html).toContain("10:00");
    expect(html).toContain("GMT+5:30");
    expect(html).toContain("http://localhost:3000/events/river-drive");
  });

  it("lists every change in an update, escaped, linking to the event", async () => {
    await sendEventUpdates(ann, event, allChanges);

    const { subject, html } = batches()[0][0];
    expect(subject).toBe("River <Drive> has changed");
    expect(html).toContain("New time: ");
    expect(html).toContain("10:00");
    expect(html).toContain("12:00");
    expect(html).toContain("the event is now both in person and online");
    expect(html).toContain(
      "New venue: 12 &lt;River&gt; Road, Guwahati, Assam, India",
    );
    expect(html).toContain("New meeting link");
    expect(html).toContain("/events/river-drive");
  });

  it("lists only what changed", async () => {
    await sendEventUpdates(ann, event, {
      time: false,
      mode: false,
      venue: false,
      meetingLink: true,
    });

    const { html } = batches()[0][0];
    expect(html.match(/<li>/g)).toHaveLength(1);
    expect(html).toContain("New meeting link");
  });

  it("words a removal differently from a refused request", async () => {
    await sendEventDecline("ann@example.com", "Ann", event, true);
    expect(lastMessage().subject).toBe(
      "Your place at River <Drive> was removed",
    );
    expect(lastMessage().html).toContain("removed your place");

    await sendEventDecline("ann@example.com", "Ann", event, false);
    expect(lastMessage().subject).toBe(
      "Your request to join River <Drive> was not approved",
    );
    expect(lastMessage().html).toContain("did not approve your request");
  });

  it("points the organizer to the attendee page, with no attendee email", async () => {
    await sendEventRequestOrganizerNotice(
      "host@example.com",
      event,
      "Ann",
      "waitlisted",
    );

    const { subject, html } = lastMessage();
    expect(subject).toBe("Ann joined the waitlist for River <Drive>");
    expect(html).toContain("/organization/events/river-drive/attendees");
    expect(html).not.toContain("@example.com");
  });
});
