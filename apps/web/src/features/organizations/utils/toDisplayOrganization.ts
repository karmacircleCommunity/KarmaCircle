import { ORGANIZATION_ACCENTS } from "../constants/organizationDirectory";
import type { ApiOrganization, DisplayOrganization } from "../types";

/**
 * Picks a stable accent for an organization that has no cover photo, so the
 * same record gets the same colour on the card and on its profile header,
 * across reloads and across machines. Derived from the handle rather than
 * stored, because the accent is decoration — it should never be a column
 * the backend has to keep.
 */
function accentFor(handle: string): number {
  let hash = 0;
  for (const char of handle) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash % ORGANIZATION_ACCENTS.length;
}

/** "1,20,000" style grouping is wrong for a global directory; keep it plain. */
function formatAmount(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return String(amount);
}

/**
 * Maps the live `GET /organizations` shape onto what the card and the
 * public profile render.
 *
 * Two rules this encodes, both from the model's own design:
 * - **Nothing is invented.** An organization with no drives gets an empty
 *   `activeDrives`, not a placeholder one, and the profile drops that
 *   section entirely. Same for milestones.
 * - **Typed-in numbers are labelled as typed-in.** `fundsRaised` is the
 *   organization's own claim until donations run through the platform, so
 *   its stat reads "Funds raised (stated)" rather than passing as a figure
 *   KarmaCircle counted.
 */
export function toDisplayOrganization(
  organization: ApiOrganization,
): DisplayOrganization {
  const stats: DisplayOrganization["stats"] = [
    { label: "Team", value: String(organization.teamSize ?? "—") },
    { label: "Followers", value: String(organization.followers ?? 0) },
    { label: "Focus areas", value: String(organization.domains?.length ?? 0) },
  ];

  if (organization.fundsRaised) {
    stats.push({
      label: "Funds raised (stated)",
      value: formatAmount(organization.fundsRaised),
    });
  }

  const description = organization.description?.trim() ?? "";
  const paragraphs = description ? description.split(/\n{2,}/) : [];

  return {
    _id: organization.id,
    userName: organization.handle,
    name: organization.name,
    // The card's two-line summary is the first paragraph of the same
    // description the profile renders in full — an organization should not
    // have to write its "about" twice.
    tagLine: paragraphs[0] ?? "",
    description,
    cause: organization.domains?.[0] ?? organization.tag ?? "Organization",
    city: organization.location?.city ?? "",
    country: organization.location?.country ?? "",
    founded: new Date(organization.createdAt).getFullYear(),
    verified: organization.verified,
    followers: organization.followers ?? 0,
    drives: 0,
    volunteers: organization.teamSize ?? 0,
    accent: accentFor(organization.handle),
    cover: organization.cover || undefined,
    coverAlt: organization.cover
      ? `${organization.name} cover photo`
      : undefined,
    focusAreas: organization.domains ?? [],
    // The header already shows the first paragraph as the tagline, so a
    // one-paragraph description would otherwise print twice on the same
    // screen — full-width under "About us" and again above the stat strip.
    about: paragraphs.length > 1 ? paragraphs : [],
    stats,
    activeDrives: [],
    milestones: [],
    website: organization.website ?? "",
    contactEmail: organization.contactEmail ?? "",
    address: [
      organization.location?.city,
      organization.location?.state,
      organization.location?.country,
    ]
      .filter(Boolean)
      .join(", "),
  };
}
