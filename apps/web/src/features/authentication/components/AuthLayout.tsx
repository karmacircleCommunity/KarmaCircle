import SplitPanelLayout from "@components/layouts/SplitPanelLayout";
import { UserType } from "@/types/user";
import type { CSSProperties, ReactNode } from "react";
import { FiAward, FiCalendar, FiUsers } from "react-icons/fi";

// Shell for the unified auth flow (pages/Auth.tsx). The page frame itself
// — dark left panel, cream right panel, wordmark placement, the 900px
// breakpoint where the left panel drops — is `SplitPanelLayout`
// (@components/layouts), shared with organization setup so the two flows
// can't drift apart. What stays here is the only part that is auth's own:
// the value props in that panel, and the accent variables Auth.tsx reads.
// Don't fork the shell into per-step copies — extend here instead.

type AuthLayoutProps = {
  children: ReactNode;
  accountType?: UserType;
};

const AuthLayout = ({ children, accountType }: AuthLayoutProps) => {
  const isIndividual = accountType === UserType.Individual;
  const asideContent = accountType
    ? {
        eyebrow: isIndividual ? "Your personal account" : "Your organization",
        title: isIndividual
          ? "Make your support count."
          : "Bring your cause to people who care.",
        description: isIndividual
          ? "Find causes you care about, take part in events, and share the difference you make."
          : "Build your public presence, connect with supporters, and bring people together around your mission.",
        valueProps: isIndividual
          ? [
              {
                icon: FiUsers,
                title: "Find your community",
                description: "Connect with causes and people who share your values.",
              },
              {
                icon: FiCalendar,
                title: "Take part in events",
                description: "Discover ways to show up, volunteer, and contribute.",
              },
              {
                icon: FiAward,
                title: "Share your story",
                description: "Build a personal profile around the causes you support.",
              },
            ]
          : [
              {
                icon: FiUsers,
                title: "Reach the right people",
                description: "Help donors and volunteers discover your cause.",
              },
              {
                icon: FiCalendar,
                title: "Host events",
                description: "Bring your community together around your mission.",
              },
              {
                icon: FiAward,
                title: "Build trust with a profile",
                description: "Share your story, your impact, and your mission.",
              },
            ],
      }
    : {
        eyebrow: undefined,
        title: "Bring your cause to people who care.",
        description:
          "Join KarmaCircle to connect with donors, volunteers, and a community ready to help.",
        valueProps: [
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
        ],
      };

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
        <div
          key={accountType ?? "general"}
          aria-live="polite"
        >
          {asideContent.eyebrow && (
            <p className="mb-3 font-outfit text-xs font-semibold tracking-[0.12em] text-white/65 uppercase">
              {asideContent.eyebrow}
            </p>
          )}
          <h2 className="font-poppins text-3xl leading-tight font-bold text-white">
            {asideContent.title}
          </h2>
          <p className="mt-3 font-outfit text-body text-white/70">
            {asideContent.description}
          </p>

          <ul className="mt-10 flex list-none flex-col gap-6 p-0">
            {asideContent.valueProps.map(({ icon: Icon, title, description }) => (
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
      }
    >
      {children}
    </SplitPanelLayout>
  );
};

export default AuthLayout;
