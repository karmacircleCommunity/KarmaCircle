import type { ReactNode } from "react";
import Skeleton from "./Skeleton";

interface SkeletonCardProps {
  /** The card body's placeholders, laid out in a column. */
  children: ReactNode;
  testId?: string;
}

/**
 * The placeholder for the directory card (events and organizations): the same
 * outer corners, border, shadow, 16:9 cover and body padding as the real card,
 * so a grid does not move when the content arrives.
 */
const SkeletonCard = ({ children, testId }: SkeletonCardProps) => (
  <div
    aria-hidden="true"
    data-testid={testId}
    className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-secondary/8 bg-white shadow-[0_2px_18px_-14px_var(--color-brand-secondary)]"
  >
    <Skeleton shape="flush" className="aspect-16/9 shrink-0" />
    <div className="flex flex-1 flex-col p-4 sm:p-5">{children}</div>
  </div>
);

export default SkeletonCard;
