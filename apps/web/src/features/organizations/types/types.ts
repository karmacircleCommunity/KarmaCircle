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

/**
 * The setup wizard's steps, in order. String ids rather than indexes so
 * they survive in the URL (`/organization/setup?step=reach`) and so
 * inserting a third step later doesn't renumber the two that exist.
 */
export type OrganizationSetupStepId = "about" | "reach";

/**
 * What the setup page is showing. `"intro"` is the opt-in screen a draft
 * organization lands on after signup — setting the profile up is
 * deliberately optional, so nothing is asked of them before they say yes.
 */
export type OrganizationSetupStage = "intro" | OrganizationSetupStepId;
