import type { ChangeEvent } from "react";
import type { UserType } from "@/types/user";
import type { ProfileCompletionErrors } from "./types";

/** Address sub-shape shared by `useProfileCompletion.ts` and `ProfileUpdate.tsx`. */
export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

/* ---------------------------------------------------------------------
 * hooks/useProfileCompletion.ts + components/ProfileCompletion.tsx
 * ------------------------------------------------------------------- */

export interface ProfileCompletionCredentials {
  description: string;
  coverImage: string;
  address: Address;
}

export interface ProfileCompletionProps {
  setShowEditModal: (open: boolean) => void;
  refreshProfileData: () => void;
}

/** Loose — this is whatever the caller's own fetched/session data looks
 * like (see `handleSetDefaultValues`'s two very different call sites:
 * unused-in-practice from `Dashboard.tsx`, and the shape this hook's own
 * default state matches). Response shape is unverified from this repo. */
export interface ProfileCompletionDefaultValues {
  description?: string;
  coverImage?: string;
  address?: Partial<Address>;
}

export interface UseProfileCompletionResult {
  credentials: ProfileCompletionCredentials;
  errors: ProfileCompletionErrors;
  handleChange: (
    field: string,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  validateForm: (
    updatedCredentials: ProfileCompletionCredentials,
  ) => Promise<boolean | undefined>;
  clearError: (field: string) => void;
  handleResetFields: () => void;
  handleSetDefaultValues: (profileData?: ProfileCompletionDefaultValues) => void;
}

/* ---------------------------------------------------------------------
 * components/ProfileUpdate.tsx — separate, parallel state shape (not a
 * reuse of useProfileCompletion.ts — see SPEC.md).
 * ------------------------------------------------------------------- */

export interface ProfileUpdateProfileData {
  description?: string;
  name?: string;
  address?: Partial<Address>;
  [key: string]: unknown;
}

export interface ProfileUpdateProps {
  setOpenModal: (open: boolean) => void;
  refreshProfileData: () => void;
  profileData?: ProfileUpdateProfileData;
}

/* ---------------------------------------------------------------------
 * utils/checkMissingFields.ts
 * ------------------------------------------------------------------- */

/** Whatever `Profile.tsx` passes in — the Redux `user` object. Every
 * check is `=== undefined`, so this is deliberately loose: an absent
 * key and an empty string are not the same thing to this function. */
export interface CheckableProfileInfo {
  city?: string;
  state?: string;
  address?: string;
  country?: string;
  pincode?: string;
  userType?: UserType | string;
  tagLine?: string;
  description?: string;
  [key: string]: unknown;
}

/* ---------------------------------------------------------------------
 * utils/getProfileFields.ts — unused scaffolding
 * ------------------------------------------------------------------- */

/** Same shape family as `CheckableProfileInfo`, but accessed by dynamic
 * key (`info[field]` for each entry in `brandingFields`/`addressFields`/
 * `mandatoryFields`), hence the index signature. */
export interface ProfileFieldsInfo {
  userType?: UserType | string;
  tagLine?: string;
  [key: string]: unknown;
}

/* ---------------------------------------------------------------------
 * constants/ProfileElements.ts — unused scaffolding
 * ------------------------------------------------------------------- */

export interface ProfileFieldElement {
  id: string;
  label: string;
  placeholder: string;
  minimumLength: number;
  errorMessage: string;
  type: "text" | "textarea";
}

/* ---------------------------------------------------------------------
 * pages/Profile.tsx — the live public profile page
 * ------------------------------------------------------------------- */

/** `useSWR(organizationEndpoints.details(...), fetcher)`'s data. Covers both the
 * organization branch (name/tagLine/description) and the individual branch
 * (firstName/lastName) this page renders, per its own `userType` check.
 * Response shape is unverified from this repo — see SPEC.md. */
export interface ProfileDetails {
  userType?: UserType | string;
  name?: string;
  tagLine?: string;
  firstName?: string;
  lastName?: string;
  description?: string;
  [key: string]: unknown;
}

/* ---------------------------------------------------------------------
 * pages/UserProfile.tsx — not routed
 * ------------------------------------------------------------------- */

export interface UserProfileDetails {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  about?: string;
  profilepicture?: string;
  [key: string]: unknown;
}

/**
 * `Logout()`'s (`KarmaCircleApi.ts`) return shape — like several `KarmaCircleApi.ts`
 * functions, its catch block returns the caught error as-is, so the
 * real inferred type includes `unknown`; asserted at each call site
 * (`Profile.tsx`, `UserProfile.tsx`) to the shape both actually read.
 */
export interface LogoutResponse {
  status?: number;
  data?: { message?: string };
  message?: string;
}

/* ---------------------------------------------------------------------
 * pages/ProfileSetup.tsx + hooks/useProfileSetup.ts — the individual-user
 * equivalent of organizations' `/organization/setup`. Only two fields are
 * in scope (`description`, `address`) — the only ones `PATCH /user/update`
 * actually persists for a profile — so this is a much smaller sibling of
 * `OrganizationSetupForm`/`OrganizationSetupQuestion`, not a generalization
 * of it. See SPEC.md.
 * ------------------------------------------------------------------- */

/** `GET /user/profile`'s `{ user }` payload — the fields this flow reads. */
export interface MyProfile {
  userName?: string;
  name?: string;
  description?: string;
  address?: Partial<Address>;
}

export interface ProfileSetupForm {
  description: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export type ProfileSetupField = keyof ProfileSetupForm;

/** What one field looks like inside the "group" question kind. */
export interface ProfileSetupFieldSpec {
  label: string;
  placeholder?: string;
  maxLength?: number;
}

/**
 * One screen of the flow: a headline, and the field (or small group of
 * fields) it collects. No `requiredFields` here — unlike an organization,
 * an individual profile has no publish gate on the backend, so nothing in
 * this flow blocks Continue.
 */
export interface ProfileSetupQuestion {
  id: string;
  kind: "textarea" | "group";
  headline: string;
  hint?: string;
  fields: ProfileSetupField[];
}

/** Satisfies the shared `SetupStepStatus` (`@/types/setup`) that
 *  `SetupLayout` reads, plus the extra fields `ProfileSetupIntro`'s own
 *  checklist wants. */
export interface ProfileSetupStepStatus {
  id: string;
  title: string;
  current: boolean;
}

/* ---------------------------------------------------------------------
 * utils/geoapify.ts + hooks/useAddressAutocomplete.ts — address-line
 * autocomplete on the setup flow's "address" question.
 *
 * Google Places (New) was the first pass here (same day) — reverted
 * before shipping, in favor of Geoapify, because the person building
 * this didn't want to set up Google Cloud billing for it. Geoapify's
 * free tier (3,000 requests/day, no card) covers this comfortably, and
 * its plain-REST shape needs no script-tag loading, no session tokens,
 * and no ambient `Window` typing the way the Google version did — a
 * `fetch()` response is already JSON. See SPEC.md for the history and
 * `apps/web/.env.example` for the key.
 * ------------------------------------------------------------------- */

/**
 * One row of Geoapify's Address Autocomplete API response
 * (`GET /v1/geocode/autocomplete`), `format=json`. Only the fields this
 * flow actually reads — the live API returns many more (coordinates,
 * OSM metadata, confidence scores, timezone, …).
 */
export interface GeoapifyAddressResult {
  formatted?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}
