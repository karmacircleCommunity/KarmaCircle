import type {
  ProfileSetupField,
  ProfileSetupFieldSpec,
  ProfileSetupQuestion,
} from "../types";

/**
 * Labels and placeholders for the fields that appear inside a `group`
 * question. The `description` question doesn't need an entry — its
 * headline *is* the label (`ProfileSetupQuestion.tsx`'s `textarea` branch).
 *
 * Only `text` inputs — unlike organizations' `FIELD_SPECS`, nothing here is
 * a URL/email/phone/number, so there's no `type`/`inputMode` to vary and no
 * `validateSetupField`-style format checking to do: every value here is
 * free text, and the backend's `addressSchema` has no length cap on any of
 * them, so these `maxLength`s are a sensible UI ceiling, not a mirrored API
 * limit.
 */
export const FIELD_SPECS: Record<
  Exclude<ProfileSetupField, "description">,
  ProfileSetupFieldSpec
> = {
  line1: { label: "Address line 1", placeholder: "14 MG Road", maxLength: 200 },
  line2: {
    label: "Address line 2",
    placeholder: "Apartment, suite, etc. (optional)",
    maxLength: 200,
  },
  city: { label: "City", maxLength: 120 },
  state: { label: "State or region", maxLength: 120 },
  country: { label: "Country", placeholder: "India", maxLength: 120 },
  pincode: { label: "Pincode", maxLength: 12 },
};

/** Test handles, per field — written out rather than derived so a renamed
 *  field can't silently break a spec, same reasoning as organizations'
 *  `FIELD_CY`. */
export const FIELD_CY: Record<ProfileSetupField, string> = {
  description: "profile-description",
  line1: "profile-address-line1",
  line2: "profile-address-line2",
  city: "profile-city",
  state: "profile-state",
  country: "profile-country",
  pincode: "profile-pincode",
};

/**
 * The flow, asked one question at a time — the individual-user equivalent
 * of organizations' `SETUP_STEPS`, but flat: a single step's worth of
 * questions, since nothing here is required and there's no multi-step
 * save boundary worth the extra machinery for three questions.
 */
export const PROFILE_SETUP_QUESTIONS: ProfileSetupQuestion[] = [
  {
    id: "description",
    kind: "textarea",
    headline: "Tell people a little about yourself",
    hint: "A sentence or two is plenty. Shown on your profile.",
    fields: ["description"],
  },
  {
    id: "location",
    kind: "group",
    headline: "Where are you based?",
    hint: "City and state.",
    fields: ["city", "state"],
  },
  {
    id: "address",
    kind: "group",
    headline: "Add your address",
    hint: "Optional, and kept private — not shown on your public profile.",
    fields: ["line1", "line2", "country", "pincode"],
  },
];

export const PROFILE_SETUP_QUESTION_COUNT = PROFILE_SETUP_QUESTIONS.length;
