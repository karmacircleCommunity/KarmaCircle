import type { ComponentPropsWithoutRef } from "react";

/**
 * The surface of every placeholder: a brief, generic warm-neutral sweep (mixed
 * from the brand's dark tone so it shows on both the page and white cards), not
 * the brand-glow shadow vocabulary - a loading placeholder is not a filled
 * brand surface, it is the absence of content. See
 * `docs/specs/design-system/01-tokens.md#motion-tokens` for `--animate-shimmer`
 * and why it is allowed to loop. The sweep stops under reduced motion; the
 * still blocks and the region's spoken label already say "loading".
 */
const SURFACE =
  "animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(100deg,color-mix(in_srgb,var(--color-brand-secondary)_7%,white)_25%,color-mix(in_srgb,var(--color-brand-secondary)_13%,white)_50%,color-mix(in_srgb,var(--color-brand-secondary)_7%,white)_75%)] motion-reduce:animate-none";

const SHAPES = {
  /** Lines of text, chips and avatars (a circle when the box is square). */
  pill: "rounded-full",
  /** Buttons, fields and tiles. */
  box: "rounded-xl",
  /** A block that takes its container's own corners, such as a card cover. */
  flush: "",
};

interface SkeletonProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  shape?: keyof typeof SHAPES;
}

/**
 * One placeholder block, the base of every skeleton in the app. Size it with
 * `className` (a width and a height, or an aspect ratio); it has neither of its
 * own. It is hidden from assistive technology: announce the loading once,
 * with `SkeletonRegion` or a live status line.
 */
const Skeleton = ({
  shape = "pill",
  className = "",
  ...props
}: SkeletonProps) => (
  <div
    {...props}
    aria-hidden="true"
    data-skeleton=""
    className={`${SHAPES[shape]} ${SURFACE} ${className}`}
  />
);

export default Skeleton;
