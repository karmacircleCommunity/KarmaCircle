import { useEffect, useRef } from "react";
import { FiClock, FiMapPin } from "react-icons/fi";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sampleDrives } from "../constants/landingContent";
import { useSectionReveal } from "@hooks";
import type { SampleDrive } from "../types";

/** Pixels per second the rail drifts on its own. Slow enough to read a card
 *  title while it passes, fast enough that the row is visibly alive. */
const MARQUEE_SPEED = 32;
/** How long after a touch/wheel nudge the drift picks itself back up. */
const RESUME_DELAY_MS = 2200;

/**
 * The drives rail — the second section below the hero.
 *
 * **These cards are sample content, not live data.** There is no public
 * "list drives/events" endpoint in `MilanApi.ts`/`ApiEndpoints.ts` today
 * (`Organizations.tsx`/`Events.tsx` have the same gap — see
 * docs/specs/known-issues.md), so the section says so on the page rather
 * than implying a live feed. The card shape is deliberately the shape of a
 * real drive record: wiring this up later should be a `useSWR` swap.
 *
 * ## Why it's a marquee, and why it's still a real scroller
 *
 * It drifts on its own so nobody has to work a horizontal scrollbar just to
 * see what's happening on the platform (direct feedback — the earlier
 * arrow-button version put the burden on the visitor and the buttons read as
 * imported furniture rather than part of this site).
 *
 * The drift is implemented by advancing the **native** `scrollLeft` of a real
 * overflow container from GSAP's ticker, *not* by translating a track with
 * `transform`. That distinction is the whole design:
 * - swipe on a phone and trackpad-scroll on a laptop keep working exactly as
 *   they do anywhere else, with real momentum, because nothing is faked;
 * - the container stays focusable and arrow-key scrollable for keyboard users;
 * - and the drift resumes from wherever the visitor left it, since the
 *   animation's own position (`offsetRef`) is re-synced from `scrollLeft`
 *   every frame it isn't driving.
 *
 * The card list is rendered twice and the drift wraps at the halfway point,
 * which is what makes it seamless. The wrap is only ever applied while the
 * drift is *running*: writing `scrollLeft` mid-gesture cancels momentum
 * scrolling on iOS, so a paused rail is left alone until the visitor stops.
 */
const DriveCard = ({
  drive,
  loopStart = false,
}: {
  drive: SampleDrive;
  /** Marks the first card of the duplicated set — the drift measures its
   *  loop distance from this element, see `measureLoop()` below. */
  loopStart?: boolean;
}) => (
  <li
    data-drive-card
    data-loop-start={loopStart || undefined}
    className="flex w-[78vw] max-w-xs shrink-0 flex-col overflow-hidden rounded-15px border border-brand-secondary/8 bg-surface shadow-[0_2px_18px_-14px_var(--color-brand-secondary)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/35 hover:shadow-[0_16px_34px_-18px_var(--color-brand)] motion-safe:hover:-translate-y-1.5 sm:w-80"
  >
    {/* Graph-paper band, echoing the hero's three.js line grid so the two
        sections read as the same design language. Pure CSS gradients: a
        decorative strip isn't worth an image request or a second canvas. */}
    <div
      aria-hidden="true"
      className="relative h-24 bg-gradient-to-br from-brand/18 via-brand/8 to-brand-secondary/10"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(56,44,36,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,44,36,0.07) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    >
      <span className="absolute bottom-3 left-5 rounded-full bg-surface/85 px-3 py-1 font-outfit text-caption font-medium tracking-widest text-brand-secondary uppercase backdrop-blur-sm">
        {drive.category}
      </span>
    </div>

    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <h3 className="font-outfit text-lg leading-snug font-semibold tracking-tight text-brand-secondary sm:text-xl">
        {drive.title}
      </h3>
      <p className="mt-2 font-poppins text-caption tracking-wide text-ink/55 uppercase">
        {drive.organizer}
      </p>
      <p className="mt-3 flex-1 font-poppins text-body leading-6 text-ink/70">
        {drive.summary}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-poppins text-caption text-ink/55">
        <span className="inline-flex items-center gap-1.5">
          <FiMapPin aria-hidden="true" className="size-3.5" />
          {drive.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FiClock aria-hidden="true" className="size-3.5" />
          {drive.daysLeft} days left
        </span>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-brand-secondary/10"
        role="progressbar"
        aria-valuenow={drive.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${drive.title} funding progress`}
      >
        <span
          data-progress
          className="block h-full rounded-full bg-brand"
          style={{ width: `${drive.percent}%` }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="font-outfit text-body-lg font-semibold text-brand-secondary">
          {drive.raised}
          <span className="ml-1.5 font-poppins text-caption font-normal text-ink/50">
            of {drive.goal}
          </span>
        </p>
        <p className="font-poppins text-caption text-ink/50">
          {drive.supporters} supporters
        </p>
      </div>
    </div>
  </li>
);

const DrivesRail = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  // The drift's own sub-pixel position. `scrollLeft` rounds to whole pixels
  // in most browsers, so accumulating there directly would quantize a 32px/s
  // drift into a visible stutter.
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<number>(0);
  // Distance after which the drift jumps back — see `measureLoop` below.
  const loopRef = useRef(0);

  useSectionReveal(sectionRef);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    // Reduced motion gets a plain, honest scroller: no drift, no
    // auto-wrapping, just the duplicated cards sitting still.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /**
     * The wrap distance is the gap between the first card of the original
     * set and the first card of the duplicated set — measured from the DOM,
     * never `scrollWidth / 2`.
     *
     * Half the scroll width is *not* the same number: the scroller's own
     * horizontal padding sits inside `scrollWidth` but outside the repeating
     * pattern, and the pattern has one fewer gap than it has cards. At the
     * desktop sizes here that's `1738` vs the correct `1700` — a 38px jump
     * every lap, which is exactly the kind of thing that reads as "the
     * animation is broken" without being obvious enough to name.
     */
    const measureLoop = () => {
      const first = rail.querySelector<HTMLElement>("[data-drive-card]");
      const duplicate = rail.querySelector<HTMLElement>("[data-loop-start]");
      loopRef.current =
        first && duplicate
          ? duplicate.offsetLeft - first.offsetLeft
          : rail.scrollWidth / 2;
    };

    measureLoop();
    offsetRef.current = rail.scrollLeft;

    const pause = () => {
      pausedRef.current = true;
      window.clearTimeout(resumeTimerRef.current);
    };
    const resume = () => {
      offsetRef.current = rail.scrollLeft;
      pausedRef.current = false;
    };
    // A wheel/touch nudge has no "leave" event to resume on, so it resumes
    // on an idle timer instead; hover and focus resume on their own exits.
    const resumeAfterIdle = () => {
      pause();
      resumeTimerRef.current = window.setTimeout(resume, RESUME_DELAY_MS);
    };

    const tick = (_time: number, deltaTime: number) => {
      const loop = loopRef.current;
      if (pausedRef.current || loop <= 0) {
        offsetRef.current = rail.scrollLeft;
        return;
      }
      // Clamped because SmoothScroll.tsx calls `gsap.ticker.lagSmoothing(0)`
      // for the Lenis bridge, which switches off GSAP's own delta clamping
      // globally. Without this, the first frame after the tab has been in
      // the background carries the entire hidden duration as one delta and
      // the rail teleports.
      const delta = Math.min(deltaTime, 50);
      offsetRef.current += (MARQUEE_SPEED * delta) / 1000;
      if (offsetRef.current >= loop) offsetRef.current -= loop;
      rail.scrollLeft = offsetRef.current;
    };

    gsap.ticker.add(tick);
    window.addEventListener("resize", measureLoop);
    rail.addEventListener("pointerenter", pause);
    rail.addEventListener("pointerleave", resume);
    rail.addEventListener("focusin", pause);
    rail.addEventListener("focusout", resume);
    rail.addEventListener("touchstart", resumeAfterIdle, { passive: true });
    rail.addEventListener("wheel", resumeAfterIdle, { passive: true });

    return () => {
      gsap.ticker.remove(tick);
      window.clearTimeout(resumeTimerRef.current);
      window.removeEventListener("resize", measureLoop);
      rail.removeEventListener("pointerenter", pause);
      rail.removeEventListener("pointerleave", resume);
      rail.removeEventListener("focusin", pause);
      rail.removeEventListener("focusout", resume);
      rail.removeEventListener("touchstart", resumeAfterIdle);
      rail.removeEventListener("wheel", resumeAfterIdle);
    };
  }, []);

  // The funding bars fill on first view. `scaleX` (composited) rather than
  // `width` (layout) — this row is already moving every frame, so the bars
  // must not add layout work on top of it.
  useGSAP(
    () => {
      const bars = Array.from(
        sectionRef.current?.querySelectorAll<HTMLElement>("[data-progress]") ??
          [],
      );
      if (!bars.length) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(bars, { scaleX: 1 });
        return;
      }

      gsap.set(bars, { scaleX: 0, transformOrigin: "left center" });
      ScrollTrigger.create({
        trigger: railRef.current,
        start: "top 85%",
        once: true,
        onEnter: () =>
          gsap.to(bars, {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            stagger: 0.06,
          }),
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="drives-heading"
      className="relative border-y border-brand-secondary/8 bg-surface-warm py-16 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-9 lg:px-12">
        <span
          data-reveal
          className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase"
        >
          The circle, in motion
        </span>
        <h2
          id="drives-heading"
          data-reveal
          className="leading-1.1 mt-6 max-w-xl font-outfit text-[2rem] font-semibold tracking-tight text-brand-secondary sm:text-4xl lg:text-[2.75rem]"
        >
          Blankets in Kolkata. Books in Kajiado.{" "}
          <span className="text-brand">One feed.</span>
        </h2>
        <p
          data-reveal
          className="mt-5 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7"
        >
          A preview of what a drive looks like on KarmaCircle — the organizer,
          the ask, and exactly how far along it is. These cards are illustrative
          while the public drives feed is being wired up.
        </p>
      </div>

      {/* Full-bleed by design: the row should read as a band passing through
          the page, not as a box that overflows one. The edge mask is what
          makes that deliberate rather than clipped — cards dissolve into the
          section background at both sides instead of being cut off by it. */}
      <div
        data-reveal
        className="mt-10 sm:mt-12"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, black 4.5rem, black calc(100% - 4.5rem), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 4.5rem, black calc(100% - 4.5rem), transparent 100%)",
        }}
      >
        <ul
          ref={railRef}
          tabIndex={0}
          aria-label="Sample drives, scrolling automatically. Hover or focus to pause."
          className="flex [scrollbar-width:none] gap-5 overflow-x-auto px-9 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {sampleDrives.map((drive) => (
            <DriveCard key={drive.id} drive={drive} />
          ))}
          {/* Second pass of the same cards: this is what the drift wraps
              onto, so the row never runs out. Hidden from assistive tech so
              a screen reader doesn't read every drive twice. */}
          <li aria-hidden="true" className="contents">
            <ul className="contents">
              {sampleDrives.map((drive, index) => (
                <DriveCard
                  key={`${drive.id}-loop`}
                  drive={drive}
                  loopStart={index === 0}
                />
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default DrivesRail;
