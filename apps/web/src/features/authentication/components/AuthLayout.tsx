import signupPanelArt from "@assets/pictures/authpages/signup-panel-waves.jpg";
import type { CSSProperties, ReactNode } from "react";
import { FiAward, FiCalendar, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";

// Shell for the unified auth flow (pages/Auth.tsx) — the left brand/
// value-prop panel and the page shell (background, accent color,
// right-panel frame) stay identical across every step; only the form
// content inside the right panel changes, and that's what the caller
// passes as `children`. Don't fork this into per-step copies — extend
// here instead.

// No numbers/stats here on purpose: this app doesn't have real usage data to
// back a claim like "10,000+ organizations" and this codebase already has a
// documented problem elsewhere (Landing.tsx) with fabricated stats standing
// in for real ones — not repeating that here.
const VALUE_PROPS = [
  {
    icon: FiUsers,
    title: "Reach the right people",
    description:
      "Get discovered by donors and volunteers actively searching for causes like yours.",
  },
  {
    icon: FiCalendar,
    title: "Host events effortlessly",
    description:
      "Create and manage events with built-in RSVPs, all in one place.",
  },
  {
    icon: FiAward,
    title: "Build trust with a public profile",
    description: "Share your story, your impact, and your mission.",
  },
];

type AuthLayoutProps = {
  children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div
      className="auth-page flex min-h-screen w-full"
      style={
        {
          // Was a deliberate one-off shift away from the old orange
          // --color-brand, kept local to this page. Now that the site
          // rebranded to this same muted-clay family (styles/index.css),
          // this just points at the real tokens instead of carrying its
          // own duplicate hex — still a local var because Auth.tsx reads
          // it as `--auth-accent` throughout, not because the color
          // itself needs to differ from the rest of the app anymore.
          "--auth-accent": "var(--color-brand)",
          "--auth-accent-hover": "var(--color-brand-hover)",
        } as CSSProperties
      }
    >
      {/* Left panel — value proposition, not decoration. Hidden below
          900px, where the form takes the full width instead. */}
      <div className="relative hidden w-[46%] shrink-0 flex-col justify-center overflow-hidden bg-[#0e0906] px-14 py-12 min-[900px]:flex">
        <img
          src={signupPanelArt}
          alt=""
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover blur-2xl"
        />
        {/* Scrim so the value-prop text stays legible regardless of where
            the image's lighter highlights land underneath it. Lighter
            than before — the blur above already does most of the work
            of keeping the image from competing with the text. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.35)_28%,rgba(0,0,0,0.4)_75%,transparent_100%)]"
        />

        <Link
          to="/"
          className="absolute top-10 left-14 flex items-center gap-2 font-outfit text-sm font-medium text-white/90 no-underline"
        >
          <span className="inline-block size-1.5 rounded-full bg-[var(--auth-accent)]" />
          NgoWorld
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
            Bring your cause to people who care.
          </h2>
          <p className="mt-3 font-outfit text-body text-white/70">
            Join NgoWorld to connect with donors, volunteers, and a community
            ready to help.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon className="text-lg" />
                </span>
                <div>
                  <p className="font-outfit text-body-lg font-semibold text-white">
                    {title}
                  </p>
                  <p className="mt-0.5 font-outfit text-body text-white/65">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — the form. A soft cream, not pure white — pure
          white next to small-ish body text was reading as low-contrast
          glare rather than "clean". */}
      <div className="flex w-full flex-col items-center justify-center bg-[#faf8f5] px-6 py-12 sm:px-10">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2 self-start font-outfit text-sm font-medium text-ink no-underline min-[900px]:hidden"
        >
          <span className="inline-block size-1.5 rounded-full bg-[var(--auth-accent)]" />
          NgoWorld
        </Link>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
