import Button from "@components/buttons/Button";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { showSuccessToast } from "@utils/Toasts";
import AboutStep from "../components/setup/AboutStep";
import ReachStep from "../components/setup/ReachStep";
import SetupIntro from "../components/setup/SetupIntro";
import SetupLayout from "../components/setup/SetupLayout";
import { REQUIRED_LABELS } from "../constants/organizationSetup";
import { useOrganizationSetup } from "../hooks/useOrganizationSetup";
import type { OrganizationSetupStepId } from "../types";

/**
 * The organization's own setup page, routed at `/organization/setup`.
 *
 * This is what stands between signing up and appearing anywhere: an
 * organization is created in `draft` at signup and stays invisible — absent
 * from `/organizations`, a 404 on its own public profile — until every
 * required field is filled. The backend owns that rule
 * (`missingRequiredFields()` in the API's organization service) and
 * publishes the record itself on the save that completes it.
 *
 * Three things this page deliberately is:
 *
 * - **Optional.** A new organization lands on an intro that asks whether it
 *   wants to do this now, with "Maybe later" as a real answer. Nothing here
 *   traps the account: every screen exits to the rest of the app, and the
 *   flow can be resumed from `/organization/setup` (or the reminder on the
 *   dashboard) at any time.
 * - **Two steps, each saved on its own.** This is a lot to ask at once, so
 *   Continue saves before it advances and "Save and finish later" saves
 *   before it leaves. Nothing typed is lost by stopping.
 * - **Partial.** A half-finished save is allowed and expected — the
 *   organization simply stays in draft until the rest arrives.
 *
 * The pieces: `useOrganizationSetup` (state, staging, per-step save),
 * `constants/organizationSetup.ts` (the steps, as data), `SetupLayout` (the
 * shell and the progress rail) and one component per step. A third step is
 * an entry in that constant plus a component — no other file changes.
 */
const OrganizationSetup = () => {
  const navigate = useNavigate();
  const {
    organization,
    taxonomy,
    isLoading,
    error,
    form,
    setField,
    saving,
    stage,
    step,
    steps,
    goTo,
    saveStep,
  } = useOrganizationSetup();

  const badge = (
    <span
      className={`inline-block rounded-full px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] uppercase ${
        organization?.isLive
          ? "border border-brand/25 bg-brand/8 text-brand"
          : "border border-amber-500/30 bg-amber-500/10 text-amber-700"
      }`}
    >
      {organization?.isLive ? "Live" : "Draft — not visible yet"}
    </span>
  );

  if (isLoading || error || !organization) {
    return (
      <SetupLayout stage={stage} steps={steps}>
        <p className="font-outfit text-body text-ink/70">
          {isLoading
            ? "Loading your organization…"
            : "This page is for organization accounts. Sign in as one to set up a profile."}
        </p>
      </SetupLayout>
    );
  }

  /** Saves whatever step is on screen, then leaves for the rest of the app. */
  const leave = async () => {
    if (step) {
      const updated = await saveStep(step.id);
      if (!updated) return;
      showSuccessToast("Saved. You can finish this whenever you like.");
    }
    navigate("/");
  };

  const goForward = async (id: OrganizationSetupStepId, index: number) => {
    const updated = await saveStep(id);
    if (!updated) return;

    const next = steps[index + 1];
    if (next) {
      goTo(next.id);
      return;
    }

    if (updated.isLive) {
      showSuccessToast("Your organization is live");
      navigate(`/organization/${updated.handle}`);
    } else {
      showSuccessToast("Saved — still a few details to go");
    }
  };

  const topBar = (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      {badge}
      {stage === "intro" ? (
        organization.isLive && (
          <Link
            to={`/organization/${organization.handle}`}
            className="inline-flex items-center gap-1.5 font-outfit text-body font-medium text-brand no-underline hover:underline"
            data-cy="view-public-profile"
          >
            View your public profile
            <FiArrowUpRight aria-hidden />
          </Link>
        )
      ) : (
        <button
          type="button"
          onClick={leave}
          disabled={saving}
          data-cy="setup-exit"
          className="cursor-pointer border-none bg-transparent p-0 font-outfit text-body font-medium text-ink/55 transition-colors hover:text-ink disabled:cursor-not-allowed"
        >
          Save and finish later
        </button>
      )}
    </div>
  );

  if (!step) {
    return (
      <SetupLayout stage={stage} steps={steps} topBar={topBar}>
        <SetupIntro
          name={organization.name}
          steps={steps}
          started={steps.some(
            (entry) => entry.outstanding < entry.requiredFields.length,
          )}
          onStart={() => goTo(steps[0].id)}
          onLater={() => navigate("/")}
        />
      </SetupLayout>
    );
  }

  const isLastStep = step.index === steps.length - 1;
  // The server's list, not the form's — this is what actually blocks
  // publication, and it is worth being exact about at the end of the flow.
  const stillMissing = organization.missingFields
    .map((field) => REQUIRED_LABELS[field])
    .filter(Boolean);

  return (
    <>
      <Helmet>
        <title>KarmaCircle | Set up your organization</title>
        <meta
          name="description"
          content="Add your organization's details so donors and volunteers can find you on KarmaCircle."
        />
      </Helmet>

      <SetupLayout stage={stage} steps={steps} topBar={topBar}>
        <h1 className="font-poppins text-[26px] leading-tight font-bold text-ink sm:text-3xl">
          {step.title}
        </h1>
        <p className="mt-3 font-outfit text-body text-gray-600">
          {step.subtitle}
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            goForward(step.id, step.index);
          }}
        >
          {step.id === "about" ? (
            <AboutStep form={form} setField={setField} taxonomy={taxonomy} />
          ) : (
            <ReachStep form={form} setField={setField} taxonomy={taxonomy} />
          )}

          {isLastStep && !organization.isLive && stillMissing.length > 0 && (
            <p className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 font-outfit text-body text-amber-800">
              Still needed before you can go live: {stillMissing.join(", ")}.
              Saving now keeps everything else.
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                goTo(step.index === 0 ? "intro" : steps[step.index - 1].id)
              }
              data-cy="setup-back"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 border-none bg-transparent p-0 font-outfit text-body font-medium text-ink/60 transition-colors hover:text-ink sm:justify-start"
            >
              <FiArrowLeft aria-hidden />
              Back
            </button>

            <Button
              type="submit"
              isLoading={saving}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 sm:w-auto"
              cypressfield="org-save"
            >
              {isLastStep
                ? organization.isLive
                  ? "Save changes"
                  : "Save and publish"
                : "Save and continue"}
              {!isLastStep && <FiArrowRight aria-hidden />}
            </Button>
          </div>
        </form>
      </SetupLayout>
    </>
  );
};

export default OrganizationSetup;
