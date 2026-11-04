import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDuration,
  formatEventBadge,
  formatEventDate,
  formatEventTime,
  isEventPast,
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

  // Real bug, reported rather than fixed: an unparseable date makes every
  // arithmetic step NaN and the helper returns "NaN days".
  it.todo("returns a safe fallback instead of 'NaN days' for invalid dates");
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

describe("isEventPast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is true for a start time before now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    expect(isEventPast("2026-09-12T11:59:59Z")).toBe(true);
    expect(isEventPast("2025-01-01T00:00:00Z")).toBe(true);
  });

  it("is false for a start time after now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    expect(isEventPast("2026-09-12T12:00:01Z")).toBe(false);
    expect(isEventPast("2030-01-01T00:00:00Z")).toBe(false);
  });

  it("is false at the exact start instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    expect(isEventPast("2026-09-12T12:00:00Z")).toBe(false);
  });

  it("compares absolute instants, not wall-clock text", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T12:00:00Z"));
    // 17:00 in +05:30 is 11:30Z, which is already past.
    expect(isEventPast("2026-09-12T17:00:00+05:30")).toBe(true);
    // 17:00 in -05:00 is 22:00Z, which is still ahead.
    expect(isEventPast("2026-09-12T17:00:00-05:00")).toBe(false);
  });

  it("treats an invalid date as not past (current behavior)", () => {
    expect(isEventPast("not-a-date")).toBe(false);
  });
});
