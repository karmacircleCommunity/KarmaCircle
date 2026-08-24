import type { UserType } from "@/types/user";

/**
 * An organization record as rendered by `OrganizationCard.jsx`.
 * Per `organizations/SPEC.md`, the real shape returned by `GET /organizations`
 * is unverified from this repo (no backend code lives here) — this type
 * covers exactly the fields the hardcoded fixture in `Organizations.jsx` and
 * `OrganizationCard.jsx` actually read today, plus an open index signature
 * so a real backend response with extra fields doesn't need a type change
 * to pass through. Tighten this once the backend's `/organizations`
 * response is confirmed.
 */
export interface Organization {
  _id: string;
  userType: UserType;
  userName: string;
  name: string;
  email?: string;
  cart?: unknown[];
  description?: string;
  __v?: number;
  [key: string]: unknown;
}

export interface OrganizationCardProps {
  organization?: Organization;
}
