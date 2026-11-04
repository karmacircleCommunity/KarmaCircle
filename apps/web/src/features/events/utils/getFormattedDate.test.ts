import { describe, expect, it } from "vitest";
import getFormattedDate from "./getFormattedDate";

/**
 * Inputs have no `Z`/offset on purpose: the helper reads the string in local
 * time, so a local-time string yields the same calendar day on any machine.
 */
const day = (d: number, month = 1) =>
  getFormattedDate(
    `2026-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}T10:00:00`,
  );

describe("getFormattedDate", () => {
  it("formats the day with an ordinal suffix and the full month name", () => {
    expect(day(1)).toBe("1st January");
    expect(day(2)).toBe("2nd January");
    expect(day(3)).toBe("3rd January");
    expect(day(4)).toBe("4th January");
  });

  it("uses 'th' for the teens", () => {
    expect(day(11)).toBe("11th January");
    expect(day(12)).toBe("12th January");
    expect(day(13)).toBe("13th January");
  });

  it("returns to st/nd/rd after the teens", () => {
    expect(day(21)).toBe("21st January");
    expect(day(22)).toBe("22nd January");
    expect(day(23)).toBe("23rd January");
    expect(day(31)).toBe("31st January");
  });

  it("covers every month name", () => {
    const names = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    names.forEach((name, index) => {
      expect(day(15, index + 1)).toBe(`15th ${name}`);
    });
  });

  it("handles a leap day", () => {
    expect(getFormattedDate("2028-02-29T09:00:00")).toBe("29th February");
  });

  it("accepts a date-only string", () => {
    // Date-only ISO strings parse as UTC midnight, so only assert the shape
    // here; the exact day depends on the local zone for negative offsets.
    expect(getFormattedDate("2026-06-15")).toMatch(
      /^\d{1,2}(st|nd|rd|th) \w+$/,
    );
  });

  // Real bug, reported rather than fixed: with no input or an unparseable one
  // the helper returns "NaNth undefined".
  it.todo("returns an empty string for a missing or invalid date");
});
