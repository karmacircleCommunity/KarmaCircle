/**
 * The cause taxonomy the directory filters by. Deliberately a small, closed
 * union rather than a free-form string: the filter chips in
 * `Organizations.tsx` are generated from `CAUSES` in
 * `constants/organizationDirectory.ts`, and a typo'd cause on one record
 * would otherwise silently create a chip nobody can ever match.
 *
 * When the real `GET /organizations` response lands, this is the field most
 * likely to need mapping from whatever the backend calls it.
 */
export type Cause =
  | "Relief"
  | "Education"
  | "Healthcare"
  | "Environment"
  | "Animal welfare"
  | "Livelihood"
  | "Water & sanitation"
  | "Elder care";

/** The cause chips include an "All" pseudo-option that clears the filter. */
export type CauseFilter = Cause | "All";
