import type { OrganizationAccent } from "../types";

/**
 * Display-only helpers shared by the organization card, the profile, and
 * (via `ORGANIZATION_ACCENTS`) the event card/hero — decorative palette and
 * number formatting, not business data. Split out from the now-deleted
 * `constants/organizationDirectory.ts`, which held these two genuinely-live
 * exports alongside a twelve-organization sample fixture that nothing
 * fetches or renders any more (see `docs/specs/known-issues.md`) — real
 * demo data lives in `apps/api/scripts/seed-demo-data.ts` now, the same
 * September 2026 move events made.
 */

/**
 * Decorative gradients for the card cover band and the monogram, indexed by
 * each organization's (or, via the same derivation, each event's)
 * `accent`.
 *
 * These are *not* palette tokens and must not become any: they exist only
 * to make several cards on one screen distinguishable at a glance, the way
 * a photo would if every record had one. Every one is a warm hue that sits
 * on the cream page next to `--color-brand` without arguing with it — a
 * cool blue or a saturated green here would read as a different site.
 */
export const ORGANIZATION_ACCENTS: OrganizationAccent[] = [
  { from: "#a8623e", to: "#d8a17c", ink: "#7d4527" },
  { from: "#8a6b3d", to: "#d9c08a", ink: "#6a5029" },
  { from: "#7d5a4f", to: "#c9a596", ink: "#5e4038" },
  { from: "#96603f", to: "#e0b48e", ink: "#70452b" },
  { from: "#6f6a45", to: "#c2bd8f", ink: "#535030" },
  { from: "#9c5450", to: "#dda49c", ink: "#763a37" },
];

/**
 * Compact display form for the raw follower/volunteer counts ("12.4k").
 * `Intl.NumberFormat`'s own `notation: "compact"` rather than a hand-rolled
 * divide-and-round, so it stays correct past a million and localises.
 */
export const formatCount = (value: number): string =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
