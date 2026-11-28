import { describe, expect, it } from "vitest";
import { visibleOptions } from "./filterOptions";

/** An "All" option followed by `count` choices: "Kind 1", "Kind 2"... */
const list = (count: number) => [
  "All",
  ...Array.from({ length: count }, (_, index) => `Kind ${index + 1}`),
];

const show = (
  count: number,
  overrides: Partial<Parameters<typeof visibleOptions>[0]> = {},
) =>
  visibleOptions({
    options: list(count),
    defaultValue: "All",
    selected: "All",
    expanded: false,
    query: "",
    ...overrides,
  });

describe("visibleOptions", () => {
  it("draws a short list whole, with nothing to open or search", () => {
    const result = show(7);
    expect(result.shown).toEqual(list(7));
    expect(result.collapsible).toBe(false);
    expect(result.searchable).toBe(false);
  });

  it("never hides a single choice", () => {
    expect(show(9).shown).toEqual(list(9));
    expect(show(9).collapsible).toBe(false);
  });

  it("starts a long list with its first eight choices", () => {
    const result = show(10);
    expect(result.shown).toEqual(list(8));
    expect(result.collapsible).toBe(true);
    expect(result.choiceCount).toBe(10);
  });

  it("draws every choice once opened", () => {
    expect(show(24, { expanded: true }).shown).toEqual(list(24));
  });

  it("keeps the selected choice on a closed list, in its place", () => {
    expect(show(24, { selected: "Kind 20" }).shown).toEqual([
      ...list(8),
      "Kind 20",
    ]);
  });

  it("offers search above fifteen choices only", () => {
    expect(show(15).searchable).toBe(false);
    expect(show(16).searchable).toBe(true);
  });

  it("searches every choice, ignoring case and outer spaces", () => {
    const result = show(24, { query: "  kind 2 " });
    expect(result.shown).toEqual([
      // The selected option, here the default, stays.
      "All",
      "Kind 2",
      "Kind 20",
      "Kind 21",
      "Kind 22",
      "Kind 23",
      "Kind 24",
    ]);
    expect(result.collapsible).toBe(false);
  });

  it("keeps the selected choice while searching and reports no matches", () => {
    const result = show(24, { selected: "Kind 3", query: "zzz" });
    expect(result.shown).toEqual(["Kind 3"]);
    expect(result.noMatches).toBe(true);
  });

  it("ignores a search term on a list that cannot be searched", () => {
    expect(show(7, { query: "zzz" }).shown).toEqual(list(7));
  });
});
