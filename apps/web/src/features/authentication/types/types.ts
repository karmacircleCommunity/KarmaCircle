import type { Dispatch, SetStateAction } from "react";
import type {
  AuthErrors,
  ValidationError,
  ValidationSuccess,
  IndividualFormState,
  ClubFormState,
} from "./interfaces";

export type SetAuthErrors = Dispatch<SetStateAction<AuthErrors>>;

export type ValidationResult = ValidationError[] | ValidationSuccess;

export type SignupFormState = IndividualFormState | ClubFormState;

export type SubmitCallback = (
  formState: SignupFormState,
) => Promise<{ status?: number; data?: { message?: string }; message?: string } | undefined>;
