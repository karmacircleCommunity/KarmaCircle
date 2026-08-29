import mongoose, { Document, Schema } from "mongoose";

/**
 * The two categories the app's own code queries by. The Mongoose field
 * itself stays an unconstrained string (not `enum: [...]`) because the
 * DB was never validated at this level and may hold other values from
 * before this type existed; `(string & NonNullable<unknown>)` keeps that
 * honest while still giving autocomplete/typo-safety for the two known
 * values.
 */
export type UserType = "individual" | "organization";

export interface IUser extends Document {
  userType?: UserType | (string & NonNullable<unknown>);
  userName: string;
  name?: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  bannerPicture?: string;
  password: string;
  description?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  config?: {
    hasCompletedProfile: boolean;
  };
  cart: Array<{ id: string }>;
  /**
   * Bumped on logout and on password change to revoke every JWT issued
   * before that point — see src/modules/auth/auth.service.ts's signToken
   * and src/middleware/auth.ts's requireAuth. Never returned to a client;
   * excluded the same way `password` is (see user.service.ts).
   */
  tokenVersion: number;
  /**
   * SHA-256 hash of the single-use, 1-hour-lived forgot-password token —
   * never the raw token itself, which only ever exists in the emailed
   * link (see auth.service.ts's requestPasswordReset/resetPassword).
   * Cleared on a successful reset, or on any other successful password
   * change, so a stale unused token can't outlive the password it was
   * issued for. Never returned to a client — excluded the same way
   * `password` is (see user.service.ts).
   */
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

const userSchema = new Schema<IUser>(
  {
    userType: { type: String, index: true },
    // Not `unique: true` — userName uniqueness is still only enforced at the
    // application layer (generateUniqueUsername in user.service.ts), which
    // has a real check-then-write race window. A plain index here only
    // speeds up lookups; it does not close that race. See known-issues.md.
    userName: {
      type: String,
      required: true,
      index: true,
    },
    name: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: { type: String },
    profilePicture: { type: String },
    bannerPicture: { type: String },
    password: {
      type: String,
      required: true,
    },
    description: { type: String },
    address: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      pincode: { type: String },
    },
    config: {
      hasCompletedProfile: { type: Boolean, default: false },
    },
    cart: [{ id: { type: String } }],
    tokenVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
  },
  // Individuals and organizations live in one physical collection (see
  // below) but are split at the schema level via a Mongoose discriminator
  // keyed on this already-existing `userType` field, rather than an
  // unconstrained string every module re-filters on by convention. Neither
  // discriminator adds fields yet — there's no organization-only data
  // today — but this is the home for that once it exists, instead of it
  // landing loosely on the shared base schema. See known-issues.md's
  // former "individuals/organizations share one undiscriminated User
  // collection" entry.
  { discriminatorKey: "userType" },
);

export const User = mongoose.model<IUser>("user", userSchema);

// Both discriminators intentionally add no fields yet — see the comment
// above. Construct via `getUserModel(userType)` (not `new User(...)`
// directly) so a document's discriminator schema always matches the
// `userType` it's actually being created with.
export const Individual = User.discriminator<IUser>(
  "individual",
  new Schema<IUser>({}),
);
export const Organization = User.discriminator<IUser>(
  "organization",
  new Schema<IUser>({}),
);

/**
 * Resolves which model to construct a new user document with. Anything
 * other than exactly "organization" defaults to `Individual` — matching
 * the pre-discriminator behavior where an absent/garbage `userType` still
 * produced a normal, queryable user, just without a real discriminator
 * schema backing it.
 */
export function getUserModel(userType?: string): typeof Individual {
  return userType === "organization" ? Organization : Individual;
}
