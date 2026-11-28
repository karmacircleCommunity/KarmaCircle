import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "@app/store/slices/userSlice";
import { viewerIdentity } from "@app/store/viewerIdentity";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import type { ApiEvent, EventSnapshot } from "@features/events/types";

interface Result {
  request: string;
  event?: ApiEvent;
  error?: unknown;
  loadedAt: number;
}

/**
 * One event fetched for this page visit and then held still, for a form that
 * copies it into its own state.
 *
 * Deliberately not `useSWR`: the `byUid` cache is shared with the event page,
 * so it can hand over an older copy first (a form would start from it and later
 * save its gaps back, deleting the stored meeting link), and a background
 * revalidation would move the record the unsaved changes are measured against.
 * Here nothing is returned until a request made by this visit, for the current
 * viewer, has answered, and only `replace` (this page's own save) changes it.
 */
export function useEventSnapshot(eventId: string | undefined): EventSnapshot {
  const viewer = viewerIdentity(useSelector(selectUser));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result>();
  const request = JSON.stringify([viewer, eventId, attempt]);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const finish = (answer: Pick<Result, "event" | "error">) => {
      if (active) setResult({ ...answer, request, loadedAt: Date.now() });
    };
    fetcher<ApiEvent>(eventEndpoints.byUid(eventId)).then(
      (event) => finish({ event }),
      (error: unknown) => finish({ error }),
    );
    return () => {
      active = false;
    };
  }, [eventId, request]);

  const replace = useCallback(
    (event: ApiEvent) =>
      setResult((current) => current && { ...current, event }),
    [],
  );
  const current = result?.request === request ? result : undefined;

  return {
    event: current?.event,
    loadedAt: current?.loadedAt ?? 0,
    error: current?.error,
    isLoading: !current,
    retry: () => setAttempt((count) => count + 1),
    replace,
  };
}
