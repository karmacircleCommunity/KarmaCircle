import { SHIMMER } from "@components/skeleton/shimmer";

const bar = (className: string) => (
  <div className={`rounded-full ${className} ${SHIMMER}`} />
);

/**
 * Loading placeholder for the event page, in the shape of what replaces it: the
 * back link, the hero card, then the reading column beside the join panel (the
 * panel comes first on a phone, as on the real page). It holds the page open so
 * the footer doesn't jump up and back down while the event loads.
 */
const DetailedEventSkeleton = () => (
  <div role="status">
    <span className="sr-only">Loading event</span>
    <div
      aria-hidden="true"
      className="mx-auto max-w-6xl px-9 pt-8 pb-20 sm:px-10 lg:px-12 lg:pt-12"
    >
      {bar("h-4 w-24")}

      <div className="mt-5 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white">
        <div className={`h-44 sm:h-64 lg:h-80 ${SHIMMER}`} />
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          {bar("h-5 w-32")}
          {bar("h-8 w-3/4")}
          {bar("h-4 w-1/2")}
          {bar("h-4 w-2/3")}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 flex flex-col gap-3 lg:order-1">
          {bar("h-6 w-48")}
          {bar("h-4 w-full")}
          {bar("h-4 w-full")}
          {bar("h-4 w-2/3")}
        </div>
        <div className="order-1 flex flex-col gap-4 rounded-3xl border border-brand-secondary/8 bg-white p-6 lg:order-2">
          {bar("h-6 w-1/2")}
          {bar("h-4 w-2/3")}
          {bar("h-12 w-full")}
        </div>
      </div>
    </div>
  </div>
);

export default DetailedEventSkeleton;
