import { describe, expect, it } from "vitest";
import { editBlocker, isMissingEvent } from "./editEvent";

const event = {
  organizerHandle: "green-wave",
  hostUsername: "greenwave",
  endTime: "2026-09-12T14:00:00Z",
};
const BEFORE = Date.parse("2026-09-12T13:00:00Z");
const AFTER = Date.parse("2026-09-12T15:00:00Z");

describe("editBlocker", () => {
  it("lets the host edit an event that has not ended", () => {
    expect(editBlocker(event, "green-wave", BEFORE)).toBeUndefined();
    expect(editBlocker(event, "greenwave", BEFORE)).toBeUndefined();
  });

  it("refuses another organization, or none", () => {
    expect(editBlocker(event, "someone-else", BEFORE)).toBe("foreign");
    expect(editBlocker(event, undefined, BEFORE)).toBe("foreign");
  });

  it("refuses a cancelled event and one that had ended when it loaded", () => {
    expect(
      editBlocker({ ...event, status: "cancelled" }, "green-wave", BEFORE),
    ).toBe("cancelled");
    expect(editBlocker(event, "green-wave", AFTER)).toBe("ended");
  });

  it("does not call a draft with past dates ended", () => {
    const draft = { ...event, status: "draft" as const };
    expect(editBlocker(draft, "green-wave", BEFORE)).toBeUndefined();
    expect(editBlocker(draft, "green-wave", AFTER)).toBe("draft-expired");
  });
});

describe("isMissingEvent", () => {
  it("is true only when the API says there is no such event", () => {
    expect(isMissingEvent({ response: { status: 404 } })).toBe(true);
    expect(isMissingEvent({ response: { status: 400 } })).toBe(true);
    expect(isMissingEvent({ response: { status: 500 } })).toBe(false);
    expect(isMissingEvent(new Error("Network Error"))).toBe(false);
    expect(isMissingEvent(undefined)).toBe(false);
  });
});
