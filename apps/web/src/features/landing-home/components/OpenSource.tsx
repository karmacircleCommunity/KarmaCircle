import { useRef } from "react";
import { FiArrowUpRight, FiGithub } from "react-icons/fi";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMagnetic, useSectionReveal } from "@hooks";
import {
  CONTRIBUTE_URL,
  REPOSITORY_URL,
  contributeWays,
} from "../constants/landingContent";

/**
 * "Built in the open" — the closing section above the footer.
 *
 * ## Why it's this small
 *
 * This slot used to hold a full transparency bento: a "you give ₹1,000, the
 * drive gets ₹1,000" headline, animated comparison bars against an
 * illustrative competitor, a worked receipt, and three supporting tiles. It
 * was accurate and it was too much — a dense, figure-heavy argument in the
 * last thing before the footer, on a page that had already made its case
 * three sections earlier. Cut deliberately, not lost: the 0%-cut promise
 * still lives where it belongs, as step 03's `meta` in `drivePlaybook`
 * ("0% platform fee") inside `HowItWorks.tsx`.
 *
 * What's left is the one claim that has no other home on the page — this is
 * a community project, it's open, and you can join it. Keep it at this
 * weight. If bars, receipts or money proportions reappear here, the old
 * section is growing back.
 *
 * ## Layout and motion
 *
 * Still a dark **inset card** on the cream page rather than a full-bleed
 * band, for the original reason: `Footer.tsx` below is already
 * `bg-surface-dark`, and full-bleed would fuse the two into one slab.
 * Inside, a two-column split from `lg` (pitch left, the three ways right)
 * that stacks on mobile.
 *
 * The card eases in on a scrubbed scale/lift with a warm glow behind it.
 * The inner `lg`-gated parallax the old section carried is gone with it —
 * that effect needs a tall block to have anywhere to travel, and this one
 * no longer is one.
 */
const OpenSource = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  // Magnetic, so the primary action leans toward the cursor. Note the CTAs
  // below carry no `hover:-translate-*`: this hook owns their transform
  // (see useMagnetic.ts).
  const repoCtaRef = useMagnetic<HTMLAnchorElement>({ strength: 0.3, max: 10 });

  useSectionReveal(sectionRef);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(cardRef.current, { clearProps: "transform" });
        gsap.set(glowRef.current, { opacity: 0.5 });
        return;
      }

      gsap.fromTo(
        cardRef.current,
        { scale: 0.94, yPercent: 3 },
        {
          scale: 1,
          yPercent: 0,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "top 35%",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        glowRef.current,
        { opacity: 0 },
        {
          opacity: 0.55,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "top 45%",
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
      aria-labelledby="open-source-heading"
      className="relative px-6 py-16 sm:px-9 sm:py-20 lg:px-12 lg:py-24"
    >
      {/* Warm halo on the cream page, behind the card — the page background
          shouldn't meet a black rectangle with nothing in between. */}
      <span
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 inset-y-8 opacity-0 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(168,98,62,0.20), transparent 70%)",
        }}
      />

      <div
        ref={cardRef}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-surface-dark px-6 py-12 will-change-transform sm:px-10 sm:py-14 lg:px-14 lg:py-16"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 20%, black 10%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 20%, black 10%, transparent 100%)",
          }}
        />

        <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14">
          <div>
            <span
              data-reveal
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-white/70 uppercase"
            >
              {/* A live-ish dot: the section's one gamified beat, and the
                  same mark as the logo, so "open" reads as ongoing rather
                  than as a badge. */}
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
              Open source
            </span>

            <h2
              id="open-source-heading"
              data-reveal
              className="leading-1.12 mt-6 max-w-xl font-outfit text-[2rem] font-semibold tracking-tight text-white sm:text-4xl"
            >
              Built in the open, by{" "}
              <span className="text-brand">the people using it.</span>
            </h2>

            <p
              data-reveal
              className="mt-5 max-w-lg font-poppins text-body leading-6 text-white/60 sm:text-body-lg sm:leading-7"
            >
              KarmaCircle isn’t a company with a growth target. It’s a community
              project — the code is public, the roadmap is public, and anyone
              who wants it to be better is welcome to make it better.
            </p>

            <div
              data-reveal
              className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            >
              <a
                ref={repoCtaRef}
                href={CONTRIBUTE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 font-poppins text-body-lg font-medium text-white no-underline shadow-[0_8px_24px_-10px_var(--color-brand)] transition-colors duration-300 ease-out hover:bg-brand-hover"
              >
                <FiGithub aria-hidden="true" /> Contribute on GitHub
              </a>

              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-poppins text-body-lg font-medium text-white no-underline transition-colors duration-200 hover:border-white/45 hover:bg-white/5"
              >
                Read the code
                <FiArrowUpRight
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                />
              </a>
            </div>
          </div>

          <ul className="mt-10 flex list-none flex-col gap-2 p-0 lg:mt-0">
            {contributeWays.map((way) => {
              const Icon = way.icon;
              return (
                <li
                  key={way.id}
                  data-reveal
                  className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.06] sm:p-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
                    <Icon aria-hidden="true" className="size-4.5" />
                  </span>
                  <div>
                    <h3 className="font-outfit text-body-lg font-semibold tracking-tight text-white">
                      {way.title}
                    </h3>
                    <p className="mt-1 font-poppins text-body leading-6 text-white/55">
                      {way.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default OpenSource;
