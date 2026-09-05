import Button from "@components/buttons/Button";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiX } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { showSuccessToast } from "@utils/Toasts";
import SetupIntro from "../components/setup/SetupIntro";
import SetupLayout from "../components/setup/SetupLayout";
import SetupLocateButton from "../components/setup/SetupLocateButton";
import SetupQuestion from "../components/setup/SetupQuestion";
import {
  FIELD_CY,
  FIELD_SPECS,
  REQUIRED_LABELS,
} from "../constants/organizationSetup";
import { useLocateCity } from "../hooks/useLocateCity";
import { useOrganizationSetup } from "../hooks/useOrganizationSetup";
import { outstandingFields } from "../utils/organizationSetupForm";

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
 * Four things this page deliberately is:
 *
 * - **One question at a time.** Every screen asks a single thing, in
 *   sentence form, and moves with it — the same shape as a Typeform. The
 *   long labelled form this replaced put thirteen fields on one page, which
 *   is what made a two-minute task read as paperwork.
 * - **Optional.** A new organization lands on an intro that asks whether it
 *   wants to do this now, with "Maybe later" as a real answer. Nothing here
 *   traps the account: every screen exits to the rest of the app, and the
 *   flow can be resumed from the navbar or the setup gate at any time.
 * - **Saved per step, not per question.** Crossing from one step to the
 *   next writes everything answered so far. Four questions in, one PATCH.
 * - **Partial.** A half-finished save is allowed and expected — the
 *   organization simply stays in draft until the rest arrives. A required
 *   question can be walked past; it says so rather than blocking.
 *
 * The pieces: `useOrganizationSetup` (state, position, transitions,
 * per-step save), `constants/organizationSetup.ts` (steps and questions, as
 * data), `SetupLayout` (the shell, the rail, the progress bar) and
 * `SetupQuestion` (one screen, rendered by kind). A new question is an
 * entry in that constant — no other file changes.
 */
const OrganizationSetup = () => {
  const navigate = useNavigate();

  // The question a Continue was refused on. Held by id rather than as a
  // boolean so it clears itself the moment the flow moves — there is
  // nothing to reset, and a stale error can't follow the user forward.
  const [blockedOn, setBlockedOn] = useState<string | null>(null);

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
    question,
    questionNumber,
    questionCount,
    direction,
    leaving,
    goToStep,
    next,
    back,
    saveStep,
  } = useOrganizationSetup();

  // Owned here rather than inside the location question, because its button
  // and its answer sit on opposite sides of the fields - see
  // `useLocateCity`.
  const locate = useLocateCity((key, value) => setField(key, value));

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

  const advance = async () => {
    const result = await next();
    if (result.kind !== "finished") return;

    if (result.organization.isLive) {
      showSuccessToast("Your organization is live");
      navigate(`/organization/${result.organization.handle}`);
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
        /* An exit, not an offer. This was a full-weight "Save and finish
           later" in the same visual class as the flow's own actions, which
           put a way *out* of the screen at the same volume as the way
           forward. It saves either way - that is what the tooltip and the
           toast are for - but the control itself now only has to say
           "leave", and the close glyph in the corner is the one shape that
           says that without a sentence. */
        <button
          type="button"
          onClick={leave}
          disabled={saving}
          data-cy="setup-exit"
          title="Save and finish later"
          aria-label="Save and finish later"
          className="-mr-1.5 inline-flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-1.5 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink/70 disabled:cursor-not-allowed"
        >
          <FiX aria-hidden className="size-5" />
        </button>
      )}
    </div>
  );

  if (!step || !question) {
    return (
      <SetupLayout stage={stage} steps={steps} topBar={topBar}>
        <SetupIntro
          name={organization.name}
          steps={steps}
          started={steps.some(
            (entry) => entry.outstanding < entry.requiredFields.length,
          )}
          onStart={() => goToStep(steps[0].id)}
          onLater={() => navigate("/")}
        />
      </SetupLayout>
    );
  }

  // The end of the flow — the only screen whose button publishes rather
  // than continues.
  const isLastQuestion = questionNumber === questionCount;

  // What this screen itself still needs, so the message is about the
  // question being asked rather than about the flow as a whole.
  const unanswered = outstandingFields(form, question.requiredFields);
  const unansweredLabels = unanswered
    .map((field) => FIELD_SPECS[field]?.label.toLowerCase() ?? field)
    .join(" and ");

  /**
   * Puts the cursor back on the answer a refused Continue was about — the
   * field itself where there is one, or the first option where the answer
   * is a set of choices (`org-tag-NGO`, `org-domain-Shelter`, …).
   */
  const focusFirstAnswer = () => {
    const handle = FIELD_CY[unanswered[0]];
    const target =
      document.querySelector<HTMLElement>(`[data-cy="${handle}"]`) ??
      document.querySelector<HTMLElement>(`[data-cy^="${handle}-"]`);
    target?.focus();
  };

  // The server's list — what actually blocks publication — shown only at
  // the end, where "why am I still a draft?" is the live question.
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

      <SetupLayout
        stage={stage}
        steps={steps}
        topBar={topBar}
        questionNumber={questionNumber}
        questionCount={questionCount}
      >
        <form
          // Keyed on the question so React remounts — and therefore
          // re-animates — the whole screen on every move, rather than
          // diffing one headline into another in place.
          key={question.id}
          onSubmit={(event) => {
            event.preventDefault();

            // The guard. Leaving the flow entirely is still free ("Save and
            // finish later" saves whatever is filled in and goes), but
            // walking *past* a required question isn't: an answer skipped
            // here is one nobody would ever be prompted for again, and the
            // organization would sit in draft with no idea which screen it
            // was on.
            if (unanswered.length > 0) {
              setBlockedOn(question.id);
              focusFirstAnswer();
              return;
            }

            setBlockedOn(null);
            advance();
          }}
          className={
            leaving
              ? direction === "forward"
                ? "motion-safe:animate-question-out"
                : "motion-safe:animate-question-out-back"
              : direction === "forward"
                ? "motion-safe:animate-question-in"
                : "motion-safe:animate-question-in-back"
          }
        >
          {/* Headline and hint on the left, the question's own optional
              shortcut on the right. Only the location question has one
              today, and it is here because the alternative - stacked under
              the fields - put an optional aid below the answer it helps
              with, in the space the eye is already moving through on its
              way to Continue, while the right half of this row sat empty.
              `items-start` keeps the pill level with the first line of the
              headline rather than centred against a block that is two lines
              on one screen and one on the next; below `sm` the row stacks
              and the shortcut sits under the hint, left-aligned. */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="m-0 font-poppins text-[26px] leading-tight font-bold text-ink sm:text-[32px]">
                {question.headline}
                {/* On a single-field question the headline *is* the label, so
                the required marker belongs here. Grouped questions carry
                one per field instead (SetupQuestion.tsx).

                The joining character is a non-breaking space, not `ml-1` -
                a plain space (or margin on the span) leaves a break
                opportunity right before the marker, so a headline that
                nearly fills the line strands a lone "*" on the next one,
                flush left and detached from the question it belongs to. A
                non-breaking space keeps the marker glued to the headline's
                last word: if it doesn't fit, that word wraps down with it. */}
                {question.kind !== "group" &&
                  question.requiredFields.length > 0 && (
                    <>
                      {" "}
                      <span
                        className="align-top text-xl text-red-500"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    </>
                  )}
              </h1>

              {question.hint && (
                <p className="mt-3 mb-0 font-outfit text-body text-gray-600 sm:text-body-lg">
                  {question.hint}
                </p>
              )}
            </div>

            {question.id === "location" && (
              <SetupLocateButton
                locate={locate}
                hasCity={form.city.trim().length > 0}
              />
            )}
          </div>

          <div className="mt-8">
            <SetupQuestion
              question={question}
              form={form}
              setField={setField}
              taxonomy={taxonomy}
              locate={locate}
            />

            {/* Sits under the field it is about. It used to hang off the
                button on the far side of the screen, where it read as a
                warning about the button rather than a note about a blank
                answer. Quiet until a Continue is actually refused - the
                asterisk on the headline already marks a field required, and
                what skipping one costs is said once, where it's actually
                true: the "still needed to go live" banner at the end of the
                flow. */}
            {unanswered.length > 0 && blockedOn === question.id && (
              <p
                data-cy="setup-required-note"
                role="alert"
                className="mt-3 font-outfit text-caption text-red-500"
              >
                {question.kind === "group"
                  ? `Fill in ${unansweredLabels} to continue.`
                  : "Fill this in to continue."}
              </p>
            )}
          </div>

          {isLastQuestion &&
            !organization.isLive &&
            stillMissing.length > 0 && (
              <p className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 font-outfit text-body text-amber-800">
                Still needed before you can go live: {stillMissing.join(", ")}.
                Saving now keeps everything else.
              </p>
            )}

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={back}
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
              {isLastQuestion
                ? organization.isLive
                  ? "Save changes"
                  : "Save and publish"
                : "Continue"}
              {!isLastQuestion && <FiArrowRight aria-hidden />}
            </Button>
          </div>
        </form>
      </SetupLayout>
    </>
  );
};

export default OrganizationSetup;
