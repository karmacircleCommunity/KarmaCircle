import { FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatEventBadge, formatEventDate } from "../constants/eventDirectory";
import type { EventCardProps } from "../types";

/**
 * One event in the `/events` directory.
 *
 * The same card as `organizations/OrganizationCard.tsx` and
 * `landing-home/DrivesRail.tsx` - cover photo, a label riding on it, a
 * one-line title, a two-line summary on a fixed box - plus the two things
 * an event card needs and those don't: the date, and how full it is.
 *
 * It replaced a component that **declared no props at all**: every field
 * ("Food Marathon, 2025", "GodLike Club", "+300 Participated") was
 * hardcoded, so all twenty cards in the grid were byte-for-byte identical
 * while `Events.tsx` passed each one an `event` prop it ignored. See
 * `docs/specs/events.md`.
 *
 * The card is not a link: there is no event detail route yet
 * (`DetailedEvent.tsx` is a one-line stub, unregistered). The organizer
 * name *is* a link, to a profile that does exist - which is also why it
 * sits outside the card's own hover treatment.
 */
const EventCard = ({ event }: EventCardProps) => {
  const online = event.mode === "Online";
  const full = event.spotsLeft === 0;

  return (
    <article
      data-reveal
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-secondary/8 bg-white shadow-[0_2px_18px_-14px_var(--color-brand-secondary)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/35 hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-16/9 shrink-0 overflow-hidden bg-brand-secondary/10">
        <img
          src={event.cover}
          alt={event.coverAlt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
        />
        {/* Date badge, the one thing a visitor scans an event grid for.
            Top-left on the photo so it costs no vertical space. */}
        <span className="absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-outfit text-caption font-semibold tracking-widest text-brand-secondary uppercase backdrop-blur-sm">
          {formatEventBadge(event.startsAt)}
        </span>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
        />
        <span className="absolute bottom-2.5 left-4 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm">
          {event.cause}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="truncate font-outfit text-body-lg leading-tight font-semibold tracking-tight text-brand-secondary sm:text-lg">
          {event.title}
        </h2>
        <Link
          to={`/organization/${event.organizerUserName}`}
          className="mt-1 block truncate font-poppins text-caption tracking-wide text-ink/55 uppercase no-underline transition-colors duration-200 hover:text-brand"
        >
          {event.organizer}
        </Link>

        <p className="mt-2 line-clamp-2 min-h-11 font-poppins text-body leading-[1.375rem] text-ink/70">
          {event.summary}
        </p>

        <div className="mt-2.5 flex flex-col gap-1.5 font-poppins text-caption tracking-wide text-ink/55">
          <span className="inline-flex items-center gap-1.5">
            <FiCalendar aria-hidden="true" className="size-3.5 shrink-0" />
            {formatEventDate(event.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            {online ? (
              <>
                <FiVideo aria-hidden="true" className="size-3.5 shrink-0" />
                Online · {event.platform}
              </>
            ) : (
              <>
                <FiMapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {event.city}, {event.country}
              </>
            )}
          </span>
        </div>

        {/* Bottom rule, matching the organization card's stat row. "Full"
            rather than "0 spots left" - a zero reads as a data bug. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3.5 font-outfit">
          <p className="m-0 text-body font-semibold text-brand-secondary">
            {event.going} going
          </p>
          <p
            className={`m-0 rounded-full px-2.5 py-1 font-poppins text-caption tracking-wide ${
              full
                ? "bg-brand-secondary/8 text-ink/50"
                : "bg-brand/10 text-brand"
            }`}
          >
            {full ? "Full" : `${event.spotsLeft} spots left`}
          </p>
        </div>
      </div>
    </article>
  );
};

export default EventCard;
