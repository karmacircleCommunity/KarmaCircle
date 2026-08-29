import SplitPanelLayout from "@components/layouts/SplitPanelLayout";
import type { CSSProperties, ReactNode } from "react";
import { FiAward, FiCalendar, FiUsers } from "react-icons/fi";

// Shell for the unified auth flow (pages/Auth.tsx). The page frame itself
// — dark left panel, cream right panel, wordmark placement, the 900px
// breakpoint where the left panel drops — is `SplitPanelLayout`
// (@components/layouts), shared with organization setup so the two flows
// can't drift apart. What stays here is the only part that is auth's own:
// the value props in that panel, and the accent variables Auth.tsx reads.
// Don't fork the shell into per-step copies — extend here instead.

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
    <SplitPanelLayout
      className="auth-page"
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
      aside={
        <>
          <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
            Bring your cause to people who care.
          </h2>
          <p className="mt-3 font-outfit text-body text-white/70">
            Join KarmaCircle to connect with donors, volunteers, and a community
            ready to help.
          </p>

          <ul className="mt-10 flex list-none flex-col gap-6 p-0">
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
        </>
      }
    >
      {children}
    </SplitPanelLayout>
  );
};

export default AuthLayout;
