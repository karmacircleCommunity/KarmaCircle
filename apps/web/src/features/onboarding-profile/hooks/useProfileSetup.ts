import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { userEndpoints } from "@services/ApiEndpoints";
import { updateUserProfile } from "@services/KarmaCircleApi";
import { STATUSCODE } from "@statics/Constants";
import fetcher from "@utils/Fetcher";
import { showErrorToast } from "@utils/Toasts";
import { PROFILE_SETUP_QUESTIONS } from "../constants/profileSetup";
import type { MyProfile, ProfileSetupField, ProfileSetupForm } from "../types";
import {
  EMPTY_PROFILE_SETUP_FORM,
  toProfileSetupForm,
  toProfileSetupPayload,
} from "../utils/profileSetupForm";

/**
 * How long the leaving question is given to animate out before the next one
 * mounts — mirrors organizations' `useOrganizationSetup.ts`, and must stay
 * in step with the same `--animate-question-out` CSS token
 * (`styles/index.css`).
 */
const EXIT_MS = 170;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export type ProfileSetupAdvance = "moved" | "failed" | "finished";

/**
 * Everything `/user/setup` needs — the individual-user equivalent of
 * `useOrganizationSetup`, but a single flat run of questions rather than a
 * multi-step one: nothing here is required (an individual profile has no
 * publish gate on the backend), so there's exactly one save boundary, at
 * the end of the only "step" there is. See SPEC.md.
 */
export function useProfileSetup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { data, error, isLoading, mutate } = useSWR<{ user: MyProfile }>(
    userEndpoints.profile,
    fetcher,
  );
  const user = data?.user;

  const [form, setForm] = useState<ProfileSetupForm>(EMPTY_PROFILE_SETUP_FORM);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);

  // Seed once the record arrives, keyed on the username rather than the
  // whole object so a background revalidation can't overwrite what the
  // user is mid-way through typing — same reasoning as organization setup.
  useEffect(() => {
    if (!user) return;
    setForm(toProfileSetupForm(user));
  }, [user?.userName]);

  const setField = <K extends ProfileSetupField>(
    key: K,
    value: ProfileSetupForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const started = searchParams.get("step") === "about";
  const stage: "intro" | "about" = started ? "about" : "intro";

  const questionIndex = started
    ? Math.min(
        Math.max(Number(searchParams.get("q") ?? 1) || 1, 1),
        PROFILE_SETUP_QUESTIONS.length,
      ) - 1
    : 0;
  const question = started ? PROFILE_SETUP_QUESTIONS[questionIndex] : null;

  const goToIntro = () => {
    setSearchParams({}, { state: location.state });
    window.scrollTo({ top: 0 });
  };

  const goToQuestion = (index: number) => {
    setSearchParams(
      { step: "about", q: String(index + 1) },
      { state: location.state },
    );
    window.scrollTo({ top: 0 });
  };

  const transition = async (to: "forward" | "back", commit: () => void) => {
    if (busy.current) return;
    busy.current = true;

    setDirection(to);
    setLeaving(true);
    await wait(prefersReducedMotion() ? 0 : EXIT_MS);
    commit();
    setLeaving(false);

    busy.current = false;
  };

  /** Saves the whole form. `true` on success, `false` on failure. */
  const save = async (): Promise<boolean> => {
    setSaving(true);
    const response = await updateUserProfile({
      credentials: toProfileSetupPayload(form),
    });
    setSaving(false);

    if (response?.status !== STATUSCODE.OK) {
      showErrorToast(response?.data?.message ?? "Could not save, try again");
      return false;
    }

    await mutate();
    return true;
  };

  /** The next question, or — on the last one — the save. */
  const next = async (): Promise<ProfileSetupAdvance> => {
    if (!question || busy.current) return "failed";

    const isLastQuestion = questionIndex === PROFILE_SETUP_QUESTIONS.length - 1;

    if (!isLastQuestion) {
      await transition("forward", () => goToQuestion(questionIndex + 1));
      return "moved";
    }

    const ok = await save();
    return ok ? "finished" : "failed";
  };

  /** The previous question, or the intro. */
  const back = async () => {
    if (!question || busy.current) return;

    if (questionIndex > 0) {
      await transition("back", () => goToQuestion(questionIndex - 1));
      return;
    }

    await transition("back", goToIntro);
  };

  return {
    user,
    isLoading,
    error,
    retry: () => {
      void mutate();
    },
    form,
    setField,
    saving,
    stage,
    question,
    questionIndex,
    questionNumber: questionIndex + 1,
    questionCount: PROFILE_SETUP_QUESTIONS.length,
    direction,
    leaving,
    goToIntro,
    goToQuestion,
    next,
    back,
    save,
  };
}
