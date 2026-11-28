import { Skeleton, SkeletonRegion, SkeletonText } from "@components";

const PANEL = "rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7";

/**
 * Loading placeholder for the event page, in the shape of what replaces it: the
 * back link, the hero card (cover, kind, title, host, three facts), then the
 * reading column beside the join and organizer panels (the panels come first on
 * a phone, as on the real page). It uses the page's own containers, so nothing
 * shifts sideways and the footer doesn't jump while the event loads.
 */
const DetailedEventSkeleton = () => (
  <SkeletonRegion label="Loading event">
    <div className="mx-auto max-w-6xl px-9 pt-8 sm:px-10 lg:px-12 lg:pt-12">
      {/* Each wrapper is as tall as the line of text it stands for. */}
      <div className="flex h-[1.5625rem] items-center">
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white">
        <Skeleton shape="flush" className="h-44 sm:h-64 lg:h-80" />
        <div className="p-6 sm:p-8">
          <Skeleton className="mb-3 h-[1.5625rem] w-36" />
          <Skeleton className="h-[2.1875rem] w-4/5 sm:h-[2.8125rem] sm:w-3/5" />
          <div className="mt-3 flex h-[1.625rem] items-center">
            <Skeleton className="h-4 w-1/2 sm:w-1/4" />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
            {["w-2/3 sm:w-36", "w-1/3 sm:w-20", "w-1/2 sm:w-36"].map(
              (width, index) => (
                <div
                  key={index}
                  className={`flex h-[1.4375rem] items-center ${width}`}
                >
                  <Skeleton className="h-4 w-full" />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-6xl px-9 pt-12 pb-36 sm:px-10 lg:px-12 lg:py-16">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 min-w-0 lg:order-1">
          <Skeleton className="mb-5 h-9 w-52" />
          <SkeletonText lines={4} lineClassName="h-4" className="gap-4" />
          <Skeleton className="mt-12 mb-5 h-9 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} shape="box" className="h-20" />
            ))}
          </div>
        </div>

        <div className="order-1 flex flex-col gap-5 lg:order-2">
          <div className={PANEL}>
            <Skeleton className="h-6 w-1/2" />
            <SkeletonText lines={2} className="mt-4" />
            <Skeleton shape="box" className="mt-6 h-12" />
          </div>
          <div className={`${PANEL} flex items-center gap-4`}>
            <Skeleton shape="box" className="size-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <SkeletonText lines={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </SkeletonRegion>
);

export default DetailedEventSkeleton;
