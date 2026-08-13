export const renderErrorMessage = (fieldName, formState) => {
  return (
    formState?.errors?.length > 0 && (
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
