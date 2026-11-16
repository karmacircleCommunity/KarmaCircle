import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  browserTimeZone,
  combineInZone,
  eventZone,
  listTimeZones,
  partsInZone,
  startOfDayInZone,
  viewerTimeNote,
  zoneAbbreviation,
  zoneOptionLabel,
} from "./eventTimezone";

// The vitest config pins TZ to UTC and the locale to en-US.
const day = (iso: string) => dayjs(iso);
const clock = (iso: string) => dayjs(`2000-01-01T${iso}`);

describe("combineInZone", () => {
  it("reads the date and time as the clock in the zone, not the browser's", () => {
    // 10:00 in Kolkata (UTC+5:30) is 04:30 UTC.
    expect(
      combineInZone(
        day("2030-05-01"),
        clock("10:00"),
        "Asia/Kolkata",
      ).toISOString(),
    ).toBe("2030-05-01T04:30:00.000Z");
    // 10:00 in Tokyo (UTC+9) is 01:00 UTC.
    expect(
      combineInZone(
        day("2030-05-01"),
        clock("10:00"),
        "Asia/Tokyo",
      ).toISOString(),
    ).toBe("2030-05-01T01:00:00.000Z");
    // 10:00 in New York in May (UTC-4, daylight time) is 14:00 UTC.
    expect(
      combineInZone(
        day("2030-05-01"),
        clock("10:00"),
        "America/New_York",
      ).toISOString(),
    ).toBe("2030-05-01T14:00:00.000Z");
  });

  it("follows daylight saving: the same clock time is a different instant in winter", () => {
    expect(
      combineInZone(
        day("2030-01-15"),
        clock("10:00"),
        "America/New_York",
      ).toISOString(),
    ).toBe("2030-01-15T15:00:00.000Z");
  });

  it("can land on the previous or next UTC day", () => {
    expect(
      combineInZone(
        day("2030-05-01"),
        clock("01:00"),
        "Asia/Tokyo",
      ).toISOString(),
    ).toBe("2030-04-30T16:00:00.000Z");
    expect(
      combineInZone(
        day("2030-05-01"),
        clock("22:00"),
        "America/Los_Angeles",
      ).toISOString(),
    ).toBe("2030-05-02T05:00:00.000Z");
  });

  it("is the same as UTC for UTC", () => {
    expect(
      combineInZone(day("2030-05-01"), clock("10:00"), "UTC").toISOString(),
    ).toBe("2030-05-01T10:00:00.000Z");
  });
});

describe("partsInZone", () => {
  it("gives back the wall clock the organizer typed (round trip)", () => {
    for (const zone of [
      "Asia/Kolkata",
      "America/New_York",
      "Pacific/Auckland",
      "UTC",
    ]) {
      const instant = combineInZone(day("2030-05-01"), clock("17:45"), zone);
      const parts = partsInZone(instant, zone);
      expect(parts.date.format("YYYY-MM-DD")).toBe("2030-05-01");
      expect(parts.time.format("HH:mm")).toBe("17:45");
    }
  });

  it("shows a different calendar day when the zone is ahead of UTC", () => {
    const parts = partsInZone("2030-04-30T20:00:00.000Z", "Asia/Tokyo");
    expect(parts.date.format("YYYY-MM-DD")).toBe("2030-05-01");
    expect(parts.time.format("HH:mm")).toBe("05:00");
  });
});

describe("startOfDayInZone", () => {
  it("is midnight in that zone", () => {
    expect(
      startOfDayInZone(day("2030-05-01"), "Asia/Kolkata").toISOString(),
    ).toBe("2030-04-30T18:30:00.000Z");
  });
});

describe("zoneAbbreviation and zoneOptionLabel", () => {
  it("names the zone at that moment", () => {
    expect(zoneAbbreviation("2030-01-15T12:00:00Z", "America/New_York")).toBe(
      "EST",
    );
    expect(zoneAbbreviation("2030-07-15T12:00:00Z", "America/New_York")).toBe(
      "EDT",
    );
    expect(zoneAbbreviation("2030-07-15T12:00:00Z", "Asia/Kolkata")).toBe(
      "GMT+5:30",
    );
  });

  it("builds a picker label and copes with a bad zone", () => {
    expect(
      zoneOptionLabel("Asia/Kolkata", new Date("2030-07-15T12:00:00Z")),
    ).toBe("Asia/Kolkata (GMT+5:30)");
    expect(zoneAbbreviation("2030-07-15T12:00:00Z", "Mars/Base")).toBe("");
  });
});

describe("eventZone", () => {
  it("passes a valid zone through and drops a missing or bogus one", () => {
    expect(eventZone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(eventZone(undefined)).toBeUndefined();
    expect(eventZone("")).toBeUndefined();
    expect(eventZone("Mars/Base")).toBeUndefined();
  });
});

describe("viewerTimeNote", () => {
  it("shows the viewer's own clock when it differs from the event's", () => {
    // 10:00 in Kolkata is 04:30 UTC, and the viewer is on UTC here.
    expect(
      viewerTimeNote("2030-05-01T04:30:00.000Z", "Asia/Kolkata", "UTC"),
    ).toBe("Wed · 4:30 AM");
    expect(
      viewerTimeNote(
        "2030-05-01T04:30:00.000Z",
        "Asia/Kolkata",
        "America/Los_Angeles",
      ),
    ).toBe("Tue · 9:30 PM");
  });

  it("says nothing when the clocks agree, even across different zone names", () => {
    expect(
      viewerTimeNote(
        "2030-05-01T04:30:00.000Z",
        "Asia/Kolkata",
        "Asia/Kolkata",
      ),
    ).toBeUndefined();
    expect(
      viewerTimeNote(
        "2030-05-01T04:30:00.000Z",
        "Asia/Calcutta",
        "Asia/Kolkata",
      ),
    ).toBeUndefined();
    expect(
      viewerTimeNote("2030-01-15T12:00:00.000Z", "Europe/London", "UTC"),
    ).toBeUndefined();
  });

  it("says nothing for an event with no timezone", () => {
    expect(
      viewerTimeNote("2030-05-01T04:30:00.000Z", undefined, "UTC"),
    ).toBeUndefined();
    expect(
      viewerTimeNote("2030-05-01T04:30:00.000Z", "Mars/Base", "UTC"),
    ).toBeUndefined();
  });
});

describe("browserTimeZone and listTimeZones", () => {
  it("reads the pinned test zone", () => {
    expect(browserTimeZone()).toBe("UTC");
  });

  it("lists many zones, sorted, with UTC and any extra one included once", () => {
    const zones = listTimeZones(["Asia/Kolkata", "Asia/Kolkata"]);
    expect(zones.length).toBeGreaterThan(50);
    expect(zones).toEqual([...zones].sort());
    expect(zones).toContain("UTC");
    expect(zones.filter((z) => z === "Asia/Kolkata")).toHaveLength(1);
  });
});
