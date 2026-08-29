/**
 * The two closed vocabularies an organization picks from. Closed on
 * purpose: the directory's filters are only useful if every record uses
 * the same words, which free text can't guarantee. Adding an option is a
 * one-line change here — the frontend reads both lists from
 * `GET /organizations/taxonomy` rather than hardcoding its own copy, so
 * the two can never drift.
 */
export const ORGANIZATION_TAGS = [
  "NGO",
  "Charity",
  "Foundation",
  "Club",
  "Student group",
  "Community group",
  "Trust",
  "Self-help group",
] as const;

export const ORGANIZATION_DOMAINS = [
  "Animal welfare",
  "Disaster relief",
  "Education",
  "Environment",
  "Food and hunger",
  "Healthcare",
  "Livelihood",
  "Women and children",
  "Elderly care",
  "Shelter",
] as const;

export type OrganizationTag = (typeof ORGANIZATION_TAGS)[number];
export type OrganizationDomain = (typeof ORGANIZATION_DOMAINS)[number];
