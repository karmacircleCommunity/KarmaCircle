import Skeleton from "./Skeleton";

interface SkeletonTextProps {
  lines?: number;
  /** Height of each line. */
  lineClassName?: string;
  /** Spacing and placement of the block. */
  className?: string;
}

/** A paragraph's placeholder. The last of several lines stops short. */
const SkeletonText = ({
  lines = 2,
  lineClassName = "h-3.5",
  className = "",
}: SkeletonTextProps) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton
        key={index}
        className={`${lineClassName} ${lines > 1 && index === lines - 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);

export default SkeletonText;
