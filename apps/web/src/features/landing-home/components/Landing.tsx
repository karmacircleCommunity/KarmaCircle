import { selectIsLoggedIn } from "@app/store/slices/userSlice";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import avatar56752104 from "@assets/avatars/gh-56752104.jpg";
import avatar71691473 from "@assets/avatars/gh-71691473.jpg";
import avatar94097778 from "@assets/avatars/gh-94097778.jpg";
import avatar72697074 from "@assets/avatars/gh-72697074.jpg";
import { Button, Navbar } from "@components";

// three.js + @react-three/fiber are the heaviest of this redesign's new
// dependencies and only ever used here — routesConfig.tsx doesn't
// route-split most pages (only Auth.tsx does), so without this every other
// route (dashboard, events, organizations, ...) would pay for them too.
// Suspense fallback is `null`: the scene is a purely decorative background
// layer, so "briefly absent" is the correct loading state, not a spinner.
const HeroScene = lazy(() => import("./HeroScene"));

/** The marketing hero rendered by `Home.tsx`. See SPEC.md. */
const Landing = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const heroRef = useRef<HTMLDivElement>(null);
  const ctaRowRef = useRef<HTMLDivElement>(null);
  // Drives Navbar's own "Sign Up" visibility (see the ScrollTrigger below
  // and Navbar.tsx's `hideSignUpForHeroCta` prop) — starts `true` since the
  // hero CTA is on screen at initial load on any realistic viewport height,
  // so there's nothing to flash before ScrollTrigger's first evaluation.
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Entrance: the headline/paragraph/CTA fade and settle in on mount, then
  // the whole block drifts up and fades slightly as the visitor scrolls
  // past it — the ScrollTrigger `scrub` ties that second part directly to
  // scroll position, which is what actually tracks Lenis's eased scroll
  // (see SmoothScroll.tsx) rather than the raw native one. Both are skipped
  // under prefers-reduced-motion, in favor of just showing the final state.
  useGSAP(
    () => {
      const reveal = gsap.utils.toArray<HTMLElement>("[data-hero-reveal]");
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduced) {
        gsap.set(reveal, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(reveal, { opacity: 0, y: 22 });
      gsap.to(reveal, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
      });

      gsap.to(heroRef.current, {
        yPercent: 10,
        opacity: 0.55,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Navbar carries its own, much smaller "Sign Up" — redundant while
      // this row is anywhere on screen. `onToggle`'s `self.isActive` is
      // true for as long as the trigger is anywhere between fully entering
      // from the bottom and fully leaving the top, i.e. "on screen at
      // all", which is what we want here (not the scrubbed/eased position
      // the parallax tween above uses).
      ScrollTrigger.create({
        trigger: ctaRowRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setHeroCtaVisible(self.isActive),
      });
    },
    { scope: heroRef, dependencies: [windowWidth] },
  );

  return (
    // A flex column with Navbar as a shrink-0 item and the hero as flex-1
    // is what actually centers the hero content on screen. The previous
    // `min-h-[95dvh]` on the hero div guessed at "the viewport minus the
    // navbar" with a flat percentage — since the sticky Navbar still takes
    // up real space in normal flow above it, that guess was short by
    // however tall the navbar rendered, so the hero's own vertical center
    // sat below the page's actual visual center. `flex-1` fills exactly
    // whatever space is left after the navbar, on any screen size, with no
    // guessing — which is also why the old `max-500px:min-h-[100dvh]`
    // mobile-only patch is gone; it was compensating for the same bug.
    <div className="flex min-h-dvh flex-col">
      <Navbar hideSignUpForHeroCta={heroCtaVisible} />
      <div
        ref={heroRef}
        className="relative container flex flex-1 flex-col items-center justify-center overflow-hidden max-500px:items-start max-500px:px-9 max-500px:pt-0"
      >
        <Suspense fallback={null}>
          <HeroScene className="pointer-events-none [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,black_55%,transparent_100%)]" />
        </Suspense>

        {/* items-center centers each child as its own box on desktop
            (by design - the h1 lines are shorter than the 55%-wide
            paragraph, and centering each independently is what makes
            them read as a stacked, centered block rather than a
            block-left-aligned-inside-a-centered-column). On mobile that
            same behavior was the bug: text flipped to text-start, but
            the h1 (no w-full) still shrank to its own content width and
            got centered as a box, while the paragraph/CTA row (both
            w-full) sat flush against the true left edge - two different
            left edges on screen. max-500px:items-start fixes the layout
            itself instead of just the text-align, and w-full below on
            the h1 makes it span the same width as everything else so
            text-start actually means "the same left edge". */}
        <div className="z-1 flex flex-col items-center justify-center max-500px:items-start">
          {windowWidth > 430 ? (
            <>
              <h1
                data-hero-reveal
                className="leading-1.05 z-3 m-0 text-center font-outfit text-6xl font-semibold tracking-tight text-brand-secondary max-500px:w-full max-500px:text-start max-500px:text-[2.7rem]"
              >
                We connect NGOs,
              </h1>
              <h1
                data-hero-reveal
                className="leading-1.05 z-3 m-0 text-center font-outfit text-6xl font-semibold tracking-tight text-brand-secondary max-500px:w-full max-500px:text-start max-500px:text-[2.7rem]"
              >
                Charities and <span className="text-brand">you.</span>
              </h1>
            </>
          ) : (
            <h1
              data-hero-reveal
              className="leading-1.05 z-3 m-0 text-center font-outfit text-6xl font-semibold tracking-tight text-brand-secondary max-500px:w-full max-500px:text-start max-500px:text-[2.7rem]"
            >
              We connect NGOs, charities and{" "}
              <span className="text-brand">you.</span>
            </h1>
          )}

          {windowWidth > 430 ? (
            <p
              data-hero-reveal
              className="z-3 mx-auto mt-8 w-[55%] text-center font-poppins text-lg leading-7 tracking-[0.2px] text-ink/70 max-500px:w-full max-500px:text-start max-500px:text-body-lg"
            >
              Welcome to <span className="font-medium">KarmaCircle</span>, a
              platform to connect and support NGOs, charities and you to build a
              better tomorrow.
            </p>
          ) : (
            <p
              data-hero-reveal
              className="z-3 mx-auto mt-8 w-[55%] text-center font-poppins text-lg leading-7 tracking-[0.2px] text-ink/70 max-500px:w-full max-500px:text-start max-500px:text-body-lg"
            >
              A platform for NGOs, charities, organizations and you to
              collaborate, grow and build a better tomorrow.
            </p>
          )}

          <div
            ref={ctaRowRef}
            data-hero-reveal
            className="mt-14 flex items-center justify-center gap-[0.8rem] max-500px:w-full max-500px:flex-col-reverse max-500px:items-start max-500px:justify-start"
          >
            {isLoggedIn ? (
              <Button
                to="/organizations"
                className="z-3 mx-auto flex w-auto items-center justify-around gap-2.5 rounded-lg border-none px-6 py-3 font-poppins text-body-lg font-medium shadow-[0_8px_24px_-10px_var(--color-brand)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_var(--color-brand)] max-500px:mx-0 max-500px:w-auto"
              >
                <span className="text-lg">Explore our organizations</span>
              </Button>
            ) : (
              <Button
                to="/auth/signup"
                className="z-3 mx-auto flex w-auto items-center justify-around gap-2.5 rounded-lg border-none px-6 py-3 font-poppins text-body-lg font-medium shadow-[0_8px_24px_-10px_var(--color-brand)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_var(--color-brand)] max-500px:mx-0 max-500px:w-auto"
              >
                <span className="text-lg">Sign up Today !</span>
              </Button>
            )}

            <div className="h-11.5 border-l-[3px] border-border-muted max-500px:hidden"></div>

            <div className="flex flex-col">
              <div className="z-3 flex items-center gap-0">
                <img
                  src={avatar56752104}
                  alt=""
                  className="z-4 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src={avatar71691473}
                  alt=""
                  className="z-3 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src={avatar94097778}
                  alt=""
                  className="z-2 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
                <img
                  src={avatar72697074}
                  alt=""
                  className="z-1 -ml-2.5 aspect-square w-7.5 rounded-full object-cover"
                />
              </div>
              <span className="z-3 font-poppins text-body font-medium text-ink/70">
                Trusted by 300+ users.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
