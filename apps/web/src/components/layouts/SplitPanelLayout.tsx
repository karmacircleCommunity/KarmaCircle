import panelArt from "@assets/pictures/authpages/signup-panel-waves.jpg";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The app's focused-flow shell: a dark brand panel on the left, the thing
 * the user is actually doing on the right, and no navbar or footer to wander
 * off into mid-flow.
 *
 * Two flows use it — signing in/up (`features/authentication/components/
 * AuthLayout.tsx`) and organization setup (`features/organizations/
 * components/setup/SetupLayout.tsx`). They differ only in what fills the
 * left panel, so that is the prop; everything else (the art, the scrim, the
 * cream form surface, where the wordmark sits at each breakpoint) lives
 * here once, which is what stops the two flows drifting into two designs.
 *
 * Below 900px the left panel is dropped entirely rather than stacked — its
 * job is reassurance, and on a phone that belongs under the form, not above
 * it, pushing the first field off screen.
 */
type SplitPanelLayoutProps = {
  /** The left panel's content. Rendered above the art and the scrim. */
  aside: ReactNode;
  children: ReactNode;
  /**
   * How the right panel places its content. `"center"` for a short form
   * (auth), `"start"` for anything tall enough to scroll (setup) — a
   * centered tall form jumps as its height changes between steps.
   */
  align?: "center" | "start";
  /** Width cap on the right panel's content. */
  contentClassName?: string;
  className?: string;
  style?: CSSProperties;
};

const Wordmark = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    className={`flex items-center gap-2 font-outfit text-sm font-medium no-underline ${className}`}
  >
    <span className="inline-block size-1.5 rounded-full bg-brand" />
    KarmaCircle
  </Link>
);

const SplitPanelLayout = ({
  aside,
  children,
  align = "center",
  contentClassName = "max-w-sm",
  className = "",
  style,
}: SplitPanelLayoutProps) => (
  <div className={`flex min-h-screen w-full ${className}`} style={style}>
    {/* Sticky so a long right-hand form scrolls past a panel that stays
        put, rather than dragging a half-height column of art with it. */}
    <div className="relative hidden w-[44%] shrink-0 flex-col justify-center overflow-hidden bg-surface-dark px-14 py-12 min-[900px]:sticky min-[900px]:top-0 min-[900px]:flex min-[900px]:h-screen">
      <img
        src={panelArt}
        alt=""
        className="pointer-events-none absolute inset-0 size-full scale-125 object-cover blur-2xl"
      />
      {/* Scrim so the panel text stays legible regardless of where the
          image's lighter highlights land underneath it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.35)_28%,rgba(0,0,0,0.4)_75%,transparent_100%)]"
      />

      <Wordmark className="absolute top-10 left-14 text-white/90" />

      <div className="relative z-10 max-w-md">{aside}</div>
    </div>

    {/* A soft cream, not pure white — pure white next to small-ish body
        text was reading as low-contrast glare rather than "clean". */}
    <div
      className={`flex w-full flex-col bg-[#faf8f5] px-9 py-12 sm:px-10 ${
        align === "center" ? "items-center justify-center" : "items-center"
      }`}
    >
      <Wordmark className="mb-8 self-start text-ink min-[900px]:hidden" />

      <div className={`w-full ${contentClassName}`}>{children}</div>
    </div>
  </div>
);

export default SplitPanelLayout;
