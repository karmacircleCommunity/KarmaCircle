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

/**
 * Anything a phone number can legitimately be written with: digits, a
 * leading `+`, and the separators people actually type (spaces, dashes,
 * dots, brackets). Everything else is dropped as it's typed rather than
 * rejected afterwards - a field that silently accepted `8245034+======`
 * and then failed to save is worse than one that never let the junk land.
 */
const PHONE_ALLOWED = /[^0-9+()\-. ]/g;

/** E.164 tops out at 15 digits; 7 is the shortest real subscriber number. */
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

/**
 * Deliberately not RFC 5322: the point here is to catch the typo (`a@b`,
 * `name@domain`, a stray space) before a save round-trips into a 400, not
 * to out-argue the mail server that will do the real check.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * A host, with the scheme optional because `normalizeWebsite` adds it.
 * Requires a dot and a two-letter-plus TLD, so "karmacircle" is caught
 * here rather than becoming `https://karmacircle` and passing the API's
 * `.url()` - which accepts any scheme-plus-something, single word included.
 */
const WEBSITE =
  /^(https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(:\d{2,5})?([/?#]\S*)?$/i;

/** Matches the API's `contactEmail` ceiling, which is the RFC's own. */
const EMAIL_MAX = 254;

/**
 * Trims a value to what its field can hold as it's typed. Only the phone
 * needs it today - the rest are capped by `maxLength` on the input, which
 * the browser enforces for free.
 */
export function sanitizeSetupValue(
  field: OrganizationSetupField,
  value: string,
): string {
  return field === "contactPhone" ? value.replace(PHONE_ALLOWED, "") : value;
}

/**
 * What's wrong with one answer, as a sentence to put under the field, or
 * `null` when there's nothing wrong with it.
 *
 * Blank is never an error here: these three fields are optional, and
 * "required but empty" is `outstandingFields`' job, said once in its own
 * words. This function only ever objects to something that *was* filled in.
 */
export function validateSetupField(
  field: OrganizationSetupField,
  rawValue: string,
): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  switch (field) {
    case "website": {
      if (!WEBSITE.test(value)) {
        return "Enter a full web address, like karmacircle.org.";
      }
      return null;
    }

    case "contactEmail": {
      if (value.length > EMAIL_MAX) return "That email address is too long.";
      if (!EMAIL.test(value)) {
        return "Enter a valid email address, like hello@karmacircle.org.";
      }
      return null;
    }

    case "contactPhone": {
      const digits = value.replace(/\D/g, "");
      if (digits.length < PHONE_MIN_DIGITS) {
        return "Enter a full phone number, including the area or country code.";
      }
      if (digits.length > PHONE_MAX_DIGITS) {
        return "That's more digits than a phone number has.";
      }
      if (value.includes("+") && !value.startsWith("+")) {
        return "The + belongs at the front, before the country code.";
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Every badly-formed answer in this slice of the form, keyed by field, so a
 * question can refuse to advance and label each offending input in one
 * pass. Empty object means nothing to complain about.
 */
export function invalidFields(
  form: OrganizationSetupForm,
  fields: OrganizationSetupField[],
): Partial<Record<OrganizationSetupField, string>> {
  const errors: Partial<Record<OrganizationSetupField, string>> = {};

  for (const field of fields) {
    const value = form[field];
    if (Array.isArray(value)) continue;

    const error = validateSetupField(field, value);
    if (error) errors[field] = error;
  }

  return errors;
}
