import { describe, expect, it } from "vitest";
import type { DisplayEvent } from "@features/events/types";
import {
  calendarLocation,
  googleCalendarUrl,
  icsUrl,
  outlookCalendarUrl,
  toCalendarEntry,
} from "./calendarLinks";

const event = {
  id: "beach-day",
  title: "Beach clean-up & picnic",
  summary: "Gloves, bags & snacks provided.",
  mode: "Offline",
  address: "Juhu Beach",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  startsAt: "2026-11-22T01:30:00.000Z",
  endsAt: "2026-11-22T04:30:00.000Z",
} as unknown as DisplayEvent;

const PAGE = "https://www.example.org/events/beach-day";

describe("calendarLocation", () => {
  it("joins the venue of an in-person event", () => {
    expect(calendarLocation(event)).toBe(
      "Juhu Beach, Mumbai, Maharashtra, India",
    );
  });

  it("uses the meeting link of an online event, or its platform without one", () => {
    const online = {
      ...event,
      mode: "Online",
      platform: "Zoom",
    } as DisplayEvent;

    expect(
      calendarLocation({
        ...online,
        platformLink: "https://zoom.example/j/1",
      } as DisplayEvent),
    ).toBe("https://zoom.example/j/1");
    expect(calendarLocation(online)).toBe("Online (Zoom)");
  });

  it("describes both for a hybrid event", () => {
    expect(
      calendarLocation({
        ...event,
        mode: "Hybrid",
        platform: "Zoom",
      } as DisplayEvent),
    ).toBe("Juhu Beach, Mumbai, Maharashtra, India, and Online (Zoom)");
  });

  it("is empty when there is nothing to say", () => {
    expect(
      calendarLocation({
        ...event,
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      } as DisplayEvent),
    ).toBe("");
  });
});

describe("toCalendarEntry", () => {
  it("carries the title, times, place and a link back to the event page", () => {
    const entry = toCalendarEntry(event, PAGE)!;

    expect(entry.title).toBe("Beach clean-up & picnic");
    expect(entry.start.toISOString()).toBe("2026-11-22T01:30:00.000Z");
    expect(entry.end.toISOString()).toBe("2026-11-22T04:30:00.000Z");
    expect(entry.description).toBe(
      `Gloves, bags & snacks provided.\n\n${PAGE}`,
    );
  });

  it("gives an end that is not after the start one hour", () => {
    for (const endsAt of [
      "2026-11-22T01:30:00.000Z",
      "2026-11-21T00:00:00.000Z",
      "nonsense",
      "",
    ]) {
      const entry = toCalendarEntry(
        { ...event, endsAt } as DisplayEvent,
        PAGE,
      )!;
      expect(entry.end.toISOString()).toBe("2026-11-22T02:30:00.000Z");
    }
  });

  it("gives up when the start cannot be read", () => {
    expect(
      toCalendarEntry({ ...event, startsAt: "soon" } as DisplayEvent, PAGE),
    ).toBeNull();
  });
});

describe("googleCalendarUrl", () => {
  const url = new URL(googleCalendarUrl(toCalendarEntry(event, PAGE)!));

  it("goes to Google Calendar's new event page", () => {
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.pathname).toBe("/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
  });

  it("writes the times in UTC, start and end", () => {
    expect(url.searchParams.get("dates")).toBe(
      "20261122T013000Z/20261122T043000Z",
    );
  });

  it("keeps a title with an ampersand in one piece", () => {
    expect(url.searchParams.get("text")).toBe("Beach clean-up & picnic");
    expect(url.search).not.toContain("& picnic");
  });

  it("carries the place and the details with the page link", () => {
    expect(url.searchParams.get("location")).toBe(
      "Juhu Beach, Mumbai, Maharashtra, India",
    );
    expect(url.searchParams.get("details")).toContain(PAGE);
  });

  it("encodes anything a person typed", () => {
    const entry = toCalendarEntry(
      {
        ...event,
        title: 'A "title" #1 <b>?x=1&y=2',
        summary: "line 1\nline 2 सफ़ाई 🌊",
      } as DisplayEvent,
      PAGE,
    )!;
    const parsed = new URL(googleCalendarUrl(entry));

    expect(parsed.searchParams.get("text")).toBe('A "title" #1 <b>?x=1&y=2');
    expect(parsed.searchParams.get("details")).toContain(
      "line 1\nline 2 सफ़ाई 🌊",
    );
    expect(parsed.searchParams.get("y")).toBeNull();
  });

  it("leaves out an empty place instead of sending a blank one", () => {
    const entry = toCalendarEntry(
      {
        ...event,
        address: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
      } as DisplayEvent,
      PAGE,
    )!;

    expect(new URL(googleCalendarUrl(entry)).searchParams.has("location")).toBe(
      false,
    );
  });
});

describe("outlookCalendarUrl", () => {
  const url = new URL(outlookCalendarUrl(toCalendarEntry(event, PAGE)!));

  it("goes to Outlook's compose page for a new event", () => {
    expect(url.origin).toBe("https://outlook.live.com");
    expect(url.pathname).toBe("/calendar/0/deeplink/compose");
    expect(url.searchParams.get("path")).toBe("/calendar/action/compose");
    expect(url.searchParams.get("rru")).toBe("addevent");
  });

  it("writes the times as ISO 8601 UTC", () => {
    expect(url.searchParams.get("startdt")).toBe("2026-11-22T01:30:00.000Z");
    expect(url.searchParams.get("enddt")).toBe("2026-11-22T04:30:00.000Z");
  });

  it("carries the subject, body and place", () => {
    expect(url.searchParams.get("subject")).toBe("Beach clean-up & picnic");
    expect(url.searchParams.get("body")).toContain(PAGE);
    expect(url.searchParams.get("location")).toBe(
      "Juhu Beach, Mumbai, Maharashtra, India",
    );
  });
});

describe("icsUrl", () => {
  it("points at the API's calendar file for the event", () => {
    expect(icsUrl("beach-day")).toMatch(/\/events\/beach-day\/calendar\.ics$/);
  });

  it("escapes the address", () => {
    expect(icsUrl("a b/c")).toMatch(/\/events\/a%20b%2Fc\/calendar\.ics$/);
  });
});
