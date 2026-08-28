import type { UserType } from "@/types/user";
import type { Cause } from "./types";

/**
 * An organization record as rendered by `OrganizationCard.tsx`.
 * Per `organizations/SPEC.md`, the real shape returned by `GET /organizations`
 * is unverified from this repo (no backend code lives here) — this type
 * covers exactly the fields the fixture in
 * `constants/organizationDirectory.ts` reads today, plus an open index
 * signature so a real backend response with extra fields doesn't need a
 * type change to pass through. Tighten this once the backend's
 * `/organizations` response is confirmed.
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

/**
 * One headline number on an organization's profile ("₹41L moved", "18
 * drives run"). A string, not a number, because the unit is part of the
 * value and varies by organization (currency symbol, "L"/"k" shorthand).
 */
export interface OrganizationStat {
  label: string;
  value: string;
}

/**
 * A drive an organization is currently running. Intentionally the same
 * shape as `landing-home`'s `SampleDrive` minus the fields the landing rail
 * needs and a profile doesn't (the organizer is the page you're already on),
 * so the two can converge on one type when a real drives endpoint exists.
 */
export interface OrganizationDrive {
  id: string;
  title: string;
  summary: string;
  raised: string;
  goal: string;
  /** 0-100. Drives the progress bar's width and its `aria-valuenow`. */
  percent: number;
  supporters: number;
  daysLeft: number;
}

/** One entry on the profile's track-record timeline. */
export interface OrganizationMilestone {
  id: string;
  year: string;
  title: string;
  body: string;
}

/**
 * A directory-grade organization: everything the card grid and the public
 * profile page render. Extends `Organization` so it stays assignable to
 * whatever the API path eventually returns.
 *
 * `accent` is an index into `ORGANIZATION_ACCENTS`, which now only tints the
 * monogram on the profile header - the card itself is identified by its
 * `cover` photo (`assets/pictures/organizations/`, one per organization).
 * Whatever replaces this fixture must keep giving every organization its own
 * image: reusing one shared banner across every card is what made the old
 * grid read as twenty copies of one record.
 */
export interface DirectoryOrganization extends Organization {
  tagLine: string;
  description: string;
  cause: Cause;
  city: string;
  country: string;
  founded: number;
  verified: boolean;
  followers: number;
  drives: number;
  volunteers: number;
  accent: number;
  /** Cover photo, imported so Vite fingerprints it. Placeholder imagery
   *  standing in for what an organization would upload for itself. */
  cover: string;
  /** Describes the photo itself; the organization's own text is already
   *  in the card. */
  coverAlt: string;
  focusAreas: string[];
  /** Long-form "About us" copy, one string per rendered paragraph. */
  about: string[];
  stats: OrganizationStat[];
  activeDrives: OrganizationDrive[];
  milestones: OrganizationMilestone[];
  website: string;
  contactEmail: string;
  address: string;
}

/** The decorative gradient/monogram palette one `accent` index resolves to. */
export interface OrganizationAccent {
  from: string;
  to: string;
  /** Monogram foreground; the chip/monogram background is `from` at low alpha. */
  ink: string;
}

export interface OrganizationCardProps {
  organization: DirectoryOrganization;
}
