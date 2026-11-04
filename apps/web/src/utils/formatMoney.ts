/**
 * Money display helpers shared across features.
 * Pure functions with no feature knowledge, so any page that shows an amount
 * or a raised-of-goal bar uses these instead of its own formatter.
 */

/**
 * "₹4,50,000", "KES 620,000" - whichever the runtime's locale data can do.
 *
 * Whole units only: a raised-of-goal bar with decimals on it reads as a
 * bank statement, not a fundraiser.
 */
export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

/** Raised as a whole percentage of goal, clamped so an over-funded drive
 *  cannot push the bar past its track. */
export const fundedPercent = (raised: number, goal: number) =>
  goal <= 0 ? 0 : Math.min(100, Math.round((raised / goal) * 100));
