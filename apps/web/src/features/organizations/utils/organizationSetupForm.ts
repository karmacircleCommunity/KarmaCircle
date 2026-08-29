import { SETUP_STEPS } from "../constants/organizationSetup";
import type {
  MyOrganization,
  OrganizationSetupField,
  OrganizationSetupForm,
} from "../types";

export const EMPTY_SETUP_FORM: OrganizationSetupForm = {
  name: "",
  description: "",
  tag: "",
  domains: [],
  teamSize: "",
  city: "",
  state: "",
  country: "",
  website: "",
  contactEmail: "",
  contactPhone: "",
  fundsRaised: "",
  fundsGoal: "",
};

/** Fields the API wants as numbers and the form holds as strings. */
const NUMERIC_FIELDS = new Set<OrganizationSetupField>([
  "teamSize",
  "fundsRaised",
  "fundsGoal",
]);

export function toSetupForm(
  organization: MyOrganization,
): OrganizationSetupForm {
  return {
    name: organization.name ?? "",
    description: organization.description ?? "",
    tag: organization.tag ?? "",
    domains: organization.domains ?? [],
    teamSize: organization.teamSize ? String(organization.teamSize) : "",
    city: organization.location?.city ?? "",
    state: organization.location?.state ?? "",
    country: organization.location?.country ?? "",
    website: organization.website ?? "",
    contactEmail: organization.contactEmail ?? "",
    contactPhone: organization.contactPhone ?? "",
    fundsRaised: organization.fundsRaised
      ? String(organization.fundsRaised)
      : "",
    fundsGoal: organization.fundsGoal ? String(organization.fundsGoal) : "",
  };
}

/**
 * `karmacircle.org` is what someone types; `https://karmacircle.org` is
 * what the backend's `.url()` accepts. Prefixing here rather than
 * rejecting there means a correct answer typed the ordinary way saves.
 */
export function normalizeWebsite(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * The body for one step's save: only that step's fields, and only the ones
 * with something in them.
 *
 * An empty string on an optional field is "never touched", not "clear
 * this" — sending `website: ""` to a URL-validated field is the difference
 * between a save and a 400. `domains` is the exception: it is always sent,
 * because deselecting every chip is a real edit an empty-means-untouched
 * rule would silently drop.
 */
export function toStepPayload(
  form: OrganizationSetupForm,
  fields: OrganizationSetupField[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (field === "domains") {
      payload.domains = form.domains;
      continue;
    }

    const value = form[field].trim();
    if (!value) continue;

    if (NUMERIC_FIELDS.has(field)) {
      payload[field] = Number(value);
    } else if (field === "website") {
      payload[field] = normalizeWebsite(value);
    } else {
      payload[field] = value;
    }
  }

  return payload;
}

/** Whether a single field counts as answered. */
export function isFieldFilled(
  form: OrganizationSetupForm,
  field: OrganizationSetupField,
): boolean {
  const value = form[field];
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

/**
 * The required fields of a step that are still empty, read off the form
 * rather than off the server's `missingFields`, so a tick appears as the
 * user types instead of only after a save. The server's list stays the
 * authority on whether the organization actually publishes — the two
 * reconcile on every save, since a step's save is what advances it.
 */
export function outstandingFields(
  form: OrganizationSetupForm,
  fields: OrganizationSetupField[],
): OrganizationSetupField[] {
  return fields.filter((field) => !isFieldFilled(form, field));
}

/** Whether anything in this slice of the form differs from what was saved. */
export function isStepDirty(
  form: OrganizationSetupForm,
  saved: OrganizationSetupForm,
  fields: OrganizationSetupField[],
): boolean {
  return fields.some((field) => {
    const next = form[field];
    const previous = saved[field];

    return Array.isArray(next) && Array.isArray(previous)
      ? next.length !== previous.length ||
          next.some((item, index) => item !== previous[index])
      : next !== previous;
  });
}

/**
 * Where "continue setup" should land: the first step that still has a
 * required field missing, so someone coming back is dropped exactly where
 * they left off rather than at the beginning.
 *
 * Reads the server's `missingFields` (the list that actually gates
 * publication) rather than the form, because every caller of this is
 * outside the setup flow and has no form to read.
 */
export function resumeSetupPath(missingFields: string[]): string {
  const next = SETUP_STEPS.find((step) =>
    step.requiredFields.some((field) => missingFields.includes(field)),
  );

  return next ? `/organization/setup?step=${next.id}` : "/organization/setup";
}
