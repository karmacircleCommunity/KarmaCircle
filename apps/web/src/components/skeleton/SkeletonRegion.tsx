import type { ReactNode } from "react";

interface SkeletonRegionProps {
  /** What is loading, for a screen reader: "Loading event". */
  label: string;
  /** Layout of the placeholders. */
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a whole loading screen: says what is loading once, and hides the
 * placeholder blocks. Not needed where the page already announces the load.
 */
const SkeletonRegion = ({
  label,
  className,
  children,
}: SkeletonRegionProps) => (
  <div role="status">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className={className}>
      {children}
    </div>
  </div>
);

export default SkeletonRegion;
