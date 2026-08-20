import type { UserType } from "./enums";

/** Shape of each entry in `authTypeOptions` (react-select option objects). */
export interface AuthTypeOption {
  value: UserType;
  label: string;
}

/**
 * The logged-in user as stored in the Redux `user` slice
 * (`src/app/store/slices/userSlice.ts`). The slice is intentionally
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
