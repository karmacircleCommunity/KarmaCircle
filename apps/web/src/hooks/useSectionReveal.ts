import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

/**
 * The app's standard scroll entrance: anything tagged `data-reveal` inside
 * `scope` fades and rises into place the first time it reaches the
 * viewport, in source order, in batches.
 *
 * Lives in `src/hooks/` rather than in `features/landing-home/` (where it
 * started) because it is not a landing-page effect — it is the one entrance
 * animation this app has, and any page section that should arrive rather
 * than appear is expected to use it instead of hand-rolling a fourth
 * variation. `Landing.tsx`'s own reveal stays where it is because it's a
 * mount-time (not scroll-time) animation with a different trigger story.
 *
 * Two details worth keeping:
 * - The elements are collected with `scope.current.querySelectorAll`, not
 *   `gsap.utils.toArray("[data-reveal]")`. `useGSAP`'s scope only rewrites
 *   selector *strings passed to gsap methods*; `gsap.utils.toArray` queries
 *   the whole document, which would make each section animate every other
 *   section's elements too, since they all share this one attribute.
 * - `once: true` — these are entrance animations, not scrubbed effects.
 *   Re-playing them on every scroll-back reads as jitter, and it would also
 *   fight `ScrollTrigger`'s own refresh on resize.
 *
 * Skipped entirely under `prefers-reduced-motion`, where the elements are
 * simply set to their final state (same contract as `Landing.tsx`/`Footer.tsx`).
 */
export const useSectionReveal = (
  scope: RefObject<HTMLElement | null>,
  dependencies: unknown[] = [],
) => {
  useGSAP(
    () => {
      const targets = Array.from(
        scope.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [],
      );
      if (!targets.length) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y: 26 });
      ScrollTrigger.batch(targets, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.1,
            overwrite: true,
          }),
      });
    },
    { scope, dependencies },
  );
};
