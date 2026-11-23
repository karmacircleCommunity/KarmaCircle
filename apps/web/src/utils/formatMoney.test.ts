import { describe, expect, it } from "vitest";
import { formatMoney, fundedPercent } from "./formatMoney";

/** Intl inserts non-breaking and narrow no-break spaces between a currency
 *  code and the digits; collapse them so assertions read naturally. */
const NBSP_PATTERN = new RegExp("[\\u00a0\\u202f]", "g");
const plain = (value: string) => value.replace(NBSP_PATTERN, " ");

describe("formatMoney", () => {
  it("formats whole units with the locale's grouping", () => {
    expect(plain(formatMoney(1200, "USD"))).toBe("$1,200");
    expect(plain(formatMoney(450000, "INR"))).toBe("₹450,000");
  });

  it("falls back to the currency code when there is no local symbol", () => {
    expect(plain(formatMoney(620000, "KES"))).toBe("KES 620,000");
  });

  it("formats zero without decimals", () => {
    expect(plain(formatMoney(0, "USD"))).toBe("$0");
  });

  it("never shows fractional digits and rounds to the nearest whole unit", () => {
    expect(plain(formatMoney(1234.4, "USD"))).toBe("$1,234");
    expect(plain(formatMoney(1234.56, "USD"))).toBe("$1,235");
    expect(plain(formatMoney(0.4, "USD"))).toBe("$0");
  });

  it("keeps the sign on negative amounts", () => {
    expect(plain(formatMoney(-5, "USD"))).toBe("-$5");
  });

  it("handles very large amounts", () => {
    expect(plain(formatMoney(1_000_000_000, "USD"))).toBe("$1,000,000,000");
  });

  it("throws a RangeError for a malformed currency code", () => {
    expect(() => formatMoney(10, "NOT-A-CURRENCY")).toThrow(RangeError);
  });
});

describe("fundedPercent", () => {
  it("returns 0 when nothing is raised", () => {
    expect(fundedPercent(0, 1000)).toBe(0);
  });

  it("returns the whole percentage of the goal", () => {
    expect(fundedPercent(250, 1000)).toBe(25);
    expect(fundedPercent(500, 1000)).toBe(50);
    expect(fundedPercent(999, 1000)).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(fundedPercent(1, 3)).toBe(33);
    expect(fundedPercent(2, 3)).toBe(67);
    expect(fundedPercent(1, 200)).toBe(1);
    expect(fundedPercent(1, 400)).toBe(0);
  });

  it("returns exactly 100 when the goal is met", () => {
    expect(fundedPercent(1000, 1000)).toBe(100);
  });

  it("clamps an over-funded drive to 100", () => {
    expect(fundedPercent(1500, 1000)).toBe(100);
    expect(fundedPercent(1_000_000, 1)).toBe(100);
  });

  it("returns 0 for a zero goal instead of dividing by zero", () => {
    expect(fundedPercent(500, 0)).toBe(0);
    expect(fundedPercent(0, 0)).toBe(0);
  });

  it("returns 0 for a negative goal", () => {
    expect(fundedPercent(500, -100)).toBe(0);
  });

  it("handles fractional amounts", () => {
    expect(fundedPercent(0.5, 2)).toBe(25);
  });

  it("returns 0 for a negative raised amount instead of a negative percent", () => {
    expect(fundedPercent(-500, 1000)).toBe(0);
  });

  it("returns 0 when the goal or the raised amount is not a number", () => {
    expect(fundedPercent(500, NaN)).toBe(0);
    expect(fundedPercent(NaN, 1000)).toBe(0);
  });
});
