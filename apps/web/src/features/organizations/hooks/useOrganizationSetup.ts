import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { organizationEndpoints } from "@services/ApiEndpoints";
import { UpdateMyOrganization } from "@services/KarmaCircleApi";
import { STATUSCODE } from "@statics/Constants";
import fetcher from "@utils/Fetcher";
import { showErrorToast } from "@utils/Toasts";
import {
  SETUP_QUESTION_COUNT,
  SETUP_STEPS,
} from "../constants/organizationSetup";
import type {
  MyOrganization,
  OrganizationSetupField,
  OrganizationSetupForm,
  OrganizationSetupStage,
  OrganizationSetupStepId,
  OrganizationSetupStepStatus,
  OrganizationTaxonomy,
} from "../types";
import {
  EMPTY_SETUP_FORM,
  isStepDirty,
  outstandingFields,
  toSetupForm,
  toStepPayload,
} from "../utils/organizationSetupForm";

const isStepId = (value: string | null): value is OrganizationSetupStepId =>
  SETUP_STEPS.some((step) => step.id === value);

/**
 * How long the leaving question is given to animate out before the next one
 * mounts. Must stay in step with `--animate-question-out` in
 * styles/index.css — shorter here and the exit is cut off, longer and the
 * flow sits on an empty screen.
 */
const EXIT_MS = 170;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** What `next()` did, so the page can decide what happens at the end. */
export type SetupAdvance =
  | { kind: "moved" }
  | { kind: "failed" }
  | { kind: "finished"; organization: MyOrganization };

/**
 * Everything `/organization/setup` needs: the record, the taxonomy, the
 * form, where in the flow the user is, and the per-step save.
 *
 * The flow asks **one question at a time** and saves **once per step**.
 * Those are two different granularities on purpose: a question is how much
 * someone is asked to think about at once, a step is how much is worth a
 * round trip. Four questions in, one PATCH.
 *
 * The rules that make that safe:
 *
 * - **A save sends only its own step's fields.** Step two's blank inputs
 *   can't wipe step one's answers, and a validation failure in a field the
 *   user hasn't reached yet can't block the step they're on.
 * - **`saved` tracks what the server last acknowledged**, so crossing a
 *   step boundary you changed nothing on is free rather than another round
 *   trip.
 * - **Position lives in the URL** (`?step=about&q=2`), so Back works, a
 *   refresh doesn't restart the flow, and "finish this later" can be a real
 *   link.
 * - **One transition at a time.** `busy` drops any advance requested while
 *   a question is still animating out, so a double-press can't skip one.
 */
export function useOrganizationSetup() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, error, isLoading, mutate } = useSWR<MyOrganization>(
    organizationEndpoints.mine,
    fetcher,
  );
  const { data: taxonomy } = useSWR<OrganizationTaxonomy>(
    organizationEndpoints.taxonomy,
    fetcher,
  );

  const [form, setForm] = useState<OrganizationSetupForm>(EMPTY_SETUP_FORM);
  const [saving, setSaving] = useState(false);

  // Which way the questions should move, and whether the current one is on
  // its way out. Both are read by the question's animation classes only.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);

  // What the server has. Compared against `form` to decide whether a step
  // needs saving at all.
  const saved = useRef<OrganizationSetupForm>(EMPTY_SETUP_FORM);

  // Seed once the record arrives. Keyed on the handle rather than the whole
  // object so a background revalidation can't overwrite what the user is in
  // the middle of typing.
  useEffect(() => {
    if (!data) return;
    const seeded = toSetupForm(data);
    setForm(seeded);
    saved.current = seeded;
  }, [data?.handle]);

  const stepParam = searchParams.get("step");
  const stage: OrganizationSetupStage = isStepId(stepParam)
    ? stepParam
    : // A live organization coming back to edit has already opted in; only
      // a draft gets asked whether it wants to do this now.
      data?.isLive
      ? SETUP_STEPS[0].id
      : "intro";

  const setField = <K extends OrganizationSetupField>(
    key: K,
    value: OrganizationSetupForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const steps: OrganizationSetupStepStatus[] = useMemo(
    () =>
      SETUP_STEPS.map((entry, index) => {
        const outstanding = outstandingFields(
          form,
          entry.requiredFields,
        ).length;
        return {
          ...entry,
          index,
          current: entry.id === stage,
          outstanding,
          done: outstanding === 0,
        };
      }),
    [form, stage],
  );

  // The step on screen, `null` on the intro. Taken from `steps` rather than
  // from `SETUP_STEPS` so the page gets its progress along with it.
  const stepIndex = steps.findIndex((entry) => entry.id === stage);
  const step = stepIndex === -1 ? null : steps[stepIndex];

  // `q` is 1-based in the URL because it is human-facing; clamped rather
  // than trusted, so a hand-typed `?q=99` lands on the last question
  // instead of a blank screen.
  const questionIndex = step
    ? Math.min(
        Math.max(Number(searchParams.get("q") ?? 1) || 1, 1),
        step.questions.length,
      ) - 1
    : 0;
  const question = step ? step.questions[questionIndex] : null;

  /** How many questions come before this one across the whole flow. */
  const questionsBefore = SETUP_STEPS.slice(0, Math.max(stepIndex, 0)).reduce(
    (total, entry) => total + entry.questions.length,
    0,
  );

  const goToIntro = () => {
    setSearchParams({});
    window.scrollTo({ top: 0 });
  };

  const goToStep = (id: OrganizationSetupStepId, index = 0) => {
    setSearchParams({ step: id, q: String(index + 1) });
    window.scrollTo({ top: 0 });
  };

  /**
   * Runs `commit` with the leaving question animated out first, unless the
   * viewer asked for reduced motion — in which case it is immediate.
   */
  const transition = async (
    to: "forward" | "back",
    commit: () => void | Promise<void>,
  ) => {
    if (busy.current) return;
    busy.current = true;

    setDirection(to);
    setLeaving(true);
    await wait(prefersReducedMotion() ? 0 : EXIT_MS);
    await commit();
    setLeaving(false);

    busy.current = false;
  };

  /**
   * Saves one step. Returns the updated record, `null` on failure, and the
   * existing record untouched when there was nothing to save — so a caller
   * can advance on anything non-null.
   */
  const saveStep = async (
    id: OrganizationSetupStepId,
  ): Promise<MyOrganization | null> => {
    const target = SETUP_STEPS.find((entry) => entry.id === id);
    if (!target || !data) return null;

    if (!isStepDirty(form, saved.current, target.fields)) {
      return data;
    }

    setSaving(true);
    const response = await UpdateMyOrganization(
      toStepPayload(form, target.fields),
    );
    setSaving(false);

    if (response?.status !== STATUSCODE.OK) {
      showErrorToast(response?.data?.message ?? "Could not save, try again");
      return null;
    }

    const updated = response.data.organization as MyOrganization;

    // Only this step's fields are now known-saved; the other step may still
    // hold unsaved edits.
    saved.current = { ...saved.current, ...pick(form, target.fields) };

    // `revalidate: false` — the response already is the fresh record, and a
    // refetch here would re-seed the form mid-flow.
    await mutate(updated, { revalidate: false });

    return updated;
  };

  /**
   * The next question — crossing into the next step (saving on the way) or
   * finishing the flow when there isn't one.
   */
  const next = async (): Promise<SetupAdvance> => {
    if (!step || busy.current) return { kind: "failed" };

    const isLastQuestion = questionIndex === step.questions.length - 1;

    if (!isLastQuestion) {
      await transition("forward", () => goToStep(step.id, questionIndex + 1));
      return { kind: "moved" };
    }

    // End of a step: this is the save boundary. Saving happens *before* the
    // animation so a failure leaves the user on the question that caused it
    // rather than on the next one.
    const updated = await saveStep(step.id);
    if (!updated) return { kind: "failed" };

    const nextStep = SETUP_STEPS[stepIndex + 1];
    if (!nextStep) return { kind: "finished", organization: updated };

    await transition("forward", () => goToStep(nextStep.id));
    return { kind: "moved" };
  };

  /** The previous question, the previous step's last one, or the intro. */
  const back = async () => {
    if (!step || busy.current) return;

    if (questionIndex > 0) {
      await transition("back", () => goToStep(step.id, questionIndex - 1));
      return;
    }

    const previousStep = SETUP_STEPS[stepIndex - 1];
    await transition("back", () =>
      previousStep
        ? goToStep(previousStep.id, previousStep.questions.length - 1)
        : goToIntro(),
    );
  };

  return {
    organization: data,
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
    questionIndex,
    /** 1-based position across the whole flow, for the progress bar. */
    questionNumber: questionsBefore + questionIndex + 1,
    questionCount: SETUP_QUESTION_COUNT,
    direction,
    leaving,
    goToIntro,
    goToStep,
    next,
    back,
    saveStep,
  };
}

function pick(
  form: OrganizationSetupForm,
  fields: OrganizationSetupField[],
): Partial<OrganizationSetupForm> {
  return Object.fromEntries(
    fields.map((field) => [field, form[field]]),
  ) as Partial<OrganizationSetupForm>;
}
