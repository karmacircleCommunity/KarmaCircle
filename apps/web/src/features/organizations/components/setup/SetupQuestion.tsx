import { useEffect, useRef, useState } from "react";
import { FiCheck } from "react-icons/fi";
import {
  FIELD_CY,
  FIELD_SPECS,
  MAX_DOMAINS,
} from "../../constants/organizationSetup";
import type {
  OrganizationSetupField,
  OrganizationSetupForm,
  OrganizationSetupQuestion,
  OrganizationTaxonomy,
} from "../../types";
import type { LocateCity } from "../../hooks/useLocateCity";
import { sanitizeSetupValue } from "../../utils/organizationSetupForm";
import SetupFieldLabel from "./SetupFieldLabel";
import SetupLocationFields from "./SetupLocationFields";

/**
 * One question of the setup flow, rendered by kind.
 *
 * The inputs are underlines rather than boxes, and set at roughly twice
 * body size. With a single question on screen there is nothing for a box to
 * separate it *from* — the border would only be drawing a container around
 * the one thing already in the middle of the page — and at this size the
 * answer reads as the subject of the screen rather than as form filling.
 *
 * Choice screens carry letter keys (A, B, C…) that actually work: on a
 * question with no text input, the keyboard is otherwise idle, and typing
 * "C" is faster than reaching for a mouse.
 */
type SetupQuestionProps = {
  question: OrganizationSetupQuestion;
  form: OrganizationSetupForm;
  setField: <K extends OrganizationSetupField>(
    key: K,
    value: OrganizationSetupForm[K],
  ) => void;
  taxonomy?: OrganizationTaxonomy;
  /**
   * The "use my current location" state, owned by the page because its
   * button sits in the headline row rather than in here. Only the location
   * question reads it.
   */
  locate: LocateCity;
  /**
   * What's badly formed right now, keyed by field (`invalidFields`). Held
   * by the page rather than computed here because the same map is what
   * decides whether Continue is allowed through.
   */
  errors?: Partial<Record<OrganizationSetupField, string>>;
  /**
   * Show every error in `errors`, whether or not that field has been left
   * yet. Set when a Continue is refused: at that point the user has been
   * told the screen is wrong, so saying *which* field only after they
   * revisit it would be a riddle.
   */
  showErrors?: boolean;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const lineInput =
  "w-full border-0 border-b-2 border-ink/15 bg-transparent px-0 py-3 font-outfit text-ink transition-colors placeholder:text-ink/25 focus:border-brand focus:outline-none";

/**
 * The paragraph answer is the one field that is a box rather than an
 * underline.
 *
 * An underline only works when the text sits on it. A textarea aligns its
 * text to the top, so a tall one draws its rule an inch below the words —
 * which read as floating in space rather than as written on a line. A box
 * is also where a browser extension (Grammarly and friends) expects to put
 * its own button: in the corner of a bordered field, not loose over a gap.
 *
 * Sized as body copy, not as a headline: the letter-key choice buttons
 * (`border-brand-secondary/15`) set the line here, not `lineInput`'s
 * near-black `border-ink/15` - this box is meant to read as one of the
 * app's warm surfaces, not a generic HTML field dropped on top of one.
 */
const AREA_MIN_PX = 88;
const AREA_MAX_PX = 240;
const DESCRIPTION_MAX = 500;
/** Nudges the counter to amber before the hard `maxLength` cutoff bites. */
const DESCRIPTION_WARN = DESCRIPTION_MAX - 50;

/**
 * The two single-field, non-group questions ("What's your organization
 * called?" and "How many people are behind it?") aren't in `FIELD_SPECS` -
 * their headline is the label, so they never needed an entry there - but
 * `name` and `teamSize` are still capped server-side
 * (`updateOrganizationSchema`). Named for the one field each guards, same as
 * `DESCRIPTION_MAX` above.
 */
const NAME_MAX = 120;
const TEAM_SIZE_MAX = 1_000_000;

const textArea =
  "w-full resize-none overflow-y-auto rounded-xl border border-brand-secondary/15 bg-surface px-4 py-3.5 pr-16 font-outfit text-body-lg leading-relaxed text-ink transition-colors placeholder:text-ink/25 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none";

/**
 * Grows the box to fit what has been typed, between the two bounds above.
 * `resize-none` plus this is deliberate: the old field was `resize-y` with
 * no ceiling, so it could be dragged to any height at all, and it started
 * at a size that was mostly empty regardless of the answer.
 */
const autoGrow = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(
    Math.max(element.scrollHeight, AREA_MIN_PX),
    AREA_MAX_PX,
  )}px`;
};

const SetupQuestion = ({
  question,
  form,
  setField,
  taxonomy,
  locate,
  errors = {},
  showErrors = false,
}: SetupQuestionProps) => {
  const firstInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  // Which fields the user has finished with. A format complaint while
  // someone is still mid-way through typing an email is noise - every
  // address is invalid until the moment it isn't - so an error waits for
  // the blur, or for a refused Continue (`showErrors`). Local state, and
  // the component remounts per question, so it clears itself on every move.
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});

  // Every text-ish field on these screens holds a string; `setField` is
  // generic over the whole form, `domains` (a string[]) included, so this
  // one cast is what tells it these call sites can only be string fields.
  const setText = (field: OrganizationSetupField, value: string) =>
    setField(field as "name", value);

  // Focus the answer as the question arrives — on a one-question screen the
  // only thing to do is answer it, so making someone click into the field
  // first is a step that carries no meaning. Skipped on touch, where it
  // would throw up the keyboard over the question being asked.
  //
  // `preventScroll` matters here: the screen mounts mid-way through the
  // `question-in` entrance (a 38px upward slide), so a plain `focus()` would
  // scroll the page to the field's pre-animation position and then let the
  // slide drag it back — a visible jump. `requestAnimationFrame` waits for
  // the remounted node to be laid out before reaching for it.
  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;

    const frame = requestAnimationFrame(() => {
      if (!coarse) firstInput.current?.focus({ preventScroll: true });

      // Size the paragraph box to whatever is already saved in it, so coming
      // back to an answered question doesn't show it collapsed.
      if (firstInput.current instanceof HTMLTextAreaElement) {
        autoGrow(firstInput.current);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [question.id]);

  const options =
    question.kind === "choice"
      ? (taxonomy?.tags ?? [])
      : question.kind === "chips"
        ? (taxonomy?.domains ?? [])
        : [];

  const pickedDomains = form.domains;
  const atDomainLimit = pickedDomains.length >= MAX_DOMAINS;

  const choose = (value: string) => {
    if (question.kind === "choice") {
      setField("tag", value);
      return;
    }

    const picked = pickedDomains.includes(value);
    if (!picked && atDomainLimit) return;
    setField(
      "domains",
      picked
        ? pickedDomains.filter((item) => item !== value)
        : [...pickedDomains, value],
    );
  };

  // Letter shortcuts, live only while a choice question is on screen.
  useEffect(() => {
    if (question.kind !== "choice" && question.kind !== "chips") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const index = LETTERS.indexOf(event.key.toUpperCase());
      if (index === -1 || index >= options.length) return;
      event.preventDefault();
      choose(options[index]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (question.kind === "choice" || question.kind === "chips") {
    const multi = question.kind === "chips";

    return (
      <ul className="grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
        {options.map((option, index) => {
          const picked = multi
            ? pickedDomains.includes(option)
            : form.tag === option;
          const blocked = multi && !picked && atDomainLimit;

          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => choose(option)}
                aria-pressed={picked}
                disabled={blocked}
                data-cy={`org-${multi ? "domain" : "tag"}-${option}`}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-outfit text-body transition-colors duration-200 ${
                  picked
                    ? "cursor-pointer border-brand bg-brand/8 text-brand"
                    : blocked
                      ? "cursor-not-allowed border-brand-secondary/10 bg-white/50 text-ink/30"
                      : "cursor-pointer border-brand-secondary/15 bg-white text-ink/80 hover:border-brand/40 hover:bg-brand/4"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md font-outfit text-caption font-semibold ${
                    picked
                      ? "bg-brand text-white"
                      : "bg-ink/6 text-ink/45 group-hover:bg-brand/10"
                  }`}
                >
                  {picked && multi ? (
                    <FiCheck className="size-3.5" />
                  ) : (
                    LETTERS[index]
                  )}
                </span>
                {option}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  if (question.kind === "group") {
    // The one group whose answers are drawn from a known list, so it gets
    // suggestions and a "use my location" shortcut instead of two blank
    // boxes. Split out rather than switched on inside the loop below: it
    // carries its own async data and cross-fills one field from the other,
    // neither of which the generic path has any business knowing about.
    if (question.id === "location") {
      return (
        <SetupLocationFields
          question={question}
          form={form}
          setField={setText}
          registerFirstInput={(element) => {
            firstInput.current = element;
          }}
          inputClassName={lineInput}
          locate={locate}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {question.fields.map((field, index) => {
          const spec = FIELD_SPECS[field];
          if (!spec) return null;
          const required = question.requiredFields.includes(field);

          return (
            <div key={field} className="flex flex-col gap-1">
              <SetupFieldLabel
                htmlFor={`org-field-${field}`}
                required={required}
              >
                {spec.label}
              </SetupFieldLabel>
              <input
                id={`org-field-${field}`}
                ref={(element) => {
                  if (index === 0) firstInput.current = element;
                }}
                type={spec.type}
                min={spec.type === "number" ? 0 : undefined}
                maxLength={spec.maxLength}
                placeholder={spec.placeholder}
                value={form[field] as string}
                onChange={(event) => setText(field, event.target.value)}
                data-cy={FIELD_CY[field]}
                className={`${lineInput} text-body-lg`}
              />
              {spec.hint && (
                <span className="font-outfit text-caption text-ink/45">
                  {spec.hint}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (question.kind === "textarea") {
    const count = form.description.length;
    const nearLimit = count >= DESCRIPTION_WARN;

    return (
      <div className="relative">
        <textarea
          ref={(element) => {
            firstInput.current = element;
          }}
          rows={2}
          // Grammarly (and anything else driven off these attributes) injects
          // its own button into the corner of a textarea, which lands on top
          // of the field's own chrome and looks like a rendering bug. Asked
          // for explicitly — the browser's native spellcheck still runs.
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(event) => {
            setField("description", event.target.value);
            autoGrow(event.target);
          }}
          placeholder="We clear and rebuild riverbank homes after the monsoon…"
          data-cy="org-description"
          style={{ minHeight: AREA_MIN_PX, maxHeight: AREA_MAX_PX }}
          className={textArea}
        />
        {/* Lives in the `pr-16` gutter the field already reserves, clear of
            where typed text wraps. Only turns amber near the hard cap -
            there's no minimum to nag about, `description` is required and
            that's already said above the field. */}
        <span
          aria-hidden="true"
          data-cy="org-description-count"
          className={`pointer-events-none absolute right-3.5 bottom-3 font-outfit text-caption tabular-nums ${
            nearLimit ? "text-amber-600" : "text-ink/45"
          }`}
        >
          {count}/{DESCRIPTION_MAX}
        </span>
      </div>
    );
  }

  const field = question.fields[0];
  const isNumber = question.kind === "number";

  return (
    <input
      ref={(element) => {
        firstInput.current = element;
      }}
      type={isNumber ? "number" : "text"}
      min={isNumber ? 1 : undefined}
      // Mirrors the API's own caps (`updateOrganizationSchema`) so a step
      // can't fail to save over a length or size nothing on screen warned
      // about: `name` at 120 chars, `teamSize` at a million.
      max={isNumber ? TEAM_SIZE_MAX : undefined}
      maxLength={isNumber ? undefined : NAME_MAX}
      value={form[field] as string}
      onChange={(event) => setText(field, event.target.value)}
      placeholder={isNumber ? "12" : "Type your answer…"}
      data-cy={FIELD_CY[field]}
      className={`${lineInput} text-2xl`}
    />
  );
};

export default SetupQuestion;
