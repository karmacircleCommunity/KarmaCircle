import { FiArrowUpRight, FiInfo, FiMapPin, FiVideo } from "react-icons/fi";
import {
  hasJoiningContent,
  hasVenueContent,
} from "@features/events/utils/eventMode";
import { mapsUrl } from "@features/events/utils/formatEventFacts";
import type { EventLocationPanelProps } from "@features/events/types";

/**
 * Where the event happens - a venue with directions for an in-person event,
 * how the link reaches you for an online one, and both for a hybrid one
 * (PG-10), venue first because it is what a person plans their day around.
 *
 * One component rather than two because it is one question ("where do I
 * actually turn up?") with up to two answers, and `event.mode` already decides
 * which. The map is a plain search link, not an embed: an iframe here would
 * mean a third-party script and a cookie banner for a single address.
 *
 * **The meeting link is not public.** `platformLink` arrives only for the host
 * and for a signed-in person who is going. Everyone else reads `linkNote`
 * (`utils/joinLinkNote.ts`) instead, next to the organizer's own
 * `linkDelivery` text when there is one.
 *
 * A draft may lack any of this, so each card renders only what exists: no
 * empty card, no blank line and no "Open in maps" for an address nobody typed.
 *
 * Reads flat fields straight off `DisplayEvent`/`EventDetailContent`
 * (`event.address`/`city`/`platform`/`platformLink`,
 * `detail.gettingThere`/`linkDelivery`/`joinRequirements`) rather than a
 * nested `venue`/`onlineAccess` object the old fixture data used to carry -
 * that shape doesn't exist on a live `Event` record, and there's nothing to
 * gain by reconstructing it in a mapping function just to destructure it
 * straight back out again here.
 */
const JoiningCard = ({ event, detail, linkNote }: EventLocationPanelProps) => {
  if (
    !hasJoiningContent(
      event,
      detail.linkDelivery,
      detail.joinRequirements,
      linkNote,
    )
  ) {
    return null;
  }

  return (
    <div
      data-reveal
      className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
    >
      <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/65 uppercase">
        <FiVideo aria-hidden="true" className="size-3.5 text-brand" />
        {event.mode === "Hybrid" ? "Joining online" : "Joining"}
      </p>
      <h3 className="mt-2 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
        {event.platform ? `On ${event.platform}` : "Joining online"}
      </h3>
      {detail.linkDelivery && (
        <p className="mt-3 font-poppins text-body leading-7 break-words text-ink/75">
          {detail.linkDelivery}
        </p>
      )}
      {linkNote && (
        <p className="mt-3 font-poppins text-body leading-7 text-ink/75">
          {linkNote}
        </p>
      )}
      {detail.joinRequirements && (
        <p className="mt-4 flex gap-3 rounded-xl bg-surface-warm p-4 font-poppins text-body leading-6 text-ink/70">
          <FiInfo
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          {detail.joinRequirements}
        </p>
      )}
      {event.platformLink && (
        <a
          href={event.platformLink}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 inline-flex items-center gap-2 rounded-full border border-brand-secondary/15 px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand"
        >
          Open the join link
          <FiArrowUpRight
            aria-hidden="true"
            className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
          />
        </a>
      )}
    </div>
  );
};

const VenueCard = ({ event, detail }: EventLocationPanelProps) => {
  const addressLines = [event.address, event.city, event.state, event.country]
    .filter(Boolean)
    .join(", ");
  const region = [event.city, event.state, event.country]
    .filter(Boolean)
    .join(", ");

  if (!hasVenueContent(event, detail.gettingThere)) return null;

  return (
    <div
      data-reveal
      className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
    >
      <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/65 uppercase">
        <FiMapPin aria-hidden="true" className="size-3.5 text-brand" />
        Venue
      </p>

      {addressLines && (
        <address className="mt-2 font-poppins text-body leading-7 break-words text-ink/75 not-italic">
          {event.address && <span className="block">{event.address}</span>}
          {region && <span className="block">{region}</span>}
        </address>
      )}

      {detail.gettingThere && (
        <p className="mt-4 flex gap-3 rounded-xl bg-surface-warm p-4 font-poppins text-body leading-6 text-ink/70">
          <FiInfo
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          {detail.gettingThere}
        </p>
      )}

      {addressLines && (
        <a
          href={mapsUrl(addressLines)}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 inline-flex items-center gap-2 rounded-full border border-brand-secondary/15 px-5 py-2.5 font-poppins text-body font-medium text-brand-secondary no-underline transition-colors duration-200 hover:border-brand/45 hover:text-brand"
        >
          Open in maps
          <FiArrowUpRight
            aria-hidden="true"
            className="transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
          />
        </a>
      )}
    </div>
  );
};

/** Both cards decide for themselves whether they have anything to show. */
const EventLocationPanel = (props: EventLocationPanelProps) => (
  <div className="flex flex-col gap-5">
    <VenueCard {...props} />
    <JoiningCard {...props} />
  </div>
);

export default EventLocationPanel;
