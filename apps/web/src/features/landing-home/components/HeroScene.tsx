import { useEffect, useRef } from "react";

// Cell size of the graph-paper grid, in CSS pixels. Deliberately larger than
// DrivesRail.tsx's 26px card band: that grid decorates a 96px-tall strip,
// this one is full-bleed behind the hero, and at 26px across a whole viewport
// the lines stop reading as paper and start reading as a screen door.
const CELL_PX = 72;

// Line color/alpha. `rgba(56,44,36,...)` is `--color-brand-secondary`, the
// same ink DrivesRail's band uses. On the alpha, see the note in SPEC.md:
// this is a *crisp, full-CSS-pixel* line, so it is not comparable to the
// number the old WebGL version needed — 0.04 here reads roughly like the
// hairline 0.16 did, which is the level asked for (texture you notice only
// if you look for it, not a visible feature).
const LINE = "rgba(56,44,36,0.04)";

// How far (px) the layer drifts toward the pointer at the extremes, and how
// hard it eases there per frame. Small on purpose: this should register as
// depth, not as the grid sliding around.
const PARALLAX_PX = 10;
const EASE = 0.06;

type HeroSceneProps = {
  className?: string;
};

/**
 * A static, axis-aligned line grid behind the hero copy — graph-paper
 * texture whose only job is to keep the hero from reading as empty space.
 *
 * **This used to be a three.js/`@react-three/fiber` canvas, and should not
 * go back to being one.** Two things went wrong with the WebGL version,
 * both of which a CSS background simply cannot have:
 *
 * 1. *It didn't paint on load.* The grid only appeared after scrolling down
 *    and back up. A WebGL canvas that is also the element carrying a
 *    `mask-image` gets promoted to its own composited layer, and the first
 *    composite could land before/without the canvas' first frame; scrolling
 *    forced the recomposite that revealed it. Nothing about that is
 *    controllable from React — the fix is to not draw the grid on a canvas.
 * 2. *It was impossible to tune.* `lineBasicMaterial` draws exactly one
 *    **device** pixel (`linewidth` is a no-op on ANGLE/Metal), so every line
 *    was a sub-CSS-pixel hairline resampled by the `dpr` cap — which is why
 *    it swung from "not at all visible" at 0.08 straight to "way too
 *    prominent" at 0.16 with nothing usable in between. A `background-image`
 *    gradient line is a real, crisp pixel at whatever alpha you ask for.
 *
 * Removing it also drops three.js (~230KB gzipped, the heaviest dependency
 * of the August 2026 redesign) from the bundle entirely — it had no other
 * consumer. `Landing.tsx` still `React.lazy()`s this file; that's now just
 * cheap, but it keeps the decorative layer off the critical path.
 */
const HeroScene = ({ className = "" }: HeroSceneProps) => {
  const layerRef = useRef<HTMLDivElement>(null);

  // The one piece of motion: the grid eases toward the pointer, replacing
  // the old scene's camera parallax. Driven imperatively on a rAF loop
  // rather than through React state — this runs every frame and must never
  // re-render the hero. Skipped entirely under prefers-reduced-motion and on
  // coarse pointers (a phone has no hover position to follow, so the loop
  // would just burn battery holding the grid still).
  useEffect(() => {
    const layer = layerRef.current;
    const inert = window.matchMedia(
      "(prefers-reduced-motion: reduce), (hover: none)",
    ).matches;

    if (!layer || inert) {
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2 * PARALLAX_PX;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2 * PARALLAX_PX;
    };

    const tick = () => {
      x += (targetX - x) * EASE;
      y += (targetY - y) * EASE;
      layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // Two elements, not one: the outer div is what the caller masks and
    // clips, the inner one is what moves. Overscanning the inner layer by
    // more than PARALLAX_PX on every side means the drift can never pull a
    // hard edge of the grid into view.
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        ref={layerRef}
        className="absolute -inset-16 will-change-transform"
        style={{
          backgroundImage: `linear-gradient(to right, ${LINE} 1px, transparent 1px), linear-gradient(to bottom, ${LINE} 1px, transparent 1px)`,
          backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
        }}
      />
    </div>
  );
};

export default HeroScene;
