import Button from "@components/buttons/Button";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import type { OrganizationSetupStepStatus } from "../../types";

/**
 * The opt-in screen a draft organization lands on straight after signup.
 *
 * Setting a profile up is optional — this asks rather than assumes, and
 * "Maybe later" is a real, equally reachable answer that leaves the account
 * on the home page with nothing half-filled. What it does not do is hide
 * the consequence: a draft organization is invisible until this is done,
 * and that is said plainly rather than discovered later.
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

    <ol className="mt-8 flex list-none flex-col gap-3 p-0">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex items-start gap-4 rounded-2xl border border-brand-secondary/10 bg-white p-5"
        >
          <span
            aria-hidden
            className={`flex size-8 shrink-0 items-center justify-center rounded-full font-outfit text-sm font-semibold ${
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
            <p className="mt-1 font-outfit text-body text-ink/60">
              {step.summary}
            </p>
          </div>
        </li>
      ))}
    </ol>

    <p className="mt-6 font-outfit text-body text-ink/55">
      Two short steps, and each one saves on its own — stopping after the first
      loses nothing. Leaving now is fine too:{" "}
      <strong className="font-medium">Profile → Finish setting up</strong> in
      the top bar brings you straight back to where you stopped.
    </p>

    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        onClickfunction={onStart}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 sm:w-auto"
        cypressfield="setup-start"
      >
        {started ? "Continue setup" : "Set up my profile"}
        <FiArrowRight aria-hidden />
      </Button>

      <button
        type="button"
        onClick={onLater}
        data-cy="setup-later"
        className="w-full cursor-pointer rounded-lg border-none bg-transparent px-2 py-3 text-center font-outfit text-body font-medium text-ink/60 transition-colors hover:text-ink sm:w-auto sm:text-left"
      >
        Maybe later
      </button>
    </div>
  </div>
);

export default SetupIntro;
