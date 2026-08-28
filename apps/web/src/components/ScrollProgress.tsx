import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

/**
 * A 2px brand rule across the very top of the window that fills as the page
 * scrolls. Mounted once in `App.tsx`, outside the router, so it covers every
 * route rather than being re-created on navigation.
 *
 * ScrollTrigger itself is registered once, globally, by SmoothScroll.tsx —
 * no local import or registerPlugin call needed, same as Landing.tsx.
 *
 * Why a `ScrollTrigger` on `document.documentElement` and not a scroll
 * listener: this app's real scroll position is Lenis's eased one
 * (`SmoothScroll.tsx`), and `ScrollTrigger` is already fed from it. A raw
 * `window.scrollY` listener would track the un-eased position and visibly
 * run ahead of the page it is supposed to be describing.
 *
 * `scrub: 0.2` rather than `true` — a small trailing ease so the bar reads
 * as a physical thing being pulled along, which is the whole point of it
 * over a plain percentage readout. Purely decorative, so it's `aria-hidden`
 * and simply never animates under reduced motion (staying at zero width,
 * i.e. invisible) instead of being given a static half-filled state that
 * would describe a scroll position nobody is at.
 */
const ScrollProgress = () => {
  const barRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      barRef.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        transformOrigin: "left center",
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.2,
        },
      },
    );
  });

  return (
    <span
      ref={barRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-999 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-brand to-brand-hover"
    />
  );
};

export default ScrollProgress;
