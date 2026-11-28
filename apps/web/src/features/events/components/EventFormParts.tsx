import type { ReactNode } from "react";
import type { EventMode } from "@features/events/types";

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

/** Where people go or how they join, as publishing asks for it. */
const PUBLISH_PLACE: Record<EventMode, string> = {
  Offline: "the full venue (street address, city, state or region and country)",
  Online: "a video platform and meeting link",
  Hybrid: "the full venue plus a video platform and meeting link",
};

/**
 * Says in plain words, next to the two save buttons, how much a draft needs and
 * how much more publishing needs. Both buttons point at it with
 * `aria-describedby`. The rules themselves live in `utils/validateEvent.ts`.
 */
export const SaveRequirements = ({
  id,
  mode,
  includeAddress,
}: {
  id: string;
  mode: EventMode;
  /** The page address is only chosen when the event is created. */
  includeAddress: boolean;
}) => (
  <div
    id={id}
    className="rounded-xl border border-brand-secondary/12 bg-white p-4 font-poppins text-caption leading-5 text-ink/65"
  >
    <p className="m-0">
      <strong className="font-semibold text-brand-secondary">
        A draft needs
      </strong>{" "}
      only an event name{includeAddress ? ", a page address" : ""}, a format,
      and a start and end date and time.
    </p>
    <p className="mt-2 mb-0">
      <strong className="font-semibold text-brand-secondary">
        Publishing also needs
      </strong>{" "}
      a description of at least 20 characters, a cover image, the kind of event
      and {PUBLISH_PLACE[mode]}.
    </p>
    <p className="mt-2 mb-0">
      Anything else you fill in is checked either way.
    </p>
  </div>
);

type FormSectionProps = {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
  sectionKey?: string;
  hidden?: boolean;
  /** Set when the section is a tab panel (the edit form), so it is announced as
   * one and labelled by its tab (see `EditSectionTabs`). */
  asTabPanel?: boolean;
};

/** The DOM id of the tab for a section, and of its panel. */
export const sectionTabId = (key: string) => `event-section-tab-${key}`;
export const sectionPanelId = (key: string) => `event-section-panel-${key}`;

export const FormSection = ({
  number,
  title,
  description,
  children,
  sectionKey,
  hidden,
  asTabPanel,
}: FormSectionProps) => (
  <section
    data-event-form-section={sectionKey}
    hidden={hidden}
    {...(asTabPanel && sectionKey
      ? {
          id: sectionPanelId(sectionKey),
          role: "tabpanel",
          "aria-labelledby": sectionTabId(sectionKey),
        }
      : {})}
    className="rounded-2xl border border-brand-secondary/10 bg-surface-warm/55 p-5 sm:p-6"
  >
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
