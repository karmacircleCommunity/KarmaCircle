import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Dropdown } from "@components";
import type { DropdownOption } from "@components";
import {
  Field,
  FormSection,
  inputClasses,
} from "@features/events/components/EventFormParts";
import RichText from "@features/events/components/RichText";
import { hasOnlineAccess, hasVenue } from "@features/events/utils/eventMode";
import {
  COST_CURRENCIES,
  DETAIL_LIMITS,
  paragraphs,
} from "@features/events/utils/eventDetailFields";
import type { EventFormErrors, EventFormState } from "@features/events/types";

interface EventDetailsSectionProps {
  event: EventFormState;
  setEvent: Dispatch<SetStateAction<EventFormState>>;
  errors: EventFormErrors;
  hidden?: boolean;
  asTabPanel?: boolean;
}

/**
 * Section 04 of the event form (PG-7): everything the event page can show
 * beyond the basics, all optional. Each part is hidden from the event page when
 * left empty, so an organizer only fills in what helps: a longer write-up, a
 * contact email, a fee, what to bring, languages, a minimum age, the run sheet,
 * and the mode's own "how do I get there / join" notes.
 *
 * `fundraiser` and the government-backed badge are not here: the first waits on
 * the money decision (PG-26) and the second is set by the server only.
 */
const EventDetailsSection = ({
  event,
  setEvent,
  errors,
  hidden,
  asTabPanel,
}: EventDetailsSectionProps) => {
  const L = DETAIL_LIMITS;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEvent((current) => ({ ...current, [name]: value }));
  };

  const setAgendaRow = (
    index: number,
    field: "time" | "title" | "detail",
    value: string,
  ) =>
    setEvent((current) => ({
      ...current,
      agenda: current.agenda.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));

  const addAgendaRow = () =>
    setEvent((current) => ({
      ...current,
      agenda: [...current.agenda, { time: "", title: "", detail: "" }],
    }));

  const removeAgendaRow = (index: number) =>
    setEvent((current) => ({
      ...current,
      agenda: current.agenda.filter((_, i) => i !== index),
    }));

  const currencies = COST_CURRENCIES.includes(
    event.costCurrency as (typeof COST_CURRENCIES)[number],
  )
    ? COST_CURRENCIES
    : [...COST_CURRENCIES, event.costCurrency];
  const currencyOptions: readonly DropdownOption[] = currencies.map(
    (currency) => ({ value: currency, label: currency }),
  );

  return (
    <FormSection
      number="04"
      title="More about the event"
      description="All optional. Anything you leave empty stays off the event page."
      sectionKey="details"
      hidden={hidden}
      asTabPanel={asTabPanel}
    >
      <div className="space-y-5">
        <Field
          id="about"
          label="Full write-up"
          error={errors.about}
          hint="Separate paragraphs with a blank line. Use **bold**, *italic*, [a link](https://…), lines starting with - for bullets and 1. for a numbered list. This appears under “About this event”."
        >
          <textarea
            id="about"
            name="about"
            value={event.about}
            onChange={handleChange}
            className={`${inputClasses} min-h-40 resize-y`}
            placeholder="Tell people what the day looks like, who it’s for and why it matters."
            aria-invalid={Boolean(errors.about)}
          />
        </Field>
        {paragraphs(event.about).length > 0 && (
          <div
            aria-label="Preview of the write-up"
            role="group"
            className="rounded-xl border border-brand-secondary/12 bg-white p-4"
          >
            <p className="mt-0 mb-3 font-outfit text-caption font-semibold tracking-wide text-ink/50 uppercase">
              Preview
            </p>
            <RichText
              paragraphs={paragraphs(event.about)}
              className="font-poppins text-body leading-7 text-ink/75"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="contactEmail"
            label="Contact email"
            error={errors.contactEmail}
            hint="Shown on the event page so people can ask you a question."
          >
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={event.contactEmail}
              onChange={handleChange}
              className={inputClasses}
              maxLength={L.contactEmailLength}
              placeholder="volunteers@yourorg.org"
              aria-invalid={Boolean(errors.contactEmail)}
            />
          </Field>
          <Field
            id="minimumAge"
            label="Minimum age"
            error={errors.minimumAge}
            hint="Only if there is a real reason. Leave empty for everyone."
          >
            <input
              id="minimumAge"
              name="minimumAge"
              type="number"
              inputMode="numeric"
              min={1}
              max={L.minimumAgeMax}
              step={1}
              value={event.minimumAge}
              onChange={handleChange}
              className={inputClasses}
              placeholder="No limit"
              aria-invalid={Boolean(errors.minimumAge)}
            />
          </Field>
        </div>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 font-outfit text-body font-medium text-ink/75">
            Cost to attend
          </legend>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Field
              id="costAmount"
              label="Fee"
              error={errors.costAmount}
              hint="Leave empty for a free event, which is nearly all of them."
            >
              <input
                id="costAmount"
                name="costAmount"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={event.costAmount}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Free"
                aria-invalid={Boolean(errors.costAmount)}
              />
            </Field>
            <Field
              id="costCurrency"
              label="Currency"
              error={errors.costCurrency}
            >
              <Dropdown
                id="costCurrency"
                options={currencyOptions}
                value={event.costCurrency}
                onChange={(value) =>
                  setEvent((current) => ({ ...current, costCurrency: value }))
                }
                invalid={Boolean(errors.costCurrency)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field
              id="costNote"
              label="What the fee covers"
              error={errors.costNote}
              hint="Shown next to the fee on the event page."
              count={{ value: event.costNote.length, max: L.costNoteLength }}
            >
              <input
                id="costNote"
                name="costNote"
                value={event.costNote}
                onChange={handleChange}
                className={inputClasses}
                maxLength={L.costNoteLength}
                placeholder="Snacks, gloves and a certificate"
                aria-invalid={Boolean(errors.costNote)}
              />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="bringAlong"
            label="What to bring"
            error={errors.bringAlong}
            hint="One item per line."
          >
            <textarea
              id="bringAlong"
              name="bringAlong"
              value={event.bringAlong}
              onChange={handleChange}
              className={`${inputClasses} min-h-28 resize-y`}
              placeholder={"Water bottle\nSun hat"}
              aria-invalid={Boolean(errors.bringAlong)}
            />
          </Field>
          <Field
            id="languages"
            label="Languages"
            error={errors.languages}
            hint="Separate with commas or put one language per line."
          >
            <textarea
              id="languages"
              name="languages"
              value={event.languages}
              onChange={handleChange}
              className={`${inputClasses} min-h-28 resize-y`}
              placeholder="English, Hindi"
              aria-invalid={Boolean(errors.languages)}
            />
          </Field>
        </div>

        {hasVenue(event.mode) && (
          <Field
            id="gettingThere"
            label="Getting there"
            error={errors.gettingThere}
            count={{
              value: event.gettingThere.length,
              max: L.gettingThereLength,
            }}
            hint="Directions, parking or the nearest station."
          >
            <textarea
              id="gettingThere"
              name="gettingThere"
              value={event.gettingThere}
              onChange={handleChange}
              className={`${inputClasses} min-h-24 resize-y`}
              maxLength={L.gettingThereLength}
              aria-invalid={Boolean(errors.gettingThere)}
            />
          </Field>
        )}

        {hasOnlineAccess(event.mode) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="linkDelivery"
              label="When the join link arrives"
              error={errors.linkDelivery}
              count={{
                value: event.linkDelivery.length,
                max: L.joinNoteLength,
              }}
            >
              <input
                id="linkDelivery"
                name="linkDelivery"
                value={event.linkDelivery}
                onChange={handleChange}
                className={inputClasses}
                maxLength={L.joinNoteLength}
                placeholder="Emailed the evening before"
                aria-invalid={Boolean(errors.linkDelivery)}
              />
            </Field>
            <Field
              id="joinRequirements"
              label="Have ready before joining"
              error={errors.joinRequirements}
              count={{
                value: event.joinRequirements.length,
                max: L.joinNoteLength,
              }}
            >
              <input
                id="joinRequirements"
                name="joinRequirements"
                value={event.joinRequirements}
                onChange={handleChange}
                className={inputClasses}
                maxLength={L.joinNoteLength}
                placeholder="A working camera and microphone"
                aria-invalid={Boolean(errors.joinRequirements)}
              />
            </Field>
          </div>
        )}

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-1.5 font-outfit text-body font-medium text-ink/75">
            How the day runs
          </legend>
          <p className="mt-0 mb-3 font-poppins text-caption text-ink/50">
            A simple schedule. Times are shown as you write them, in the event’s
            own time.
          </p>
          {event.agenda.length > 0 && (
            <ul className="m-0 mb-3 flex list-none flex-col gap-3 p-0">
              {event.agenda.map((row, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-brand-secondary/12 bg-white p-3 sm:p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <input
                      aria-label={`Time for row ${index + 1}`}
                      value={row.time}
                      onChange={(e) =>
                        setAgendaRow(index, "time", e.target.value)
                      }
                      maxLength={L.agendaTimeLength}
                      placeholder="9:00 am"
                      className={inputClasses}
                    />
                    <input
                      aria-label={`Title for row ${index + 1}`}
                      value={row.title}
                      onChange={(e) =>
                        setAgendaRow(index, "title", e.target.value)
                      }
                      maxLength={L.agendaTitleLength}
                      placeholder="Welcome and briefing"
                      className={inputClasses}
                    />
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <input
                      aria-label={`Detail for row ${index + 1} (optional)`}
                      value={row.detail}
                      onChange={(e) =>
                        setAgendaRow(index, "detail", e.target.value)
                      }
                      maxLength={L.agendaDetailLength}
                      placeholder="A line of detail (optional)"
                      className={inputClasses}
                    />
                    <button
                      type="button"
                      onClick={() => removeAgendaRow(index)}
                      aria-label={`Remove row ${index + 1}`}
                      className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-secondary/15 bg-white text-ink/60 transition hover:border-error/40 hover:text-error"
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {errors.agenda && (
            <p
              role="alert"
              className="mt-0 mb-3 font-poppins text-caption text-error"
            >
              {errors.agenda}
            </p>
          )}
          {event.agenda.length < L.agendaItems && (
            <button
              type="button"
              onClick={addAgendaRow}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-secondary/25 bg-transparent px-4 font-outfit text-body font-medium text-brand-secondary transition hover:border-brand/55 hover:text-brand"
            >
              <FiPlus aria-hidden="true" />
              Add a row
            </button>
          )}
        </fieldset>
      </div>
    </FormSection>
  );
};

export default EventDetailsSection;
