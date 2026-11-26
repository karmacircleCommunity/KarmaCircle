import { SHIMMER } from "@components/skeleton/shimmer";

/**
 * Loading placeholder for `EventCard`, matched box-for-box so the grid doesn't
 * reflow and the footer doesn't jump when real cards swap in: same outer
 * rounding, border, shadow and padding, same `aspect-16/9` cover, a title that
 * is two lines tall from `sm` up, a two-line summary and the two meta rows.
 *
 * `aria-hidden` throughout - the toolbar's `aria-live` summary already says
 * "Loading events".
 */
const EventCardSkeleton = () => (
  <div
    aria-hidden="true"
    data-testid="event-card-skeleton"
    className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-secondary/8 bg-white shadow-[0_2px_18px_-14px_var(--color-brand-secondary)]"
  >
    <div className={`aspect-16/9 shrink-0 ${SHIMMER}`} />

    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:h-[2.8125rem]">
        <div className={`h-5 w-3/4 rounded-full ${SHIMMER}`} />
        <div className={`hidden h-4 w-2/5 rounded-full sm:block ${SHIMMER}`} />
      </div>

      <div className={`mt-2 h-2.5 w-2/5 rounded-full ${SHIMMER}`} />

      <div className="mt-3 mb-6 flex flex-col gap-2">
        <div className={`h-3.5 w-full rounded-full ${SHIMMER}`} />
        <div className={`h-3.5 w-2/3 rounded-full ${SHIMMER}`} />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className={`h-3 w-1/3 rounded-full ${SHIMMER}`} />
        <div className={`h-3 w-2/5 rounded-full ${SHIMMER}`} />
      </div>
    </div>
  </div>
);

export default EventCardSkeleton;
