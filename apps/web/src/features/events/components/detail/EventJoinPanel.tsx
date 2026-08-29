import { FiCheck, FiMail, FiShare2, FiUserPlus } from "react-icons/fi";
import { formatEventDate } from "../../constants/eventDirectory";
import { formatMoney } from "../../utils/formatEventFacts";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { EventJoinPanelProps } from "../../types";

/**
 * The decision panel: cost, remaining spots, and the join control.
 *
 * **Joining is local-only, and deliberately so.** There is no attend/RSVP
 * endpoint in `KarmaCircleApi.ts` or `ApiEndpoints.ts` today (see
 * `docs/specs/api-integration.md`), so the button acknowledges the press
 * and says out loud that the organizer has not been told yet. A control
 * that looks live and silently does nothing is the worse failure - it is
 * what `Profile.tsx`'s Subscribe/Sponsor pair does, and what this page is
 * written not to copy.
 *
 * The counts move with the toggle (`going + 1`, one spot fewer) because a
 * join that changes nothing on screen reads as a failed click.
 */
const EventJoinPanel = ({
  event,
  detail,
  joined,
  onToggleJoin,
}: EventJoinPanelProps) => {
  const going = event.going + (joined ? 1 : 0);
  const spotsLeft = Math.max(0, event.spotsLeft - (joined ? 1 : 0));
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
      <p className="m-0 font-outfit text-2xl font-semibold tracking-tight text-brand-secondary">
        {detail.cost
          ? formatMoney(detail.cost.amount, detail.cost.currency)
          : "Free to attend"}
      </p>
      <p className="mt-1.5 font-poppins text-body leading-6 text-ink/60">
        {detail.cost?.note ?? "Nonprofit event. Nothing to pay, ever."}
      </p>

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

      <button
        type="button"
        onClick={onToggleJoin}
        disabled={full}
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
            {full ? "Event is full" : "Join this event"}
          </>
        )}
      </button>

      {joined && (
        <p className="m-0 mt-3 font-poppins text-caption leading-5 text-ink/55">
          Saved on this device only - the organizer has not been told yet. Tap
          again to change your mind.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={share}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-brand-secondary/15 bg-transparent px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary transition-colors duration-200 hover:border-brand/45 hover:text-brand"
        >
          <FiShare2 aria-hidden="true" className="size-4" /> Share
        </button>
        <a
          href={`mailto:${detail.contactEmail}?subject=${encodeURIComponent(event.title)}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-secondary/15 px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand"
        >
          <FiMail aria-hidden="true" className="size-4" /> Ask
        </a>
      </div>

      <p className="m-0 mt-5 border-t border-border-subtle pt-4 font-poppins text-caption leading-5 text-ink/50">
        Starts {formatEventDate(event.startsAt)}
      </p>
    </div>
  );
};

export default EventJoinPanel;
