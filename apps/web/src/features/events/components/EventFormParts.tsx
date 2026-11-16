import type { ReactNode } from "react";

/**
 * The small building blocks the event form is made of, shared by the main form
 * (`CreateEvents.tsx`) and the optional-details section
 * (`EventDetailsSection.tsx`).
 */

export const inputClasses =
  "min-h-12 w-full rounded-lg border border-brand-secondary/15 bg-white px-4 py-3 font-outfit text-body text-ink outline-none transition focus:border-brand/55 focus:ring-2 focus:ring-brand/15";

export type FieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  count?: { value: number; max: number };
};

export const Field = ({
  id,
  label,
  children,
  error,
  hint,
  count,
}: FieldProps) => (
  <div className="min-w-0">
    <div className="mb-1.5 flex items-center justify-between gap-4">
      <label
        htmlFor={id}
        className="font-outfit text-body font-medium text-ink/75"
      >
        {label}
      </label>
      {count && (
        <span className="shrink-0 font-poppins text-caption text-ink/45 tabular-nums">
          {count.value} / {count.max}
        </span>
      )}
    </div>
    {children}
    {error && (
      <p role="alert" className="mt-1.5 font-poppins text-caption text-error">
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="mt-1.5 font-poppins text-caption text-ink/50">{hint}</p>
    )}
  </div>
);

type FormSectionProps = {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
};

export const FormSection = ({
  number,
  title,
  description,
  children,
}: FormSectionProps) => (
  <section className="rounded-2xl border border-brand-secondary/10 bg-surface-warm/55 p-5 sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 font-outfit text-caption font-semibold text-brand">
        {number}
      </span>
      <div>
        <h2 className="m-0 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
          {title}
        </h2>
        <p className="mt-1 font-poppins text-caption leading-5 text-ink/55">
          {description}
        </p>
      </div>
    </div>
    {children}
  </section>
);
