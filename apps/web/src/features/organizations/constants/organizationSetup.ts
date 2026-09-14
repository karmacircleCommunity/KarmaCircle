import type {
  OrganizationSetupField,
  OrganizationSetupFieldSpec,
  OrganizationSetupQuestion,
  OrganizationSetupStep,
  OrganizationSetupStepId,
} from "../types";

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
};

/**
 * The backend caps `domains` at five (`updateOrganizationSchema`). The cap
 * is enforced in the UI as well as trusted from it — a sixth chip that
 * looks selectable and then 400s is worse than one that can't be pressed.
 */
export const MAX_DOMAINS = 5;

/**
 * Labels and input types for the fields that appear inside a `group`
 * question. Single-field questions don't need an entry: their headline
 * *is* the label, and repeating it underneath reads as a stutter.
 */
export const FIELD_SPECS: Partial<
  Record<OrganizationSetupField, OrganizationSetupFieldSpec>
> = {
  city: { label: "City", type: "text", maxLength: 120 },
  state: { label: "State or region", type: "text", maxLength: 120 },
  /**
   * `type: "text"`, not `"url"` - the field accepts a bare host
   * (`karmacircle.org`, what people actually type) and `normalizeWebsite`
   * adds the scheme on save, whereas a native URL field would reject it
   * with a browser-worded message no one can style or translate. The shape
   * is checked by `validateSetupField` instead, which knows about that
   * normalisation.
   */
  website: {
    label: "Website",
    type: "text",
    placeholder: "karmacircle.org",
    inputMode: "url",
    autoComplete: "url",
    maxLength: 2000,
  },
  contactEmail: {
    label: "Contact email",
    type: "email",
    placeholder: "hello@karmacircle.org",
    inputMode: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  contactPhone: {
    label: "Contact phone",
    type: "tel",
    placeholder: "+91 98300 00000",
    inputMode: "tel",
    autoComplete: "tel",
    maxLength: 30,
  },
  fundsRaised: {
    label: "Raised so far",
    type: "number",
    hint: "Your own figure, shown as stated by you",
  },
  fundsGoal: { label: "Trying to raise", type: "number" },
  logo: {
    label: "Logo URL",
    type: "url",
    placeholder: "https://…",
    hint: "A square image works best. Direct upload is coming later — paste a link for now.",
    maxLength: 2000,
  },
  cover: {
    label: "Cover photo URL",
    type: "url",
    placeholder: "https://…",
    hint: "Wide (16:9) — this is what shows on your directory card.",
    maxLength: 2000,
  },
  address: {
    label: "Street address",
    type: "text",
    placeholder: "14 MG Road",
    maxLength: 200,
  },
  mapIframe: {
    label: "Map embed URL",
    type: "url",
    placeholder: "https://www.google.com/maps/embed?…",
    hint: "From a map's own \"Share → Embed\" option.",
    maxLength: 2000,
  },
  socialInstagram: { label: "Instagram", type: "url", placeholder: "https://instagram.com/…" },
  socialFacebook: { label: "Facebook", type: "url", placeholder: "https://facebook.com/…" },
  socialTwitter: { label: "X (Twitter)", type: "url", placeholder: "https://x.com/…" },
  socialLinkedin: { label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/company/…" },
  socialYoutube: { label: "YouTube", type: "url", placeholder: "https://youtube.com/@…" },
};

/**
 * Test handles, per field. Written out rather than derived from the field
 * name so the Cypress specs keep working regardless of how a field is
 * spelled in the model (`contactEmail` has always been `org-contact-email`
 * on screen), and so renaming a field can't silently break a spec.
 */
export const FIELD_CY: Record<OrganizationSetupField, string> = {
  name: "org-name",
  description: "org-description",
  tag: "org-tag",
  // Singular, matching the per-chip handle each domain button actually
  // renders (`org-domain-Shelter`, …) - this entry is only ever consumed as
  // a prefix match (`focusFirstAnswer` in OrganizationSetup.tsx), and the
  // plural "org-domains" that used to be here never matched anything, so a
  // Continue refused on this screen silently failed to focus the chips.
  domains: "org-domain",
  teamSize: "org-teamsize",
  city: "org-city",
  state: "org-state",
  website: "org-website",
  contactEmail: "org-contact-email",
  contactPhone: "org-contact-phone",
  fundsRaised: "org-funds-raised",
  fundsGoal: "org-funds-goal",
  address: "org-address",
  mapIframe: "org-map-iframe",
  logo: "org-logo",
  cover: "org-cover",
  socialInstagram: "org-social-instagram",
  socialFacebook: "org-social-facebook",
  socialTwitter: "org-social-twitter",
  socialLinkedin: "org-social-linkedin",
  socialYoutube: "org-social-youtube",
  sponsorshipEnabled: "org-sponsorship-enabled",
  leadership: "org-leadership",
};

/**
 * The flow, asked one question at a time.
 *
 * Written as data rather than as components because everything else reads
 * it: the progress bar counts these, the URL addresses them
 * (`?step=about&q=2`), the save boundary is the end of a step's list, and
 * the resume link finds the first step still unanswered. Adding a question
 * is an entry here plus, at most, a `FIELD_SPECS` row.
 *
 * Two rules the copy follows: every headline is a question a person would
 * actually ask out loud, and anything optional says so on screen rather
 * than leaving someone guessing whether a blank box will cost them.
 */
const ABOUT_QUESTIONS: OrganizationSetupQuestion[] = [
  {
    id: "name",
    kind: "text",
    headline: "What's your organization called?",
    hint: "The name people will search for.",
    fields: ["name"],
    requiredFields: ["name"],
  },
  {
    id: "description",
    kind: "textarea",
    headline: "What do you actually do?",
    hint: "Two or three sentences on the work you run, who it reaches, and where.",
    fields: ["description"],
    requiredFields: ["description"],
  },
  {
    id: "tag",
    kind: "choice",
    headline: "What kind of organization are you?",
    fields: ["tag"],
    requiredFields: ["tag"],
  },
  {
    id: "domains",
    kind: "chips",
    headline: "Which causes do you work on?",
    hint: `Pick up to ${MAX_DOMAINS}. These are the filters people find you by.`,
    fields: ["domains"],
    requiredFields: ["domains"],
  },
];

const REACH_QUESTIONS: OrganizationSetupQuestion[] = [
  {
    id: "teamSize",
    kind: "number",
    headline: "How many people are behind it?",
    hint: "Staff and regular volunteers — a rough number is fine.",
    fields: ["teamSize"],
    requiredFields: ["teamSize"],
  },
  {
    id: "location",
    kind: "group",
    headline: "Where are you based?",
    hint: "This is what puts you in the right local searches.",
    fields: ["city", "state"],
    requiredFields: ["city"],
  },
  {
    id: "contact",
    kind: "group",
    headline: "How can people reach you?",
    hint: "All optional — but a profile with no way to get in touch rarely hears from anyone.",
    fields: ["website", "contactEmail", "contactPhone"],
    requiredFields: [],
  },
  {
    id: "funding",
    kind: "group",
    headline: "Anything you'd like to say about funding?",
    hint: "Optional. Shown on your profile as your own stated figures, never as a verified total.",
    fields: ["fundsRaised", "fundsGoal"],
    requiredFields: [],
  },
];

/**
 * Everything here is optional — none of it joins `REQUIRED_FIELDS`
 * (organization.service.ts), the same precedent `logo` already set before
 * this step existed: an organization can go live with none of this filled
 * in, and fill it in later from the same wizard (it doubles as the edit
 * flow — see organizations.md).
 */
const PRESENCE_QUESTIONS: OrganizationSetupQuestion[] = [
  {
    id: "logoCover",
    kind: "group",
    headline: "Add a logo and a cover photo",
    hint: "Both optional, and both just a pasted image URL for now.",
    fields: ["logo", "cover"],
    requiredFields: [],
  },
  {
    id: "socials",
    kind: "group",
    headline: "Where can people find you online?",
    hint: "All optional — only the ones you fill in show up on your profile.",
    fields: [
      "socialInstagram",
      "socialFacebook",
      "socialTwitter",
      "socialLinkedin",
      "socialYoutube",
    ],
    requiredFields: [],
  },
  {
    id: "addressMap",
    kind: "group",
    headline: "Add a street address or a map",
    hint: "Optional, beyond the city and state you already gave.",
    fields: ["address", "mapIframe"],
    requiredFields: [],
  },
  {
    id: "leadership",
    kind: "list",
    headline: "Who leads this organization?",
    hint: "Optional — introduce up to 8 people on your public profile.",
    fields: ["leadership"],
    requiredFields: [],
  },
  {
    id: "sponsorship",
    kind: "toggle",
    headline: "Accept direct support through KarmaCircle?",
    hint: "Turns on a real \"Support\" button on your profile, paid through Razorpay.",
    fields: ["sponsorshipEnabled"],
    requiredFields: [],
  },
];

/** Flattens a step's questions into the field lists the rest of the app uses. */
function toStep(
  id: OrganizationSetupStepId,
  title: string,
  summary: string,
  questions: OrganizationSetupQuestion[],
): OrganizationSetupStep {
  return {
    id,
    title,
    summary,
    questions,
    fields: questions.flatMap((question) => question.fields),
    // `name` is deliberately dropped here: signup always fills it, so it
    // can never be what blocks publication, and counting it would have the
    // progress rail claim a detail is outstanding when it isn't. It stays
    // in the question's own `requiredFields` so the screen still marks it
    // as needed.
    requiredFields: questions.flatMap((question) =>
      question.requiredFields.filter((field) => field !== "name"),
    ),
  };
}

export const SETUP_STEPS: OrganizationSetupStep[] = [
  toStep(
    "about",
    "What your organization does",
    "Your name, your work, and the causes you cover.",
    ABOUT_QUESTIONS,
  ),
  toStep(
    "reach",
    "Where you are, and how to reach you",
    "Location, size, contact details and funding.",
    REACH_QUESTIONS,
  ),
  toStep(
    "presence",
    "Round out your profile",
    "Logo, cover, socials, your team, and support.",
    PRESENCE_QUESTIONS,
  ),
];

export const SETUP_REQUIRED_FIELDS: OrganizationSetupField[] =
  SETUP_STEPS.flatMap((step) => step.requiredFields);

/** How many screens the whole flow is, for the progress bar's denominator. */
export const SETUP_QUESTION_COUNT = SETUP_STEPS.reduce(
  (total, step) => total + step.questions.length,
  0,
);

/**
 * The missing fields as a readable phrase — "what you do, how many people
 * and city" — for the places that nudge an organization back into setup.
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
