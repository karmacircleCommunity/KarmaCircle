import { useEffect } from "react";
import type { ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Phones and most tablets get native scroll only, skipping the Lenis
// wrapper entirely (fixed August 2026, on direct feedback that scrolling
// felt heavy on mobile). This isn't swapping out a JS reimplementation of
// touch momentum for the native one - Lenis's own `syncTouch` option
// defaults to `false` and is never set here, so touchmove already passes
// straight through untouched even with the wrapper mounted. What's
// actually removed is the overhead that rides along regardless of that:
// a rAF loop bridged through GSAP's ticker, a `ScrollTrigger.update()`
// call on every single scroll tick, and Lenis's own pointerdown listener
// - all real main-thread work competing with this app's Three.js hero
// scene and several `scrub: true` ScrollTrigger animations for the same
// frames. `(pointer: coarse)` is a capability check, not a viewport-width
// guess - it correctly catches a touchscreen laptop and correctly leaves
// a mouse/trackpad-driven desktop (including a narrow browser window) on
// the smooth path.
const prefersCoarsePointer = () =>
  window.matchMedia("(pointer: coarse)").matches;

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
 * Skips Lenis entirely under `prefers-reduced-motion` or a coarse
 * (touch) pointer: children render with plain native scroll, same as
 * before this existed, rather than imposing an eased scroll a
 * motion-sensitive visitor didn't ask for or a phone doesn't need. See
 * `prefersCoarsePointer` above for why the latter is skipped too.
 */
const SmoothScroll = ({ children }: SmoothScrollProps) => {
  if (prefersReducedMotion() || prefersCoarsePointer()) {
    return <>{children}</>;
  }

  return (
    // `lerp` only, no `duration`: Lenis's `Animate.advance()` checks
    // `if (this.duration && this.easing)` *before* `else if (this.lerp)`
    // (node_modules/lenis/dist/lenis.mjs) - and the constructor
    // auto-assigns a default `easing` function the moment `duration` is
    // a number and no custom `easing` was given. So the previous
    // `duration: 1.2` alongside `lerp: 0.1` wasn't "duration as a
    // fallback" - it silently made both truthy and won that check
    // outright, meaning every scroll actually ran a full 1.2s
    // duration-eased animation and `lerp: 0.1` never took effect at all.
    // That's what read as heavy/laggy on desktop wheel scroll (Lenis's
    // touch handling is untouched by this - see above). Dropping
    // `duration` restores real lerp-based damping, and 0.12 (a touch
    // above Lenis's own 0.1 default) makes it noticeably snappier on
    // direct feedback that even the fixed version should feel lighter.
    <ReactLenis root options={{ autoRaf: false, lerp: 0.12 }}>
      <LenisGsapBridge />
      {children}
    </ReactLenis>
  );
};

export default SmoothScroll;
