import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface InfiniteScrollOptions {
  /** There is more to fetch and nothing is stopping the next request. */
  enabled: boolean;
  /** How many items are on the page; a change watches the end again. */
  itemCount: number;
  onLoadMore: () => void;
  /** How far before the end of the list the next request starts. */
  rootMargin?: string;
}

/**
 * Calls `onLoadMore` when the element given the returned ref comes near the
 * viewport. It asks once, then waits until `enabled` or `itemCount` changes, so
 * one approach never starts two requests. Watching again also covers a screen
 * tall enough that the end is still in view after a page arrives.
 */
export const useInfiniteScroll = ({
  enabled,
  itemCount,
  onLoadMore,
  rootMargin = "0px 0px 600px 0px",
}: InfiniteScrollOptions) => {
  const [node, setNode] = useState<Element | null>(null);
  const load = useRef(onLoadMore);

  useLayoutEffect(() => {
    load.current = onLoadMore;
  });

  useEffect(() => {
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load.current();
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, itemCount, node, rootMargin]);

  return setNode;
};
