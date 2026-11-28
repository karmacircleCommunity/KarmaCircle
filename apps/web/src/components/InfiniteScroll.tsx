import { useInfiniteScroll } from "@hooks/useInfiniteScroll";

interface InfiniteScrollProps {
  hasMore: boolean;
  /** A page, or a whole new list, is on its way. */
  loading: boolean;
  failed: boolean;
  itemCount: number;
  /** Plural, for the messages: "events". */
  itemsName: string;
  onLoadMore: () => void;
  onRetry: () => void;
  /** Shown under the list once there is nothing more to fetch. */
  endMessage?: string;
}

/**
 * The end of a list that loads itself as the reader approaches it. Put it right
 * after the list. The list draws its own placeholders (they have to sit in its
 * grid); this watches the end, tells a screen reader a page is loading, offers
 * a retry after a failure and closes the list when there is no more.
 *
 * A failure stops the automatic requests until the reader asks again, so a
 * broken connection never turns into a loop.
 */
const InfiniteScroll = ({
  hasMore,
  loading,
  failed,
  itemCount,
  itemsName,
  onLoadMore,
  onRetry,
  endMessage,
}: InfiniteScrollProps) => {
  const endRef = useInfiniteScroll({
    enabled: hasMore && !loading && !failed,
    itemCount,
    onLoadMore,
  });

  return (
    <>
      <p role="status" className="sr-only">
        {loading && hasMore ? `Loading more ${itemsName}` : ""}
      </p>
      {failed ? (
        <div
          role="alert"
          className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-error/25 bg-error/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="m-0 font-poppins text-body text-ink/80">
            {hasMore
              ? `Could not load more ${itemsName}.`
              : `Could not refresh ${itemsName}.`}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 shrink-0 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-safe:active:scale-97"
          >
            Try again
          </button>
        </div>
      ) : hasMore ? (
        <div ref={endRef} aria-hidden="true" className="h-px" />
      ) : (
        endMessage && (
          <p className="mt-10 font-poppins text-body text-ink/65 sm:text-center">
            {endMessage}
          </p>
        )
      )}
    </>
  );
};

export default InfiniteScroll;
