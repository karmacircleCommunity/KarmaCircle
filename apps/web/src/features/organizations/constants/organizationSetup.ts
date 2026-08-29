import type { OrganizationSetupField, OrganizationSetupStep } from "../types";

/**
 * What each required field is called on screen. The backend answers with
 * field names (`missingFields`), not sentences — putting the wording here
 * keeps the API free of copy, and keeps the progress rail and the form
 * labels from drifting apart.
 */
export const REQUIRED_LABELS: Record<string, string> = {
  description: "What you do",
  tag: "What kind of organization",
  domains: "Causes you work on",
  teamSize: "How many people",
  city: "City",
  country: "Country",
};

/**
 * The wizard, as data.
 *
 * Two steps rather than one long form because this is a lot to ask of an
 * account that signed up thirty seconds ago: each step saves on its own
 * (`useOrganizationSetup`), so leaving after step one keeps step one.
 *
 * `requiredFields` across both steps must stay equal to the backend's
 * `REQUIRED_FIELDS` (apps/api/src/modules/organizations/
 * organization.service.ts) — that list is what actually decides whether
 * the organization publishes; this one only decides where each item is
 * asked for. `SETUP_REQUIRED_FIELDS` below is the flattened version, and
 * exists so a mismatch shows up in one place.
 */
export const SETUP_STEPS: OrganizationSetupStep[] = [
  {
    id: "about",
    title: "What your organization does",
    subtitle: "The part people read first. Two or three sentences is plenty.",
    summary: "Your name, your work, and the causes you cover.",
    fields: ["name", "description", "tag", "domains"],
    requiredFields: ["description", "tag", "domains"],
  },
  {
    id: "reach",
    title: "Where you are, and how to reach you",
    subtitle:
      "This is what puts you in the right searches and lets people get in touch.",
    summary: "Location, size, contact details and funding.",
    fields: [
      "teamSize",
      "city",
      "state",
      "country",
      "website",
      "contactEmail",
      "contactPhone",
      "fundsRaised",
      "fundsGoal",
    ],
    requiredFields: ["teamSize", "city", "country"],
  },
];

export const SETUP_REQUIRED_FIELDS: OrganizationSetupField[] =
  SETUP_STEPS.flatMap((step) => step.requiredFields);

/**
 * The backend caps `domains` at five (`updateOrganizationSchema`). The cap
 * is enforced in the UI as well as trusted from it — a sixth chip that
 * looks selectable and then 400s is worse than one that can't be pressed.
 */
export const MAX_DOMAINS = 5;

/**
 * The missing fields as a readable phrase — "what you do, city and
 * country" — for the places that nudge an organization back into setup.
 * Serial-comma-free "a, b and c", matching how the rest of the app's copy
 * reads.
 */
export function describeMissingFields(missingFields: string[]): string {
  const labels = missingFields
    .map((field) => REQUIRED_LABELS[field]?.toLowerCase())
    .filter(Boolean);

  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
