import SplitPanelLayout from "@components/layouts/SplitPanelLayout";
import type { ReactNode } from "react";
import { FiCheck } from "react-icons/fi";
import type {
  OrganizationSetupStage,
  OrganizationSetupStepStatus,
} from "../../types";

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
  children: ReactNode;
};

const SetupLayout = ({ stage, steps, topBar, children }: SetupLayoutProps) => {
  const current = steps.find((step) => step.current);
  const remaining = steps.reduce((total, step) => total + step.outstanding, 0);

  return (
    <SplitPanelLayout
      align="start"
      contentClassName="max-w-xl"
      aside={
        <>
          <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
            {stage === "intro"
              ? "A full profile is what gets you found."
              : "Nearly there."}
          </h2>
          <p className="mt-3 font-outfit text-body text-white/70">
            {stage === "intro"
              ? "Organizations with their causes, location and story filled in show up in the directory and in every search that matches them."
              : remaining === 0
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
                      step.current || step.done ? "text-white" : "text-white/60"
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
                      {step.outstanding === 1 ? "detail" : "details"} to fill in
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-10 border-t border-white/10 pt-6 font-outfit text-body text-white/55">
            Each step saves on its own. You can leave whenever you like and pick
            this up later.
          </p>
        </>
      }
    >
      {topBar}

      {/* The rail above is desktop-only, so small screens get the step
          count and a progress bar instead — the same information, in the
          space a phone can spare. */}
      {current && (
        <div className="mb-7 min-[900px]:hidden">
          <p className="m-0 font-outfit text-caption font-medium tracking-[0.14em] text-ink/55 uppercase">
            Step {current.index + 1} of {steps.length}
          </p>
          <div className="mt-2 flex gap-1.5">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step.done || step.index <= current.index
                    ? "bg-brand"
                    : "bg-ink/12"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {children}
    </SplitPanelLayout>
  );
};

export default SetupLayout;
