import { describe, expect, it } from "vitest";
import { joinLinkNote } from "@features/events/utils/joinLinkNote";

const viewer = {
  hasLink: false,
  isHost: false,
  going: false,
  phase: "upcoming" as const,
  cancelled: false,
};

describe("joinLinkNote", () => {
  it("says the link is shown once the viewer has joined", () => {
    expect(joinLinkNote(viewer)).toBe(
      "The meeting link is shown here once you have joined.",
    );
  });

  it("never claims the organizer will send the link", () => {
    for (const phase of ["upcoming", "ongoing", "ended"] as const) {
      for (const going of [true, false]) {
        expect(joinLinkNote({ ...viewer, phase, going }) ?? "").not.toMatch(
          /organi[sz]er|send|email/i,
        );
      }
    }
  });

  it("says nothing when the viewer has the link", () => {
    expect(joinLinkNote({ ...viewer, hasLink: true })).toBeUndefined();
    expect(
      joinLinkNote({ ...viewer, hasLink: true, phase: "ongoing", going: true }),
    ).toBeUndefined();
  });

  it("tells a host only that no link has been added", () => {
    expect(joinLinkNote({ ...viewer, isHost: true })).toBe(
      "No meeting link has been added yet.",
    );
  });

  it("explains that joining has closed once the event is running", () => {
    expect(joinLinkNote({ ...viewer, phase: "ongoing" })).toMatch(
      /^Joining has closed because the event has started/,
    );
  });

  it("promises nothing for an ended or cancelled event", () => {
    expect(joinLinkNote({ ...viewer, phase: "ended" })).toBeUndefined();
    expect(joinLinkNote({ ...viewer, cancelled: true })).toBeUndefined();
  });

  it("does not tell someone who is going to join first", () => {
    expect(joinLinkNote({ ...viewer, going: true })).toBe(
      "The meeting link is not available yet.",
    );
    expect(joinLinkNote({ ...viewer, going: true, refreshing: true })).toBe(
      "Getting your meeting link…",
    );
  });
});
