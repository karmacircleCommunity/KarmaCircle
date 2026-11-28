import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiMapPin,
  FiRadio,
  FiShield,
  FiUserCheck,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { ORGANIZATION_ACCENTS } from "@features/organizations/constants/organizationDisplay";
import { accessLabel } from "@features/events/constants/eventAccess";
import { eventTypeLabel } from "@features/events/constants/eventTypes";
import { viewerTimeNote } from "@features/events/utils/eventTimezone";
import { describeWhere } from "@features/events/utils/eventMode";
import {
  eventPhase,
  formatEventDate,
  formatDuration,
} from "@features/events/utils/formatEventFacts";
import type { EventHeroProps } from "@features/events/types";

/** Same derivation as `EventCard`/`toDisplayEvent.ts#accentFor` - a stable,
 *  un-stored gradient for an event with no cover photo, so the same event
 *  gets the same fallback on every reload. */
function accentFor(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash % ORGANIZATION_ACCENTS.length;
}

/**
 * The top of the event detail page: the same cover photo as the card the
 * visitor clicked, then the title, the organizer, badges for the two
 * trust/access flags, and the three facts they came to check - when, how
 * long, and where.
 *
 * The cover is a fixed-height crop rather than the card's 16:9 aspect box,
 * matching `OrganizationProfile.tsx`'s header: at page width a 16:9 photo
 * would push everything below the fold.
 *
 * **"Happening now" and "Completed" (`eventPhase`)** join the trust/access
 * badge row between the start and the end, and after the end - the same
 * definition `EventCard`'s own label and `EventJoinPanel`'s copy use, so this
 * page never disagrees with the card that opened it. A draft shows neither,
 * whatever its dates.
 *
 * **"Cancelled" (PG-2)** is a badge in the same row and replaces "Completed":
 * a cancelled event never took place, whatever its date.
 */
const EventHero = ({ event }: EventHeroProps) => {
  const online = event.mode === "Online";
  const cancelled = event.cancelled;
  const typeLabel = eventTypeLabel(event.eventType);
  const phase = eventPhase(event.startsAt, event.endsAt);
  // A draft has not happened and is not about to, so it has no time state.
  const past = !cancelled && !event.draft && phase === "ended";
  const live = !cancelled && !event.draft && phase === "ongoing";
  const accent = ORGANIZATION_ACCENTS[accentFor(event.id)];

  const facts = [
    {
      icon: FiCalendar,
      label: formatEventDate(event.startsAt, event.timezone),
      // The viewer's own clock, only when it differs from the event's (PG-11).
      note: viewerTimeNote(event.startsAt, event.timezone),
    },
    {
      icon: FiClock,
      label: formatDuration(event.startsAt, event.endsAt),
    },
    {
      icon: online ? FiVideo : FiMapPin,
      label: describeWhere(event),
    },
  ];

  return (
    <header className="mx-auto max-w-6xl px-9 pt-8 sm:px-10 lg:px-12 lg:pt-12">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 font-poppins text-body text-ink/65 no-underline transition-colors duration-200 hover:text-brand"
      >
        <FiArrowLeft aria-hidden="true" className="size-4" />
        All events
      </Link>

      <div className="mt-5 overflow-hidden rounded-3xl border border-brand-secondary/8 bg-white shadow-[0_2px_20px_-16px_var(--color-brand-secondary)]">
        <div className="relative h-44 overflow-hidden bg-brand-secondary/10 sm:h-64 lg:h-80">
          {event.cover ? (
            <img
              src={event.cover}
              alt={event.coverAlt}
              className="size-full object-cover"
            />
          ) : (
            // No cover uploaded for this event — same accent-gradient
            // fallback as EventCard, rather than a broken <img>.
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              }}
            >
              <FiCalendar className="size-14 text-white/90" />
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent"
          />
        </div>

        <div className="p-6 sm:p-8">
          {(typeLabel ||
            event.draft ||
            cancelled ||
            past ||
            live ||
            event.isGovernmentSponsored ||
            event.access !== "open") && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {typeLabel && (
                <span className="inline-flex items-center rounded-full border border-brand-secondary/15 bg-white px-3 py-1 font-outfit text-caption font-medium tracking-wide text-brand-secondary uppercase">
                  {typeLabel}
                </span>
              )}
              {event.draft && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-brand-hover uppercase">
                  <FiEdit3 aria-hidden="true" className="size-3.5" />
                  Draft
                </span>
              )}
              {cancelled && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/8 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-error uppercase">
                  <FiXCircle aria-hidden="true" className="size-3.5" />
                  Cancelled
                </span>
              )}
              {live && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-brand-hover uppercase">
                  <FiRadio aria-hidden="true" className="size-3.5" />
                  Happening now
                </span>
              )}
              {past && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-ink/5 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-ink/65 uppercase">
                  <FiCheckCircle aria-hidden="true" className="size-3.5" />
                  Completed
                </span>
              )}
              {event.isGovernmentSponsored && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-brand-hover uppercase">
                  <FiShield aria-hidden="true" className="size-3.5" />
                  Government-backed
                </span>
              )}
              {event.access !== "open" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-ink/5 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-ink/65 uppercase">
                  <FiUserCheck aria-hidden="true" className="size-3.5" />
                  {accessLabel(event.access)}
                </span>
              )}
            </div>
          )}

          <h1 className="m-0 font-outfit text-[1.75rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
            {event.title}
          </h1>

          <p className="mt-3 font-poppins text-body text-ink/65 sm:text-body-lg">
            Hosted by{" "}
            {event.organizerUserName ? (
              <Link
                to={`/organization/${event.organizerUserName}`}
                className="font-medium text-brand-secondary no-underline transition-colors duration-200 hover:text-brand"
              >
                {event.organizer}
              </Link>
            ) : (
              <span className="font-medium text-brand-secondary">
                {event.organizer}
              </span>
            )}
          </p>

          {event.tags.length > 0 && (
            <ul
              aria-label="Tags"
              className="mt-4 flex list-none flex-wrap gap-2 p-0"
            >
              {event.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-surface-warm px-3 py-1 font-poppins text-caption text-ink/65"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}

          <ul className="mt-6 flex list-none flex-col gap-3 p-0 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {facts.map(({ icon: Icon, label, note }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2.5 font-poppins text-body text-ink/75"
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand"
                />
                {label}
                {note && (
                  <span className="text-ink/65"> ({note} your time)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default EventHero;
