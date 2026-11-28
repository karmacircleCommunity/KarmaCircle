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
  access: "open",
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
      access: "invite",
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
      access: "invite",
    });
  });

  it("uses startTime, not startDate, as startsAt", () => {
    expect(toDisplayEvent(baseEvent).startsAt).toBe(baseEvent.startTime);
  });

  it("carries the end time, which decides whether the event is over", () => {
    expect(toDisplayEvent(baseEvent).endsAt).toBe(baseEvent.endTime);
    expect(toDisplayEventDetail(baseEvent).event.endsAt).toBe(
      baseEvent.endTime,
    );
  });

  it("maps a draft with no description, cover, venue or link", () => {
    const draft: ApiEvent = {
      ...baseEvent,
      status: "draft",
      mode: "Hybrid",
      description: undefined,
      platform: "",
      platformLink: "",
      linkDelivery: "",
    };
    const card = toDisplayEvent(draft);
    const { event, detail } = toDisplayEventDetail(draft);

    expect(card.summary).toBe("");
    expect(card.cover).toBeUndefined();
    expect(card.platform).toBeUndefined();
    expect(event.summary).toBe("");
    expect(event.cover).toBeUndefined();
    expect(event.platform).toBeUndefined();
    expect(event.platformLink).toBeUndefined();
    expect(detail.linkDelivery).toBeUndefined();
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

  it("turns false flags and open access into undefined so the card omits the pills", () => {
    const card = toDisplayEvent(baseEvent);
    expect(card.isGovernmentSponsored).toBeUndefined();
    expect(card.access).toBeUndefined();
  });

  it("keeps a restricted access level so the card can label it", () => {
    expect(toDisplayEvent({ ...baseEvent, access: "approval" }).access).toBe(
      "approval",
    );
  });

  it("shows the person's own standing on My Events unless they are going", () => {
    expect(
      toDisplayEvent({ ...baseEvent, registrationStatus: "pending" })
        .registrationStatus,
    ).toBe("pending");
    expect(
      toDisplayEvent({ ...baseEvent, registrationStatus: "going" })
        .registrationStatus,
    ).toBeUndefined();
    expect(toDisplayEvent(baseEvent).registrationStatus).toBeUndefined();
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
      access: "open",
      waitlistEnabled: true,
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

describe("cancelled events", () => {
  it("marks a cancelled event on both the card and the detail page", () => {
    const cancelled = { ...baseEvent, status: "cancelled" as const };

    expect(toDisplayEvent(cancelled).cancelled).toBe(true);
    expect(toDisplayEventDetail(cancelled).event.cancelled).toBe(true);
  });

  it("treats a published event, or one with no stored status, as not cancelled", () => {
    const published = { ...baseEvent, status: "published" as const };

    expect(toDisplayEvent(published).cancelled).toBeUndefined();
    expect(toDisplayEvent(baseEvent).cancelled).toBeUndefined();
    expect(toDisplayEventDetail(published).event.cancelled).toBe(false);
    expect(toDisplayEventDetail(baseEvent).event.cancelled).toBe(false);
  });
});

describe("capacity counts", () => {
  it("shows going and spots left only for an event with a capacity", () => {
    const capped = { ...baseEvent, capacity: 10, registrationCount: 4 };

    expect(toDisplayEvent(capped)).toMatchObject({ going: 4, spotsLeft: 6 });
    expect(toDisplayEventDetail(capped).event).toMatchObject({
      going: 4,
      spotsLeft: 6,
    });
  });

  it("invents nothing for an event with no capacity, whatever the stored count", () => {
    const open = { ...baseEvent, registrationCount: 7 };

    expect(toDisplayEvent(open).going).toBeUndefined();
    expect(toDisplayEvent(open).spotsLeft).toBeUndefined();
    expect(toDisplayEventDetail(open).event.going).toBeUndefined();
    expect(toDisplayEventDetail(open).event.spotsLeft).toBeUndefined();
  });

  it("reports a full event as zero spots left, and never goes negative or over", () => {
    expect(
      toDisplayEvent({ ...baseEvent, capacity: 5, registrationCount: 5 }),
    ).toMatchObject({ going: 5, spotsLeft: 0 });
    expect(
      toDisplayEvent({ ...baseEvent, capacity: 5, registrationCount: 9 }),
    ).toMatchObject({ going: 5, spotsLeft: 0 });
  });

  it("treats a capped event with no stored count as nobody going", () => {
    expect(toDisplayEvent({ ...baseEvent, capacity: 3 })).toMatchObject({
      going: 0,
      spotsLeft: 3,
    });
  });
});

describe("event type and tags", () => {
  it("passes the type to the card and the type and tags to the detail page", () => {
    const typed = {
      ...baseEvent,
      eventType: "volunteering" as const,
      tags: ["beach", "families"],
    };

    expect(toDisplayEvent(typed).eventType).toBe("volunteering");
    expect(toDisplayEventDetail(typed).event).toMatchObject({
      eventType: "volunteering",
      tags: ["beach", "families"],
    });
  });

  it("leaves the type empty and the tags an empty list for an older event", () => {
    expect(toDisplayEvent(baseEvent).eventType).toBeUndefined();
    expect(toDisplayEventDetail(baseEvent).event.eventType).toBeUndefined();
    expect(toDisplayEventDetail(baseEvent).event.tags).toEqual([]);
  });
});

describe("timezone", () => {
  it("passes the event's timezone to the card and the detail page", () => {
    const zoned = { ...baseEvent, timezone: "Asia/Kolkata" };
    expect(toDisplayEvent(zoned).timezone).toBe("Asia/Kolkata");
    expect(toDisplayEventDetail(zoned).event.timezone).toBe("Asia/Kolkata");
  });

  it("leaves it empty for an older event", () => {
    expect(toDisplayEvent(baseEvent).timezone).toBeUndefined();
    expect(toDisplayEventDetail(baseEvent).event.timezone).toBeUndefined();
  });
});
