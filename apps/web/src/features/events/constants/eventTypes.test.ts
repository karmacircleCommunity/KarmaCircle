import { describe, expect, it } from "vitest";
import { EVENT_TYPE_OPTIONS, eventTypeLabel } from "./eventTypes";

describe("event types", () => {
  it("lists the same seven slugs as the API", () => {
    expect(EVENT_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "volunteering",
      "fundraiser",
      "workshop",
      "awareness",
      "meetup",
      "cultural",
      "other",
    ]);
  });

  it("has a unique, non-empty label for each", () => {
    const labels = EVENT_TYPE_OPTIONS.map((option) => option.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every(Boolean)).toBe(true);
  });

  it("looks a label up by slug, and has none for an event without a type", () => {
    expect(eventTypeLabel("workshop")).toBe("Workshop or training");
    expect(eventTypeLabel(undefined)).toBeUndefined();
  });
});
