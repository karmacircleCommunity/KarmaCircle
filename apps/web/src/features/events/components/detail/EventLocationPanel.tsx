import { FiArrowUpRight, FiInfo, FiMapPin, FiVideo } from "react-icons/fi";
import { mapsUrl } from "../../utils/formatEventFacts";
import type { EventLocationPanelProps } from "../../types";

/**
 * Where the event happens - a venue with directions for an offline event,
 * or how the link reaches you for an online one.
 *
 * One component rather than two because it is one question ("where do I
 * actually turn up?") with two answers, and `event.mode` already decides
 * which. The map is a plain search link, not an embed: an iframe here would
 * mean a third-party script and a cookie banner for a single address.
 */
const EventLocationPanel = ({ event, detail }: EventLocationPanelProps) => {
  const { venue, onlineAccess } = detail;

  if (event.mode === "Online" && onlineAccess) {
    return (
      <div
        data-reveal
        className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
      >
        <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
          <FiVideo aria-hidden="true" className="size-3.5 text-brand" />
          Joining
        </p>
        <h3 className="mt-2 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
          On {onlineAccess.platform}
        </h3>
        <p className="mt-3 font-poppins text-body leading-7 text-ink/75">
          {onlineAccess.linkDelivery}
        </p>
        <p className="mt-4 flex gap-3 rounded-xl bg-surface-warm p-4 font-poppins text-body leading-6 text-ink/70">
          <FiInfo
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          {onlineAccess.requirements}
        </p>
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div
      data-reveal
      className="rounded-2xl border border-brand-secondary/8 bg-white p-6 sm:p-7"
    >
      <p className="m-0 inline-flex items-center gap-2 font-poppins text-caption tracking-wide text-ink/50 uppercase">
        <FiMapPin aria-hidden="true" className="size-3.5 text-brand" />
        Venue
      </p>
      <h3 className="mt-2 font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
        {venue.name}
      </h3>

      <address className="mt-2 font-poppins text-body leading-7 text-ink/75 not-italic">
        {venue.addressLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        <span className="block">
          {event.city}, {event.country}
        </span>
      </address>

      <p className="mt-4 flex gap-3 rounded-xl bg-surface-warm p-4 font-poppins text-body leading-6 text-ink/70">
        <FiInfo
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-brand"
        />
        {venue.gettingThere}
      </p>

      <a
        href={mapsUrl(venue.mapQuery)}
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
    </div>
  );
};

export default EventLocationPanel;
