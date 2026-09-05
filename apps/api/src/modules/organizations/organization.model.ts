import mongoose, { Document, Schema } from "mongoose";
import { ORGANIZATION_DOMAINS, ORGANIZATION_TAGS } from "./organization.taxonomy";

/**
 * An organization's own record, in its own collection — separate from the
 * `users` document that logs in on its behalf.
 *
 * Why separate, when signup still creates exactly one login and that login
 * *is* the organization today: an organization grows fields a person never
 * has (tag, domains, team size, funds, verification) and, later, affiliated
 * members. Keeping those on the shared `User` schema would either bloat
 * every individual's document or force a migration the day affiliates ship.
 * `ownerEmail` + the (initially empty) `members` array are that future,
 * pre-wired: an affiliate accepting an invite becomes a row in `members`,
 * and nothing else has to move.
 */
export const ORGANIZATION_STATUS = {
  Draft: "draft",
  Live: "live",
  Suspended: "suspended",
} as const;

export type OrganizationStatus =
  (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];

export const MEMBER_ROLE = {
  Owner: "owner",
  Admin: "admin",
  Editor: "editor",
} as const;

export type MemberRole = (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE];

export interface IOrganizationMember {
  email: string;
  role: MemberRole;
  addedAt: Date;
}

export interface IOrganization extends Document {
  handle: string;
  name: string;
  /**
   * The account that owns this organization, keyed by email because that
   * is what a verified JWT carries (`req.auth.email` — see
   * src/middleware/auth.ts), so every ownership check is a direct lookup
   * rather than a second round trip through the users collection.
   */
  ownerEmail: string;
  tag?: string;
  domains: string[];
  description?: string;
  teamSize?: number;
  location: {
    city?: string;
    state?: string;
  };
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  cover?: string;
  gallery: string[];
  /**
   * Typed in by the organization, and labelled as such everywhere it is
   * rendered. Once donations run through the platform the counted figure
   * becomes the headline and this stays as the pre-platform history —
   * which is why it is deliberately not named `totalRaised`.
   */
  fundsRaised?: number;
  fundsGoal?: number;
  followers: number;
  status: OrganizationStatus;
  /** Set by platform admins only — never writable through the org's own routes. */
  verified: boolean;
  members: IOrganizationMember[];
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IOrganizationMember>(
  {
    email: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(MEMBER_ROLE),
      default: MEMBER_ROLE.Editor,
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const organizationSchema = new Schema<IOrganization>(
  {
    // Unlike `User.userName` (application-level uniqueness only — see
    // user.model.ts), this one carries a real unique index, so two
    // simultaneous signups can't both claim the same handle.
    handle: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, index: true },
    tag: { type: String, enum: [...ORGANIZATION_TAGS] },
    domains: [{ type: String, enum: [...ORGANIZATION_DOMAINS] }],
    description: { type: String, trim: true },
    teamSize: { type: Number, min: 1 },
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
    website: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    logo: { type: String, trim: true },
    cover: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    fundsRaised: { type: Number, min: 0 },
    fundsGoal: { type: Number, min: 0 },
    followers: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ORGANIZATION_STATUS),
      default: ORGANIZATION_STATUS.Draft,
      index: true,
    },
    verified: { type: Boolean, default: false },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true },
);

// Backs the directory's free-text search box (name/description/city) in
// one index rather than three separate regex scans.
organizationSchema.index({ name: "text", description: "text" });

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  organizationSchema,
);
