import { describe, expect, it } from "vitest";
import {
  joinView,
  leaveLabel,
  signInPrompt,
} from "@features/events/utils/joinView";
import type { EventAccess } from "@features/events/types";

const base = {
  spotsLeft: undefined as number | undefined,
  waitlistEnabled: true,
};
const open = { ...base, access: "open" as EventAccess };
const approval = { ...base, access: "approval" as EventAccess };
const invite = { ...base, access: "invite" as EventAccess };
const none = { status: "none", invited: false } as const;

describe("joinView", () => {
  it("lets anyone join an open event", () => {
    expect(joinView(open, none)).toEqual({
      kind: "join",
      label: "Join this event",
      shortLabel: "Join event",
    });
  });

  it("asks for a note only before a request or a waitlist spot", () => {
    expect(joinView(approval, none)).toMatchObject({ asks: "request" });
    for (const level of [open, approval]) {
      expect(joinView({ ...level, spotsLeft: 0 }, none)).toMatchObject({
        asks: "waitlist",
      });
    }
    // Direct joins stay one tap: open, and any accepted invitation.
    expect(joinView(open, none)).not.toHaveProperty("asks");
    expect(
      joinView(
        { ...approval, spotsLeft: 0 },
        { status: "none", invited: true },
      ),
    ).not.toHaveProperty("asks");
  });

  it("offers a request on an approval event", () => {
    expect(joinView(approval, none)).toMatchObject({
      kind: "join",
      label: "Request to join",
    });
  });

  it("offers nothing on an invite-only event without an invitation", () => {
    expect(joinView(invite, none)).toEqual({ kind: "invite-only" });
  });

  it("lets an invited person accept on any level, even a full one", () => {
    const invited = { status: "none", invited: true } as const;
    for (const level of [open, approval, invite]) {
      expect(joinView({ ...level, spotsLeft: 0 }, invited)).toMatchObject({
        kind: "join",
        label: "Accept invitation",
      });
    }
  });

  it("lets an invitation settle a pending, waitlisted or declined request", () => {
    for (const status of ["pending", "waitlisted", "declined"] as const) {
      expect(joinView(approval, { status, invited: true })).toMatchObject({
        kind: "join",
        label: "Accept invitation",
      });
    }
  });

  it("offers the waitlist on a full event, or says it is full", () => {
    expect(joinView({ ...open, spotsLeft: 0 }, none)).toMatchObject({
      kind: "join",
      label: "Join the waitlist",
    });
    expect(
      joinView({ ...open, spotsLeft: 0, waitlistEnabled: false }, none),
    ).toEqual({ kind: "full" });
  });

  it("does not treat a spot left as full", () => {
    expect(joinView({ ...open, spotsLeft: 1 }, none)).toMatchObject({
      label: "Join this event",
    });
  });

  it("keeps the person's own standing", () => {
    expect(joinView(open, { status: "going", invited: false })).toEqual({
      kind: "going",
    });
    expect(joinView(approval, { status: "pending", invited: false })).toEqual({
      kind: "pending",
    });
    expect(
      joinView(approval, { status: "waitlisted", invited: false }),
    ).toEqual({ kind: "waitlisted" });
    expect(joinView(approval, { status: "declined", invited: false })).toEqual({
      kind: "declined",
    });
  });

  it("treats a full event as going for someone who already holds a spot", () => {
    expect(
      joinView({ ...open, spotsLeft: 0 }, { status: "going", invited: false }),
    ).toEqual({ kind: "going" });
  });

  it("reads no registration yet as none", () => {
    expect(joinView(open, undefined)).toMatchObject({ kind: "join" });
  });
});

describe("leaveLabel", () => {
  it("words the link for each standing", () => {
    expect(leaveLabel("going", false)).toBe("Leave event");
    expect(leaveLabel("going", true)).toBe("Remove my registration");
    expect(leaveLabel("pending", false)).toBe("Withdraw my request");
    expect(leaveLabel("waitlisted", false)).toBe("Leave the waitlist");
  });

  it("has no link for anyone without something to give up", () => {
    expect(leaveLabel("declined", false)).toBeUndefined();
    expect(leaveLabel("join", false)).toBeUndefined();
    expect(leaveLabel("invite-only", false)).toBeUndefined();
  });
});

describe("signInPrompt", () => {
  const visitor = {
    signedIn: false,
    cancelled: false,
    phase: "upcoming" as const,
    kind: "join" as const,
  };

  it("asks a visitor of a running event whether they already joined", () => {
    for (const kind of ["join", "invite-only", "full"] as const) {
      expect(signInPrompt({ ...visitor, phase: "ongoing", kind })).toBe(
        "Already joined?",
      );
    }
  });

  it("asks whether they are invited where only an invitation gets in", () => {
    for (const kind of ["invite-only", "full"] as const) {
      expect(signInPrompt({ ...visitor, kind })).toBe("Invited?");
    }
  });

  it("adds nothing beside a Join button", () => {
    expect(signInPrompt(visitor)).toBeUndefined();
  });

  it("asks nobody who is signed in, or about an event that is over or off", () => {
    const running = { ...visitor, phase: "ongoing" as const };
    expect(signInPrompt({ ...running, signedIn: true })).toBeUndefined();
    expect(signInPrompt({ ...running, cancelled: true })).toBeUndefined();
    expect(signInPrompt({ ...visitor, phase: "ended" })).toBeUndefined();
  });
});
