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
import { Footer, Navbar } from "@components";
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
} from "@features/events/components/EventFormParts";
import EventDetailsSection from "@features/events/components/EventDetailsSection";
import { emptyDetailFields } from "@features/events/utils/eventDetailFields";
import convertToBase64 from "@features/events/utils/convertToBase64";
import { uploadCover } from "@features/events/utils/uploadCover";
import { RequestCoverUpload, SendCoverImage } from "@services/KarmaCircleApi";
import { useEvent } from "@features/events/hooks/useEvent";
import {
  browserTimeZone,
  combineInZone,
  listTimeZones,
  zoneAbbreviation,
  zoneOptionLabel,
} from "@features/events/utils/eventTimezone";
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

/** A blank form, with dates computed when the form opens (not at page load). */
const createInitialEvent = (): EventFormState => ({
  name: "",
  startDate: dayjs().add(1, "day"),
  endDate: dayjs().add(1, "day"),
  startTime: dayjs().add(1, "hour"),
  endTime: dayjs().add(2, "hour"),
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
  inviteOnly: false,
  capacity: "",
  timezone: browserTimeZone(),
  eventType: "",
  tags: "",
  ...emptyDetailFields(),
});

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
}: {
  initial: EventFormState;
  original?: ApiEvent;
}) => {
  const isEdit = Boolean(original);
  // Every timezone the browser knows, plus the event's own if it is somehow
  // missing from that list.
  const timeZones = useMemo(
    () => listTimeZones([initial.timezone]),
    [initial.timezone],
  );
  const isDraftEdit = original?.status === "draft";
  const navigate = useNavigate();
  const { organization } = useMyOrganization();
  const eventPageUrlPrefix = `${window.location.origin}/events/`;
  const [event, setEvent] = useState<EventFormState>(initial);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverError, setCoverError] = useState("");
  // While a cover is on its way to the image service the organizer sees the
  // file they chose (a local preview) and a progress bar, and cannot save the
  // event yet: saving now would leave the old cover or none.
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverUpload = useRef<AbortController | null>(null);
  const coverPreviewUrl = useRef<string | null>(null);
  const [isUidEdited, setIsUidEdited] = useState(isEdit);
  const { validateEvent, submitCallback } = useEvent(event, original);
  // The moment the preview's start means, to name its zone (daylight time and all).
  const shownCover = coverPreview ?? event.coverImage;
  const previewInstant =
    event.startDate && event.startTime
      ? combineInZone(event.startDate, event.startTime, event.timezone)
      : new Date();

  const handleTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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

  const releaseCoverPreview = () => {
    if (coverPreviewUrl.current) URL.revokeObjectURL(coverPreviewUrl.current);
    coverPreviewUrl.current = null;
    setCoverPreview(null);
  };

  // Leaving the page cancels an upload in flight and frees the local preview.
  useEffect(
    () => () => {
      coverUpload.current?.abort();
      if (coverPreviewUrl.current) URL.revokeObjectURL(coverPreviewUrl.current);
    },
    [],
  );

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

    // A newer choice replaces one still uploading.
    coverUpload.current?.abort();
    const controller = new AbortController();
    coverUpload.current = controller;

    releaseCoverPreview();
    coverPreviewUrl.current = URL.createObjectURL(file);
    setCoverPreview(coverPreviewUrl.current);
    setCoverUploading(true);
    setCoverProgress(0);

    const outcome = await uploadCover(
      file,
      {
        requestGrant: RequestCoverUpload,
        sendFile: SendCoverImage,
        readAsDataUrl: convertToBase64,
      },
      { signal: controller.signal, onProgress: setCoverProgress },
    );

    // Cancelled, or a newer choice has taken over: it owns the state now.
    if (outcome.kind === "cancelled" || coverUpload.current !== controller) {
      return;
    }
    coverUpload.current = null;
    setCoverUploading(false);
    releaseCoverPreview();

    if (outcome.kind === "uploaded") {
      setEvent((current) => ({ ...current, coverImage: outcome.url }));
    } else if (outcome.kind === "inline") {
      setEvent((current) => ({ ...current, coverImage: outcome.dataUrl }));
    } else {
      setCoverError(outcome.message);
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
    void submit("publish");
  };

  /**
   * Runs the checks, then saves. `intent` is which button was pressed: publish
   * (the form's own submit) or save as a draft (PG-15). A saved draft is not
   * public, so the organizer goes back to their list rather than to a page
   * nobody else can open.
   */
  const submit = async (intent: SubmitIntent) => {
    if (coverUploading) return;
    const validationErrors = validateEvent();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      document.getElementById(Object.keys(validationErrors)[0])?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCallback(
        event,
        () =>
          navigate(
            intent === "draft"
              ? "/organization/events"
              : `/events/${event.uid}`,
          ),
        validationErrors,
        intent,
      );
    } finally {
      setIsSubmitting(false);
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
    <OrganizationSetupGate
      title={isEdit ? "Edit an event" : "Publish an event"}
      description={
        isEdit
          ? "Finish your organization profile before editing events."
          : "Finish your organization profile before publishing events to the community."
      }
    >
      <Navbar />
      <main className="min-h-[70vh] bg-surface px-5 py-8 sm:px-9 sm:py-12 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/organization/events"
            className="inline-flex items-center gap-2 font-outfit text-body font-medium text-ink/65 no-underline transition hover:text-brand"
          >
            <FiArrowLeft aria-hidden="true" />
            Your events
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
                  ? "Change anything below. People see the update on the event page as soon as you save."
                  : "Share the essentials first. Your event will appear in discovery as soon as it’s published, or save a draft and finish later."}
            </p>
          </header>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:gap-12">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <FormSection
                number="01"
                title="The basics"
                description="Give your event a clear name and a cover image."
              >
                <div className="space-y-5">
                  <Field
                    id="name"
                    label="Event name"
                    error={errors.name}
                    count={{ value: event.name.length, max: 80 }}
                  >
                    <input
                      id="name"
                      name="name"
                      value={event.name}
                      onChange={handleNameChange}
                      className={inputClasses}
                      maxLength={80}
                      aria-invalid={Boolean(errors.name)}
                    />
                  </Field>
                  <Field
                    id="uid"
                    label="Event page address"
                    error={errors.uid}
                    hint={
                      isEdit
                        ? "The page address can’t change after publishing, so links people already have keep working."
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
                        className={`min-h-12 w-full bg-transparent px-4 py-3 font-outfit text-body outline-none ${isEdit ? "cursor-not-allowed text-ink/55" : "text-ink"}`}
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
                    count={{ value: event.description.length, max: 200 }}
                  >
                    <textarea
                      id="description"
                      name="description"
                      value={event.description}
                      onChange={handleTextChange}
                      className={`${inputClasses} min-h-32 resize-y`}
                      maxLength={200}
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
                      <select
                        id="eventType"
                        name="eventType"
                        value={event.eventType}
                        onChange={handleTextChange}
                        className={inputClasses}
                        aria-invalid={Boolean(errors.eventType)}
                      >
                        <option value="" disabled>
                          Choose a kind
                        </option>
                        {EVENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
                      {shownCover ? (
                        <img
                          src={shownCover}
                          alt="Event cover preview"
                          className="h-56 w-full object-cover"
                        />
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
                    {coverUploading && (
                      <div role="status" className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand/10">
                          <div
                            className="h-full rounded-full bg-brand transition-[width]"
                            style={{ width: `${coverProgress}%` }}
                          />
                        </div>
                        <p className="mt-1.5 font-poppins text-caption text-ink/60">
                          Uploading cover image
                          {coverProgress > 0 ? ` ${coverProgress}%` : "…"}
                        </p>
                      </div>
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
                    />
                  </Field>
                  <Field id="endDate" label="End date" error={errors.endDate}>
                    <input
                      id="endDate"
                      type="date"
                      value={event.endDate?.format("YYYY-MM-DD") ?? ""}
                      onChange={(e) => setDate("endDate", e.target.value)}
                      className={inputClasses}
                    />
                  </Field>
                  <Field id="endTime" label="End time" error={errors.endTime}>
                    <input
                      id="endTime"
                      type="time"
                      value={event.endTime?.format("HH:mm") ?? ""}
                      onChange={(e) => setTime("endTime", e.target.value)}
                      className={inputClasses}
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
                    <select
                      id="timezone"
                      name="timezone"
                      value={event.timezone}
                      onChange={handleTextChange}
                      className={inputClasses}
                    >
                      {timeZones.map((zone) => (
                        <option key={zone} value={zone}>
                          {zoneOptionLabel(zone)}
                        </option>
                      ))}
                    </select>
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
                      />
                    </Field>
                    <Field id="city" label="City" error={errors.city}>
                      <input
                        id="city"
                        name="city"
                        value={event.city}
                        onChange={handleTextChange}
                        className={inputClasses}
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
                      />
                    </Field>
                    <Field id="country" label="Country" error={errors.country}>
                      <select
                        id="country"
                        name="country"
                        value={event.country}
                        onChange={handleTextChange}
                        className={inputClasses}
                      >
                        {countries.map((country) => (
                          <option key={country.value} value={country.label}>
                            {country.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                {hasOnlineAccess(event.mode) && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field id="platform" label="Video platform">
                      <select
                        id="platform"
                        name="platform"
                        value={event.platform}
                        onChange={handleTextChange}
                        className={inputClasses}
                      >
                        {platforms.map((platform) => (
                          <option key={platform.value} value={platform.label}>
                            {platform.label}
                          </option>
                        ))}
                      </select>
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
                      />
                    </Field>
                  </div>
                )}
              </FormSection>

              <FormSection
                number="03"
                title="Who can attend?"
                description="Choose whether anyone can join or you’ll share details directly."
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-secondary/12 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(event.inviteOnly)}
                    onChange={(e) =>
                      setEvent((current) => ({
                        ...current,
                        inviteOnly: e.target.checked,
                      }))
                    }
                    className="mt-1 size-4 accent-brand"
                  />
                  <span>
                    <span className="block font-outfit text-body font-semibold text-brand-secondary">
                      Invite-only event
                    </span>
                    <span className="mt-1 block font-poppins text-caption leading-5 text-ink/60">
                      Event stays visible in discovery, but attendees will be
                      asked to contact your organization.
                    </span>
                  </span>
                </label>
                <div className="mt-5 max-w-xs">
                  <Field
                    id="capacity"
                    label="Maximum attendees (optional)"
                    error={errors.capacity}
                    hint={
                      isEdit
                        ? "Leave it empty for no limit. It can’t go below the people already registered."
                        : "Leave it empty for no limit. Once it is full, nobody else can join."
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
              </FormSection>

              <EventDetailsSection
                event={event}
                setEvent={setEvent}
                errors={errors}
              />

              <div className="flex flex-col-reverse gap-3 border-t border-brand-secondary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/organization/events")}
                  className="min-h-12 rounded-lg px-4 font-outfit text-body font-medium text-ink/65 transition hover:bg-brand-secondary/5 hover:text-brand-secondary"
                >
                  {isEdit ? "Discard changes" : "Cancel"}
                </button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  {(!isEdit || isDraftEdit) && (
                    <button
                      type="button"
                      disabled={isSubmitting || coverUploading}
                      onClick={() => void submit("draft")}
                      className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-secondary/20 bg-white px-6 font-outfit text-body font-semibold text-brand-secondary transition hover:border-brand/45 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isDraftEdit ? "Save draft" : "Save as draft"}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || coverUploading}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 font-outfit text-body font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting
                      ? isEdit && !isDraftEdit
                        ? "Saving…"
                        : "Publishing…"
                      : isEdit && !isDraftEdit
                        ? "Save changes"
                        : "Publish event"}
                  </button>
                </div>
              </div>
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
                    className={`rounded-full px-3 py-1 font-outfit text-caption font-medium ${event.inviteOnly ? "bg-brand-secondary/8 text-brand-secondary" : "bg-success/10 text-success"}`}
                  >
                    {event.inviteOnly ? "Invite only" : "Open to all"}
                  </span>
                </div>
                <article className="mt-4 overflow-hidden rounded-xl border border-brand-secondary/10">
                  <div className="aspect-video overflow-hidden bg-surface-warm">
                    {shownCover ? (
                      <img
                        src={shownCover}
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
                    : event.inviteOnly
                      ? "This event will appear in discovery with an invite-only label."
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
