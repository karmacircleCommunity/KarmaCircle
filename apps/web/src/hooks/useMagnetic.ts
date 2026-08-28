import { useEffect, useRef } from "react";
import gsap from "gsap";

export interface MagneticOptions {
  /** How much of the cursor's offset from centre the element follows. */
  strength?: number;
  /** Hard cap on the travel, in px, so a big target can't slide far. */
  max?: number;
}

/**
 * Makes an element lean toward the cursor while it's hovered, and spring
 * back when it leaves — the "magnetic button" interaction that reads as
 * responsive without ever moving anything far enough to be a hit-target
 * problem. Attach the returned ref to the element you want to move.
 *
 * Three things it deliberately does *not* do:
 *
 * - **Touch and reduced-motion get nothing.** Gated on
 *   `(hover: hover) and (pointer: fine)`, so a phone (where `pointermove`
 *   fires from a tap and would leave the element permanently offset) and
 *   anyone who asked for less motion both keep a plain static button.
 * - **No React state per pointer move.** `gsap.quickTo` writes straight to
 *   the element's transform on GSAP's ticker — which this app already drives
 *   off Lenis (`SmoothScroll.tsx`) — instead of re-rendering a component
 *   tree at pointer-event frequency.
 * - **It owns the element's `transform`.** GSAP writes an inline transform,
 *   and an inline style beats a class, so a magnetic element must not also
 *   carry a Tailwind `hover:-translate-*`/`active:scale-*` utility: the
 *   utility would silently do nothing. Express the hover/press feedback in
 *   colour, shadow, or border on those elements instead.
 */
export const useMagnetic = <T extends HTMLElement>({
  strength = 0.28,
  max = 12,
}: MagneticOptions = {}) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reduced.matches) return;

    const moveX = gsap.quickTo(element, "x", {
      duration: 0.5,
      ease: "power3.out",
    });
    const moveY = gsap.quickTo(element, "y", {
      duration: 0.5,
      ease: "power3.out",
    });

    const onPointerMove = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      moveX(
        gsap.utils.clamp(
          -max,
          max,
          (event.clientX - (bounds.left + bounds.width / 2)) * strength,
        ),
      );
      moveY(
        gsap.utils.clamp(
          -max,
          max,
          (event.clientY - (bounds.top + bounds.height / 2)) * strength,
        ),
      );
    };

    // Settling back through the same quickTo (rather than a fresh tween)
    // keeps a single tween per axis, so leaving mid-travel eases from where
    // the element actually is instead of snapping and re-easing.
    const onPointerLeave = () => {
      moveX(0);
      moveY(0);
    };

    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", onPointerLeave);

    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      gsap.killTweensOf(element);
      gsap.set(element, { clearProps: "transform" });
    };
  }, [strength, max]);

  return ref;
};
