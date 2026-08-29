import type { UserType } from "@/types/user";
import type { Cause, OrganizationSetupStepId } from "./types";

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
 * Everything the directory card and the public profile actually render.
 *
 * Split out from `DirectoryOrganization` (which is now only the sample
 * fixture's shape) so both surfaces can be handed either a fixture record
 * or a live one mapped from `GET /organizations` — see
 * `utils/toDisplayOrganization.ts`. Fields a freshly signed-up
 * organization has no way to fill yet (`cover`, `activeDrives`,
 * `milestones`) are optional or empty rather than faked: a section with no
 * data does not render at all.
 */
export interface DisplayOrganization {
  _id: string;
  /** The URL segment: `/organization/{userName}`. The API calls it `handle`. */
  userName: string;
  name: string;
  tagLine: string;
  description: string;
  /** The primary domain, shown as the card's label. Widened to `string`
   *  because the live list comes from the backend's taxonomy, not from
   *  `CAUSES`. */
  cause: string;
  city: string;
  country: string;
  founded: number;
  verified: boolean;
  followers: number;
  drives: number;
  volunteers: number;
  accent: number;
  /** Absent until an organization uploads one — the card and the profile
   *  header both fall back to an accent band with the monogram on it. */
  cover?: string;
  coverAlt?: string;
  focusAreas: string[];
  about: string[];
  stats: OrganizationStat[];
  activeDrives: OrganizationDrive[];
  milestones: OrganizationMilestone[];
  website: string;
  contactEmail: string;
  address: string;
}

/**
 * A record from the sample fixture in `constants/organizationDirectory.ts`.
 * Kept as its own type because the fixture guarantees fields (a real cover
 * photo, a `Cause` from the closed union) that a live record does not.
 */
export interface DirectoryOrganization extends Omit<
  DisplayOrganization,
  "cause" | "cover" | "coverAlt"
> {
  cause: Cause;
  cover: string;
  coverAlt: string;
  email?: string;
  userType?: UserType;
}

/**
 * One organization exactly as `GET /organizations` and
 * `GET /organizations/{handle}` return it. Mirrors `toPublic()` in
 * apps/api/src/modules/organizations/organization.service.ts — the two
 * must be changed together.
 */
export interface ApiOrganization {
  id: string;
  handle: string;
  name: string;
  tag?: string;
  domains: string[];
  description?: string;
  teamSize?: number;
  location: { city?: string; state?: string; country?: string };
  website?: string;
  contactEmail?: string;
  logo?: string;
  cover?: string;
  gallery: string[];
  fundsRaised?: number;
  fundsGoal?: number;
  followers: number;
  verified: boolean;
  createdAt: string;
}

/** `GET /organizations` — the paginated directory response. */
export interface ApiOrganizationList {
  data: ApiOrganization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * `GET /organizations/me` — the owner's own view. Adds the private fields
 * and the two derived values the setup form's checklist is built from:
 * `missingFields` (what still blocks going live) and `isLive`.
 */
export interface MyOrganization extends ApiOrganization {
  ownerEmail: string;
  contactPhone?: string;
  members: Array<{ email: string; role: string; addedAt: string }>;
  status: "draft" | "live" | "suspended";
  missingFields: string[];
  isLive: boolean;
}

/** `GET /organizations/taxonomy` — the closed lists the setup form offers. */
export interface OrganizationTaxonomy {
  tags: string[];
  domains: string[];
}

/** The decorative gradient/monogram palette one `accent` index resolves to. */
export interface OrganizationAccent {
  from: string;
  to: string;
  /** Monogram foreground; the chip/monogram background is `from` at low alpha. */
  ink: string;
}

export interface OrganizationCardProps {
  organization: DisplayOrganization;
}

/**
 * Every field the setup wizard can edit, as strings (what an `<input>`
 * actually holds) plus the one array. Keys are deliberately identical to
 * the names `PATCH /organizations/me` accepts and to the backend's
 * `REQUIRED_FIELDS` entries, so a step's field list, its required list,
 * the checklist labels and the request body are all one vocabulary with
 * no mapping table in between.
 */
export interface OrganizationSetupForm {
  name: string;
  description: string;
  tag: string;
  domains: string[];
  teamSize: string;
  city: string;
  state: string;
  country: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  fundsRaised: string;
  fundsGoal: string;
}

export type OrganizationSetupField = keyof OrganizationSetupForm;

/**
 * One step of the wizard, declared as data. A new step is an entry in
 * `SETUP_STEPS` (constants/organizationSetup.ts) plus a component that
 * renders its fields — the layout, the progress rail, the per-step save
 * and the URL handling all read this list rather than hardcoding two
 * steps.
 */
export interface OrganizationSetupStep {
  id: OrganizationSetupStepId;
  /** Heading above the form on that step. */
  title: string;
  /** One line under the heading, on the form itself. */
  subtitle: string;
  /** The shorter line the left-hand progress rail shows. */
  summary: string;
  /** Everything this step saves. Only these keys are sent when it saves. */
  fields: OrganizationSetupField[];
  /**
   * The subset of `fields` that blocks publication. Mirrors the backend's
   * `REQUIRED_FIELDS` — split across the steps, and the two lists must
   * add up to the same set.
   */
  requiredFields: OrganizationSetupField[];
}

/** A step plus where the user currently stands in it. */
export interface OrganizationSetupStepStatus extends OrganizationSetupStep {
  index: number;
  current: boolean;
  /** Required fields of this step that are still empty. */
  outstanding: number;
  done: boolean;
}
