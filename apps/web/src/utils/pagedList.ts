/** The part of a paged API answer these helpers read. */
interface Page<T> {
  data: T[];
  pagination: { totalPages: number };
}

/**
 * Every loaded item once, in page order. Items can move between pages while a
 * list is being scrolled (one is added or removed above), so the same one can
 * arrive twice.
 */
export function uniqueItems<T>(
  pages: ReadonlyArray<Page<T>> | undefined,
  keyOf: (item: T) => string,
): T[] {
  const seen = new Map<string, T>();
  for (const page of pages ?? []) {
    for (const item of page.data) {
      if (!seen.has(keyOf(item))) seen.set(keyOf(item), item);
    }
  }
  return [...seen.values()];
}

/** Whether the newest loaded page says another one follows it. */
export function hasMorePages<T>(
  pages: ReadonlyArray<Page<T>> | undefined,
): boolean {
  const last = pages?.[pages.length - 1];
  return Boolean(pages && last && pages.length < last.pagination.totalPages);
}
