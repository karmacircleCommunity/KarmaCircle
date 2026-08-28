import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reactive `prefers-reduced-motion`.
 *
 * Most animation code in this app reads the media query once, imperatively,
 * inside a `useGSAP` body — that's correct there, because `useGSAP` already
 * reverts and re-runs when its dependencies change. This hook exists for the
 * other case: a component that has to *render differently* under reduced
 * motion (skip a decorative node entirely, drop a duration to zero) and
 * therefore needs the answer as state, and needs it to update if the visitor
 * flips the OS setting without reloading.
 */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = () => setReduced(query.matches);

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
};
