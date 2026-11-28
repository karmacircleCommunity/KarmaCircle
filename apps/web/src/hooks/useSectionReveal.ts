import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
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
 *
 * **What is already on screen arrives at once.** Only what is further down waits
 * for the scroll, so a page that replaces its loading placeholders never shows
 * a blank where they just were.
 *
 * **Each element is taken once.** When the dependencies change (a list grows),
 * only elements this hook has not handled yet are hidden and animated, so cards
 * already on screen never blink as the next page arrives. Because new content
 * moves everything under it, the other scroll positions are measured again.
 */
export const useSectionReveal = (
  scope: RefObject<HTMLElement | null>,
  dependencies: unknown[] = [],
) => {
  const taken = useRef(new WeakSet<HTMLElement>());

  useGSAP(
    () => {
      const targets = Array.from(
        scope.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [],
      ).filter((target) => !taken.current.has(target));
      if (!targets.length) return;
      targets.forEach((target) => taken.current.add(target));
      // Undone with the animations, so a remount animates them again.
      const release = () =>
        targets.forEach((target) => taken.current.delete(target));

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return release;
      }

      gsap.set(targets, { opacity: 0, y: 26 });
      const enter = (elements: Element[]) =>
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          overwrite: true,
        });
      // The 26px the entrance starts below its place is not part of where it is.
      const onScreen = targets.filter((target) => {
        const { top, bottom } = target.getBoundingClientRect();
        return bottom > 0 && top - 26 < window.innerHeight;
      });
      if (onScreen.length) enter(onScreen);
      ScrollTrigger.batch(
        targets.filter((target) => !onScreen.includes(target)),
        { start: "top 88%", once: true, onEnter: enter },
      );
      // `true` waits for scrolling to stop before measuring.
      ScrollTrigger.refresh(true);
      return release;
    },
    { scope, dependencies },
  );
};
