import Skeleton from "./Skeleton";

interface SkeletonRowsProps {
  count?: number;
  /** Lines of text in each row, the first one standing for its title. */
  lines?: number;
  /** What sits at the end of a row (below it on a phone). */
  trailing?: "pill" | "button";
  /** Spacing and placement of the stack. */
  className?: string;
  testId?: string;
}

/** Widths cycle so a row reads as text, not as a block. */
const LINE_WIDTHS = ["w-3/5", "w-2/5", "w-4/5"];

const TRAILING = {
  pill: <Skeleton className="h-7 w-28 shrink-0" />,
  button: <Skeleton shape="box" className="h-12 w-28 shrink-0" />,
};

/**
 * Placeholders for a stack of list rows: bordered white cards with a few lines
 * and something at the end. Hidden from assistive technology.
 */
const SkeletonRows = ({
  count = 3,
  lines = 3,
  trailing,
  className = "",
  testId,
}: SkeletonRowsProps) => (
  <div aria-hidden="true" className={`flex flex-col gap-3 ${className}`}>
    {Array.from({ length: count }, (_, row) => (
      <div
        key={row}
        data-testid={testId}
        className="flex flex-col gap-3 rounded-2xl border border-brand-secondary/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {Array.from({ length: lines }, (_, line) => (
            <Skeleton
              key={line}
              className={`${line === 0 ? "h-5" : "h-3.5"} ${LINE_WIDTHS[line % LINE_WIDTHS.length]}`}
            />
          ))}
        </div>
        {trailing && TRAILING[trailing]}
      </div>
    ))}
  </div>
);

export default SkeletonRows;
