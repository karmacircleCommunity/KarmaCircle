import { describe, expect, it } from "vitest";
import { joinedMessage } from "./joinedMessage";

describe("joinedMessage", () => {
  it("says the email went when it did", () => {
    expect(joinedMessage({ emailSent: true, emailFailed: false })).toEqual({
      tone: "success",
      text: "You joined this event. Confirmation email sent.",
    });
  });

  it("warns only about a send that failed", () => {
    expect(joinedMessage({ emailSent: false, emailFailed: true })).toEqual({
      tone: "warning",
      text: "You joined this event, but the confirmation email could not be sent.",
    });
  });

  it("says nothing about email when none was tried", () => {
    const plain = { tone: "success", text: "You joined this event." };
    expect(joinedMessage({ emailSent: false, emailFailed: false })).toEqual(
      plain,
    );
    expect(joinedMessage(undefined)).toEqual(plain);
  });
});
