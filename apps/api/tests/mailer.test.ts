const mockSend = jest.fn().mockResolvedValue({ error: null });

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

import { Resend } from "resend";
import { env } from "../src/config/env";
import {
  clearResetOutbox,
  getLastResetUrl,
  sendEventJoinConfirmation,
  sendEventJoinOrganizerNotice,
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
