import SplitPanelLayout from "@components/layouts/SplitPanelLayout";
import type { ReactNode } from "react";
import type {
  OrganizationSetupStage,
  OrganizationSetupStepStatus,
} from "../../types";
import SetupAside from "./SetupAside";

/**
 * The setup flow's shell. Same frame as the auth pages (`SplitPanelLayout`).
 *
 * The left panel is a rotating quote (`SetupAside`) — identical on the intro
 * and on every question screen, with a slow aura/orbit behind it (the
 * panel's `asideDecor`). It used to be a step rail; wayfinding now lives
 * entirely in the right-hand progress bar below — one count, not two. The
 * bar's denominator, the URL and the save boundary all still read the step
 * list, so a third step is a change in `constants/organizationSetup.ts`
 * alone.
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

  return (
    <SplitPanelLayout
      align={stage === "intro" ? "center" : "start"}
      contentClassName={stage === "intro" ? "max-w-md" : "max-w-xl"}
      asideDecor={
        <>
          {/* Slow bloom behind the quotation mark. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 size-[460px] -translate-x-1/3 -translate-y-1/4 rounded-full bg-brand/25 blur-[130px] motion-safe:animate-aura"
          />
          {/* A single brand dot turning a faint ring, anchored off the
              panel's bottom-left corner so its path never crosses the
              copy — a point travelling a circle, the KarmaCircle. */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 origin-center translate-x-[-46%] translate-y-[52%] text-white motion-safe:animate-orbit"
          >
            <svg width="520" height="520" viewBox="0 0 200 200" fill="none">
              <circle
                cx="100"
                cy="100"
                r="94"
                stroke="currentColor"
                strokeOpacity="0.07"
              />
              <circle
                cx="100"
                cy="100"
                r="56"
                stroke="currentColor"
                strokeOpacity="0.05"
              />
              <circle cx="100" cy="6" r="3.5" fill="var(--color-brand)" />
            </svg>
          </div>
        </>
      }
      aside={<SetupAside />}
    >
      {topBar}

      {/* One bar for the whole flow, at every size — the only wayfinding in
          the flow now that the left panel is quote-only. The step title on
          the left, "N of 8" on the right: without the denominator there is
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
