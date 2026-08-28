/* eslint-disable react/no-unknown-property */
// react-three-fiber elements (`points`, `bufferGeometry`, `bufferAttribute`,
// `pointsMaterial`, ...) aren't real DOM elements, so `react/no-unknown-property`
// (which only knows the real DOM prop set) flags every one of their props —
// same reason Button.tsx disables a different rule for a different prop.
import { useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

// World-space extent of the grid, well past the visible frustum at the
// camera settings below so the fade-to-transparent mask (applied via CSS on
// the canvas itself, see HeroScene's className) never reveals a hard edge.
const GRID_HALF_WIDTH = 9;
const GRID_HALF_HEIGHT = 5;
const GRID_SPACING = 1;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A static, axis-aligned line grid behind the hero copy — a graph-paper
 * texture, not a particle effect. Replaces an earlier random drifting
 * "particle field" version of this component: scattered points read as a
 * generic stock effect, where a grid reads as structure/precision, closer
 * to what the pre-redesign static background (`Vector.png`, a literal grid
 * image) was already doing right. Deliberately not animated — a grid
 * rotating or drifting stops looking like graph paper and starts looking
 * like a mistake — the "premium 3D" touch instead comes from the very
 * subtle pointer-parallax on the camera below, not from moving the grid.
 */
const Grid = () => {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let x = -GRID_HALF_WIDTH; x <= GRID_HALF_WIDTH; x += GRID_SPACING) {
      points.push(x, -GRID_HALF_HEIGHT, 0, x, GRID_HALF_HEIGHT, 0);
    }
    for (let y = -GRID_HALF_HEIGHT; y <= GRID_HALF_HEIGHT; y += GRID_SPACING) {
      points.push(-GRID_HALF_WIDTH, y, 0, GRID_HALF_WIDTH, y, 0);
    }
    return new Float32Array(points);
  }, []);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry, 3]} />
      </bufferGeometry>
      {/* 0.16, not the 0.08 this shipped with. Two things stack up against
          a WebGL grid that don't apply to a CSS one: `lineBasicMaterial`
          draws exactly one *device* pixel (`linewidth` is a no-op in every
          browser on ANGLE/Metal), so on a 2x display this is a half-CSS-pixel
          hairline, and the `dpr` cap below means it's then resampled up to
          the real display, softening it further. At 0.08 the result over the
          `#fffcf7` page was about a 6% luminance difference on a sub-pixel
          line — reported, correctly, as "not at all visible". 0.16 lands it
          roughly where DrivesRail.tsx's CSS card grid (a crisp full-pixel
          line at 0.07 alpha) actually reads. Still graph paper, not decor:
          if it starts reading as a *feature* rather than as texture, it's
          gone too far the other way. */}
      <lineBasicMaterial color="#382c24" transparent opacity={0.16} />
    </lineSegments>
  );
};

/**
 * The one piece of actual motion in this scene: the camera eases toward
 * wherever the pointer is (R3F's `state.pointer`, already normalized to
 * -1..1) instead of snapping to it, so the grid gains a faint sense of
 * depth as the visitor moves their mouse — the thing an actual 3D scene
 * can do that a flat CSS background can't, kept small enough that it reads
 * as depth rather than as the grid itself moving.
 */
const PointerParallax = () => {
  const reduced = useMemo(prefersReducedMotion, []);

  useFrame((state) => {
    if (reduced) {
      return;
    }
    state.camera.position.x +=
      (state.pointer.x * 0.4 - state.camera.position.x) * 0.03;
    state.camera.position.y +=
      (state.pointer.y * 0.25 - state.camera.position.y) * 0.03;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
};

type HeroSceneProps = {
  className?: string;
};

/**
 * Mounted by `Landing.tsx` as an absolutely-positioned layer behind the
 * hero copy, in place of the old static `Vector.png`. `frameloop="demand"`
 * under `prefers-reduced-motion` renders exactly one frame and then stops
 * (no animation loop at all) rather than a "smoothed" motion a
 * motion-sensitive visitor didn't ask for.
 *
 * The `style` prop (not `className`) is what actually has to carry
 * `position: absolute` here: `@react-three/fiber`'s `<Canvas>` renders its
 * own wrapper `<div>` with a hardcoded inline `style={{ position:
 * 'relative', width: '100%', height: '100%', ... }}`, and only spreads a
 * caller's own `style` object on top of that — inline styles always beat a
 * class-based `position-absolute` utility regardless of specificity, so
 * passing "absolute inset-0" via `className` silently no-ops. Without this,
 * the canvas stays `position: relative` and — since it's the first DOM
 * child of the hero's flex column — becomes a real flex item that pushes
 * the actual hero copy down instead of sitting behind it.
 */
const HeroScene = ({ className = "" }: HeroSceneProps) => {
  const reduced = prefersReducedMotion();

  return (
    <Canvas
      className={className}
      style={{ position: "absolute", inset: 0 }}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
      frameloop={reduced ? "demand" : "always"}
    >
      <Grid />
      <PointerParallax />
    </Canvas>
  );
};

export default HeroScene;
