import Button from "@components/buttons/Button";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { PROFILE_SETUP_QUESTIONS } from "../../constants/profileSetup";
import type { ProfileSetupForm } from "../../types";

/**
 * The screen this flow lands on before any question — the individual-user
 * fork of organizations' `SetupIntro.tsx`. Simpler than that one on
 * purpose: there's no draft/live concept and no multi-step checklist to
 * show (this whole flow is three questions, not three steps), so the
 * checklist below is driven directly by `PROFILE_SETUP_QUESTIONS` rather
 * than by a step list.
 */
type ProfileSetupIntroProps = {
  name: string;
  form: ProfileSetupForm;
  started: boolean;
  onStart: () => void;
  onLater: () => void;
};

const ProfileSetupIntro = ({
  name,
  form,
  started,
  onStart,
  onLater,
}: ProfileSetupIntroProps) => (
  <div>
    <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink sm:text-3xl">
      {started ? "Pick up where you left off" : `Welcome, ${name}`}
    </h1>
    <p className="mt-3 font-outfit text-body text-gray-600 sm:text-body-lg">
      {started
        ? "Your saved details are filled in. Review or update them whenever you are ready."
        : "A few quick details round out your profile. All optional. Save your changes at the end."}
    </p>

    <ol className="mt-9 flex list-none flex-col gap-2 p-0">
      {PROFILE_SETUP_QUESTIONS.map((question, index) => {
        const done = question.fields.some(
          (field) => form[field].trim().length > 0,
        );

        return (
          <li key={question.id} className="flex items-start gap-3.5 py-2">
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full font-outfit text-sm font-semibold ${
                done
                  ? "bg-brand text-white"
                  : "border border-brand/25 bg-brand/8 text-brand"
              }`}
            >
              {done ? <FiCheck /> : index + 1}
            </span>
            <div>
              <p className="m-0 font-outfit text-body-lg font-medium text-ink">
                {question.headline}
              </p>
              {question.hint && (
                <p className="mt-0.5 font-outfit text-body text-ink/55">
                  {question.hint}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>

    <p className="mt-8 font-outfit text-body text-ink/50">
      Three questions, under a minute. Closing before saving discards your
      changes.
    </p>

    <div className="mt-8 flex flex-col items-center gap-4">
      <Button
        onClickfunction={onStart}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5"
        cypressfield="profile-setup-start"
      >
        {started ? "Continue" : "Let's go"}
        <FiArrowRight aria-hidden />
      </Button>

      <button
        type="button"
        onClick={onLater}
        data-cy="profile-setup-later"
        className="-mx-4 -my-2.5 cursor-pointer border-none bg-transparent px-4 py-2.5 font-outfit text-caption text-ink/65 underline-offset-2 transition-colors hover:text-ink/80 hover:underline"
      >
        Maybe later
      </button>
    </div>
  </div>
);

export default ProfileSetupIntro;
