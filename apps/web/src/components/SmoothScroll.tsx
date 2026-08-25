import { useEffect } from "react";
import type { ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Drives GSAP's ticker off Lenis's eased scroll position (the Lenis
 * instance below has its own `autoRaf` disabled) instead of running two
 * separate rAF loops, and pushes every Lenis scroll tick into
 * `ScrollTrigger.update()` so any ScrollTrigger-based animation elsewhere
 * in the app (Landing.tsx today) tracks the smoothed position, not the
 * raw native one. Standard Lenis+GSAP integration — see
 * https://gsap.com/community/scrolltrigger/getting-started/#lenis.
 */
const LenisGsapBridge = () => {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) {
      return;
    }

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    const onScroll = () => ScrollTrigger.update();

    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", onScroll);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.off("scroll", onScroll);
    };
  }, [lenis]);

  return null;
};

type SmoothScrollProps = {
  children: ReactNode;
};

/**
 * Global smooth-scroll provider, mounted once in `App.tsx` around the whole
 * routed app. `root: true` makes Lenis drive the real window scroll (eased/
 * interpolated deltas applied to the actual `window.scrollY`, not a
 * virtualized container) — no wrapper markup, and nothing else that reads
 * `window.scrollY` or listens for the native `"scroll"` event
 * (`BacktoTop.tsx`, `Home.tsx`'s `window.scrollTo(0, 0)`) needs to change.
 * Any component can reach the shared instance via `useLenis()`
 * (`lenis/react`) without needing to sit inside this provider — see
 * `BacktoTop.tsx`.
 *
 * Skips Lenis entirely under `prefers-reduced-motion`: children render with
 * plain native (instant) scroll, same as before this existed, rather than
 * imposing an eased scroll a motion-sensitive visitor didn't ask for.
 */
const SmoothScroll = ({ children }: SmoothScrollProps) => {
  if (prefersReducedMotion()) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }}>
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
};

export default SmoothScroll;
