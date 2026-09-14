/**
 * A closed cause taxonomy, kept for `events/types/interfaces.ts`'s
 * `EventCardEvent.cause` — an event has no cause field of its own
 * (`event.model.ts`) and this type is never actually populated from live
 * data today (`toDisplayEvent.ts` leaves it `undefined` rather than
 * inventing one), but the optional slot stays typed and ready for the day
 * an event inherits its host organization's domain as a displayable cause.
 *
 * `Organizations.tsx`'s own filter chips no longer use this type at all —
 * they're generated from the live `GET /organizations/taxonomy` response
 * (`OrganizationTaxonomy.domains`), a plain `string[]`. This closed union
 * used to also back a twelve-organization sample fixture
 * (`constants/organizationDirectory.ts`, deleted September 2026 — see
 * `docs/specs/known-issues.md`); real demo data lives in
 * `apps/api/scripts/seed-demo-data.ts` now.
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

/**
 * The setup wizard's steps, in order. String ids rather than indexes so
 * they survive in the URL (`/organization/setup?step=reach`) and so
 * inserting a third step later doesn't renumber the two that exist.
 */
export type OrganizationSetupStepId = "about" | "reach" | "presence";

/**
 * What the setup page is showing. `"intro"` is the opt-in screen a draft
 * organization lands on after signup — setting the profile up is
 * deliberately optional, so nothing is asked of them before they say yes.
 */
export type OrganizationSetupStage = "intro" | OrganizationSetupStepId;
