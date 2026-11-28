import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groupHostedEvents, hostedEventState } from "./groupHostedEvents";

const at = (name: string, day: number, status?: string) => ({
  name,
  status,
  startTime: `2026-09-${day}T10:00:00Z`,
  endTime: `2026-09-${day}T14:00:00Z`,
});
const names = (events: { name: string }[]) => events.map((e) => e.name);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("groupHostedEvents", () => {
  it("keeps drafts out of upcoming and past, whatever their dates", () => {
    const groups = groupHostedEvents([
      at("later draft", 20, "draft"),
      at("old draft", 10, "draft"),
      at("running draft", 15, "draft"),
      at("running", 15, "published"),
      at("next", 18),
      at("older", 11),
      at("old", 12, "cancelled"),
    ]);

    expect(names(groups.drafts)).toEqual([
      "old draft",
      "running draft",
      "later draft",
    ]);
    expect(names(groups.upcoming)).toEqual(["running", "next"]);
    expect(names(groups.past)).toEqual(["old", "older"]);
  });
});

describe("hostedEventState", () => {
  it("never gives a draft a time state", () => {
    for (const day of [10, 15, 20]) {
      expect(hostedEventState(at("draft", day, "draft"))).toBe("Draft");
    }
  });

  it("puts cancelled ahead of happening now", () => {
    expect(hostedEventState(at("off", 15, "cancelled"))).toBe("Cancelled");
    expect(hostedEventState(at("on", 15, "published"))).toBe("Happening now");
    expect(hostedEventState(at("next", 18))).toBeUndefined();
    expect(hostedEventState(at("old", 10))).toBeUndefined();
  });
});
