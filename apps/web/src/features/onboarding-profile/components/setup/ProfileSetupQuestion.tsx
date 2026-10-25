import Combobox from "@components/inputs/Combobox";
import SetupFieldLabel from "@components/setup/SetupFieldLabel";
import type { LocateCity } from "@hooks/useLocateCity";
import { useEffect, useRef } from "react";
import { FIELD_CY, FIELD_SPECS } from "../../constants/profileSetup";
import { useAddressAutocomplete } from "../../hooks/useAddressAutocomplete";
import type { ProfileSetupField, ProfileSetupForm, ProfileSetupQuestion as Question } from "../../types";
import { isAddressAutocompleteConfigured } from "../../utils/geoapify";
import ProfileSetupLocationFields from "./ProfileSetupLocationFields";

/**
 * One question of the profile-setup flow, rendered by kind — the
 * individual-user fork of organizations' `SetupQuestion.tsx`. Only two
 * kinds exist here (`textarea`, `group`); there's no `choice`/`chips`/
 * `list`/`toggle` branch because nothing in this flow needs them. See
 * SPEC.md for why this is a fork rather than a shared, parameterized
 * component.
 */
type ProfileSetupQuestionProps = {
  question: Question;
  form: ProfileSetupForm;
  setField: <K extends ProfileSetupField>(
    key: K,
    value: ProfileSetupForm[K],
  ) => void;
  locate: LocateCity;
};

const lineInput =
  "w-full border-0 border-b-2 border-ink/15 bg-transparent px-0 py-3 font-outfit text-ink transition-colors placeholder:text-ink/25 focus:border-brand focus:outline-none";

const textArea =
  "w-full resize-none overflow-y-auto rounded-xl border border-brand-secondary/15 bg-surface px-4 py-3.5 pr-16 font-outfit text-body-lg leading-relaxed text-ink transition-colors placeholder:text-ink/25 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none";

const AREA_MIN_PX = 88;
const AREA_MAX_PX = 240;
const DESCRIPTION_MAX = 500;
const DESCRIPTION_WARN = DESCRIPTION_MAX - 50;

const autoGrow = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(
    Math.max(element.scrollHeight, AREA_MIN_PX),
    AREA_MAX_PX,
  )}px`;
};

const ProfileSetupQuestion = ({
  question,
  form,
  setField,
  locate,
}: ProfileSetupQuestionProps) => {
  const firstInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  // Backs the "address" question's line1 field when a Google Maps key is
  // configured (see the `field === "line1"` branch below). Declared
  // unconditionally, same as any other hook, even though only one question
  // ever reads it — this component has early returns above the group
  // branch, so it can't be called from inside that branch instead.
  const addressAutocomplete = useAddressAutocomplete((fill) => {
    setField("line1", fill.line1);
    setField("line2", fill.line2);
    setField("city", fill.city);
    setField("state", fill.state);
    setField("country", fill.country);
    setField("pincode", fill.pincode);
  });

  // Same focus-on-arrival behavior as organization setup's `SetupQuestion`
  // — one thing on screen, nothing to click into first. Skipped on touch,
  // where it would raise the keyboard over the question being asked.
  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;

    const frame = requestAnimationFrame(() => {
      if (!coarse) firstInput.current?.focus({ preventScroll: true });
      if (firstInput.current instanceof HTMLTextAreaElement) {
        autoGrow(firstInput.current);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [question.id]);

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
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(event) => {
            setField("description", event.target.value);
            autoGrow(event.target);
          }}
          placeholder="I volunteer with local shelters most weekends…"
          data-cy={FIELD_CY.description}
          style={{ minHeight: AREA_MIN_PX, maxHeight: AREA_MAX_PX }}
          className={textArea}
        />
        <span
          aria-hidden="true"
          data-cy="profile-description-count"
          className={`pointer-events-none absolute right-3.5 bottom-3 font-outfit text-caption tabular-nums ${
            nearLimit ? "text-warning" : "text-ink/45"
          }`}
        >
          {count}/{DESCRIPTION_MAX}
        </span>
      </div>
    );
  }

  // The one group whose answers are drawn from a known list — split out
  // the same way organizations' `SetupQuestion` splits its "location"
  // question, since it carries its own async suggestion data.
  if (question.id === "location") {
    return (
      <ProfileSetupLocationFields
        form={form}
        setField={setField}
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
        if (field === "description") return null;
        const spec = FIELD_SPECS[field];

        // Street address gets Google Places suggestions when a key is
        // configured — picking one fills line2/city/state/country/pincode
        // too (`addressAutocomplete`'s `onFill`, above), the same
        // "pick one thing, several fields update" shape the location
        // question's city/state already has. No key configured: falls
        // through to the plain input below, unchanged.
        if (field === "line1" && isAddressAutocompleteConfigured()) {
          return (
            <div key={field} className="flex flex-col gap-1 sm:col-span-2">
              <SetupFieldLabel htmlFor="profile-field-line1">
                {spec.label}
              </SetupFieldLabel>
              <Combobox
                id="profile-field-line1"
                value={form.line1}
                onChange={(value) => {
                  setField("line1", value);
                  addressAutocomplete.search(value);
                }}
                onPick={(option) => addressAutocomplete.pick(option)}
                options={addressAutocomplete.suggestions}
                maxLength={spec.maxLength}
                placeholder={spec.placeholder}
                dataCy={FIELD_CY.line1}
                inputRef={(element) => {
                  if (index === 0) firstInput.current = element;
                }}
                className={`${lineInput} text-body-lg`}
                noun="addresses"
              />
            </div>
          );
        }

        return (
          <div key={field} className="flex flex-col gap-1">
            <SetupFieldLabel htmlFor={`profile-field-${field}`}>
              {spec.label}
            </SetupFieldLabel>
            <input
              id={`profile-field-${field}`}
              ref={(element) => {
                if (index === 0) firstInput.current = element;
              }}
              type="text"
              maxLength={spec.maxLength}
              placeholder={spec.placeholder}
              value={form[field]}
              onChange={(event) => setField(field, event.target.value)}
              data-cy={FIELD_CY[field]}
              className={`${lineInput} text-body-lg`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ProfileSetupQuestion;
