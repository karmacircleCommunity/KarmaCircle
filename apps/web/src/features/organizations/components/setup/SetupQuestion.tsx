import { useEffect, useRef } from "react";
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
  /** Called by a single-choice question once it has been answered. */
  onAnswered: () => void;
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
 */
const AREA_MIN_PX = 88;
const AREA_MAX_PX = 240;

const textArea =
  "w-full resize-none overflow-y-auto rounded-xl border border-ink/15 bg-white px-4 py-3.5 pr-12 font-outfit text-lg leading-relaxed text-ink transition-colors placeholder:text-ink/25 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none";

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
  onAnswered,
}: SetupQuestionProps) => {
  const firstInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  // Every text-ish field on these screens holds a string; `setField` is
  // generic over the whole form, `domains` (a string[]) included, so this
  // one cast is what tells it these call sites can only be string fields.
  const setText = (field: OrganizationSetupField, value: string) =>
    setField(field as "name", value);

  // Focus the answer as the question arrives — on a one-question screen the
  // only thing to do is answer it, so making someone click into the field
  // first is a step that carries no meaning. Skipped on touch, where it
  // would throw up the keyboard over the question being asked.
  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (!coarse) firstInput.current?.focus();

    // Size the paragraph box to whatever is already saved in it, so coming
    // back to an answered question doesn't show it collapsed.
    if (firstInput.current instanceof HTMLTextAreaElement) {
      autoGrow(firstInput.current);
    }
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
      onAnswered();
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
    return (
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {question.fields.map((field, index) => {
          const spec = FIELD_SPECS[field];
          if (!spec) return null;
          const required = question.requiredFields.includes(field);

          return (
            <label key={field} className="flex flex-col gap-1">
              <span className="font-outfit text-body font-medium text-ink/70">
                {spec.label}
                {required && (
                  <span className="ml-0.5 align-top text-xs text-red-500">
                    *
                  </span>
                )}
              </span>
              <input
                ref={(element) => {
                  if (index === 0) firstInput.current = element;
                }}
                type={spec.type}
                min={spec.type === "number" ? 0 : undefined}
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
            </label>
          );
        })}
      </div>
    );
  }

  if (question.kind === "textarea") {
    return (
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
        maxLength={4000}
        onChange={(event) => {
          setField("description", event.target.value);
          autoGrow(event.target);
        }}
        placeholder="We clear and rebuild riverbank homes after the monsoon…"
        data-cy="org-description"
        style={{ minHeight: AREA_MIN_PX, maxHeight: AREA_MAX_PX }}
        className={textArea}
      />
    );
  }

  const field = question.fields[0];

  return (
    <input
      ref={(element) => {
        firstInput.current = element;
      }}
      type={question.kind === "number" ? "number" : "text"}
      min={question.kind === "number" ? 1 : undefined}
      value={form[field] as string}
      onChange={(event) => setText(field, event.target.value)}
      placeholder={question.kind === "number" ? "12" : "Type your answer…"}
      data-cy={FIELD_CY[field]}
      className={`${lineInput} text-2xl`}
    />
  );
};

export default SetupQuestion;
