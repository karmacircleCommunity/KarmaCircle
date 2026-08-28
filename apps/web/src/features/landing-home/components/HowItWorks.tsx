import { useRef } from "react";
import { FiArrowRight } from "react-icons/fi";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
// ScrollTrigger is registered once, globally, by SmoothScroll.tsx — same as
// Landing.tsx and Footer.tsx, no local registerPlugin call needed.
import Button from "@components/buttons/Button";
import { drivePlaybook } from "../constants/landingContent";
import { useSectionReveal } from "@hooks";

/**
 * "How a drive actually happens" — the first section below the hero.
 *
 * Layout is one column on mobile and a two-column split from `lg` up, where
 * the left intro column is `sticky` and the numbered steps scroll past it.
 * The sticky column is gated to `lg` on purpose: below that there isn't
 * enough viewport height for a pinned block plus a readable step, and a
 * sticky element on a short phone screen just eats the fold.
 *
 * The vertical rail down the left of the steps is a real progress
 * indicator, not decoration — its fill is a `scrub`bed `scaleY` tied to the
 * list's own scroll range, so it tracks Lenis's eased scroll position the
 * same way the hero parallax does. It renders at every breakpoint (unlike
 * `Footer.tsx`'s parallax, which is desktop-only) because a `scaleY` on a
 * dedicated 1px rail can't collide with anyone's padding the way a
 * `yPercent` on a content block can.
 */
const HowItWorks = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const railFillRef = useRef<HTMLSpanElement>(null);

  useSectionReveal(sectionRef);

  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        // Reduced motion gets the rail at full height rather than at zero:
        // it's a progress *indicator*, so "no animation" should mean
        // "complete", not "permanently empty".
        gsap.set(railFillRef.current, { scaleY: 1 });
        return;
      }

      gsap.fromTo(
        railFillRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top center",
          scrollTrigger: {
            trigger: listRef.current,
            start: "top 70%",
            end: "bottom 75%",
            scrub: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="how-it-works-heading"
      className="relative overflow-hidden"
    >
      <div className="mx-auto max-w-6xl px-9 py-16 sm:py-24 lg:px-12 lg:py-32">
        <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <span
              data-reveal
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase"
            >
              How it works
            </span>

            <h2
              id="how-it-works-heading"
              data-reveal
              className="leading-1.1 mt-6 font-outfit text-[2rem] font-semibold tracking-tight text-brand-secondary sm:text-4xl lg:text-5xl"
            >
              From “someone should do something” to{" "}
              <span className="text-brand">done.</span>
            </h2>

            <p
              data-reveal
              className="mt-5 max-w-md font-poppins text-body-lg leading-7 text-ink/70"
            >
              KarmaCircle is a community hub, not a noticeboard. A drive posted
              here gets seen, funded, and accounted for in one place — by people
              who chose to show up for it.
            </p>

            <div
              data-reveal
              className="mt-8 rounded-15px border border-border-subtle bg-white/70 p-5 sm:p-6"
            >
              <p className="font-outfit text-caption font-medium tracking-[0.14em] text-ink/45 uppercase">
                A real example
              </p>
              <p className="mt-3 font-poppins text-body leading-6 text-ink/75 sm:text-body-lg sm:leading-7">
                One club. Two hundred blankets. One cold weekend in December.
                Posted on a Tuesday, funded by Friday, delivered by Sunday.
              </p>
            </div>

            <Button
              to="/auth/signup"
              data-reveal
              className="mt-8 inline-flex w-auto items-center gap-2 rounded-lg border-none px-6 py-3 font-poppins text-body-lg font-medium shadow-[0_8px_24px_-10px_var(--color-brand)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_var(--color-brand)]"
            >
              Start a drive <FiArrowRight aria-hidden="true" />
            </Button>
          </div>

          <ol ref={listRef} className="relative mt-14 lg:mt-0">
            {/* The rail sits at 18px — the centre of the 36px step badge —
                so the badges read as beads on the line rather than as
                boxes next to it. Hidden from assistive tech: the numbering
                it visualises is already in each step's own label. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-[18px] w-px bg-brand-secondary/12"
            />
            <span
              ref={railFillRef}
              aria-hidden="true"
              className="absolute inset-y-2 left-[18px] w-px origin-top scale-y-0 bg-brand"
            />

            {drivePlaybook.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.id}
                  data-reveal
                  className="relative pb-10 pl-14 last:pb-0 sm:pb-12 sm:pl-16"
                >
                  <span className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full border border-brand/25 bg-surface font-outfit text-caption font-semibold tracking-[0.08em] text-brand">
                    {step.label}
                  </span>

                  <div className="flex items-center gap-2.5">
                    <Icon
                      aria-hidden="true"
                      className="size-[1.15rem] shrink-0 text-brand"
                    />
                    <h3 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary sm:text-2xl">
                      {step.title}
                    </h3>
                  </div>

                  <p className="mt-3 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
                    {step.body}
                  </p>

                  <span className="mt-4 inline-block rounded-full bg-brand-secondary/6 px-3 py-1 font-outfit text-caption font-medium tracking-widest text-brand-secondary/70 uppercase">
                    {step.meta}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
