jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ error: null }) },
  })),
}));

import { Resend } from "resend";
import { env } from "../src/config/env";
import {
  clearResetOutbox,
  getLastResetUrl,
  sendEventJoinConfirmation,
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

  it("constructs Resend and sends mail in production", async () => {
    env.NODE_ENV = "production";

    await sendPasswordResetEmail(
      "member@example.com",
      "https://karmacircle.org/auth/reset-password/production-token",
    );

    expect(mockResend).toHaveBeenCalledTimes(1);
  });
});
