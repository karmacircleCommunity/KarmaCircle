import type { SignupFormState } from "../types";

/**
 * Renders every `useValidation.js`-shaped error whose `.field` matches
 * `fieldName`. Only meaningful paired with `useFormLogic`'s
 * `formState.errors` array shape — the live pages' `errors` object is a
 * different shape (see `types/index.ts`'s `AuthErrors`) and is rendered
 * inline instead. Unused today (see `SPEC.md`).
 */
export const renderErrorMessage = (
  fieldName: string,
  formState: SignupFormState,
) => {
  return (
    formState?.errors && formState.errors.length > 0 && (
      <div className="authpage_error-div">
        {formState.errors.map(
          (error, index) =>
            // Check if the error is related to the email field
            error.field === fieldName && (
              <div key={index} className="authpage_error-message">
                {error.message}
              </div>
            ),
        )}
      </div>
    )
  );
};
