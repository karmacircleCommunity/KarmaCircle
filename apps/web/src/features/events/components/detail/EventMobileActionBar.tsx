import { FiArrowRight, FiCheck, FiMail, FiUserPlus } from "react-icons/fi";
import { Link } from "react-router-dom";
import { formatMoney, isEventPast } from "../../utils/formatEventFacts";
import type { EventJoinPanelProps } from "../../types";

/**
 * The persistent join CTA below `lg`, fixed to the bottom of the viewport
 * for as long as `EventJoinPanel` itself is scrolled out of view.
 *
 * `EventJoinPanel` renders first on a phone (see the `order-1` comment in
 * `DetailedEvent.tsx`), but "first" still scrolls away the moment someone
 * reads "About this event" or further - on a long event page that's most of
 * the scroll. Mobile ticketing/registration surfaces (Meetup, Finimize,
 * Shopee - see the reference screens pulled via the mobbin MCP for this
 * change) all solve this the same way: a slim bar pinned to the bottom of
 * the screen with the price and the one primary action, independent of
 * scroll position. This is that bar for the equivalent KarmaCircle surface -
 * it duplicates only the primary action, not the whole panel (going/spots,
 * Share, Ask, "Starts …" stay in `EventJoinPanel`; a second Share/Ask pair
 * down here would just be visual noise).
 *
 * `hidden` is driven by two `IntersectionObserver`s in `DetailedEvent.tsx`:
 * one watching `EventJoinPanel` itself, so this bar only appears once the
 * real Join button has actually scrolled out of view rather than sitting
 * directly underneath it (the first version of this bar showed both at
 * once, right after the hero - an exact duplicate control, not just visual
 * noise); another watching a sentinel just above `<Footer />`, so the bar
 * also steps aside once the footer is reachable rather than sitting on top
 * of its newsletter form and links for the rest of the scroll.
 * `pointer-events-none` while hidden so the bar's buttons can't be
 * tabbed/clicked while it's translated off-screen.
 *
 * **Not `translate-y-full`.** This bar floats with a real `bottom` gap
 * (see below), not flush at `bottom-0` - so translating down by exactly its
 * own height (what `translate-y-full` does) leaves that gap's worth of the
 * bar still inside the viewport. Verified live: at a 16px `bottom` gap, a
 * 16px sliver of the "Join event" button stayed visible over the footer
 * (reported as the glass bar "glitching" when the footer appears - an
 * orange corner poking up over the footer's dark newsletter band). The
 * translate distance has to clear the gap too, so it's the bar's own height
 * plus a flat `4rem` - comfortably past the largest real `bottom` gap this
 * bar ever sits at (`0.75rem` + a notched iPhone's `safe-area-inset-bottom`,
 * ~46px worst case), not tuned to that exact number.
 *
 * **Material.** A floating "liquid glass" capsule rather than an opaque bar
 * flush with the screen edges - `inset-x-9` lines its sides up with
 * `EventHero`/`EventJoinPanel`'s own edges above it (same page, same
 * margin, reads as a continuation of those cards rather than a new,
 * disagreeing one), and it sits a full `rounded-3xl` away from the bottom
 * edge too, matching `EventHero`'s own corner radius on this page. The
 * glass itself is a heavy `backdrop-blur` plus `backdrop-saturate` (blur
 * alone flattens and grays out whatever scrolls underneath; saturating it
 * back up is what keeps that see-through content looking like glass over
 * it rather than frosted paper) over a translucent tint, an `inset`
 * box-shadow for a bright top edge (light catching the rim), and a soft
 * `color-mix(in srgb, var(--color-brand-secondary) 50%, transparent)`
 * ambient shadow underneath for lift - the same warm-shadow vocabulary
 * `OrganizationCard`/`EventCard`'s hover state already uses, not a raw hex.
 * The button and pills inside stay fully opaque - the glass effect is the
 * surface they float on, not something they need to share.
 *
 * **Completed event (September 2026, `isEventPast`).** Cost/spots-left and
 * the Join button stop meaning anything once the event's `startsAt` has
 * passed, so both sides of the bar swap: "Completed" plus a pointer to the
 * organizer's page on the left, and a "Visit" link straight to
 * `/organization/:handle` on the right (an "Ended" pill instead, for a
 * pre-existing record with no organizer link at all). This takes priority
 * over the invite-only branch below it - a past invite-only event is still
 * past, not still asking to be invited to.
 */
const EventMobileActionBar = ({
  event,
  detail,
  joined,
  joining,
  checkingRegistration,
  registrationCheckFailed,
  onToggleJoin,
  hidden,
}: EventJoinPanelProps & { hidden: boolean }) => {
  const past = isEventPast(event.startsAt);
  const hasCapacity = event.going !== undefined && event.spotsLeft !== undefined;
  const spotsLeft = hasCapacity
    ? Math.max(0, event.spotsLeft! - (joined ? 1 : 0))
    : undefined;
  const full = spotsLeft === 0 && !joined;

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-9 z-10 flex items-center justify-between gap-4 rounded-3xl border border-white/50 bg-white/55 px-5 py-3.5 shadow-[0_20px_45px_-18px_color-mix(in_srgb,var(--color-brand-secondary)_50%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.65)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-out lg:hidden ${
        hidden ? "pointer-events-none translate-y-[calc(100%+4rem)]" : "translate-y-0"
      }`}
      style={{ bottom: "max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))" }}
    >
      <div className="min-w-0">
        <p className="m-0 truncate font-outfit text-body-lg font-semibold text-brand-secondary">
          {past
            ? "Completed"
            : detail.cost
              ? formatMoney(detail.cost.amount, detail.cost.currency)
              : "Free"}
        </p>
        {/* Zero spots is said once, by the button below ("Full") - not
            repeated here as "0 spots left", which the rest of this feature
            (EventCard, EventFacts) treats as a data-bug-looking string to
            avoid. */}
        {past ? (
          <p className="m-0 truncate font-poppins text-caption text-ink/55">
            Updates on the organizer&apos;s page
          </p>
        ) : (
          hasCapacity &&
          spotsLeft! > 0 && (
            <p className="m-0 truncate font-poppins text-caption text-ink/55">
              {spotsLeft} spots left
            </p>
          )
        )}
      </div>

      {past ? (
        event.organizerUserName ? (
          <Link
            to={`/organization/${event.organizerUserName}`}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-none bg-brand px-5 py-2.5 font-poppins text-body font-medium text-white no-underline shadow-[0_10px_26px_-14px_var(--color-brand)]"
          >
            Visit <FiArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-warm px-4 py-2.5 font-poppins text-body font-medium text-ink/60">
            Ended
          </span>
        )
      ) : event.inviteOnly ? (
        detail.contactEmail ? (
          <a
            href={`mailto:${detail.contactEmail}?subject=${encodeURIComponent(event.title)}`}
            tabIndex={hidden ? -1 : undefined}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-none bg-brand px-5 py-2.5 font-poppins text-body font-medium text-white no-underline shadow-[0_10px_26px_-14px_var(--color-brand)]"
          >
            <FiMail aria-hidden="true" className="size-4" /> Ask
          </a>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-warm px-4 py-2.5 font-poppins text-body font-medium text-ink/60">
            Invite only
          </span>
        )
      ) : (
        <button
          type="button"
          onClick={onToggleJoin}
          disabled={full || joining || checkingRegistration}
          aria-pressed={joined}
          tabIndex={hidden ? -1 : undefined}
          className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 font-poppins text-body font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 motion-safe:active:scale-97 ${
            joined
              ? "border border-brand/35 bg-brand/8 text-brand"
              : "border-none bg-brand text-white shadow-[0_10px_26px_-14px_var(--color-brand)]"
          }`}
        >
          {joined ? (
            <>
              <FiCheck aria-hidden="true" /> Going
            </>
          ) : (
            <>
              <FiUserPlus aria-hidden="true" />{" "}
              {registrationCheckFailed
                ? "Retry check"
                : checkingRegistration
                  ? "Checking…"
                  : joining
                    ? "Joining…"
                    : full
                      ? "Full"
                      : "Join event"}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default EventMobileActionBar;
