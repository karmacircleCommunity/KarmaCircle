import profileImage from "@assets/pictures/Navbar/profilePlaceholderImage.png";
import { forwardRef, useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCaretDown, RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetUserData, selectUser } from "@app/store/slices/userSlice";
import type { RootState } from "@app/store/store";
import { Logout } from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import Button from "@components/buttons/Button";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { resumeSetupPath } from "@features/organizations/utils/organizationSetupForm";

// No "Home" entry — the logo already links there (standard marketing-site
// convention: a persistent top nav lists the *other* destinations, not the
// page the logo itself points to).
const Links = [
  {
    name: "Organizations",
    link: "/organizations",
  },
  {
    name: "Events",
    link: "/events",
  },
];

type NavbarProps = {
  // Hides the navbar's own "Sign Up" while a bigger, redundant CTA
  // elsewhere on the page is on screen (Landing.tsx passes this, driven by
  // its own ScrollTrigger — see that file). Every other page renders
  // `<Navbar />` with no props, so this defaults to `false` (always show)
  // there, which is the correct behavior on pages with no such CTA.
  hideSignUpForHeroCta?: boolean;
};

// `forwardRef` exists only so `Landing.tsx` can measure this component's
// real rendered height (`<nav>` itself, not a wrapper `Landing.tsx` would
// otherwise need around it — see that file for why a wrapper div is
// actually wrong here, not just unnecessary: a `position: sticky` element's
// containing block is its immediate parent, and a wrapper that auto-fits
// to exactly `<nav>`'s own height gives it zero room to stick within,
// which silently defeats sticky entirely rather than erroring). Every
// other page still renders `<Navbar />` with no ref, which forwardRef
// leaves unaffected.
const Navbar = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  { hideSignUpForHeroCta = false },
  ref,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  const user = useSelector(selectUser);

  // Sticky is a conversion tool, not a blanket "nav should always float"
  // rule — direct feedback (September 2026): sticky read as right on `/`
  // (the hero's "Sign Up" needs to stay reachable the whole scroll) and on
  // `/organizations`/`/events` too, but *only* for a visitor who hasn't
  // signed up yet — once logged in, there's no "Sign Up" for a sticky nav
  // to keep prompting, so it just eats scroll real estate for the rest of
  // the page. Home stays sticky unconditionally (its hero CTA row makes
  // the same prompt-to-sign-up case `hideSignUpForHeroCta` above already
  // encodes); every other route only stickies while logged out. Not a
  // prop — every page renders `<Navbar />` the same way, and this is
  // meant to read as one consistent rule, not a per-page opt-in.
  const isHome = location.pathname === "/";
  const isSticky = isHome || !isLoggedIn;

  // A draft organization needs one always-visible way back into setup —
  // it opted out of finishing it, and nothing else on screen tells it that
  // it is still invisible. Fetches nothing for anyone else.
  const { organization, isDraft } = useMyOrganization();

  const [isNavbarOpen, setIsNavbarOpen] = useState(false);

  const toggleNavbar = () => {
    setIsNavbarOpen(!isNavbarOpen);
  };

  async function handleLogout() {
    const data = await Logout();

    // @ts-expect-error — pre-existing loose access into `Logout()`'s
    // response shape (catch branch returns the raw caught error, not
    // `error.response` — see KarmaCircleApi.ts/SPEC.md); preserved as-is for
    // a types-only pass.
    if (data?.status === 200) {
      // @ts-expect-error — see above.
      showSuccessToast(data?.data?.message);
      navigate("/");
      dispatch(resetUserData());
      localStorage.clear();
      document
        .querySelector(".nav_dropdown")
        ?.classList.remove("nav_dropdown_visible");
    } else {
      // @ts-expect-error — see above.
      showErrorToast(data?.message);
    }
  }

  return (
    // Sticky lives on `<nav>` itself, not the `max-w-6xl` div inside it —
    // `<nav>` is the full-viewport-width block, so the border/shadow span
    // edge to edge while the link row still lines up with every other
    // page's own `max-w-6xl` content (see layout-navigation.md).
    //
    // `.nav_dropdown` no longer anchors to this div's own `relative`
    // (October 2026) — it's now positioned off a tighter `relative`
    // wrapper around the "Profile" trigger itself, right where that
    // trigger renders below, so the panel tracks the trigger directly
    // instead of a fixed offset calibrated against this row's own padding.
    // See that wrapper's own comment for why.
    //
    // `top-0` is not decorative: Tailwind's `sticky` utility only sets
    // `position: sticky` — CSS requires an inset value (`top`/`bottom`/
    // `left`/`right`) before an element can actually stick, so without it
    // this rendered as plain `position: static` the entire time (confirmed
    // absent from the computed style; every other `sticky` in the app —
    // `SplitPanelLayout`'s aside (`sticky top-0`), `DetailedEvent.tsx`'s
    // join-panel sidebar (`lg:sticky lg:top-24`) — already pairs it with
    // `top-*`, this file was the outlier). Lenis drives the real `window`
    // scroll (`root: true`, see `SmoothScroll.tsx`), so no wrapper
    // `overflow` is fighting it once `top-0` is present. Both classes are
    // now conditional on `isSticky` (computed above) rather than always
    // on — see that computation for the actual per-page/per-auth rule.
    //
    // **Solid, not glass (October 2026) — supersedes the liquid-glass
    // material this bar carried September-October 2026.** That material
    // (an SVG `feDisplacementMap` refraction filter over a near-zero white
    // tint, added to fix the first pass's own "flat glassmorphism"
    // complaint) ended up reading as a rendering glitch rather than
    // deliberate glass once live — this app's own pages are themselves
    // near-white, so there was rarely enough contrast behind the bar for
    // blur/refraction to read as anything. The bar also carries the one
    // CTA ("Sign Up") that has to stay at full contrast regardless of
    // what's scrolling underneath, which a transparent material works
    // against by design. Checked how other companies solve this before
    // reverting: Stripe's header is plain solid white, no blur — the
    // pattern `Navbar` now matches; Linear and Vercel lean glass/
    // transparent, but on higher-contrast dark surfaces or with a
    // scroll-triggered solid swap, neither of which fits a straight
    // revert here as well as Stripe's simpler, more common pattern does.
    // Full history of the glass material — why it existed, the refraction
    // technique, the npm libraries considered and rejected — stays in
    // [layout-navigation.md](../../docs/specs/layout-navigation.md#navbar)
    // and
    // [design-system/06-radius-elevation.md](../../docs/specs/design-system/06-radius-elevation.md#liquid-glass)
    // rather than inline here, since none of it is live behavior anymore.
    //
    // **No ambient shadow (October 2026).** The shared "liquid glass"
    // elevation shadow (see the link above) stuck around through the solid
    // revert above and, on review, was the thing actually making this bar
    // feel like it was fighting the page rather than sitting quietly on
    // top of it — direct feedback was that it "stood out" the way a
    // minimal, text-forward marketing nav shouldn't. Checked Stripe's
    // header again specifically for this: `box-shadow: none`, a plain
    // hairline only. `Navbar`'s `border-b border-brand-secondary/10` does
    // the entire job of separating the bar from scrolled content now;
    // dropping the shadow is this component opting out of the shared
    // elevation shadow, not a change to that shared recipe itself — see
    // [design-system/06-radius-elevation.md](../../docs/specs/design-system/06-radius-elevation.md#liquid-glass)
    // for why every other shadow in the system still follows it.
    <nav
      ref={ref}
      className={`z-99 border-b border-brand-secondary/10 bg-surface ${isSticky ? "sticky top-0" : ""}`}
    >
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-9 py-[0.8rem] sm:px-10 lg:px-12">
        <Link
          to={"/"}
          className="group z-10 flex items-center gap-2 no-underline"
        >
          {/* The dot is the app's one recurring mark (it reappears in
              OpenSource.tsx's "Open source" badge). It grows on hover of the
              whole logo, not of itself — a 8px hit target isn't a hover
              affordance, the wordmark next to it is. */}
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:transform-none"
          />
          <span className="font-outfit text-xl leading-none font-medium tracking-tight text-brand-secondary transition-colors duration-300 group-hover:text-brand">
            KarmaCircle
          </span>
        </Link>

        {/* No `gap-*` here (October 2026, was `gap-8`) — the Sign Up
            button now animates its own `margin-left` shut when hidden (see
            below) rather than just going transparent in place; a fixed gap
            here would keep reserving that same dead space the margin
            animation is meant to close. The logged-in Profile trigger,
            which has no such hidden state, carries its own constant
            `ml-8` instead — same 32px the shared gap used to give it. */}
        <div className="hidden items-center min-[900px]:flex">
          {/* No active-route underline: that's an app-internal-tab
              pattern, not a marketing-nav one — a visitor already knows
              which page they're on from the page itself. Hover gets a
              colour shift plus a rule that wipes in from the left and, on
              leaving, continues out to the right (`origin-left` on hover,
              `origin-right` at rest) rather than retracting the way it
              came — the directional version reads as a swipe instead of a
              rubber band.
              `gap-10`, not the original `gap-7` (October 2026, direct
              feedback the link row read as cramped) — a deliberate, scroll-
              independent spacing change; see the Sign Up button below for
              the separate scroll-driven slide/reveal. */}
          <div className="z-1 flex items-center gap-10">
            {Links.map((item, index) => (
              <Link
                key={index}
                className="relative font-outfit text-body-lg leading-none font-normal text-ink/65 no-underline transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-brand after:transition-transform after:duration-300 after:ease-out after:content-[''] hover:text-brand-secondary hover:after:origin-left hover:after:scale-x-100 motion-reduce:after:transition-none"
                to={item.link}
              >
                {item.name}
              </Link>
            ))}
          </div>
          {isLoggedIn ? (
            // `relative` here, not on some ancestor further up, is
            // deliberate (October 2026 — supersedes `.nav_dropdown`
            // anchoring to the whole `max-w-6xl` row's own `relative`, a
            // fixed `right-17.75` calibrated for one specific padding
            // width). That fixed offset didn't track this trigger across
            // `px-9`/`sm:px-10`/`lg:px-12`, so the panel's right edge
            // drifted out from under the caret by double-digit pixels at
            // some widths — confirmed live, not just from reading the
            // math. Anchoring the dropdown to its own trigger's `relative`
            // and positioning it `right-0` makes "flush under the
            // trigger" true at every width, nav padding included, with no
            // magic number to keep in sync.
            <div className="relative">
              <p
                onClick={() => {
                  document
                    .querySelector(".nav_dropdown")
                    ?.classList.toggle("nav_dropdown_visible");
                }}
                className="group m-0 ml-8 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-normal text-ink/65 no-underline transition-colors duration-200 hover:text-brand-secondary"
              >
                Profile{" "}
                <RxCaretDown className="size-6.25 transition-transform duration-300 ease-out group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none" />
              </p>

              <div className="nav_dropdown absolute top-full right-0 z-10 mt-2 hidden w-50 flex-col justify-center rounded-md bg-white shadow-[0px_0px_1.17px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent),0px_0px_8.191px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent),0px_0px_28.084px_0px_color-mix(in_srgb,var(--color-brand)_12.5%,transparent)] transition-all duration-1000 ease-in-out">
                <div className="flex flex-col justify-center">
                  <span className="mb-1.25 p-2.5 font-outfit text-base">
                    Hello @{user?.userName}
                  </span>
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    className="h-px w-full bg-black/5"
                  ></div>
                  {isDraft && organization && (
                    <Link
                      to={resumeSetupPath(organization.missingFields)}
                      data-cy="nav-finish-setup"
                      className="flex items-center justify-between gap-2 rounded-5px p-2.5 font-outfit text-base leading-none font-medium text-brand no-underline hover:bg-brand/8"
                    >
                      Finish setting up
                      <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                    </Link>
                  )}
                  <Link
                    to={
                      user?.userType === "individual"
                        ? `/user/${user?.userName}`
                        : `/dashboard`
                    }
                    className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
                  >
                    {user?.userType === "individual"
                      ? "Your Profile"
                      : "Dashboard"}
                  </Link>
                  {user?.userType === "organization" ? (
                    <Link
                      to={"/organization/events"}
                      className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
                    >
                      Your Events
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-col justify-center">
                  <div
                    role="separator"
                    aria-orientation="horizontal"
                    className="h-px w-full bg-black/5"
                  ></div>
                  {/* @ts-expect-error — pre-existing: no `to` prop passed, unlike every other `<Link>` in the app; preserved as-is for a types-only pass. */}
                  <Link
                    onClick={() => {
                      handleLogout();
                    }}
                    className="flex justify-between rounded-5px p-2.5 font-outfit text-base leading-none font-normal text-brand-secondary no-underline hover:bg-black/[3.5%]"
                  >
                    Logout
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Collapses to zero width/margin when `hideSignUpForHeroCta`
            // is true (October 2026 — supersedes the original "opacity
            // only, kept in layout so nothing shifts" choice documented in
            // layout-navigation.md). That choice left a permanent dead gap
            // the width of this button whenever it was hidden — direct
            // feedback was that it read as a layout bug, not a deliberate
            // empty space. Animating `max-width`/`margin-left`/`padding`
            // shut instead (alongside the existing `opacity`) means the
            // link row above has nowhere to flow but right while hidden,
            // and — since it shares a `justify-between` row with the logo
            // — visibly slides left as this button grows back in on
            // scroll, which is the reveal this was asked for, not
            // something bolted on separately. `max-w-40` is comfortably
            // past this button's real content width (~110px with its
            // padding), so the growth settles before the transition ends
            // rather than the button overshooting its own text.
            // `overflow-hidden`/`whitespace-nowrap` keep "Sign Up" clipped
            // cleanly instead of wrapping while the width is still small.
            <Button
              to="/auth/signup"
              className={`z-3 flex items-center justify-around gap-2.5 overflow-hidden rounded-5px border-none py-2 font-outfit text-base font-normal whitespace-nowrap not-italic transition-all duration-300 ease-in-out hover:shadow-[0px_0px_1.17px_0px_var(--color-brand),0px_0px_8.191px_0px_var(--color-brand),0px_0px_28.084px_0px_var(--color-brand)] motion-safe:hover:-translate-y-0.5 ${hideSignUpForHeroCta ? "pointer-events-none ml-0 max-w-0 px-0 opacity-0" : "ml-8 max-w-40 px-5 opacity-100"}`}
            >
              <span>Sign Up</span>
            </Button>
          )}
        </div>

        {/* Caught mid-mobile-QA (September 2026, unrelated to the sticky/
              glass work above): this trigger and the desktop link row two
              blocks up used mismatched breakpoints — the row only appears
              at `min-[900px]`, but this used to switch on at `max-430px`,
              not `max-899px`. Between 431px and 899px (a real width —
              portrait tablets, several phones in landscape) neither one
              rendered: no links, no hamburger, no way to navigate or sign
              up at all. `docs/specs/layout-navigation.md` already
              documented the intent correctly ("below 900px shows a
              hamburger icon"); the code just didn't match it. Fixed by
              matching this to the same 900px line the row above already
              uses.

              **Off-by-one at exactly 899px (October 2026) — supersedes
              `max-[899px]` above.** Tailwind v4 compiles an arbitrary
              `max-[Npx]` variant to the *exclusive* range `(width < Npx)`,
              not the inclusive `(max-width: Npx)` CSS's own `max-width`
              property implies — so `max-[899px]:block` only fired below
              899px, not at it, leaving a real 1px gap against
              `min-[900px]:flex` (`width >= 900px`) where neither this
              trigger nor the link row above rendered. Confirmed live at a
              899px viewport. The zero-gap pairing with a `min-[900px]`
              variant is `max-[900px]` (`width < 900px`), not
              `max-[899px]` — matching the number in both variants is the
              correct pairing in v4's range syntax, not an off-by-one
              itself. */}
        {!isNavbarOpen &&
          (isLoggedIn ? (
            <img
              src={(user?.profileImage as string | undefined) || profileImage}
              alt=""
              role="button"
              tabIndex={0}
              aria-label="Open account menu"
              aria-haspopup="true"
              aria-expanded={isNavbarOpen}
              className="hidden size-7.5 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-[900px]:block"
              onClick={() => {
                toggleNavbar();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleNavbar();
                }
              }}
            />
          ) : (
            <GiHamburgerMenu
              role="button"
              tabIndex={0}
              aria-label="Open menu"
              aria-haspopup="true"
              aria-expanded={isNavbarOpen}
              className="hidden size-7.5 cursor-pointer text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-[900px]:block"
              onClick={() => {
                toggleNavbar();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleNavbar();
                }
              }}
            />
          ))}

        {isNavbarOpen && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/[0.867] transition-all duration-300 ease-in-out">
            <div className="absolute top-[20%] flex w-[80vw] flex-wrap items-center justify-center gap-7.5 rounded-xl bg-white p-4 pt-8 shadow-[1px_3px_80px_rgba(255,255,255,0.346)] motion-safe:animate-pop-in">
              <RxCross2
                role="button"
                tabIndex={0}
                aria-label="Close menu"
                className="absolute top-2.5 right-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                onClick={() => {
                  toggleNavbar();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleNavbar();
                  }
                }}
              />

              {Links.map((item, index) => (
                <Link
                  key={index}
                  className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-normal text-ink no-underline transition-colors duration-200 hover:text-brand motion-safe:active:scale-97"
                  to={item.link}
                >
                  {item.name}
                </Link>
              ))}

              {isLoggedIn ? (
                <>
                  {isDraft && organization && (
                    <div>
                      <Link
                        className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-brand no-underline"
                        to={resumeSetupPath(organization.missingFields)}
                        onClick={() => setIsNavbarOpen(false)}
                      >
                        Finish setting up
                      </Link>
                    </div>
                  )}
                  <div>
                    {/* Always "Dashboard" — it always points to /dashboard,
                        regardless of account type. "Your Profile" (below, in
                        the desktop dropdown) is the separate, distinctly
                        named link to /user/:handle; the two used to share
                        the ambiguous label "Profile" for individual
                        accounts. See docs/specs/layout-navigation.md. */}
                    <Link
                      className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-black no-underline"
                      to={"/dashboard"}
                    >
                      Dashboard
                    </Link>
                  </div>
                  <div>
                    <p
                      className="m-0 flex cursor-pointer items-center justify-center font-outfit text-body-lg leading-none font-medium text-black no-underline"
                      onClick={() => {
                        handleLogout();
                        setIsNavbarOpen(false);
                      }}
                    >
                      Logout
                    </p>
                  </div>
                </>
              ) : (
                <Button
                  to={"/auth/signup"}
                  className="flex w-auto items-center gap-1.25 px-4 py-2 font-outfit text-body-lg no-underline"
                >
                  <span>Sign Up</span>
                  <FaChevronRight />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

export default Navbar;
