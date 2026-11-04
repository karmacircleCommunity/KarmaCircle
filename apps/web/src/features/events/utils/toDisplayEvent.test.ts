import { describe, expect, it } from "vitest";
import { ORGANIZATION_ACCENTS } from "@features/organizations/constants/organizationDisplay";
import type { ApiEvent } from "@features/events/types";
import { toDisplayEvent } from "./toDisplayEvent";
import { toDisplayEventDetail } from "./toDisplayEventDetail";

const baseEvent: ApiEvent = {
  _id: "mongo-id-1",
  uid: "beach-cleanup-2026",
  name: "Beach Cleanup",
  description: "Pick up litter along the shore.",
  hostUsername: "greenwave",
  hostName: "Green Wave",
  mode: "Offline",
  startDate: "2026-09-12T08:00:00.000Z",
  endDate: "2026-09-12T12:00:00.000Z",
  startTime: "2026-09-12T08:30:00.000Z",
  endTime: "2026-09-12T12:00:00.000Z",
  isGovernmentSponsored: false,
  inviteOnly: false,
};

describe("toDisplayEvent", () => {
  it("maps the API record onto the card shape", () => {
    const card = toDisplayEvent({
      ...baseEvent,
      organizerHandle: "green-wave",
      coverImage: "https://img.example/cover.jpg",
      city: "Goa",
      country: "India",
      platform: "Zoom",
      isGovernmentSponsored: true,
      inviteOnly: true,
    });

    expect(card).toMatchObject({
      id: "beach-cleanup-2026",
      title: "Beach Cleanup",
      organizer: "Green Wave",
      organizerUserName: "green-wave",
      summary: "Pick up litter along the shore.",
      cover: "https://img.example/cover.jpg",
      coverAlt: "Beach Cleanup cover photo",
      mode: "Offline",
      city: "Goa",
      country: "India",
      platform: "Zoom",
      isGovernmentSponsored: true,
      inviteOnly: true,
    });
  });

  it("uses startTime, not startDate, as startsAt", () => {
    expect(toDisplayEvent(baseEvent).startsAt).toBe(baseEvent.startTime);
  });

  it("does not invent attendance or cause data", () => {
    const card = toDisplayEvent(baseEvent);
    expect(card.going).toBeUndefined();
    expect(card.spotsLeft).toBeUndefined();
    expect(card.cause).toBeUndefined();
  });

  it("omits the cover and its alt text when there is no cover image", () => {
    expect(toDisplayEvent(baseEvent).cover).toBeUndefined();
    expect(toDisplayEvent(baseEvent).coverAlt).toBeUndefined();
    const empty = toDisplayEvent({ ...baseEvent, coverImage: "" });
    expect(empty.cover).toBeUndefined();
    expect(empty.coverAlt).toBeUndefined();
  });

  it("leaves the organizer link unset for an individual host", () => {
    expect(toDisplayEvent(baseEvent).organizerUserName).toBeUndefined();
  });

  it("turns false flags into undefined so the card omits the pills", () => {
    const card = toDisplayEvent(baseEvent);
    expect(card.isGovernmentSponsored).toBeUndefined();
    expect(card.inviteOnly).toBeUndefined();
  });

  describe("accent", () => {
    it("is stable for the same uid", () => {
      expect(toDisplayEvent(baseEvent).accent).toBe(
        toDisplayEvent({ ...baseEvent }).accent,
      );
    });

    it("always indexes inside the accent palette", () => {
      const uids = [
        "",
        "a",
        "beach-cleanup-2026",
        "x".repeat(500),
        "प्रयास-2026",
        "😀-drive",
      ];
      for (const uid of uids) {
        const { accent } = toDisplayEvent({ ...baseEvent, uid });
        expect(Number.isInteger(accent)).toBe(true);
        expect(accent).toBeGreaterThanOrEqual(0);
        expect(accent).toBeLessThan(ORGANIZATION_ACCENTS.length);
      }
    });

    it("spreads different uids across more than one accent", () => {
      const accents = new Set(
        Array.from(
          { length: 50 },
          (_, i) => toDisplayEvent({ ...baseEvent, uid: `event-${i}` }).accent,
        ),
      );
      expect(accents.size).toBeGreaterThan(1);
    });
  });
});

describe("toDisplayEventDetail", () => {
  it("maps the header fields including the end time", () => {
    const { event } = toDisplayEventDetail({
      ...baseEvent,
      address: "Calangute Beach",
      state: "Goa",
      platformLink: "https://zoom.example/j/1",
    });

    expect(event).toMatchObject({
      id: "beach-cleanup-2026",
      title: "Beach Cleanup",
      startsAt: baseEvent.startTime,
      endsAt: baseEvent.endTime,
      address: "Calangute Beach",
      state: "Goa",
      platformLink: "https://zoom.example/j/1",
      isGovernmentSponsored: false,
      inviteOnly: false,
    });
    expect(event.going).toBeUndefined();
    expect(event.spotsLeft).toBeUndefined();
  });

  it("falls back to empty lists when optional sections are absent", () => {
    const { detail } = toDisplayEventDetail(baseEvent);
    expect(detail.about).toEqual([]);
    expect(detail.agenda).toEqual([]);
    expect(detail.bringAlong).toEqual([]);
    expect(detail.languages).toEqual([]);
  });

  it("passes the optional sections through when present", () => {
    const { detail } = toDisplayEventDetail({
      ...baseEvent,
      about: ["One", "Two"],
      bringAlong: ["Gloves"],
      languages: ["English", "Konkani"],
      minimumAge: 16,
      contactEmail: "hello@greenwave.example",
      gettingThere: "Take the shuttle.",
    });
    expect(detail.about).toEqual(["One", "Two"]);
    expect(detail.bringAlong).toEqual(["Gloves"]);
    expect(detail.languages).toEqual(["English", "Konkani"]);
    expect(detail.minimumAge).toBe(16);
    expect(detail.contactEmail).toBe("hello@greenwave.example");
    expect(detail.gettingThere).toBe("Take the shuttle.");
  });

  it("omits the cover and its alt text when there is no cover image", () => {
    const { event } = toDisplayEventDetail({ ...baseEvent, coverImage: "" });
    expect(event.cover).toBeUndefined();
    expect(event.coverAlt).toBeUndefined();
  });
});
