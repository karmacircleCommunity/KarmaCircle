import { describe, expect, it } from "vitest";
import { formatTags, parseTags, validateTags } from "./eventTags";

describe("parseTags", () => {
  it("splits on commas and new lines, trims, lower-cases and drops blanks", () => {
    expect(parseTags(" Beach , clean-up,\n Families ,, ")).toEqual([
      "beach",
      "clean-up",
      "families",
    ]);
  });

  it("removes repeats while keeping the first position", () => {
    expect(parseTags("beach, Clean-up, BEACH")).toEqual(["beach", "clean-up"]);
  });

  it("gives an empty list for nothing", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(" , ,")).toEqual([]);
  });
});

describe("formatTags", () => {
  it("joins with a comma and a space, and copes with no tags", () => {
    expect(formatTags(["a", "b"])).toBe("a, b");
    expect(formatTags(undefined)).toBe("");
    expect(formatTags([])).toBe("");
  });
});

describe("validateTags", () => {
  it("accepts up to eight short tags", () => {
    expect(validateTags("")).toBeUndefined();
    expect(validateTags("a, b, c, d, e, f, g, h")).toBeUndefined();
  });

  it("refuses a ninth tag, but not a repeat of an earlier one", () => {
    expect(validateTags("a, b, c, d, e, f, g, h, i")).toBe(
      "Use at most 8 tags",
    );
    expect(validateTags("a, b, c, d, e, f, g, h, H")).toBeUndefined();
  });

  it("refuses a tag over 30 characters", () => {
    expect(validateTags("x".repeat(31))).toBe(
      "Keep each tag under 30 characters",
    );
    expect(validateTags("x".repeat(30))).toBeUndefined();
  });
});
