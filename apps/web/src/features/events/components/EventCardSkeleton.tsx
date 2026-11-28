import { Skeleton, SkeletonCard, SkeletonText } from "@components";

/**
 * Loading placeholder for `EventCard`, matched box-for-box so the grid doesn't
 * reflow and the footer doesn't jump when real cards swap in: the shared card
 * shell, a title that is two lines tall from `sm` up, the organizer line, a
 * two-line summary and the two meta rows. Each wrapper has the height of the
 * line of text it stands for, so change them together with the card.
 *
 * Hidden from assistive technology - the page's own status line says events are
 * loading.
 */
const EventCardSkeleton = () => (
  <SkeletonCard testId="event-card-skeleton">
    <div className="flex flex-col gap-2 sm:h-[2.8125rem]">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="hidden h-4 w-2/5 sm:block" />
    </div>

    <div className="mt-1 flex h-[0.9375rem] items-center">
      <Skeleton className="h-2.5 w-2/5" />
    </div>

    <div className="mt-2 mb-6 flex h-11 flex-col justify-center">
      <SkeletonText lines={2} />
    </div>

    <div className="mt-auto mb-0.5 flex flex-col gap-3">
      {["w-1/3", "w-2/5"].map((width) => (
        <div key={width} className="flex h-[0.9375rem] items-center">
          <Skeleton className={`h-3 ${width}`} />
        </div>
      ))}
    </div>
  </SkeletonCard>
);

export default EventCardSkeleton;
