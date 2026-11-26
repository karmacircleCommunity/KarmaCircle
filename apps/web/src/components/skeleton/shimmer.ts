/**
 * The surface of every skeleton placeholder: a brief, generic warm-neutral
 * sweep, not the brand-glow shadow vocabulary - a loading placeholder is not a
 * filled brand surface, it's the absence of content. See
 * `docs/specs/design-system/01-tokens.md#motion-tokens` for `--animate-shimmer`
 * and why it's allowed to loop.
 */
export const SHIMMER =
  "animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(100deg,var(--color-surface-muted)_25%,color-mix(in_srgb,var(--color-brand-secondary)_10%,var(--color-surface-muted))_50%,var(--color-surface-muted)_75%)]";
