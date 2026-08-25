import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaGithub, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
// ScrollTrigger itself is registered once, globally, by SmoothScroll.tsx —
// no gsap.registerPlugin(ScrollTrigger) needed here, same as Landing.tsx.
import Button from "@components/buttons/Button";
import { showSuccessToast } from "@utils/Toasts";
import { footerLinks } from "./footerLinksConfig";

const socialIcons: Record<string, typeof FaLinkedinIn> = {
  FaLinkedinIn: FaLinkedinIn,
  FaXTwitter: FaXTwitter,
  FaGithub: FaGithub,
};

const Footer = () => {
  const [email, setEmail] = useState("");
  // Same pattern as Landing.tsx: re-evaluate on resize rather than reading
  // matchMedia once at mount. A `useGSAP` dependency array reverts and
  // re-runs the whole effect when it changes, so this is what actually
  // makes the lg: gate below reactive - without it, a page that mounted
  // wide (or a DevTools/browser resize with no full reload, which doesn't
  // remount the component) would keep the parallax active at a width
  // where it should be off, right back to eating the padding it was
  // gated off to protect.
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const footerRef = useRef<HTMLElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // No newsletter endpoint exists in MilanApi.ts/apps/api — see
  // docs/specs/known-issues.md. This gives honest feedback (nothing is
  // silently swallowed) without claiming an email was actually captured,
  // rather than mirroring Profile.tsx's Subscribe button, which has no
  // handler at all.
  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    showSuccessToast("Thanks for the interest, newsletter signups are coming soon!");
    setEmail("");
  };

  // Parallax: the newsletter band and the links band drift upward at two
  // different rates as the footer scrolls through the viewport — that
  // speed difference between layers is what actually reads as "parallax"
  // rather than a single rigid block sliding in (see Landing.tsx for the
  // same GSAP+ScrollTrigger pattern used elsewhere in the app). The bottom
  // copyright bar is left untouched as the anchor layer.
  //
  // end: "bottom bottom" rather than Landing.tsx's "bottom top" — Footer
  // is always the last element on the page, so the viewport can never
  // scroll past the point where the footer's own bottom edge lines up
  // with the viewport's bottom edge (there's nothing left below it to
  // keep scrolling into). "bottom top" would never fire, leaving the
  // scrub stuck short of its full range.
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // Parallax is desktop-only (matches the lg: breakpoint the layout
      // itself switches on below). Below lg the newsletter/links bands
      // stack full-height, so the same yPercent translate covers a much
      // bigger share of a much shorter viewport - it was visibly eating
      // into the top padding above "Stay connected." as the page scrolled.
      // Skipping it on mobile fixes that without hand-tuning a smaller
      // magnitude that would still drift depending on scroll position.
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (reduced || !isDesktop) {
        // Explicit, not left to useGSAP's automatic revert: a resize from
        // desktop down to mobile re-runs this effect (dependencies below)
        // and *should* have revert() clean up the previous run's tweens,
        // but a scrub tween's inline transform was verified (in-browser,
        // desktop -> mobile with no reload) to still be sitting on the
        // element after that revert - exactly the "translated up, eating
        // the top padding" bug this whole gate exists to prevent, just
        // reintroduced through the resize path instead of the mount path.
        // Clearing it by hand removes the dependency on revert timing.
        gsap.set([newsletterRef.current, linksRef.current], {
          clearProps: "transform",
        });
        return;
      }

      // A fresh object per tween: GSAP mutates the `scrollTrigger` vars
      // object it's given (it stamps a back-reference to the tween that
      // owns it) to create each ScrollTrigger instance, so reusing one
      // object across both `gsap.to()` calls would let the second call's
      // stamp silently clobber the first's, orphaning that ScrollTrigger.
      const makeScrollTrigger = () => ({
        trigger: footerRef.current,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
      });

      gsap.to(newsletterRef.current, {
        yPercent: -16,
        ease: "none",
        scrollTrigger: makeScrollTrigger(),
      });
      gsap.to(linksRef.current, {
        yPercent: -8,
        ease: "none",
        scrollTrigger: makeScrollTrigger(),
      });
    },
    { scope: footerRef, dependencies: [windowWidth] },
  );

  return (
    <footer ref={footerRef} className="overflow-hidden bg-surface-dark">
      <div
        ref={newsletterRef}
        className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 border-b border-white/10 px-9 py-10 sm:gap-8 sm:py-12 lg:flex-row lg:items-center lg:px-12 lg:py-16"
      >
        <div className="max-w-md">
          <h2 className="font-outfit text-2xl leading-tight font-semibold text-white sm:text-3xl">
            Stay connected.
          </h2>
          <p className="mt-3 font-poppins text-sm text-white/55 sm:text-body-lg">
            Get the latest events, causes, and organizations worth knowing
            about, straight to your inbox.
          </p>
        </div>

        <form
          onSubmit={handleSubscribe}
          className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="w-full min-w-0 rounded-10px border border-white/15 bg-white/5 px-5 py-3 font-outfit text-sm text-white transition-colors outline-none placeholder:text-white/35 focus:border-brand sm:w-72 sm:text-body-lg"
          />
          <Button
            type="submit"
            className="flex shrink-0 items-center justify-center gap-2 rounded-10px border-none px-6 py-3 font-outfit text-sm font-medium whitespace-nowrap sm:text-body-lg"
          >
            Subscribe <FiArrowRight />
          </Button>
        </form>
      </div>

      <div
        ref={linksRef}
        className="mx-auto flex max-w-6xl flex-col gap-8 px-9 py-10 sm:gap-10 sm:py-12 lg:flex-row lg:justify-between lg:px-12 lg:py-16"
      >
        <div className="flex max-w-xs flex-col gap-4">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-full bg-brand"
            />
            <span className="font-outfit text-lg leading-none font-medium tracking-tight text-white sm:text-xl">
              NgoWorld
            </span>
          </Link>
          <p className="font-poppins text-xs text-white/50 sm:text-body">
            Connecting NGOs, charities, and the people who show up for them.
          </p>
          <div className="flex gap-4">
            {footerLinks?.social?.map((item, index) => {
              const IconComponent = socialIcons[item.icon ?? ""];
              return (
                <a
                  key={index}
                  href={item?.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item?.name}
                >
                  <IconComponent className="size-[1.1rem] text-white/60 transition-colors hover:text-brand" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Divider only below lg: on mobile this sits directly under the
            brand block in one long stack, so a hairline + top padding here
            gives it its own visual group instead of blurring together.
            On lg the brand and link columns already sit side by side
            (lg:flex-row above), so the separation is spatial and this
            divider would be redundant. */}
        <div className="flex flex-wrap gap-x-16 gap-y-8 border-t border-white/5 pt-8 sm:gap-y-10 lg:border-none lg:pt-0">
          <div className="flex flex-col gap-3.5">
            <h3 className="font-outfit text-caption font-medium tracking-[0.12em] text-white/40 uppercase">
              Quick Starts
            </h3>
            {footerLinks?.quickStarts?.map((item, index) => (
              <Link
                key={index}
                to={item?.path}
                className="font-poppins text-xs text-white/55 no-underline transition-colors hover:text-white sm:text-body"
              >
                {item?.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            <h3 className="font-outfit text-caption font-medium tracking-[0.12em] text-white/40 uppercase">
              Resources
            </h3>
            {footerLinks?.resources?.map((item, index) => {
              return item?.path.startsWith("http") ? (
                <a
                  key={index}
                  href={item?.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-xs text-white/55 no-underline transition-colors hover:text-white sm:text-body"
                >
                  {item?.name}
                </a>
              ) : (
                <Link
                  key={index}
                  to={item?.path}
                  className="font-poppins text-xs text-white/55 no-underline transition-colors hover:text-white sm:text-body"
                >
                  {item?.name}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-3.5">
            <h3 className="font-outfit text-caption font-medium tracking-[0.12em] text-white/40 uppercase">
              Policies
            </h3>
            {footerLinks?.policies?.map((item, index) => (
              <Link
                key={index}
                to={item?.path}
                target="_blank"
                className="font-poppins text-xs text-white/55 no-underline transition-colors hover:text-white sm:text-body"
              >
                {item?.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-9 py-8 sm:py-10 lg:p-12">
        <p className="mx-auto max-w-6xl text-center font-poppins text-caption text-white/35">
          © {new Date().getFullYear()} NgoWorld. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
