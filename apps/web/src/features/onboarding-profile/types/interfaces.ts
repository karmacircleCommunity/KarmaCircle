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
