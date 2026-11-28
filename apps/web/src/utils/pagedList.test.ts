import { describe, expect, it } from "vitest";
import { hasMorePages, uniqueItems } from "./pagedList";

const page = (ids: string[], totalPages: number) => ({
  data: ids.map((id) => ({ id })),
  pagination: { totalPages },
});
const id = (item: { id: string }) => item.id;

describe("uniqueItems", () => {
  it("keeps page order and shows a repeated item once", () => {
    const pages = [page(["a", "b"], 2), page(["b", "c"], 2)];

    expect(uniqueItems(pages, id).map(id)).toEqual(["a", "b", "c"]);
  });

  it("is empty before anything has loaded", () => {
    expect(uniqueItems(undefined, id)).toEqual([]);
  });
});

describe("hasMorePages", () => {
  it("is true until the last page is loaded", () => {
    expect(hasMorePages([page(["a"], 2)])).toBe(true);
    expect(hasMorePages([page(["a"], 2), page(["b"], 2)])).toBe(false);
  });

  it("believes the newest page when the list has shrunk", () => {
    expect(hasMorePages([page(["a"], 3), page(["b"], 2)])).toBe(false);
  });

  it("is false with nothing loaded or nothing to load", () => {
    expect(hasMorePages(undefined)).toBe(false);
    expect(hasMorePages([])).toBe(false);
    expect(hasMorePages([page([], 0)])).toBe(false);
  });
});
