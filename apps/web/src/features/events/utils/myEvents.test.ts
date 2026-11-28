import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hostingPath,
  myEventStatusLabel,
  myEventsList,
  myEventsSearch,
  myEventsUrl,
  myEventsView,
} from "./myEvents";

vi.mock("@services/ApiEndpoints", () => ({
  eventEndpoints: {
    mine: () => "https://api.example.com/events/mine",
    invitations: () => "https://api.example.com/events/invitations",
  },
}));

describe("myEventsUrl", () => {
  it("asks for the person's registrations by period", () => {
    expect(myEventsUrl("Upcoming", 1, 100)).toBe(
      "https://api.example.com/events/mine?page=1&limit=100&period=upcoming",
    );
    expect(myEventsUrl("Past", 2, 100)).toBe(
      "https://api.example.com/events/mine?page=2&limit=100&period=past",
    );
  });

  it("asks for invitations without a period", () => {
    expect(myEventsUrl("Invited", 1, 100)).toBe(
      "https://api.example.com/events/invitations?page=1&limit=100",
    );
  });
});

describe("myEventStatusLabel", () => {
  const event = {
    startTime: "2026-09-12T12:00:00Z",
    endTime: "2026-09-12T14:00:00Z",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T11:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says going before and during the event", () => {
    expect(myEventStatusLabel(event, "Upcoming")).toBe("You're going");
    vi.setSystemTime(new Date("2026-09-12T13:00:00Z"));
    expect(
      myEventStatusLabel({ ...event, registrationStatus: "going" }, "Upcoming"),
    ).toBe("You're going");
  });

  it("says joined only once the event has ended", () => {
    vi.setSystemTime(new Date("2026-09-12T15:00:00Z"));
    expect(myEventStatusLabel(event, "Past")).toBe("You joined");
  });

  it("keeps a standing that is not going", () => {
    expect(
      myEventStatusLabel(
        { ...event, registrationStatus: "pending" },
        "Upcoming",
      ),
    ).toBe("Requested");
    expect(
      myEventStatusLabel(
        { ...event, registrationStatus: "waitlisted" },
        "Upcoming",
      ),
    ).toBe("Waitlisted");
  });

  it("labels an invitation", () => {
    expect(myEventStatusLabel(event, "Invited")).toBe("Invited");
  });

  it("puts cancelled ahead of everything else", () => {
    expect(
      myEventStatusLabel(
        { ...event, status: "cancelled", registrationStatus: "going" },
        "Upcoming",
      ),
    ).toBe("Cancelled");
  });
});

describe("myEventsView", () => {
  const at = (query: string) => new URLSearchParams(query);

  it("keeps an account that cannot host on Attending", () => {
    expect(myEventsView(at(""), false)).toBe("attending");
    expect(myEventsView(at("tab=hosting"), false)).toBe("attending");
  });

  it("opens a host on Hosting unless the address asks for Attending", () => {
    expect(myEventsView(at(""), true)).toBe("hosting");
    expect(myEventsView(at("tab=nonsense"), true)).toBe("hosting");
    expect(myEventsView(at("tab=attending"), true)).toBe("attending");
  });
});

describe("myEventsList", () => {
  const lists = ["Upcoming", "Past", "Drafts"] as const;

  it("reads the list the address names", () => {
    expect(myEventsList(new URLSearchParams("show=drafts"), lists)).toBe(
      "Drafts",
    );
  });

  it("falls back to the first list", () => {
    expect(myEventsList(new URLSearchParams(""), lists)).toBe("Upcoming");
    expect(myEventsList(new URLSearchParams("show=invited"), lists)).toBe(
      "Upcoming",
    );
  });
});

describe("My Events addresses", () => {
  it("leaves the default list out", () => {
    expect(myEventsSearch("attending")).toBe("?tab=attending");
    expect(hostingPath()).toBe("/events/mine?tab=hosting");
  });

  it("names any other list", () => {
    expect(myEventsSearch("attending", "Invited")).toBe(
      "?tab=attending&show=invited",
    );
    expect(hostingPath("Drafts")).toBe(
      "/events/mine?tab=hosting&show=drafts",
    );
  });
});
