/**
 * An organization's initials, used wherever it has no image of its own —
 * the card's cover band and the profile header's badge. Two letters max:
 * three or more stop reading as a monogram and start reading as truncated
 * text.
 */
export const monogram = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
