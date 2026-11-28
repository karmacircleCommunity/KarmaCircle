import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiImage,
  FiMapPin,
  FiRadio,
  FiVideo,
} from "react-icons/fi";
import { Dropdown, Footer, Navbar } from "@components";
import type { DropdownOption } from "@components";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import countries from "@statics/CountryList";
import platforms from "@statics/OnlinePlatform";
import {
  COVER_IMAGE_ACCEPT,
  COVER_IMAGE_MIME_TYPES,
  COVER_IMAGE_TYPE_ERROR,
} from "@features/events/constants/coverImageTypes";
import {
  Field,
  FormSection,
  inputClasses,
  SaveRequirements,
} from "@features/events/components/EventFormParts";
import EditSectionTabs from "@features/events/components/EditSectionTabs";
import EventDetailsSection from "@features/events/components/EventDetailsSection";
import { emptyDetailFields } from "@features/events/utils/eventDetailFields";
import {
  CoverUploadError,
  uploadCoverImage,
} from "@features/events/utils/uploadCoverImage";
import { useEvent } from "@features/events/hooks/useEvent";
import { buildEventChanges } from "@features/events/utils/buildEventChanges";
import { EVENT_LIMITS } from "@features/events/utils/validateEvent";
import { hostingPath } from "@features/events/utils/myEvents";
import {
  browserTimeZone,
  combineInZone,
  listTimeZones,
  zoneAbbreviation,
  zoneOptionLabel,
} from "@features/events/utils/eventTimezone";
import {
  accessLabel,
  EVENT_ACCESS_OPTIONS,
} from "@features/events/constants/eventAccess";
import { EVENT_TYPE_OPTIONS } from "@features/events/constants/eventTypes";
import {
  MODE_LABELS,
  hasOnlineAccess,
  hasVenue,
} from "@features/events/utils/eventMode";
import type {
  ApiEvent,
  EventFormErrors,
  EventFormState,
  SubmitIntent,
} from "@features/events/types";

type EditSectionKey = "basics" | "schedule" | "attendance" | "details";

const EDIT_SECTIONS: { key: EditSectionKey; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "schedule", label: "Date & place" },
  { key: "attendance", label: "Attendance" },
  { key: "details", label: "More details" },
];
const EDIT_SECTION_FIELDS: Record<EditSectionKey, (keyof EventFormState)[]> = {
  basics: ["name", "uid", "description", "eventType", "tags", "coverImage"],
  schedule: [
    "mode",
    "startDate",
    "startTime",
    "endDate",
    "endTime",
    "timezone",
    "address",
    "city",
    "state",
    "country",
    "platform",
    "platformLink",
  ],
  attendance: ["access", "capacity", "waitlistEnabled"],
  details: [
    "about",
    "contactEmail",
    "minimumAge",
    "costAmount",
    "costCurrency",
    "costNote",
    "bringAlong",
    "languages",
    "gettingThere",
    "linkDelivery",
    "joinRequirements",
    "agenda",
  ],
};

const EVENT_TYPE_DROPDOWN_OPTIONS: readonly DropdownOption[] =
  EVENT_TYPE_OPTIONS;
const ACCESS_DROPDOWN_OPTIONS: readonly DropdownOption[] =
  EVENT_ACCESS_OPTIONS.map(({ value, label }) => ({ value, label }));
// The stored value is the label (that is what the API keeps), so value and
// label are the same string.
const COUNTRY_DROPDOWN_OPTIONS: readonly DropdownOption[] = countries.map(
  ({ label }) => ({ value: label, label }),
);
const PLATFORM_DROPDOWN_OPTIONS: readonly DropdownOption[] = platforms.map(
  ({ label }) => ({ value: label, label }),
);

/** Ties both save buttons to the note on what each one needs. */
const REQUIREMENTS_ID = "event-save-requirements";

/** A blank form, with dates computed when the form opens (not at page load). */
const createInitialEvent = (): EventFormState => {
  // A day and an hour from now, lasting an hour. Each date comes from the same
  // moment as its time, so a form opened late at night still ends after it
  // starts.
  const start = dayjs().add(1, "day").add(1, "hour");
  const end = start.add(1, "hour");

  return {
    name: "",
    startDate: start,
    endDate: end,
    startTime: start,
    endTime: end,
    mode: "Offline",
    uid: "",
    description: "",
    city: "",
    state: "",
    address: "",
    country: "India",
    coverImage: "",
    platform: "Zoom Meeting",
    platformLink: "",
    access: "open",
    waitlistEnabled: true,
    capacity: "",
    timezone: browserTimeZone(),
    eventType: "",
    tags: "",
    ...emptyDetailFields(),
  };
};

/** Full-page organizer publishing flow for `/organization/events/new`. */
const CreateEvents = () => {
  const [initial] = useState(createInitialEvent);
  return <EventForm initial={initial} />;
};

/**
 * The one event form, for publishing a new event and for editing a stored one
 * (`EditEvent.tsx`, `/organization/events/:eventId/edit`). Pass `original` to
 * edit: the form starts from that event, the page address is read-only (it
 * never changes, because registrations point at it), and saving sends only
 * what changed.
 */
export const EventForm = ({
  initial,
  original,
  onStored,
}: {
  initial: EventFormState;
  original?: ApiEvent;
  /** Called with the saved event when an edit is stored and the form stays. */
  onStored?: (stored: ApiEvent) => void;
}) => {
  const isEdit = Boolean(original);
  // Every timezone the browser knows, plus the event's own if it is somehow
  // missing from that list.
  const timeZones = useMemo(
    () => listTimeZones([initial.timezone]),
    [initial.timezone],
  );
  const timeZoneOptions = useMemo<readonly DropdownOption[]>(
    () =>
      timeZones.map((zone) => ({ value: zone, label: zoneOptionLabel(zone) })),
    [timeZones],
  );
  const isDraftEdit = original?.status === "draft";
  // Where "back" goes: the list of My Events this event sits in.
  const listPath = hostingPath(isDraftEdit ? "Drafts" : "Upcoming");
  const navigate = useNavigate();
  const { organization } = useMyOrganization();
  const eventPageUrlPrefix = `${window.location.origin}/events/`;
  const [event, setEvent] = useState<EventFormState>(initial);
  const [activeEditSection, setActiveEditSection] =
    useState<EditSectionKey>("basics");
  const [errors, setErrors] = useState<EventFormErrors>({});
  // Which button's save is running, so only that one says so.
  const [submitting, setSubmitting] = useState<SubmitIntent | null>(null);
  const isSubmitting = submitting !== null;
  const [coverError, setCoverError] = useState("");
  // The cover is uploaded as soon as it is chosen (DB-1); the form keeps only
  // the link. While it uploads, the chosen file previews from the browser.
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUidEdited, setIsUidEdited] = useState(isEdit);
  const { validateEvent, submitCallback } = useEvent(event, original, onStored);
  const allowNavigation = useRef(false);
  const isDirty = Boolean(
    original && Object.keys(buildEventChanges(event, original)).length > 0,
  );

  useEffect(() => {
    if (!isEdit || !isDirty) return;

    const guardedUrl = window.location.href;
    window.history.pushState(
      { ...window.history.state, __eventEditGuard: true },
      "",
      guardedUrl,
    );

    const confirmLeave = () =>
      window.confirm(
        "You have unsaved changes. Leave this page and discard them?",
      );

    const handlePopState = () => {
      if (allowNavigation.current || !isDirty) return;
      if (confirmLeave()) {
        allowNavigation.current = true;
        window.history.go(-1);
      } else {
        window.history.pushState(
          { ...window.history.state, __eventEditGuard: true },
          "",
          window.location.href,
        );
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      if (allowNavigation.current || !isDirty || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank")
        return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (confirmLeave()) {
        allowNavigation.current = true;
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleLinkClick, true);
      if (
        window.location.href === guardedUrl &&
        window.history.state?.__eventEditGuard
      ) {
        window.history.back();
      }
    };
  }, [isDirty, isEdit]);

  useEffect(() => {
    if (!isEdit || !isDirty) return;
    const warnBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowNavigation.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, isEdit]);
  // The moment the preview's start means, to name its zone (daylight time and all).
  const previewInstant =
    event.startDate && event.startTime
      ? combineInZone(event.startDate, event.startTime, event.timezone)
      : new Date();

  /** Sets one field to a value picked from a `Dropdown`. */
  const setField = (name: keyof EventFormState, value: string) =>
    setEvent((current) => ({ ...current, [name]: value }));

  const handleTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEvent((current) => ({ ...current, [name]: value }));
  };

  const handleUidChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isEdit) return;
    setIsUidEdited(true);
    const uid = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-");
    setEvent((current) => ({ ...current, uid }));
  };

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setCoverError("");
    if (!file) return;
    if (!COVER_IMAGE_MIME_TYPES.includes(file.type)) {
      setCoverError(COVER_IMAGE_TYPE_ERROR);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("Image must be 5 MB or smaller.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setCoverPreview(preview);
    setCoverUploading(true);
    try {
      const url = await uploadCoverImage(file);
      setEvent((current) => ({ ...current, coverImage: url }));
    } catch (error) {
      // The previous cover (if any) stays; only the message says what happened.
      setCoverError(
        error instanceof CoverUploadError
          ? error.message
          : "We couldn’t upload that image. Try again.",
      );
    } finally {
      setCoverUploading(false);
      setCoverPreview(null);
      URL.revokeObjectURL(preview);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setEvent((current) => ({
      ...current,
      name,
      uid: isUidEdited
        ? current.uid
        : name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (coverUploading) return;
    if (isEdit && !isDraftEdit && !isDirty) return;
    void submit("publish");
  };

  /** Opens the section of the first field in error (edit) and focuses it. */
  const revealFirstError = (found: EventFormErrors) => {
    for (const section of EDIT_SECTIONS) {
      const fieldId = EDIT_SECTION_FIELDS[section.key].find(
        (field) => found[field],
      );
      if (!fieldId) continue;
      if (isEdit) setActiveEditSection(section.key);
      // After the paint that shows the section and its messages.
      requestAnimationFrame(() => {
        const field = document.getElementById(fieldId);
        field?.focus();
        field?.scrollIntoView({ block: "center" });
      });
      return;
    }
  };

  /**
   * Runs the checks, then saves. `intent` is which button was pressed: publish
   * (the form's own submit) or save as a draft (PG-15), which asks for much
   * less. A saved draft is not public, so the organizer goes back to their list
   * rather than to a page nobody else can open. Saving a published event is
   * held to the publishing rules.
   */
  const submit = async (intent: SubmitIntent) => {
    const validationErrors = validateEvent(intent);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      revealFirstError(validationErrors);
      return;
    }

    setSubmitting(intent);
    try {
      const refused = await submitCallback(
        event,
        () => {
          allowNavigation.current = true;
          navigate(
            intent === "draft" ? hostingPath("Drafts") : `/events/${event.uid}`,
          );
        },
        validationErrors,
        intent,
      );
      // The API has the last word: mark whatever it refused.
      if (refused && Object.keys(refused).length > 0) {
        setErrors(refused);
        revealFirstError(refused);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const setDate = (field: "startDate" | "endDate", value: string) => {
    setEvent((current) => ({
      ...current,
      [field]: value ? dayjs(value) : null,
    }));
  };
  const setTime = (field: "startTime" | "endTime", value: string) => {
    setEvent((current) => ({
      ...current,
      [field]: value ? dayjs(`2000-01-01T${value}`) : null,
    }));
  };

  return (
    <OrganizationSetupGate requireLive={false}>
      <Navbar />
      <main
        className={`min-h-[70vh] bg-surface px-5 py-8 sm:px-9 sm:py-12 lg:px-12 ${isEdit && !isDraftEdit && isDirty ? "pb-24" : ""}`}
      >
        <div className="mx-auto max-w-6xl">
          <Link
            to={listPath}
            className="inline-flex items-center gap-2 font-outfit text-body font-medium text-ink/65 no-underline transition hover:text-brand"
          >
            <FiArrowLeft aria-hidden="true" />
            My events
          </Link>

          <header className="mt-7 max-w-2xl">
            <p className="font-outfit text-caption font-semibold tracking-[0.16em] text-brand uppercase">
              Organizer workspace
            </p>
            <h1 className="mt-2 font-outfit text-3xl leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              {isDraftEdit
                ? "Edit your draft"
                : isEdit
                  ? "Edit your event"
                  : "Bring people together"}
            </h1>
            <p className="mt-3 font-poppins text-body leading-6 text-ink/65 sm:text-body-lg sm:leading-7">
              {isDraftEdit
                ? "This event is a draft: only you can see it until you publish it. Save as often as you like."
                : isEdit
                  ? "Choose a section to edit. Your changes appear on the event page after you save."
                  : "Share the essentials first. Your event will appear in discovery as soon as it’s published, or save a draft and finish later."}
            </p>
          </header>

          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:gap-12">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {isEdit && (
                <EditSectionTabs
                  tabs={EDIT_SECTIONS.map((section) => ({
                    ...section,
                    hasError: EDIT_SECTION_FIELDS[section.key].some((field) =>
                      Boolean(errors[field]),
                    ),
                  }))}
                  active={activeEditSection}
                  onChange={setActiveEditSection}
                />
              )}

              <FormSection
                number="01"
                title="The basics"
                description="Give your event a clear name and a cover image."
                sectionKey="basics"
                hidden={isEdit && activeEditSection !== "basics"}
                asTabPanel={isEdit}
              >
                <div className="space-y-5">
                  <Field
                    id="name"
                    label="Event name"
                    error={errors.name}
                    count={{
                      value: event.name.length,
                      max: EVENT_LIMITS.nameMax,
                    }}
                  >
                    <input
                      id="name"
                      name="name"
                      value={event.name}
                      onChange={handleNameChange}
                      className={inputClasses}
                      maxLength={EVENT_LIMITS.nameMax}
                      aria-invalid={Boolean(errors.name)}
                    />
                  </Field>
                  <Field
                    id="uid"
                    label={
                      isEdit
                        ? "Event page address (locked)"
                        : "Event page address"
                    }
                    error={errors.uid}
                    hint={
                      isEdit
                        ? "Locked after publishing so links people already have keep working."
                        : "This is your event’s page on KarmaCircle, not an external website. The address ending is suggested from the event name."
                    }
                  >
                    <div className="overflow-hidden rounded-lg border border-brand-secondary/15 bg-white focus-within:border-brand/55 focus-within:ring-2 focus-within:ring-brand/15">
                      <span className="block border-b border-brand-secondary/10 bg-surface-warm/60 px-4 py-2 font-poppins text-caption break-all text-ink/55">
                        {eventPageUrlPrefix}
                      </span>
                      <input
                        id="uid"
                        name="uid"
                        value={event.uid}
                        onChange={handleUidChange}
                        readOnly={isEdit}
                        className={`min-h-12 w-full bg-transparent px-4 py-3 font-outfit text-body outline-none ${isEdit ? "cursor-not-allowed bg-surface-warm/45 text-ink/55" : "text-ink"}`}
                        placeholder="your-event-name"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-invalid={Boolean(errors.uid)}
                      />
                    </div>
                  </Field>
                  <Field
                    id="description"
                    label="About this event"
                    error={errors.description}
                    count={{
                      value: event.description.length,
                      max: EVENT_LIMITS.descriptionMax,
                    }}
                  >
                    <textarea
                      id="description"
                      name="description"
                      value={event.description}
                      onChange={handleTextChange}
                      className={`${inputClasses} min-h-32 resize-y`}
                      maxLength={EVENT_LIMITS.descriptionMax}
                      placeholder="What will people do together? Share what to expect, who it’s for, or anything they should bring."
                      aria-invalid={Boolean(errors.description)}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="eventType"
                      label="Kind of event"
                      error={errors.eventType}
                    >
                      <Dropdown
                        id="eventType"
                        options={EVENT_TYPE_DROPDOWN_OPTIONS}
                        value={event.eventType}
                        onChange={(value) => setField("eventType", value)}
                        placeholder="Choose a kind"
                        invalid={Boolean(errors.eventType)}
                      />
                    </Field>
                    <Field
                      id="tags"
                      label="Tags (optional)"
                      error={errors.tags}
                      hint="Up to 8, separated by commas. People can find the event by them."
                    >
                      <input
                        id="tags"
                        name="tags"
                        value={event.tags}
                        onChange={handleTextChange}
                        className={inputClasses}
                        placeholder="beach, clean-up, families"
                        autoCapitalize="none"
                        aria-invalid={Boolean(errors.tags)}
                      />
                    </Field>
                  </div>
                  <div>
                    <p className="mb-1.5 font-outfit text-body font-medium text-ink/75">
                      Cover image
                    </p>
                    <label
                      htmlFor="coverImage"
                      className="group flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-brand-secondary/20 bg-surface-warm text-center transition hover:border-brand/50"
                    >
                      {coverPreview || event.coverImage ? (
                        <span className="relative block w-full">
                          <img
                            src={coverPreview ?? event.coverImage}
                            alt="Event cover preview"
                            className={`h-56 w-full object-cover ${coverUploading ? "opacity-60" : ""}`}
                          />
                          {coverUploading && (
                            <span
                              role="status"
                              className="absolute inset-0 flex items-center justify-center font-outfit text-body font-semibold text-brand-secondary"
                            >
                              Uploading…
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex flex-col items-center px-6 py-8">
                          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                            <FiImage aria-hidden="true" className="size-5" />
                          </span>
                          <span className="mt-3 font-outfit text-body font-semibold text-brand-secondary">
                            Choose a cover image
                          </span>
                          <span className="mt-1 font-poppins text-caption text-ink/55">
                            PNG, JPEG, WebP or GIF
                          </span>
                        </span>
                      )}
                    </label>
                    <input
                      id="coverImage"
                      type="file"
                      accept={COVER_IMAGE_ACCEPT}
                      disabled={coverUploading}
                      onChange={handleCoverChange}
                      className="sr-only"
                      aria-invalid={Boolean(errors.coverImage || coverError)}
                    />
                    {coverError && (
                      <p
                        role="alert"
                        className="mt-1.5 font-poppins text-caption text-error"
                      >
                        {coverError}
                      </p>
                    )}
                    {errors.coverImage && !coverError && (
                      <p
                        role="alert"
                        className="mt-1.5 font-poppins text-caption text-error"
                      >
                        {errors.coverImage}
                      </p>
                    )}
                    <p className="mt-1.5 font-poppins text-caption text-ink/50">
                      Wide images work best. Maximum 5 MB.
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection
                number="02"
                title="When and where"
                description="Choose a time window and how people will join."
                sectionKey="schedule"
                hidden={isEdit && activeEditSection !== "schedule"}
                asTabPanel={isEdit}
              >
                <fieldset className="space-y-4 border-0 p-0">
                  <legend className="mb-3 font-outfit text-body font-semibold text-brand-secondary">
                    Event format
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["Offline", "Online", "Hybrid"] as const).map((mode) => {
                      const selected = event.mode === mode;
                      const Icon =
                        mode === "Offline"
                          ? FiMapPin
                          : mode === "Online"
                            ? FiVideo
                            : FiRadio;
                      return (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setEvent((current) => ({ ...current, mode }))
                          }
                          className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left transition ${selected ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-brand-secondary/15 bg-white hover:border-brand/35"}`}
                        >
                          <Icon
                            aria-hidden="true"
                            className={selected ? "text-brand" : "text-ink/45"}
                          />
                          <span>
                            <span className="block font-outfit font-semibold text-brand-secondary">
                              {MODE_LABELS[mode]}
                            </span>
                            <span className="mt-0.5 block font-poppins text-caption text-ink/55">
                              {mode === "Offline"
                                ? "People meet at a place"
                                : mode === "Online"
                                  ? "People join by video"
                                  : "A place and a live stream"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    id="startDate"
                    label="Start date"
                    error={errors.startDate}
                  >
                    <input
                      id="startDate"
                      type="date"
                      value={event.startDate?.format("YYYY-MM-DD") ?? ""}
                      onChange={(e) => setDate("startDate", e.target.value)}
                      className={inputClasses}
                      aria-invalid={Boolean(errors.startDate)}
                    />
                  </Field>
                  <Field
                    id="startTime"
                    label="Start time"
                    error={errors.startTime}
                  >
                    <input
                      id="startTime"
                      type="time"
                      value={event.startTime?.format("HH:mm") ?? ""}
                      onChange={(e) => setTime("startTime", e.target.value)}
                      className={inputClasses}
                      aria-invalid={Boolean(errors.startTime)}
                    />
                  </Field>
                  <Field id="endDate" label="End date" error={errors.endDate}>
                    <input
                      id="endDate"
                      type="date"
                      value={event.endDate?.format("YYYY-MM-DD") ?? ""}
                      onChange={(e) => setDate("endDate", e.target.value)}
                      className={inputClasses}
                      aria-invalid={Boolean(errors.endDate)}
                    />
                  </Field>
                  <Field id="endTime" label="End time" error={errors.endTime}>
                    <input
                      id="endTime"
                      type="time"
                      value={event.endTime?.format("HH:mm") ?? ""}
                      onChange={(e) => setTime("endTime", e.target.value)}
                      className={inputClasses}
                      aria-invalid={Boolean(errors.endTime)}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field
                    id="timezone"
                    label="Timezone"
                    error={errors.timezone}
                    hint="The dates and times above are in this timezone. People elsewhere see the event in theirs, with your time beside it."
                  >
                    <Dropdown
                      id="timezone"
                      options={timeZoneOptions}
                      value={event.timezone}
                      onChange={(value) => setField("timezone", value)}
                      searchPlaceholder="Search timezones"
                      invalid={Boolean(errors.timezone)}
                    />
                  </Field>
                </div>

                {hasVenue(event.mode) && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field
                      id="address"
                      label="Street address"
                      error={errors.address}
                    >
                      <input
                        id="address"
                        name="address"
                        value={event.address}
                        onChange={handleTextChange}
                        className={inputClasses}
                        maxLength={EVENT_LIMITS.addressMax}
                        aria-invalid={Boolean(errors.address)}
                      />
                    </Field>
                    <Field id="city" label="City" error={errors.city}>
                      <input
                        id="city"
                        name="city"
                        value={event.city}
                        onChange={handleTextChange}
                        className={inputClasses}
                        maxLength={EVENT_LIMITS.cityMax}
                        aria-invalid={Boolean(errors.city)}
                      />
                    </Field>
                    <Field
                      id="state"
                      label="State or region"
                      error={errors.state}
                    >
                      <input
                        id="state"
                        name="state"
                        value={event.state}
                        onChange={handleTextChange}
                        className={inputClasses}
                        maxLength={EVENT_LIMITS.stateMax}
                        aria-invalid={Boolean(errors.state)}
                      />
                    </Field>
                    <Field id="country" label="Country" error={errors.country}>
                      <Dropdown
                        id="country"
                        options={COUNTRY_DROPDOWN_OPTIONS}
                        value={event.country}
                        onChange={(value) => setField("country", value)}
                        placeholder="Choose a country"
                        searchPlaceholder="Search countries"
                        invalid={Boolean(errors.country)}
                      />
                    </Field>
                  </div>
                )}

                {hasOnlineAccess(event.mode) && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field
                      id="platform"
                      label="Video platform"
                      error={errors.platform}
                    >
                      <Dropdown
                        id="platform"
                        options={PLATFORM_DROPDOWN_OPTIONS}
                        value={event.platform}
                        onChange={(value) => setField("platform", value)}
                        placeholder="Choose a platform"
                        invalid={Boolean(errors.platform)}
                      />
                    </Field>
                    <Field
                      id="platformLink"
                      label="Meeting link"
                      error={errors.platformLink}
                      hint="Paste the complete HTTP or HTTPS link people will use to join."
                    >
                      <input
                        id="platformLink"
                        name="platformLink"
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={event.platformLink}
                        onChange={handleTextChange}
                        className={inputClasses}
                        placeholder="https://"
                        maxLength={EVENT_LIMITS.platformLinkMax}
                        aria-invalid={Boolean(errors.platformLink)}
                      />
                    </Field>
                  </div>
                )}
              </FormSection>

              <FormSection
                number="03"
                title="Who can attend?"
                description="Choose whether anyone can join, or you approve or invite each person."
                sectionKey="attendance"
                hidden={isEdit && activeEditSection !== "attendance"}
                asTabPanel={isEdit}
              >
                <div className="max-w-md">
                  <Field
                    id="access"
                    label="Who can join"
                    hint={
                      EVENT_ACCESS_OPTIONS.find(
                        (option) => option.value === event.access,
                      )?.hint
                    }
                  >
                    <Dropdown
                      id="access"
                      options={ACCESS_DROPDOWN_OPTIONS}
                      value={event.access}
                      onChange={(value) => setField("access", value)}
                      searchable={false}
                    />
                  </Field>
                </div>
                <div className="mt-5 max-w-xs">
                  <Field
                    id="capacity"
                    label="Maximum attendees (optional)"
                    error={errors.capacity}
                    hint={
                      isEdit
                        ? "Leave it empty for no limit. It can’t go below the people already registered."
                        : "Leave it empty for no limit. Once it is full, new people can join a waitlist you manage."
                    }
                  >
                    <input
                      id="capacity"
                      name="capacity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100000}
                      step={1}
                      value={event.capacity}
                      onChange={handleTextChange}
                      className={inputClasses}
                      placeholder="No limit"
                      aria-invalid={Boolean(errors.capacity)}
                    />
                  </Field>
                </div>
                {event.capacity.trim() !== "" && (
                  <label className="mt-5 flex max-w-md cursor-pointer items-start gap-3 rounded-xl border border-brand-secondary/12 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={event.waitlistEnabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          waitlistEnabled: e.target.checked,
                        }))
                      }
                      className="mt-1 size-4 accent-brand"
                    />
                    <span>
                      <span className="block font-outfit text-body font-semibold text-brand-secondary">
                        Allow a waitlist when full
                      </span>
                      <span className="mt-1 block font-poppins text-caption leading-5 text-ink/60">
                        People can still ask to join a full event, and you move
                        them up yourself. Turned off, a full event just says
                        Full.
                      </span>
                    </span>
                  </label>
                )}
              </FormSection>

              <EventDetailsSection
                event={event}
                setEvent={setEvent}
                errors={errors}
                hidden={isEdit && activeEditSection !== "details"}
                asTabPanel={isEdit}
              />

              <div
                className={`space-y-4 border-t border-brand-secondary/10 pt-5 ${isEdit && !isDraftEdit ? "hidden" : ""}`}
              >
                {(!isEdit || isDraftEdit) && (
                  <SaveRequirements
                    id={REQUIREMENTS_ID}
                    mode={event.mode}
                    includeAddress={!isEdit}
                  />
                )}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      allowNavigation.current = true;
                      navigate(listPath);
                    }}
                    className="min-h-12 rounded-lg px-4 font-outfit text-body font-medium text-ink/65 transition hover:bg-brand-secondary/5 hover:text-brand-secondary"
                  >
                    {isEdit ? "Discard changes" : "Cancel"}
                  </button>
                  {(!isEdit || isDraftEdit) && (
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        disabled={isSubmitting || coverUploading}
                        onClick={() => void submit("draft")}
                        aria-describedby={REQUIREMENTS_ID}
                        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-secondary/20 bg-white px-6 font-outfit text-body font-semibold text-brand-secondary transition hover:border-brand/45 disabled:cursor-wait disabled:opacity-60"
                      >
                        {submitting === "draft"
                          ? "Saving…"
                          : isDraftEdit
                            ? "Save draft"
                            : "Save as draft"}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || coverUploading}
                        aria-describedby={REQUIREMENTS_ID}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                      >
                        {submitting === "publish"
                          ? "Publishing…"
                          : "Publish event"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isEdit && !isDraftEdit && isDirty && (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-secondary/15 bg-surface/95 px-5 py-3 shadow-[0_-12px_32px_-24px_rgba(47,36,30,0.45)] backdrop-blur sm:px-9">
                  <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:gap-12">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          allowNavigation.current = true;
                          navigate(listPath);
                        }}
                        className="min-h-12 rounded-lg px-4 font-outfit text-body font-medium text-ink/65 transition hover:bg-brand-secondary/5 hover:text-brand-secondary"
                      >
                        Discard changes
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || coverUploading}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSubmitting ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>

            <aside className="lg:sticky lg:top-8">
              <div className="rounded-2xl border border-brand-secondary/10 bg-white p-4 shadow-[0_20px_60px_-45px_rgba(47,36,30,0.38)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 font-outfit text-caption font-semibold tracking-[0.14em] text-brand uppercase">
                      Live preview
                    </p>
                    <p className="mt-1 font-poppins text-caption text-ink/50">
                      What attendees will see
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-outfit text-caption font-medium ${event.access !== "open" ? "bg-brand-secondary/8 text-brand-secondary" : "bg-success/10 text-success"}`}
                  >
                    {accessLabel(event.access)}
                  </span>
                </div>
                <article className="mt-4 overflow-hidden rounded-xl border border-brand-secondary/10">
                  <div className="aspect-video overflow-hidden bg-surface-warm">
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-[radial-gradient(ellipse_at_70%_20%,color-mix(in_srgb,var(--color-brand)_30%,transparent),transparent_48%),linear-gradient(135deg,var(--color-brand-secondary),color-mix(in_srgb,var(--color-brand-secondary)_72%,var(--color-brand)))]">
                        <FiImage
                          aria-hidden="true"
                          className="size-8 text-white/75"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="m-0 line-clamp-2 font-outfit text-xl font-semibold text-brand-secondary">
                      {event.name || "Your event name"}
                    </p>
                    <p className="mt-2 line-clamp-3 font-poppins text-body leading-6 text-ink/60">
                      {event.description ||
                        "A short introduction helps people decide whether this event is for them."}
                    </p>
                    <div className="mt-4 flex flex-col gap-2 border-t border-brand-secondary/8 pt-4 font-poppins text-caption text-ink/60">
                      <span className="inline-flex items-center gap-2">
                        <FiCalendar aria-hidden="true" className="text-brand" />
                        {event.startDate?.format("ddd, D MMM YYYY") ||
                          "Choose a date"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <FiClock aria-hidden="true" className="text-brand" />
                        {event.startTime
                          ? `${event.startTime.format("h:mm A")} ${zoneAbbreviation(previewInstant, event.timezone)}`.trim()
                          : "Choose a time"}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {event.mode === "Online" ? (
                          <FiVideo aria-hidden="true" className="text-brand" />
                        ) : (
                          <FiMapPin aria-hidden="true" className="text-brand" />
                        )}
                        {event.mode === "Online"
                          ? event.platform || "Online"
                          : `${event.mode === "Hybrid" ? "Hybrid · " : ""}${
                              [event.city, event.country]
                                .filter(Boolean)
                                .join(", ") || "Add a location"
                            }`}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-brand-secondary/8 pt-4">
                      <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 font-outfit text-caption font-semibold text-brand">
                        {organization?.name?.slice(0, 1) || "O"}
                      </span>
                      <span className="font-poppins text-caption text-ink/60">
                        Hosted by{" "}
                        <span className="font-medium text-brand-secondary">
                          {organization?.name || "Your organization"}
                        </span>
                      </span>
                    </div>
                  </div>
                </article>
                <p className="mt-4 font-poppins text-caption leading-5 text-ink/50">
                  {isDraftEdit
                    ? "This draft is visible only to you until you publish it."
                    : event.access === "invite"
                      ? "This event will appear in discovery with an invite-only label. Only people you invite can join."
                      : event.access === "approval"
                        ? "This event will appear in discovery. People ask to join and you approve each one."
                        : "This event will appear in discovery for everyone."}{" "}
                  {isEdit
                    ? "Changes appear on the event page as soon as you save."
                    : "You can edit event details after publishing from your event workspace."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </OrganizationSetupGate>
  );
};

export default CreateEvents;
