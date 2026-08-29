import type { ReactNode } from "react";

/** Same input treatment as the auth flow, so the two read as one product. */
export const setupInputClasses =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-outfit text-body text-ink transition placeholder:text-gray-500 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none";

type SetupFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
};

const SetupField = ({
  label,
  required,
  hint,
  children,
  className = "",
}: SetupFieldProps) => (
  <label className={`flex flex-col gap-2 ${className}`}>
    <span className="font-outfit text-body font-medium text-gray-800">
      {label}
      {required && (
        <span
          className="ml-0.5 align-top text-xs text-red-500"
          aria-hidden="true"
        >
          *
        </span>
      )}
    </span>
    {hint && (
      <span className="-mt-1 font-outfit text-caption text-ink/55">{hint}</span>
    )}
    {children}
  </label>
);

/** A labelled group inside a step, so a long stack still has structure. */
export const SetupSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <fieldset className="m-0 flex flex-col gap-5 border-0 p-0">
    <legend className="mb-1 p-0 font-outfit text-caption font-medium tracking-[0.14em] text-ink/50 uppercase">
      {title}
    </legend>
    {children}
  </fieldset>
);

export default SetupField;
