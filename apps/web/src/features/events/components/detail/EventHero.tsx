import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatEventDate } from "../../constants/eventDirectory";
import { formatDuration } from "../../utils/formatEventFacts";
import type { EventHeroProps } from "../../types";

/**
 * The top of the event detail page: the same cover photo as the card the
 * visitor clicked, then the title, the organizer, and the three facts they
 * came to check - when, how long, and where.
 *
 * The cover is a fixed-height crop rather than the card's 16:9 aspect box,
 * matching `OrganizationProfile.tsx`'s header: at page width a 16:9 photo
 * would push everything below the fold.
 */
const EventHero = ({ event, detail }: EventHeroProps) => {
  const online = event.mode === "Online";

  const facts = [
    { icon: FiCalendar, label: formatEventDate(event.startsAt) },
    {
      icon: FiClock,
      label: formatDuration(event.startsAt, detail.endsAt),
    },
    {
      icon: online ? FiVideo : FiMapPin,
      label: online
        ? `Online · ${event.platform}`
        : `${event.city}, ${event.country}`,
    },
  ];

  return (
    <header className="mx-auto max-w-6xl px-9 pt-8 sm:px-10 lg:px-12 lg:pt-12">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 font-poppins text-body text-ink/60 no-underline transition-colors duration-200 hover:text-brand"
      >
        <FiArrowLeft aria-hidden="true" className="size-4" />
        All events
      </Link>

      <div className="mt-5 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white shadow-[0_2px_20px_-16px_var(--color-brand-secondary)]">
        <div className="relative h-44 overflow-hidden bg-brand-secondary/10 sm:h-64 lg:h-80">
          <img
            src={event.cover}
            alt={event.coverAlt}
            className="size-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent"
          />
          <span className="absolute bottom-4 left-6 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm sm:left-8">
            {event.cause}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="m-0 font-outfit text-[1.75rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
            {event.title}
          </h1>

          <p className="mt-3 font-poppins text-body text-ink/60 sm:text-body-lg">
            Hosted by{" "}
            <Link
              to={`/organization/${event.organizerUserName}`}
              className="font-medium text-brand-secondary no-underline transition-colors duration-200 hover:text-brand"
            >
              {event.organizer}
            </Link>
          </p>

          <ul className="mt-6 flex list-none flex-col gap-3 p-0 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {facts.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2.5 font-poppins text-body text-ink/75"
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default EventHero;
