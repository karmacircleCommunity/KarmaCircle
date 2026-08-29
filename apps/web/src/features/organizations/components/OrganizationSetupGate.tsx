import { Footer, Navbar } from "@components";
import type { ReactNode } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import { SETUP_STEPS } from "../constants/organizationSetup";
import { useMyOrganization } from "../hooks/useMyOrganization";
import { resumeSetupPath } from "../utils/organizationSetupForm";

/**
 * Wraps a page that only means anything once an organization's profile is
 * complete, and explains itself when it isn't.
 *
 * Setup is optional and skippable (see `pages/OrganizationSetup.tsx`), which
 * only works if every place the skipped work matters says so and offers the
 * way back. That is this component: instead of a dashboard of empty
 * placeholders or an events page that can never have events, the account
 * gets told what is missing, which step it is on, and a link that resumes
 * exactly where it stopped.
 *
 * Deliberately a page, not a modal. The modal this replaced
 * (`onboarding-profile/components/ProfileCompletion.tsx`) covered the
 * dashboard with no working way to dismiss it — its close handler was
 * wired to a prop the caller never passed — which is precisely the trap
 * that made setup feel mandatory.
 */
type OrganizationSetupGateProps = {
  /** What the account was trying to reach, e.g. "Your events". */
  title: string;
  /** One line on why this page needs a finished profile. */
  description: string;
  children: ReactNode;
};

const OrganizationSetupGate = ({
  title,
  description,
  children,
}: OrganizationSetupGateProps) => {
  const { organization, isOrganization, isLoading } = useMyOrganization();

  // Nothing to gate on yet — don't flash the panel at an organization whose
  // record simply hasn't arrived.
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-3xl px-9 py-24 sm:px-10 lg:px-12">
          <p className="font-poppins text-body text-ink/60">Loading…</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!isOrganization) {
    return (
      <Panel
        title="This page is for organizations"
        body="Sign in with an organization account to see it."
        action={{ to: "/organizations", label: "Browse organizations" }}
      />
    );
  }

  if (!organization || organization.isLive) {
    return <>{children}</>;
  }

  const missing = organization.missingFields;

  return (
    <Panel
      title={title}
      body={description}
      action={{
        to: resumeSetupPath(missing),
        label: missing.length ? "Continue setup" : "Finish setup",
      }}
      steps={SETUP_STEPS.map((step) => ({
        id: step.id,
        title: step.title,
        summary: step.summary,
        done: !step.requiredFields.some((field) => missing.includes(field)),
      }))}
    />
  );
};

type PanelProps = {
  title: string;
  body: string;
  action: { to: string; label: string };
  steps?: Array<{ id: string; title: string; summary: string; done: boolean }>;
};

const Panel = ({ title, body, action, steps }: PanelProps) => (
  <>
    <Navbar />

    <div className="mx-auto max-w-2xl px-9 pt-14 pb-24 sm:px-10 lg:px-12 lg:pt-20">
      <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-amber-700 uppercase">
        Draft — not visible yet
      </span>

      <h1 className="mt-5 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
        {body}
      </p>

      {steps && (
        <ol
          className="mt-8 flex list-none flex-col gap-2.5 p-0"
          data-cy="gate-steps"
        >
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="flex items-start gap-4 rounded-2xl border border-brand-secondary/10 bg-white p-5"
              data-cy={`gate-step-${step.id}`}
              data-done={step.done}
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
                <p
                  className={`m-0 font-outfit text-body-lg font-medium ${
                    step.done ? "text-ink/45 line-through" : "text-ink"
                  }`}
                >
                  {step.title}
                </p>
                <p className="mt-1 font-outfit text-body text-ink/60">
                  {step.summary}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Link
        to={action.to}
        data-cy="gate-resume"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-poppins text-[15px] font-semibold text-white no-underline shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 hover:bg-brand-hover"
      >
        {action.label}
        <FiArrowRight aria-hidden />
      </Link>
    </div>

    <Footer />
  </>
);

export default OrganizationSetupGate;
