import { Skeleton, SkeletonCard, SkeletonText } from "@components";

/**
 * Loading placeholder for `OrganizationCard`, matched box-for-box so the
 * grid doesn't reflow when real cards swap in: the shared card shell and the
 * same 3-column stat rule at the bottom.
 *
 * Hidden from assistive technology: this is a purely visual stand-in. The page
 * announces the load ("Loading organizations").
 */
const OrganizationCardSkeleton = () => (
  <SkeletonCard testId="organization-card-skeleton">
    <div className="flex flex-1 flex-col gap-3">
      <Skeleton className="h-5 w-3/4" />
      <SkeletonText lines={2} />
      <Skeleton className="h-3 w-2/5" />

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border-subtle pt-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  </SkeletonCard>
);

export default OrganizationCardSkeleton;
