import type { ReactNode } from "react";

interface EventSectionProps {
  title: string;
  /** Anchors the section for the sidebar's jump links. */
  id: string;
  children: ReactNode;
}

/**
 * Section shell for the event detail page's main column - one heading,
 * consistent rhythm between sections, a scroll offset that clears the fixed
 * navbar.
 *
 * Deliberately the same shell as the one inside `OrganizationProfile.tsx`.
 * That one is private to its page; this one is a file because three
 * different components on this page render into it. If a third page ever
 * needs it, the two should collapse into one shared component rather than
 * a third copy.
 */
const EventSection = ({ title, id, children }: EventSectionProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-heading`}
    className="mt-12 scroll-mt-24 first:mt-0"
  >
    <h2
      id={`${id}-heading`}
      data-reveal
      className="mb-5 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary sm:text-[1.75rem]"
    >
      {title}
    </h2>
    {children}
  </section>
);

export default EventSection;
