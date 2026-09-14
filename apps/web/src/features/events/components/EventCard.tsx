import { FiCalendar, FiClock, FiMapPin, FiShield, FiUserCheck, FiVideo } from "react-icons/fi";
import { Link } from "react-router-dom";
import { ORGANIZATION_ACCENTS } from "@features/organizations/constants/organizationDisplay";
import { formatEventBadge, formatEventTime } from "../utils/formatEventFacts";
import type { EventCardProps } from "../types";

/**
 * One event in the `/events` directory.
 *
 * The same card as `organizations/OrganizationCard.tsx` and
 * `landing-home/DrivesRail.tsx` - cover photo, a label riding on it, a
 * one-line title, a two-line summary on a fixed box - plus the thing an
 * event card needs and those don't: the date.
 *
 * September 2026 — wired to real `GET /events` records
 * (`utils/toDisplayEvent.ts`), which is why `cause`, `going`/`spotsLeft`
 * and `cover`/`organizerUserName` are all handled as optional here: a live
 * event has no cause taxonomy and no capacity tracking at all
 * (`event.model.ts`), and no cover photo or organizer-profile link
 * guarantee either. Nothing is invented to fill those gaps — same rule
 * `toDisplayOrganization.ts` follows — the card just quietly omits what
 * isn't there, the way `OrganizationCard` already falls back to an accent
 * band + monogram for a missing cover rather than a broken `<img>`.
 *
 * The whole card is a link to `/events/:id`, via a stretched overlay on
 * the title link (`after:absolute after:inset-0`) rather than an `<a>`
 * wrapped around everything - that keeps one accessible name for the
 * destination and leaves the organizer link, which points somewhere else
 * entirely, clickable on top of it (`relative z-1`).
 *
 * The date is shown twice-over in two halves on purpose: the cover badge
 * carries the day ("12 SEP"), the meta row carries only weekday and time
 * ("Sat · 9:00 pm"). Both used to print the full date, so every card said
 * "12" twice.
 *
 * The meta row's own icon is a clock, not a second calendar — it used to
 * reuse the same `FiCalendar` glyph as the cover badge above it, which read
 * as the same fact printed twice rather than two distinct ones (the date,
 * then the time). That repetition, plus a 6px gap between the two meta
 * lines, is also what made the block read as cramped/"weird" rather than
 * as two clearly separate facts — both loosened below.
 */
const EventCard = ({ event }: EventCardProps) => {
  const online = event.mode === "Online";
  const full = event.spotsLeft === 0;
  const hasCapacity = event.going !== undefined && event.spotsLeft !== undefined;
  const accent = ORGANIZATION_ACCENTS[(event.accent ?? 0) % ORGANIZATION_ACCENTS.length];

  return (
    <article
      data-reveal
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand-secondary/8 bg-white shadow-[0_2px_18px_-14px_var(--color-brand-secondary)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:border-brand/35 hover:shadow-[0_18px_38px_-16px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-16/9 shrink-0 overflow-hidden bg-brand-secondary/10">
        {event.cover ? (
          <img
            src={event.cover}
            alt={event.coverAlt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
          />
        ) : (
          // No cover uploaded for this event — an accent gradient with a
          // calendar mark, matching OrganizationCard's own no-cover
          // fallback rather than a broken image or a shared stock photo.
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
            }}
          >
            <FiCalendar className="size-10 text-white/90" />
          </div>
        )}
        {/* Date badge, the one thing a visitor scans an event grid for.
            Top-left on the photo so it costs no vertical space. */}
        <span className="absolute top-3 left-3 rounded-full bg-white/92 px-3 py-1 font-outfit text-caption font-semibold tracking-widest text-brand-secondary uppercase backdrop-blur-sm">
          {formatEventBadge(event.startsAt)}
        </span>
        {/* Trust/access badges, top-right — same slot `OrganizationCard`'s
            "Featured" pill uses. Government-backed is a brand-tinted pill
            (a trust signal, like a verified tick); invite-only is a
            neutral one (a restriction, not a virtue) — stacked when an
            event carries both. */}
        {(event.isGovernmentSponsored || event.inviteOnly) && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {event.isGovernmentSponsored && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-outfit text-[0.65rem] font-semibold tracking-[0.08em] text-brand uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)]">
                <FiShield aria-hidden="true" className="size-3" />
                Govt
              </span>
            )}
            {event.inviteOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-outfit text-[0.65rem] font-semibold tracking-[0.08em] text-ink/65 uppercase shadow-[0_2px_10px_-4px_rgba(0,0,0,0.35)]">
                <FiUserCheck aria-hidden="true" className="size-3" />
                Invite only
              </span>
            )}
          </div>
        )}
        {event.cause && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
            />
            <span className="absolute bottom-2.5 left-4 font-outfit text-caption font-medium tracking-widest text-white uppercase drop-shadow-sm">
              {event.cause}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h2 className="m-0 font-outfit text-body-lg leading-tight font-semibold tracking-tight text-brand-secondary sm:text-lg">
          <Link
            to={`/events/${event.id}`}
            className="block truncate text-inherit no-underline transition-colors duration-200 group-hover:text-brand after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </h2>
        {event.organizerUserName ? (
          <Link
            to={`/organization/${event.organizerUserName}`}
            className="relative z-1 mt-1 block w-fit max-w-full truncate font-poppins text-caption tracking-wide text-ink/55 uppercase no-underline transition-colors duration-200 hover:text-brand"
          >
            {event.organizer}
          </Link>
        ) : (
          <span className="mt-1 block w-fit max-w-full truncate font-poppins text-caption tracking-wide text-ink/55 uppercase">
            {event.organizer}
          </span>
        )}

        <p className="mt-2 line-clamp-2 min-h-11 font-poppins text-body leading-[1.375rem] text-ink/70">
          {event.summary}
        </p>

        {/* `mb-4` rather than leaning on `mt-auto` below: on a card whose
            copy fills the box, `mt-auto` resolves to zero and the rule ends
            up sitting directly on the location line. Dropped when there's
            no stat row beneath it (a live event has no capacity) so the
            card doesn't end in a stray gap. */}
        <div
          className={`mt-3 flex flex-col gap-2 font-poppins text-caption tracking-wide text-ink/55 ${hasCapacity ? "mb-4" : "mt-auto mb-0.5"}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <FiClock aria-hidden="true" className="size-3.5 shrink-0" />
            {formatEventTime(event.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate">
            {online ? (
              <>
                <FiVideo aria-hidden="true" className="size-3.5 shrink-0" />
                Online{event.platform ? ` · ${event.platform}` : ""}
              </>
            ) : (
              <>
                <FiMapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {[event.city, event.country].filter(Boolean).join(", ") || "Location TBA"}
              </>
            )}
          </span>
        </div>

        {/* Bottom rule, matching the organization card's stat row — only
            when there's real capacity data to show (see the file-level
            comment: a live event has none yet). "Full" rather than "0
            spots left" - a zero reads as a data bug. */}
        {hasCapacity && (
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
        )}
      </div>
    </article>
  );
};

export default EventCard;
