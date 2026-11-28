import { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import type { SWRInfiniteConfiguration } from "swr/infinite";
import fetcher from "@utils/Fetcher";
import { hasMorePages, uniqueItems } from "@utils/pagedList";

/** One page as the API answers a list request. */
interface PagedAnswer<Item> {
  data: Item[];
  pagination: { total: number; totalPages: number };
}

/** The address of a page, with whoever it is private to when it is. */
export type PageKey = string | readonly [url: string, viewer: string];

interface PagedListOptions<Page, Item> {
  /** The key of page `page` (counting from 1), or `null` to ask for nothing. */
  getKey: (page: number) => PageKey | null;
  /** What makes an item the same item on two pages. */
  itemKey: (item: Item) => string;
  /** Anything else `useSWRInfinite` takes, such as `keepPreviousData`. */
  config?: SWRInfiniteConfiguration<Page>;
}

/**
 * A list the API pages, loaded as the reader scrolls. Pair it with
 * `InfiniteScroll`: spread `scroll` onto it and draw placeholders while
 * `isLoadingMore`.
 *
 * - A new page does not wait for earlier ones to be checked again.
 * - Pages kept from an earlier visit are all refetched once on return, because
 *   something added or removed shifts every page after it. (`revalidateAll`
 *   would also do that each time scrolling adds a page.)
 * - An item that moved between pages is listed once.
 * - SWR keeps a failure until a request succeeds, so a retry the reader asked
 *   for is tracked here: it shows as loading, not as still failed.
 */
export const usePagedList = <Item, Page extends PagedAnswer<Item>>({
  getKey,
  itemKey,
  config,
}: PagedListOptions<Page, Item>) => {
  const { data, error, isLoading, mutate, size, setSize } =
    useSWRInfinite<Page>(
      (index: number, previous: Page | null) =>
        previous && index >= previous.pagination.totalPages
          ? null
          : getKey(index + 1),
      (key: PageKey) => fetcher<Page>(typeof key === "string" ? key : key[0]),
      { parallel: true, ...config },
    );

  const cameBackWithPages = useRef(data !== undefined);
  useEffect(() => {
    if (!cameBackWithPages.current) return;
    cameBackWithPages.current = false;
    void mutate();
  }, [mutate]);

  // `itemKey` is a plain field read, usually written inline, so only new pages
  // rebuild the list.
  const items = useMemo(() => uniqueItems(data, itemKey), [data]);
  const loadedPages = data?.length ?? 0;
  const hasMore = hasMorePages(data);
  const [retrying, setRetrying] = useState(false);
  const failed = Boolean(error) && !retrying;
  const isLoadingMore = hasMore && size > loadedPages && !failed;
  const total = data?.[0]?.pagination.total ?? 0;

  return {
    /** The first page, for what only it carries (totals, a summary). */
    first: data?.[0],
    items,
    total,
    /** How many items the next page may bring, for sizing placeholders. */
    remaining: Math.max(total - items.length, 0),
    loadedPages,
    error,
    /** A list (the first page for these filters) is on its way. */
    isLoading,
    isLoadingMore,
    mutate,
    scroll: {
      hasMore,
      loading: isLoading || isLoadingMore,
      failed,
      itemCount: items.length,
      onLoadMore: () => void setSize(loadedPages + 1),
      onRetry: () => {
        setRetrying(true);
        void mutate().finally(() => setRetrying(false));
      },
    },
  };
};
