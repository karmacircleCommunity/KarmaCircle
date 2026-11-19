import { describe, expect, it } from "vitest";
import {
  computePanelPlacement,
  filterOptions,
  findTypeaheadIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./dropdownUtils";
import type { DropdownOption } from "./dropdownUtils";

const opt = (label: string, extra: Partial<DropdownOption> = {}) => ({
  value: label.toLowerCase(),
  label,
  ...extra,
});

describe("filterOptions", () => {
  const options = [
    opt("Asia/Kolkata (GMT+5:30)"),
    opt("Africa/Cairo"),
    opt("São Tomé"),
    opt("Zambia", { keywords: "northern rhodesia" }),
  ];

  it("returns every option untouched for an empty or blank query", () => {
    expect(filterOptions(options, "")).toBe(options);
    expect(filterOptions(options, "   ")).toBe(options);
  });

  it("matches a word inside the label, not only its start", () => {
    expect(filterOptions(options, "kolk").map((o) => o.label)).toEqual([
      "Asia/Kolkata (GMT+5:30)",
    ]);
  });

  it("ignores case and accents", () => {
    expect(filterOptions(options, "SAO").map((o) => o.label)).toEqual([
      "São Tomé",
    ]);
  });

  it("matches hidden keywords", () => {
    expect(filterOptions(options, "rhodesia").map((o) => o.label)).toEqual([
      "Zambia",
    ]);
  });

  it("ranks a label that starts with the query above one that only contains it", () => {
    const list = [opt("Meetup or networking"), opt("Networking"), opt("Other")];
    expect(filterOptions(list, "net").map((o) => o.label)).toEqual([
      "Networking",
      "Meetup or networking",
    ]);
  });

  it("keeps the original order within a rank", () => {
    expect(filterOptions(options, "a").map((o) => o.label)).toEqual([
      "Asia/Kolkata (GMT+5:30)",
      "Africa/Cairo",
      "São Tomé",
      "Zambia",
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterOptions(options, "xyz")).toEqual([]);
  });
});

describe("nextEnabledIndex", () => {
  const list = [{}, { disabled: true }, {}, { disabled: true }];

  it("steps forward and backward", () => {
    expect(nextEnabledIndex(list, -1, 1)).toBe(0);
    expect(nextEnabledIndex(list, 0, 1)).toBe(2);
    expect(nextEnabledIndex(list, 2, -1)).toBe(0);
  });

  it("wraps at both ends", () => {
    expect(nextEnabledIndex(list, 2, 1)).toBe(0);
    expect(nextEnabledIndex(list, 0, -1)).toBe(2);
  });

  it("returns -1 for an empty list or one with nothing enabled", () => {
    expect(nextEnabledIndex([], -1, 1)).toBe(-1);
    expect(nextEnabledIndex([{ disabled: true }], -1, 1)).toBe(-1);
  });

  it("finds the last enabled option", () => {
    expect(lastEnabledIndex(list)).toBe(2);
    expect(lastEnabledIndex([])).toBe(-1);
  });
});

describe("findTypeaheadIndex", () => {
  const list = [
    { label: "Volunteering drive" },
    { label: "Workshop or training" },
    { label: "Wellness walk" },
    { label: "Other", disabled: true },
  ];

  it("jumps to the first label starting with what was typed", () => {
    expect(findTypeaheadIndex(list, "wo", 0)).toBe(1);
  });

  it("cycles through matches when one letter is repeated", () => {
    expect(findTypeaheadIndex(list, "w", 0)).toBe(1);
    expect(findTypeaheadIndex(list, "ww", 1)).toBe(2);
    expect(findTypeaheadIndex(list, "www", 2)).toBe(1);
  });

  it("skips disabled options", () => {
    expect(findTypeaheadIndex(list, "o", 0)).toBe(-1);
  });

  it("returns -1 for nothing typed or no match", () => {
    expect(findTypeaheadIndex(list, "", 0)).toBe(-1);
    expect(findTypeaheadIndex(list, "q", 0)).toBe(-1);
  });
});

describe("computePanelPlacement", () => {
  const viewport = { width: 1000, height: 800 };
  const base = { viewport, maxPanelHeight: 360, minPanelWidth: 224 };

  it("opens below the trigger when there is room", () => {
    const result = computePanelPlacement({
      ...base,
      trigger: { top: 100, bottom: 148, left: 200, width: 400 },
    });
    expect(result.side).toBe("bottom");
    expect(result.top).toBe(156);
    expect(result.bottom).toBeUndefined();
    expect(result.left).toBe(200);
    expect(result.width).toBe(400);
    expect(result.maxHeight).toBe(360);
  });

  it("flips above when there is little room below and more above", () => {
    const result = computePanelPlacement({
      ...base,
      trigger: { top: 700, bottom: 748, left: 200, width: 400 },
    });
    expect(result.side).toBe("top");
    expect(result.bottom).toBe(108);
    expect(result.top).toBeUndefined();
    expect(result.maxHeight).toBe(360);
  });

  it("caps the height to the room on the chosen side", () => {
    const result = computePanelPlacement({
      ...base,
      viewport: { width: 1000, height: 500 },
      trigger: { top: 100, bottom: 148, left: 200, width: 400 },
    });
    expect(result.side).toBe("bottom");
    expect(result.maxHeight).toBe(332);
  });

  it("widens a narrow trigger to the minimum panel width", () => {
    const result = computePanelPlacement({
      ...base,
      trigger: { top: 100, bottom: 148, left: 200, width: 128 },
    });
    expect(result.width).toBe(224);
  });

  it("slides left so the panel stays inside the viewport", () => {
    const result = computePanelPlacement({
      ...base,
      trigger: { top: 100, bottom: 148, left: 900, width: 128 },
    });
    expect(result.left + result.width).toBeLessThanOrEqual(1000 - 12);
  });

  it("never exceeds a narrow viewport", () => {
    const result = computePanelPlacement({
      ...base,
      viewport: { width: 320, height: 640 },
      trigger: { top: 100, bottom: 148, left: 12, width: 100 },
    });
    expect(result.width).toBe(224);
    expect(result.left).toBeGreaterThanOrEqual(12);
    expect(result.left + result.width).toBeLessThanOrEqual(320 - 12);
  });
});
