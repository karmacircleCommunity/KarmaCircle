/**
 * The label above one field inside a grouped question.
 *
 * Its own file because two things render it now - the generic group branch
 * of `SetupQuestion` and the hand-built location pair next door - and the
 * required marker is the sort of detail that drifts the moment it exists
 * twice. `htmlFor` rather than a wrapping `<label>`: the location fields
 * put a listbox of buttons next to their input, and buttons nested inside a
 * label are a click target arguing with itself.
 */
const SetupFieldLabel = ({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label
    htmlFor={htmlFor}
    className="font-outfit text-body font-medium text-ink/70"
  >
    {children}
    {required && (
      <span className="ml-0.5 align-top text-xs text-red-500">*</span>
    )}
  </label>
);

export default SetupFieldLabel;
