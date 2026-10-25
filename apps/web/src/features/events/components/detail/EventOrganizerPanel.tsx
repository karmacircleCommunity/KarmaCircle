import { FiArrowRight, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import type { EventOrganizerPanelProps } from "../../types";

/**
 * The "Hosted by" sidebar card (September 2026) - a dedicated section
 * pointing at the organization running this event, not just the small
 * "Hosted by [name]" line under the title in `EventHero`. That line is
 * still there (context right where the title is), but it's easy to skim
 * past; this card is the deliberate, harder-to-miss "go check them out"
 * action `EventJoinPanel`'s completed-event wrap-up copy also points down
 * to (see that component).
 *
 * `event.model.ts`'s `createEvent()` now rejects a non-organization host
 * outright (`event.service.ts`), so `organizerUserName` is guaranteed set
 * for every newly created event - the plain-text fallback below only
 * matters for a pre-existing/malformed record from before that rule.
 */
const EventOrganizerPanel = ({ event }: EventOrganizerPanelProps) => (
  <div
    data-reveal
    className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
  >
    <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
      <FiUsers aria-hidden="true" className="size-3.5 text-brand" />
      Hosted by
    </p>

    <p className="mt-2 font-outfit text-lg font-semibold tracking-tight text-brand-secondary">
      {event.organizer}
    </p>

    {event.organizerUserName ? (
      <Link
        to={`/organization/${event.organizerUserName}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand/35 bg-transparent px-5 py-2.5 font-poppins text-body font-medium text-brand no-underline transition-colors duration-200 hover:bg-brand/8 motion-safe:active:scale-97"
      >
        Visit organization
        <FiArrowRight aria-hidden="true" className="size-4" />
      </Link>
    ) : (
      <p className="mt-2 font-poppins text-caption leading-5 text-ink/50">
        This event doesn&apos;t have an organization page on KarmaCircle yet.
      </p>
    )}
  </div>
);

export default EventOrganizerPanel;
