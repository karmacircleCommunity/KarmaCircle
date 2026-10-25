import Button from "@components/buttons/Button";
import SetupLayout from "@components/setup/SetupLayout";
import SetupLocateButton from "@components/setup/SetupLocateButton";
import { useLocateCity } from "@hooks/useLocateCity";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft, FiArrowRight, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { showSuccessToast } from "@utils/Toasts";
import ProfileSetupIntro from "../components/setup/ProfileSetupIntro";
import ProfileSetupQuestion from "../components/setup/ProfileSetupQuestion";
import { useProfileSetup } from "../hooks/useProfileSetup";
import type { ProfileSetupStepStatus } from "../types";

/**
 * The individual user's own profile-edit flow, routed at `/user/setup` —
 * the individual-user equivalent of organizations' `/organization/setup`,
 * reached from `Profile.tsx`'s "Edit profile" button and its
 * missing-fields nudge. Replaces the old `ProfileUpdate` modal for
 * individual accounts (organizations still use the dashboard's
 * `ProfileUpdate` modal and `/organization/setup` — unchanged).
 *
 * Deliberately simpler than the organization flow it borrows its shell
 * from: one flat run of three questions rather than multiple steps, no
 * draft/live badge (an individual profile has no publish gate), and
 * Continue is never blocked — nothing here is required. See SPEC.md.
 */
const STEP_STATUS: ProfileSetupStepStatus[] = [
  { id: "about", title: "About you", current: true },
];

const ProfileSetup = () => {
  const navigate = useNavigate();

  const {
    user,
    isLoading,
    error,
    form,
    setField,
    saving,
    stage,
    question,
    questionNumber,
    questionCount,
    direction,
    leaving,
    goToQuestion,
    next,
    back,
    save,
  } = useProfileSetup();

  const locate = useLocateCity((key, value) => setField(key, value));

  if (isLoading || error || !user) {
    return (
      <SetupLayout stage={stage} steps={STEP_STATUS}>
        <p className="font-outfit text-body text-ink/70">
          {isLoading ? "Loading your profile…" : "Sign in to edit your profile."}
        </p>
      </SetupLayout>
    );
  }

  /** Saves whatever's on screen, then leaves for the profile page. */
  const leave = async () => {
    const ok = await save();
    if (ok) showSuccessToast("Saved");
    navigate(`/user/${user.userName}`);
  };

  const advance = async () => {
    const result = await next();
    if (result !== "finished") return;
    showSuccessToast("Profile updated");
    navigate(`/user/${user.userName}`);
  };

  const topBar = (
    <div className="mb-5 flex justify-end sm:mb-8">
      <button
        type="button"
        onClick={leave}
        disabled={saving}
        data-cy="profile-setup-exit"
        title="Save and finish later"
        aria-label="Save and finish later"
        className="-mr-1.5 inline-flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-1.5 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink/70 disabled:cursor-not-allowed"
      >
        <FiX aria-hidden className="size-5" />
      </button>
    </div>
  );

  if (!question) {
    return (
      <SetupLayout stage={stage} steps={STEP_STATUS} topBar={topBar}>
        <ProfileSetupIntro
          name={user.name ?? user.userName ?? "there"}
          form={form}
          started={Object.values(form).some((value) => value.trim().length > 0)}
          onStart={() => goToQuestion(0)}
          onLater={() => navigate(`/user/${user.userName}`)}
        />
      </SetupLayout>
    );
  }

  const isLastQuestion = questionNumber === questionCount;

  return (
    <>
      <Helmet>
        <title>KarmaCircle | Edit your profile</title>
        <meta
          name="description"
          content="Add a bit more to your KarmaCircle profile."
        />
      </Helmet>

      <SetupLayout
        stage={stage}
        steps={STEP_STATUS}
        topBar={topBar}
        questionNumber={questionNumber}
        questionCount={questionCount}
      >
        <form
          key={question.id}
          onSubmit={(event) => {
            event.preventDefault();
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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="m-0 font-poppins text-[22px] leading-tight font-bold text-ink sm:text-[32px]">
                {question.headline}
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

          <div className="mt-6 sm:mt-8">
            <ProfileSetupQuestion
              question={question}
              form={form}
              setField={setField}
              locate={locate}
            />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:mt-9 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={back}
              data-cy="profile-setup-back"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 border-none bg-transparent p-0 font-outfit text-body font-medium text-ink/60 transition-colors hover:text-ink sm:justify-start"
            >
              <FiArrowLeft aria-hidden className="hidden sm:inline" />
              Back
            </button>

            <Button
              type="submit"
              isLoading={saving}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-poppins text-[15px] font-semibold shadow-[0_8px_20px_-8px_rgba(168,98,62,0.5)] transition-all hover:-translate-y-0.5 sm:w-auto"
              cypressfield="profile-setup-save"
            >
              {isLastQuestion ? "Save changes" : "Continue"}
              {!isLastQuestion && (
                <FiArrowRight aria-hidden className="hidden sm:inline" />
              )}
            </Button>
          </div>
        </form>
      </SetupLayout>
    </>
  );
};

export default ProfileSetup;
