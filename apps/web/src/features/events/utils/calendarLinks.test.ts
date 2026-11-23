import { describe, expect, it } from "vitest";
import {
  buildIcs,
  calendarLocation,
  googleCalendarUrl,
  hasCalendarTimes,
  icsFileName,
} from "./calendarLinks";
import type { DisplayEvent } from "@features/events/types";

const event = {
  id: "river-cleanup",
  title: "River clean-up, north bank",
  summary: "Bring gloves; we bring bags.",
  mode: "Offline",
  address: "Gate 2",
  city: "Guwahati",
  country: "India",
  startsAt: "2026-11-24T04:30:00.000Z",
  endsAt: "2026-11-24T07:00:00.000Z",
} as DisplayEvent;

const PAGE_URL = "https://www.karmacircle.org/events/river-cleanup";
const NOW = new Date("2026-11-23T10:00:00.000Z");

describe("calendar links (PG-19)", () => {
  it("builds a Google Calendar link with the times in UTC", () => {
    const link = new URL(googleCalendarUrl(event, PAGE_URL));

    expect(link.origin + link.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(link.searchParams.get("action")).toBe("TEMPLATE");
    expect(link.searchParams.get("text")).toBe("River clean-up, north bank");
    expect(link.searchParams.get("dates")).toBe(
      "20261124T043000Z/20261124T070000Z",
    );
    expect(link.searchParams.get("location")).toBe("Gate 2, Guwahati, India");
    expect(link.searchParams.get("details")).toContain(PAGE_URL);
  });

  it("builds an .ics file with escaped text and CRLF line ends", () => {
    const ics = buildIcs(event, PAGE_URL, NOW);

    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:river-cleanup@karmacircle.org\r\n");
    expect(ics).toContain("DTSTAMP:20261123T100000Z\r\n");
    expect(ics).toContain("DTSTART:20261124T043000Z\r\n");
    expect(ics).toContain("DTEND:20261124T070000Z\r\n");
    expect(ics).toContain("SUMMARY:River clean-up\\, north bank\r\n");
    expect(ics).toContain("Bring gloves\\; we bring bags.");
    expect(ics).toContain("LOCATION:Gate 2\\, Guwahati\\, India\r\n");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("folds a long line instead of running past 75 characters", () => {
    const long = { ...event, summary: "word ".repeat(60) } as DisplayEvent;
    const lines = buildIcs(long, PAGE_URL, NOW).split("\r\n");

    expect(lines.every((line) => line.length <= 75)).toBe(true);
    expect(lines.some((line) => line.startsWith(" "))).toBe(true);
  });

  it("uses the join link for an online event and both for a hybrid one", () => {
    const online = {
      ...event,
      mode: "Online",
      address: undefined,
      city: undefined,
      country: undefined,
      platformLink: "https://zoom.us/j/1",
    } as DisplayEvent;
    expect(calendarLocation(online)).toBe("https://zoom.us/j/1");

    const hybrid = {
      ...online,
      address: "Gate 2",
      city: "Guwahati",
    } as DisplayEvent;
    expect(calendarLocation({ ...hybrid, mode: "Hybrid" })).toBe(
      "Gate 2, Guwahati",
    );
  });

  it("leaves the location out when there is none", () => {
    const bare = {
      ...event,
      mode: "Online",
      address: undefined,
      city: undefined,
      country: undefined,
    } as DisplayEvent;

    expect(buildIcs(bare, PAGE_URL, NOW)).not.toContain("LOCATION");
    expect(
      new URL(googleCalendarUrl(bare, PAGE_URL)).searchParams.has("location"),
    ).toBe(false);
  });

  it("knows when a time cannot be read, and names the file after the event", () => {
    expect(hasCalendarTimes(event)).toBe(true);
    expect(hasCalendarTimes({ startsAt: "nope", endsAt: event.endsAt })).toBe(
      false,
    );
    expect(icsFileName(event)).toBe("river-cleanup.ics");
  });
});
