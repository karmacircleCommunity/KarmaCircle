import { afterEach, describe, expect, it, vi } from "vitest";
import {
  eventPhase,
  formatAgendaTime,
  formatDuration,
  formatEventBadge,
  formatEventDate,
  formatEventTime,
  formatSpotsLeft,
  mapsUrl,
} from "./formatEventFacts";

/**
 * Timestamps below deliberately have no `Z`/offset, so they are read as the
 * runner's local time. That keeps the wall-clock assertions independent of
 * the machine's timezone (`vitest.config.ts` also pins TZ to UTC and the
 * locale to en-US, which the locale-dependent assertions rely on).
 *
 * 12 Sep 2026 is a Saturday.
 */
const SAT_9PM = "2026-09-12T21:00:00";

/** Intl may emit a narrow no-break space before AM/PM; normalize it. */
const NBSP_PATTERN = new RegExp("[\\u00a0\\u202f]", "g");
const plain = (value: string) => value.replace(NBSP_PATTERN, " ");

describe("test environment", () => {
  it("is pinned to the en-US locale and the UTC zone", () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().locale).toBe("en-US");
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");
  });
});

describe("formatEventDate", () => {
  it("joins the date and the time with a middle dot", () => {
    expect(plain(formatEventDate(SAT_9PM))).toBe("Sat · Sep 12, 9:00 PM");
  });

  it("shows midnight and noon as 12 o'clock", () => {
    expect(plain(formatEventDate("2026-09-12T00:00:00"))).toBe(
      "Sat · Sep 12, 12:00 AM",
    );
    expect(plain(formatEventDate("2026-09-12T12:05:00"))).toBe(
      "Sat · Sep 12, 12:05 PM",
    );
  });

  it("does not throw on an invalid date", () => {
    expect(formatEventDate("not-a-date")).toBe("Invalid Date");
  });
});

describe("formatEventBadge", () => {
  it("returns the short month and day", () => {
    expect(formatEventBadge(SAT_9PM)).toBe("Sep 12");
    expect(formatEventBadge("2026-01-01T00:00:00")).toBe("Jan 1");
  });

  it("handles the last day of the year", () => {
    expect(formatEventBadge("2026-12-31T23:59:00")).toBe("Dec 31");
  });

  it("does not throw on an invalid date", () => {
    expect(formatEventBadge("")).toBe("Invalid Date");
  });
});

describe("formatEventTime", () => {
  it("returns the weekday and the start time", () => {
    expect(plain(formatEventTime(SAT_9PM))).toBe("Sat · 9:00 PM");
  });

  it("pads minutes to two digits", () => {
    expect(plain(formatEventTime("2026-09-14T08:05:00"))).toBe("Mon · 8:05 AM");
  });

  it("does not throw on an invalid date", () => {
    expect(plain(formatEventTime("nope"))).toBe("Invalid Date · Invalid Date");
  });
});

describe("formatAgendaTime", () => {
  it("writes a typed am or pm time like the rest of the page", () => {
    expect(plain(formatAgendaTime("9:00 am"))).toBe("9:00 AM");
    expect(plain(formatAgendaTime("7.30PM"))).toBe("7:30 PM");
    expect(plain(formatAgendaTime(" 7 p.m. "))).toBe("7:00 PM");
  });

  it("reads 12 am as midnight and 12 pm as noon", () => {
    expect(plain(formatAgendaTime("12:15 am"))).toBe("12:15 AM");
    expect(plain(formatAgendaTime("12 pm"))).toBe("12:00 PM");
  });

  it("restyles a two-digit 24-hour time", () => {
    expect(plain(formatAgendaTime("09:00"))).toBe("9:00 AM");
    expect(plain(formatAgendaTime("18:45"))).toBe("6:45 PM");
  });

  it("shows anything ambiguous or free-form as written", () => {
    for (const typed of [
      "9:00",
      "13 pm",
      "25:00",
      "After lunch",
      "9:00 am - 10:00 am",
    ]) {
      expect(formatAgendaTime(typed)).toBe(typed);
    }
  });
});

describe("formatDuration", () => {
  const at = (iso: string) => iso;

  it("reports minutes below one hour", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T10:45:00Z")),
    ).toBe("45 minutes");
  });

  it("reports zero minutes when start equals end", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T10:00:00Z")),
    ).toBe("0 minutes");
  });

  it("clamps an end before the start to zero minutes", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T09:00:00Z")),
    ).toBe("0 minutes");
  });

  it("uses the singular for exactly one hour", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T11:00:00Z")),
    ).toBe("1 hour");
  });

  it("uses the plural for whole hours", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T14:00:00Z")),
    ).toBe("4 hours");
  });

  it("rounds to the nearest half hour", () => {
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T12:30:00Z")),
    ).toBe("2.5 hours");
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T12:10:00Z")),
    ).toBe("2 hours");
    expect(
      formatDuration(at("2026-09-12T10:00:00Z"), at("2026-09-12T12:20:00Z")),
    ).toBe("2.5 hours");
  });

  it("stays in hours up to just under a full day", () => {
    expect(
      formatDuration(at("2026-09-12T00:00:00Z"), at("2026-09-12T23:59:00Z")),
    ).toBe("24 hours");
  });

  it("switches to days at 24 hours and uses the singular for one day", () => {
    expect(
      formatDuration(at("2026-09-12T00:00:00Z"), at("2026-09-13T00:00:00Z")),
    ).toBe("1 day");
  });

  it("rounds days to whole days", () => {
    expect(
      formatDuration(at("2026-09-12T00:00:00Z"), at("2026-09-14T07:00:00Z")),
    ).toBe("2 days");
    expect(
      formatDuration(at("2026-09-12T00:00:00Z"), at("2026-09-14T18:00:00Z")),
    ).toBe("3 days");
  });

  it("is not affected by the timezone offset on the timestamps", () => {
    expect(
      formatDuration("2026-09-12T10:00:00+05:30", "2026-09-12T14:00:00+05:30"),
    ).toBe("4 hours");
    expect(
      formatDuration("2026-09-12T10:00:00+05:30", "2026-09-12T05:30:00Z"),
    ).toBe("1 hour");
  });

  it("returns a plain fallback instead of 'NaN days' for an unreadable date", () => {
    expect(formatDuration("not-a-date", "2026-09-12T10:00:00Z")).toBe(
      "Duration unknown",
    );
    expect(formatDuration("2026-09-12T10:00:00Z", "")).toBe("Duration unknown");
  });
});

describe("mapsUrl", () => {
  it("builds a maps search URL", () => {
    expect(mapsUrl("Cubbon Park")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Cubbon%20Park",
    );
  });

  it("encodes characters that would break the query string", () => {
    expect(mapsUrl("A&B Hall, #5 / Main?")).toBe(
      "https://www.google.com/maps/search/?api=1&query=A%26B%20Hall%2C%20%235%20%2F%20Main%3F",
    );
  });

  it("encodes non-ASCII venue names", () => {
    expect(mapsUrl("Café Nairobi")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Nairobi",
    );
  });

  it("handles an empty query", () => {
    expect(mapsUrl("")).toBe(
      "https://www.google.com/maps/search/?api=1&query=",
    );
  });
});

describe("eventPhase", () => {
  const START = "2026-09-12T12:00:00Z";
  const END = "2026-09-12T14:00:00Z";
  const at = (instant: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is upcoming before the start, and at the exact start instant", () => {
    at("2026-09-12T11:59:59Z");
    expect(eventPhase(START, END)).toBe("upcoming");
    at(START);
    expect(eventPhase(START, END)).toBe("upcoming");
  });

  it("is ongoing from just after the start up to the end", () => {
    at("2026-09-12T12:00:01Z");
    expect(eventPhase(START, END)).toBe("ongoing");
    at(END);
    expect(eventPhase(START, END)).toBe("ongoing");
  });

  it("is ended only once the end has passed", () => {
    at("2026-09-12T14:00:01Z");
    expect(eventPhase(START, END)).toBe("ended");
  });

  it("compares absolute instants, not wall-clock text", () => {
    at("2026-09-12T12:00:00Z");
    // 17:00 in +05:30 is 11:30Z, which is already past.
    expect(
      eventPhase("2026-09-12T16:00:00+05:30", "2026-09-12T17:00:00+05:30"),
    ).toBe("ended");
    // 17:00 in -05:00 is 22:00Z, which is still ahead.
    expect(
      eventPhase("2026-09-12T17:00:00-05:00", "2026-09-12T18:00:00-05:00"),
    ).toBe("upcoming");
  });

  it("judges a record with no readable end by its start", () => {
    at("2026-09-12T13:00:00Z");
    expect(eventPhase(START)).toBe("ended");
    expect(eventPhase(START, "not-a-date")).toBe("ended");
    expect(eventPhase("2026-09-12T15:00:00Z", "")).toBe("upcoming");
  });

  it("treats unreadable times as upcoming (decided, not a bug)", () => {
    expect(eventPhase("not-a-date")).toBe("upcoming");
  });
});

describe("formatSpotsLeft", () => {
  it("uses the singular for exactly one spot", () => {
    expect(formatSpotsLeft(1)).toBe("1 spot left");
  });

  it("uses the plural for every other number", () => {
    expect(formatSpotsLeft(2)).toBe("2 spots left");
    expect(formatSpotsLeft(40)).toBe("40 spots left");
    expect(formatSpotsLeft(0)).toBe("0 spots left");
  });
});

describe("formatting in an event's own timezone", () => {
  // 04:30 UTC is 10:00 in Kolkata and 13:30 in Tokyo; the test runner is UTC.
  const instant = "2030-05-01T04:30:00.000Z";

  it("formats the date with the event's clock and names the zone", () => {
    expect(formatEventDate(instant, "Asia/Kolkata")).toBe(
      "Wed · May 1, 10:00 AM GMT+5:30",
    );
    expect(formatEventDate(instant, "Asia/Tokyo")).toBe(
      "Wed · May 1, 1:30 PM GMT+9",
    );
  });

  it("uses the viewer's clock, with no zone name, when there is no timezone", () => {
    expect(formatEventDate(instant)).toBe("Wed · May 1, 4:30 AM");
    expect(formatEventDate(instant, "Mars/Base")).toBe("Wed · May 1, 4:30 AM");
  });

  it("puts the badge on the event's own calendar day", () => {
    // 20:00 UTC on 30 April is already 1 May in Tokyo.
    expect(formatEventBadge("2030-04-30T20:00:00.000Z")).toBe("Apr 30");
    expect(formatEventBadge("2030-04-30T20:00:00.000Z", "Asia/Tokyo")).toBe(
      "May 1",
    );
  });

  it("formats the card's weekday and time in the event's zone", () => {
    expect(formatEventTime(instant, "Asia/Kolkata")).toBe(
      "Wed · 10:00 AM GMT+5:30",
    );
    expect(formatEventTime(instant)).toBe("Wed · 4:30 AM");
  });
});
