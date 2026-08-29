import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { organizationEndpoints } from "@services/ApiEndpoints";
import { UpdateMyOrganization } from "@services/MilanApi";
import { STATUSCODE } from "@statics/Constants";
import fetcher from "@utils/Fetcher";
import { showErrorToast } from "@utils/Toasts";
import { SETUP_STEPS } from "../constants/organizationSetup";
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
 * Everything `/organization/setup` needs: the record, the taxonomy, the
 * form, which stage is on screen, and the per-step save.
 *
 * The page is a wizard rather than one long form, and each step saves on
 * its own. Two rules make that safe:
 *
 * - **A save sends only its own step's fields.** Step two's blank inputs
 *   can't wipe step one's answers, and a validation failure in a field the
 *   user hasn't reached yet can't block the step they're on.
 * - **`saved` tracks what the server last acknowledged**, so pressing
 *   Continue on an untouched step is free rather than another round trip.
 *
 * The stage lives in the URL (`?step=about`) so Back works, a refresh
 * doesn't drop the user at the beginning, and "finish this later" can be a
 * real link.
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

  const goTo = (next: OrganizationSetupStage) => {
    setSearchParams(next === "intro" ? {} : { step: next });
    window.scrollTo({ top: 0 });
  };

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
    goTo,
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
