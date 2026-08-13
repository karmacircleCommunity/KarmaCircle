/**
 * Shared user/account types — used by more than one feature (authentication,
 * clubs, and eventually onboarding-profile/dashboard), so they live under
 * `src/types` rather than inside a single feature folder.
 */

/** The two account kinds the backend recognizes. Mirrors the string values
 * `src/statics/Constants.js`'s `authTypeOptions` already used at runtime;
 * this enum gives that same value a real type instead of a bare string. */
export enum UserType {
  Individual = "individual",
  Club = "club",
}

/** Shape of each entry in `authTypeOptions` (react-select option objects). */
export interface AuthTypeOption {
  value: UserType;
  label: string;
}

/**
 * The logged-in user as stored in the Redux `user` slice
 * (`src/app/store/slices/userSlice.js`). The slice is intentionally
 * schema-less — it's whatever `response.data.user` the backend returns,
 * spread onto `{ isLoggedIn }` — so this type only pins down the fields
 * every consumer in this codebase actually relies on and leaves the rest
 * as an open index signature rather than inventing a backend contract
 * this repo can't verify.
 */
export interface User {
  _id?: string;
  userType?: UserType;
  userName?: string;
  name?: string;
  email?: string;
  isLoggedIn: boolean;
  [key: string]: unknown;
}
