import {
  FiCheck,
  FiCheckCircle,
  FiMail,
  FiShare2,
  FiUserCheck,
  FiUserPlus,
  FiXCircle,
} from "react-icons/fi";
import {
  formatEventDate,
  isEventPast,
} from "@features/events/utils/formatEventFacts";
import { formatMoney } from "@utils/formatMoney";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { EventJoinPanelFullProps } from "@features/events/types";

/**
 * The decision panel: cost, remaining spots, and the join control.
 *
 * **Joining is local-only, and deliberately so.** There is no attend/RSVP
 * endpoint in `KarmaCircleApi.ts` or `ApiEndpoints.ts` today (see
 * `docs/specs/api-integration.md`) — a deliberate non-goal, not an
 * oversight (see "Events — RSVP and attendee capacity" in
 * `docs/specs/known-issues.md`) — so the button
 * acknowledges the press and says out loud that the organizer has not been
 * told yet. A control that looks live and silently does nothing is the
 * worse failure - it is what an older profile-page Subscribe/Sponsor pair did,
 * and what this page is written not to copy.
 *
 * **Capacity (PG-5).** The Going/Spots-left row only renders for an event the
 * organizer gave a capacity; the numbers come from the API and are refreshed
 * after every join and leave, so they never need to be nudged locally. A full
 * event shows "Event is full" instead of Join, but still shows "You are going"
 * to the people who already hold a spot.
 *
 * **Leaving (PG-3).** An attendee who is going gets a "Leave event" link under
 * the status line, which asks `DetailedEvent.tsx` to open the confirmation. It
 * is gone once the event has started, because the API refuses it from then on.
 *
 * **Invite-only events get no Join control at all.** Toggling "going" on
 * an event you weren't actually invited to would be a control that looks
 * live and does nothing useful - the same failure the rest of this panel
 * is written to avoid - so the panel shows an honest "ask the organizer"
 * state instead.
 *
 * **A completed event (September 2026, `isEventPast`) gets no Join control
 * either - cost, capacity and "Join this event" all stop meaning anything
 * once the thing has already happened.** The panel swaps to a short
 * wrap-up instead: a "Completed" pill, a line saying any recap/what's-next
 * lives on the organizer's own page, and a pointer down to
 * `EventOrganizerPanel` (the actual "go there" action, so this panel isn't
 * a second, near-duplicate link to the same place). Share and Ask both
 * stay - sharing a recap, or asking the organizer a question, are both
 * still real things to do after the fact.
 *
 * **A cancelled event (PG-2) gets no Join control either, and the panel says
 * so before anything else** - ahead of "Completed", because a cancelled
 * event that has since passed never took place. Registrations already saved
 * are kept by the API, so an attendee who joined sees a line saying the
 * organizer cancelled it and to check with them. Telling attendees by email
 * is not built yet (PG-18). Share and Ask stay.
 */
const EventJoinPanel = ({
  event,
  detail,
  joined,
  joining,
  checkingRegistration,
  registrationCheckFailed,
  onToggleJoin,
  onRequestLeave,
}: EventJoinPanelFullProps) => {
  const cancelled = event.cancelled;
  const past = !cancelled && isEventPast(event.startsAt);
  const hasCapacity =
    event.going !== undefined && event.spotsLeft !== undefined;
  // The counts come from the API and are refreshed after a join or a leave
  // (`DetailedEvent.tsx`), so they already include this attendee.
  const going = hasCapacity ? event.going : undefined;
  const spotsLeft = hasCapacity ? event.spotsLeft : undefined;
  const full = spotsLeft === 0 && !joined;

  const share = async () => {
    const url = window.location.href;

    try {
      // The share sheet where there is one (every phone), the clipboard
      // everywhere else. `navigator.share` rejects on dismissal, which is
      // not an error worth a toast.
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      showSuccessToast("Link copied");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      showErrorToast("Could not share this link");
    }
  };

  return (
    <div
      data-reveal
      className="rounded-2xl border border-brand-secondary/8 bg-white p-6 shadow-[0_2px_20px_-16px_var(--color-brand-secondary)] sm:p-7"
    >
      {cancelled ? (
        <>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-error/8 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-error uppercase">
            <FiXCircle aria-hidden="true" className="size-3.5" />
            Cancelled
          </div>
          <p className="mt-4 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
            This event was cancelled
          </p>
          <p className="mt-2 font-poppins text-body leading-6 text-ink/65">
            {joined
              ? "You had joined this event. The organizer cancelled it, so please check with them for what happens next."
              : "The organizer cancelled this event, so nobody can join it any more. Their own page has what's next."}
          </p>
        </>
      ) : past ? (
        <>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 font-outfit text-caption font-medium tracking-wide text-ink/60 uppercase">
            <FiCheckCircle aria-hidden="true" className="size-3.5" />
            Completed
          </div>
          <p className="mt-4 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
            This event has already taken place
          </p>
          <p className="mt-2 font-poppins text-body leading-6 text-ink/65">
            Any recap, photos or what&apos;s next get posted on the
            organizer&apos;s own page - see &ldquo;Hosted by&rdquo; below.
          </p>
        </>
      ) : (
        <>
          <p className="m-0 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">
            {detail.cost
              ? formatMoney(detail.cost.amount, detail.cost.currency)
              : "Free to attend"}
          </p>
          <p className="mt-1.5 font-poppins text-body leading-6 text-ink/60">
            {detail.cost?.note ?? "Nonprofit event. Nothing to pay, ever."}
          </p>

          {hasCapacity && (
            <dl className="mt-5 flex items-baseline justify-between gap-4 border-t border-border-subtle pt-5">
              <div>
                <dt className="font-poppins text-caption tracking-wide text-ink/50 uppercase">
                  Going
                </dt>
                <dd className="m-0 mt-1 font-outfit text-body-lg font-semibold text-brand-secondary">
                  {going}
                </dd>
              </div>
              <div className="text-right">
                <dt className="font-poppins text-caption tracking-wide text-ink/50 uppercase">
                  Spots left
                </dt>
                <dd
                  className={`m-0 mt-1 font-outfit text-body-lg font-semibold ${
                    spotsLeft === 0 ? "text-ink/50" : "text-brand"
                  }`}
                >
                  {spotsLeft === 0 ? "None" : spotsLeft}
                </dd>
              </div>
            </dl>
          )}

          {event.inviteOnly ? (
            <div className="mt-6 flex gap-3 rounded-xl bg-surface-warm p-4 font-poppins text-body leading-6 text-ink/70">
              <FiUserCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-brand"
              />
              This event is invite-only. Ask the organizer if you&apos;d like to
              come.
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleJoin}
              disabled={full || joining || checkingRegistration}
              aria-pressed={joined}
              className={`mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-poppins text-body font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55 motion-safe:active:scale-97 ${
                joined
                  ? "border border-brand/35 bg-brand/8 text-brand"
                  : "border-none bg-brand text-white shadow-[0_10px_26px_-14px_var(--color-brand)] hover:bg-brand-hover"
              }`}
            >
              {joined ? (
                <>
                  <FiCheck aria-hidden="true" /> You are going
                </>
              ) : (
                <>
                  <FiUserPlus aria-hidden="true" />{" "}
                  {registrationCheckFailed
                    ? "Retry status check"
                    : checkingRegistration
                      ? "Checking…"
                      : joining
                        ? "Joining…"
                        : full
                          ? "Event is full"
                          : "Join this event"}
                </>
              )}
            </button>
          )}

          {registrationCheckFailed && !joined && !event.inviteOnly && (
            <p className="m-0 mt-3 font-poppins text-caption leading-5 text-ink/55">
              Could not verify your registration. Try again before joining.
            </p>
          )}

          {joined && !event.inviteOnly && (
            <p className="m-0 mt-3 font-poppins text-caption leading-5 text-ink/55">
              You&apos;re registered for this event. Your registration is saved
              to your account.
            </p>
          )}
        </>
      )}

      {joined && !past && (
        <button
          type="button"
          onClick={onRequestLeave}
          className="mt-4 cursor-pointer border-none bg-transparent p-0 font-poppins text-body font-medium text-ink/60 underline underline-offset-4 transition-colors hover:text-error"
        >
          {cancelled ? "Remove my registration" : "Leave event"}
        </button>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={share}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-secondary/15 bg-transparent px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary transition-colors duration-200 hover:border-brand/45 hover:text-brand"
        >
          <FiShare2 aria-hidden="true" className="size-4" /> Share
        </button>
        {detail.contactEmail && (
          <a
            href={`mailto:${detail.contactEmail}?subject=${encodeURIComponent(event.title)}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-secondary/15 px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand"
          >
            <FiMail aria-hidden="true" className="size-4" /> Ask
          </a>
        )}
      </div>

      <p className="m-0 mt-5 border-t border-border-subtle pt-4 font-poppins text-caption leading-5 text-ink/50">
        {cancelled ? "Was due" : past ? "Took place" : "Starts"}{" "}
        {formatEventDate(event.startsAt)}
      </p>
    </div>
  );
};

export default EventJoinPanel;
