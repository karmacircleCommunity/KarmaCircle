import type { ChangeEvent, Dispatch, SetStateAction, FormEvent } from "react";
import type { AuthTypeOption, UserType } from "@/types/user";
import type { SetAuthErrors, SignupFormState } from "./types";

/**
 * Local `credentials` state shape shared by `SignIn.jsx`/`SignUp.jsx`.
 * `userType` only exists on the sign-up form (the react-select option
 * object, not the unwrapped string) — see `useAuth.js`, which unwraps
 * `.value` right before the `RegisterUser` call.
 */
export interface Credentials {
  name: string;
  email: string;
  password: string;
  userType?: AuthTypeOption;
}

/** `errors` state shape both live pages use — one string per field,
 * populated by `useAuth`'s `authenticateUser` (`email`/`password`) and,
 * on `SignUp` only, its own local name-format check (`name`). */
export interface AuthErrors {
  email?: string;
  password?: string;
  name?: string;
}

export interface UseAuthResult {
  authenticateUser: (
    credentials: Credentials,
    setErrors: SetAuthErrors,
  ) => Promise<void>;
  loading: boolean;
}

/* ---------------------------------------------------------------------
 * hooks/useValidation.js — the fuller, unused validator.
 * ------------------------------------------------------------------- */

export interface ValidationError {
  error: true;
  message: string;
  field: string;
}

export interface ValidationSuccess {
  error: false;
  message: "";
}

/** Every field any of `useValidation`'s branches (plain, individual-signup,
 * club-signup) may look at. Everything is optional since which fields are
 * actually required depends on the `userSignup`/`clubSignup` flags passed
 * in at the call site, not on this type. */
export interface ValidatableCredentials {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  tagLine?: string;
  description?: string;
  iframe?: string;
  website?: string;
  slug?: string;
  city?: string;
  state?: string;
  address?: string;
  country?: string;
  pincode?: string | number;
}

/* ---------------------------------------------------------------------
 * hooks/useFormLogic.js — the unused generic submit-handler hook, and
 * the two initial form-state shapes it exports.
 * ------------------------------------------------------------------- */

interface FormStateBase {
  slug: string;
  email: string;
  password: string;
  confirmPassword: string;
  city: string;
  state: string;
  address: string;
  country: string;
  pincode: string;
  /** Populated by `handleSubmit` on failed client-side validation;
   * absent otherwise. */
  errors?: ValidationError[];
}

export interface IndividualFormState extends FormStateBase {
  userType: UserType.Individual;
  firstName: string;
  lastName: string;
}

export interface ClubFormState extends FormStateBase {
  userType: UserType.Club;
  name: string;
  tagLine: string;
  description: string;
  website: string;
}

export interface UseFormLogicResult {
  formState: SignupFormState;
  setFormState: Dispatch<SetStateAction<SignupFormState>>;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    e: FormEvent<HTMLFormElement>,
    country: string,
  ) => Promise<void>;
}
