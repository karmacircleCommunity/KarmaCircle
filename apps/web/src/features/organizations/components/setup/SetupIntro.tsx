import Button from "@components/buttons/Button";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import type { OrganizationSetupStepStatus } from "../../types";

/**
 * The screen a draft organization lands on straight after signup.
 *
 * The intent is that they set the profile up now — that is the primary
 * button, and the copy points at what a finished profile does rather than
 * at the exit. "Maybe later" still exists (setup is not technically
 * mandatory, and the flow can be resumed from the navbar), but it is a
 * quiet text link, not a second button competing with the CTA. What the
 * screen does not do is hide the consequence: the "Draft — not visible
 * yet" badge above says plainly that nothing is public until this is done.
 */
type SetupIntroProps = {
  name: string;
  steps: OrganizationSetupStepStatus[];
  /** True once any required field has been answered in an earlier visit. */
  started: boolean;
  onStart: () => void;
  onLater: () => void;
};

const SetupIntro = ({
  name,
  steps,
  started,
  onStart,
  onLater,
}: SetupIntroProps) => (
  <div>
    <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink sm:text-3xl">
      {started ? `Pick up where you left off` : `Welcome, ${name}`}
    </h1>
    <p className="mt-3 font-outfit text-body text-gray-600 sm:text-body-lg">
      {started
        ? "Your answers so far are saved. Finish the rest whenever you are ready."
        : "Your account is ready. Fill in a few details and your organization appears in the directory, where donors and volunteers can find it."}
    </p>

    <ol className="mt-9 flex list-none flex-col gap-2 p-0">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-start gap-3.5 py-2">
          <span
            aria-hidden
            className={`flex size-7 shrink-0 items-center justify-center rounded-full font-outfit text-sm font-semibold ${
              step.done
                ? "bg-brand text-white"
                : "border border-brand/25 bg-brand/8 text-brand"
            }`}
          >
            {step.done ? <FiCheck /> : index + 1}
          </span>
          <div>
            <p className="m-0 font-outfit text-body-lg font-medium text-ink">
              {step.title}
            </p>
            <p className="mt-0.5 font-outfit text-body text-ink/55">
              {step.summary}
            </p>
          </div>
        </li>
      ))}
    </ol>

    <p className="mt-8 font-outfit text-body text-ink/50">
      Two steps, around two minutes. Each one saves on its own as you go.
    </p>

    <div className="mt-8 flex flex-col items-center gap-4">
      <Button
        onClickfunction={onStart}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5"
        cypressfield="setup-start"
      >
        {started ? "Continue setup" : "Set up my profile"}
        <FiArrowRight aria-hidden />
      </Button>

      {/* Deliberately understated — a centred text link, not a button.
          Setup is not mandatory, so this stays reachable, but it should
          read as a footnote to the CTA rather than an equal choice. */}
      <button
        type="button"
        onClick={onLater}
        data-cy="setup-later"
        className="cursor-pointer border-none bg-transparent p-0 font-outfit text-caption text-ink/40 underline-offset-2 transition-colors hover:text-ink/70 hover:underline"
      >
        Maybe later
      </button>
    </div>
  </div>
);

export default SetupIntro;
