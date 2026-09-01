import SplitPanelLayout from "@components/layouts/SplitPanelLayout";
import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";
import type {
  OrganizationSetupStage,
  OrganizationSetupStepStatus,
} from "../../types";
import SetupIntroAside from "./SetupIntroAside";

/**
 * The setup flow's shell. Same frame as the auth pages (`SplitPanelLayout`),
 * with the left panel given over to progress: which step you are on, what is
 * still outstanding on each, and the promise that leaving is safe.
 *
 * The progress rail is rendered from the step list rather than hardcoded, so
 * a third step is a change in `constants/organizationSetup.ts` alone.
 */
type SetupLayoutProps = {
  stage: OrganizationSetupStage;
  steps: OrganizationSetupStepStatus[];
  /** The draft/live badge and the exit affordance, pinned above the form. */
  topBar?: ReactNode;
  /** 1-based position across the whole flow. Absent on the intro. */
  questionNumber?: number;
  questionCount?: number;
  children: ReactNode;
};

const SetupLayout = ({
  stage,
  steps,
  topBar,
  questionNumber,
  questionCount,
  children,
}: SetupLayoutProps) => {
  const current = steps.find((step) => step.current);
  const remaining = steps.reduce((total, step) => total + step.outstanding, 0);

  return (
    <SplitPanelLayout
      align={stage === "intro" ? "center" : "start"}
      contentClassName={stage === "intro" ? "max-w-md" : "max-w-xl"}
      aside={
        stage === "intro" ? (
          // One held note plus atmosphere, not a second column of
          // information — everything actionable is on the right. See
          // SetupIntroAside.tsx.
          <SetupIntroAside />
        ) : (
          <>
            <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
              Nearly there.
            </h2>
            <p className="mt-3 font-outfit text-body text-white/70">
              {remaining === 0
                ? "Everything we need is filled in. Save to publish your profile."
                : `${remaining} ${remaining === 1 ? "detail" : "details"} left before your profile goes live.`}
            </p>

            <ol className="mt-10 flex list-none flex-col p-0">
              {steps.map((step, index) => (
                <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-9 bottom-1 left-[15px] w-px bg-white/15"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`z-1 flex size-8 shrink-0 items-center justify-center rounded-full font-outfit text-sm font-semibold transition-colors ${
                      step.done
                        ? "bg-brand text-white"
                        : step.current
                          ? "border border-white/70 bg-white/10 text-white"
                          : "border border-white/20 text-white/50"
                    }`}
                  >
                    {step.done ? <FiCheck /> : index + 1}
                  </span>
                  <div className="pt-0.5">
                    <p
                      className={`font-outfit text-body-lg font-semibold ${
                        step.current || step.done
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 font-outfit text-body text-white/60">
                      {step.summary}
                    </p>
                    {step.outstanding > 0 && (
                      <p className="mt-1 font-outfit text-caption text-white/45">
                        {step.outstanding}{" "}
                        {step.outstanding === 1 ? "detail" : "details"} to fill
                        in
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-10 border-t border-white/10 pt-6 font-outfit text-body text-white/55">
              Each step saves on its own — your progress is kept as you go.
            </p>
          </>
        )
      }
    >
      {topBar}

      {/* One bar for the whole flow, at every size. The rail on the left
          says which step; this says how much is left, which is the thing a
          one-question-at-a-time flow otherwise hides — without it there is
          no way to tell question three of eight from three of thirty.
          `transition-[width]` is what makes it slide forward as each
          question is answered instead of jumping. */}
      {questionNumber && questionCount ? (
        <div className="mb-8">
          <div className="flex items-baseline justify-between">
            <span className="font-outfit text-caption font-medium tracking-[0.14em] text-ink/45 uppercase">
              {current?.title}
            </span>
            <span className="font-outfit text-caption text-ink/45">
              {questionNumber} of {questionCount}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
              style={{
                width: `${(questionNumber / questionCount) * 100}%`,
              }}
              role="progressbar"
              aria-valuenow={questionNumber}
              aria-valuemin={1}
              aria-valuemax={questionCount}
              aria-label="Setup progress"
            />
          </div>
        </div>
      ) : null}

      {children}
    </SplitPanelLayout>
  );
};

export default SetupLayout;
