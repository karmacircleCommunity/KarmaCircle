import { FiHeart } from "react-icons/fi";
import Button from "@components/buttons/Button";
import { showSuccessToast } from "@utils/Toasts";
import { formatMoney, fundedPercent } from "../../utils/formatEventFacts";
import type { EventFundraiserPanelProps } from "../../types";

/**
 * What the event is raising alongside the volunteering, when it raises
 * anything at all - most don't, and the page simply omits this.
 *
 * Same raised-of-goal bar as `OrganizationProfile.tsx`'s drives and
 * `DrivesRail`'s cards, down to the percentage and the supporters line, so
 * one progress bar means one thing across the app.
 *
 * The contribute button is honest about being a stub: there is no payment
 * endpoint in `MilanApi.ts` today, so it acknowledges the press rather than
 * pretending to take money - the same call `OrganizationProfile.tsx` makes
 * for its Follow button.
 */
const EventFundraiserPanel = ({ fundraiser }: EventFundraiserPanelProps) => {
  const percent = fundedPercent(fundraiser.raised, fundraiser.goal);

  return (
    <div
      data-reveal
      className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
    >
      <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
        <FiHeart aria-hidden="true" className="size-3.5 text-brand" />
        Raising for this event
      </p>

      <p className="mt-3 font-poppins text-body leading-7 text-ink/75">
        {fundraiser.purpose}
      </p>

      <div
        className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-brand-secondary/10"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Funding progress"
      >
        <span
          className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="m-0 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
          {formatMoney(fundraiser.raised, fundraiser.currency)}
          <span className="ml-1.5 font-poppins text-caption font-normal text-ink/50">
            of {formatMoney(fundraiser.goal, fundraiser.currency)}
          </span>
        </p>
        <p className="m-0 font-poppins text-caption text-ink/55">
          {percent}% funded • {fundraiser.supporters} supporters
        </p>
      </div>

      <Button
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium"
        onClickfunction={() =>
          showSuccessToast("Noted - contributions open here soon")
        }
      >
        <FiHeart aria-hidden="true" /> Contribute
      </Button>

      <p className="m-0 mt-3 font-poppins text-caption leading-5 text-ink/45">
        KarmaCircle takes no cut. Every unit goes to the organizer running this
        event.
      </p>
    </div>
  );
};

export default EventFundraiserPanel;
