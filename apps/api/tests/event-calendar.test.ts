import request from "supertest";
import {
  buildEventIcs,
  escapeText,
  foldLine,
  formatUtc,
  icsFileName,
  type CalendarSource,
} from "../src/modules/events/event.calendar";
import * as eventService from "../src/modules/events/event.service";
import { buildTestApp } from "./helpers/test-app";

/**
 * PG-19: the event as a calendar file. The file is checked line by line
 * against what RFC 5545 requires, and the route is checked with the event
 * lookup replaced, so no database is needed.
 */

jest.mock("../src/modules/events/event.service", () => ({
  ...jest.requireActual("../src/modules/events/event.service"),
  findPublicByUid: jest.fn(),
}));
const findPublicByUid = eventService.findPublicByUid as jest.Mock;

const SITE = "https://www.example.org";

const event: CalendarSource = {
  uid: "beach-day",
  name: "Beach clean-up",
  description: "Gloves and bags provided. Bring water.",
  startTime: new Date("2026-11-22T01:30:00Z"),
  endTime: new Date("2026-11-22T04:30:00Z"),
  status: "published",
  mode: "Offline",
  address: "Juhu Beach",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  updatedAt: new Date("2026-11-18T12:00:00Z"),
};

/** The logical lines of a calendar file: unfolded, with the line endings checked. */
function parse(ics: string) {
  expect(ics.endsWith("\r\n")).toBe(true);
  expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // only CRLF, never a bare LF or CR
  const physical = ics.split("\r\n").slice(0, -1);
  const logical: string[] = [];
  for (const line of physical) {
    if (line.startsWith(" ") && logical.length)
      logical[logical.length - 1] += line.slice(1);
    else logical.push(line);
  }
  return { physical, logical };
}
const prop = (logical: string[], name: string) =>
  logical.find((line) => line.startsWith(`${name}:`))?.slice(name.length + 1);

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and line breaks", () => {
    const BS = String.fromCharCode(92); // one backslash
    expect(escapeText(`a${BS}b;c,d\ne`)).toBe(
      `a${BS}${BS}b${BS};c${BS},d${BS}ne`,
    );
    expect(escapeText("one\r\ntwo\rthree")).toBe("one\\ntwo\\nthree");
  });

  it("drops control characters but keeps tabs", () => {
    expect(escapeText("a\u0000b\u0007c\td\u007f")).toBe("abc\td");
  });

  it("leaves ordinary text, accents and emoji alone", () => {
    expect(escapeText("Café 🌊 सफ़ाई")).toBe("Café 🌊 सफ़ाई");
  });
});

describe("foldLine", () => {
  const octets = (line: string) => Buffer.byteLength(line, "utf8");

  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("keeps every line within 75 octets and loses nothing", () => {
    const long = "DESCRIPTION:" + "word ".repeat(80);
    const folded = foldLine(long);

    for (const line of folded.split("\r\n"))
      expect(octets(line)).toBeLessThanOrEqual(75);
    expect(
      folded
        .split("\r\n")
        .slice(1)
        .every((line) => line.startsWith(" ")),
    ).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });

  it("never splits a multi-byte character", () => {
    const long = "SUMMARY:" + "सफ़ाई🌊日本語".repeat(20);
    const folded = foldLine(long);

    for (const line of folded.split("\r\n")) {
      expect(octets(line)).toBeLessThanOrEqual(75);
      expect(line).not.toContain("�");
    }
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });

  it("folds a line of exactly 75 octets not at all and one of 76 once", () => {
    expect(foldLine("A".repeat(75))).toBe("A".repeat(75));
    expect(foldLine("A".repeat(76)).split("\r\n")).toHaveLength(2);
  });
});

describe("formatUtc", () => {
  it("writes the basic UTC form", () => {
    expect(formatUtc(new Date("2026-11-22T01:30:00.000Z"))).toBe(
      "20261122T013000Z",
    );
    expect(formatUtc(new Date("2026-01-05T23:59:59.999Z"))).toBe(
      "20260105T235959Z",
    );
  });
});

describe("icsFileName", () => {
  it("is safe on every system", () => {
    expect(icsFileName("beach-day")).toBe("beach-day.ics");
    expect(icsFileName('A "Strange"/../Name')).toBe("a-strange-name.ics");
    expect(icsFileName("!!!")).toBe("event.ics");
  });
});

describe("buildEventIcs", () => {
  const build = (overrides: Partial<CalendarSource> = {}) =>
    parse(buildEventIcs({ ...event, ...overrides }, { siteUrl: SITE }));

  it("has the structure a calendar expects", () => {
    const { logical } = build();

    expect(logical.slice(0, 5)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//KarmaCircle//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ]);
    expect(logical.at(-1)).toBe("END:VCALENDAR");
    expect(logical.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(logical.filter((l) => l === "END:VEVENT")).toHaveLength(1);
  });

  it("carries the required event properties", () => {
    const { logical } = build();

    for (const name of ["UID", "DTSTAMP", "DTSTART", "SUMMARY"]) {
      expect(prop(logical, name)).toBeTruthy();
    }
    expect(prop(logical, "DTSTART")).toBe("20261122T013000Z");
    expect(prop(logical, "DTEND")).toBe("20261122T043000Z");
    expect(prop(logical, "SUMMARY")).toBe("Beach clean-up");
    expect(prop(logical, "URL")).toBe(
      "https://www.example.org/events/beach-day",
    );
  });

  it("keeps every physical line within 75 octets", () => {
    const { physical } = build({
      description: "A long description, with commas; and semicolons. ".repeat(
        30,
      ),
      name: "N".repeat(200),
    });

    for (const line of physical)
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("gives an event the same UID every time, so adding it again updates it", () => {
    const first = prop(build().logical, "UID");
    const later = prop(
      build({
        updatedAt: new Date("2026-11-19T00:00:00Z"),
        description: "Edited",
      }).logical,
      "UID",
    );

    expect(first).toBe("beach-day@www.example.org");
    expect(later).toBe(first);
  });

  it("says which copy is newer with SEQUENCE and LAST-MODIFIED", () => {
    const older = build().logical;
    const newer = build({
      updatedAt: new Date("2026-11-19T00:00:00Z"),
    }).logical;

    expect(Number(prop(newer, "SEQUENCE"))).toBeGreaterThan(
      Number(prop(older, "SEQUENCE")),
    );
    expect(prop(newer, "LAST-MODIFIED")).toBe("20261119T000000Z");
  });

  it("is the same file for the same event", () => {
    expect(buildEventIcs(event, { siteUrl: SITE })).toBe(
      buildEventIcs(event, { siteUrl: SITE }),
    );
  });

  it("puts the venue in LOCATION for an in-person event", () => {
    expect(prop(build().logical, "LOCATION")).toBe(
      "Juhu Beach\\, Mumbai\\, Maharashtra\\, India",
    );
  });

  it("names the platform and puts the meeting link in the description for an online event", () => {
    const { logical } = build({
      mode: "Online",
      platform: "Zoom",
      platformLink: "https://zoom.example/j/123",
      address: undefined,
      city: undefined,
      state: undefined,
      country: undefined,
    });

    expect(prop(logical, "LOCATION")).toBe("Online (Zoom)");
    expect(prop(logical, "DESCRIPTION")).toContain(
      "Join online: https://zoom.example/j/123",
    );
  });

  it("leaves LOCATION out when there is nothing to say", () => {
    const { logical } = build({
      address: undefined,
      city: undefined,
      state: undefined,
      country: undefined,
    });

    expect(prop(logical, "LOCATION")).toBeUndefined();
  });

  it("confirms a live event and gives it an alarm an hour before", () => {
    const { logical } = build();

    expect(prop(logical, "STATUS")).toBe("CONFIRMED");
    expect(logical).toContain("TRIGGER:-PT1H");
    expect(logical).toContain("BEGIN:VALARM");
  });

  it("marks a cancelled event cancelled and gives it no alarm", () => {
    const { logical } = build({ status: "cancelled" });

    expect(prop(logical, "STATUS")).toBe("CANCELLED");
    expect(logical).not.toContain("BEGIN:VALARM");
  });

  it("cannot be made to add lines by what a person typed", () => {
    const { logical } = build({
      name: "Clean-up\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:Evil",
      description:
        "Hello\nATTENDEE:mailto:x@evil.example\r\nORGANIZER:mailto:y@evil.example",
    });

    expect(logical.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(logical.filter((l) => l.startsWith("ATTENDEE"))).toHaveLength(0);
    expect(logical.filter((l) => l.startsWith("ORGANIZER"))).toHaveLength(0);
    expect(prop(logical, "SUMMARY")).toBe(
      "Clean-up\\nEND:VEVENT\\nBEGIN:VEVENT\\nSUMMARY:Evil",
    );
  });

  it("carries nothing private", () => {
    const text = buildEventIcs(event, { siteUrl: SITE });

    expect(text).not.toMatch(/ATTENDEE|ORGANIZER|mailto:/);
  });

  it("escapes the address in the page link", () => {
    expect(prop(build({ uid: "a b" }).logical, "URL")).toBe(
      "https://www.example.org/events/a%20b",
    );
  });
});

describe("GET /events/:uid/calendar.ics", () => {
  const app = buildTestApp();

  beforeEach(() => findPublicByUid.mockReset());

  it("serves the event as a calendar file", async () => {
    findPublicByUid.mockResolvedValue(event);

    const res = await request(app).get("/events/beach-day/calendar.ics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="beach-day.ics"',
    );
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(res.text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(res.text).toContain("SUMMARY:Beach clean-up");
    expect(findPublicByUid).toHaveBeenCalledWith("beach-day");
  });

  it("needs no sign-in", async () => {
    findPublicByUid.mockResolvedValue(event);

    expect(
      (await request(app).get("/events/beach-day/calendar.ics")).status,
    ).toBe(200);
  });

  it("is a 404 for an event that does not exist or is a draft", async () => {
    findPublicByUid.mockResolvedValue(null);

    const res = await request(app).get("/events/nothing/calendar.ics");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("still serves a cancelled event, marked cancelled", async () => {
    findPublicByUid.mockResolvedValue({ ...event, status: "cancelled" });

    const res = await request(app).get("/events/beach-day/calendar.ics");

    expect(res.text).toContain("STATUS:CANCELLED");
  });
});
