import { Helmet } from "react-helmet-async";
import { truncate } from "@features/events/seo/eventHead";
import type { DisplayEvent } from "@features/events/types";

/**
 * The tab title, description and canonical address of an event page once the
 * app is running, so moving from the events list to an event changes the tab
 * title (it used to stay "KarmaCircle | Events") and a search engine that runs
 * the page's JavaScript sees the right ones.
 *
 * Link previews and crawlers that do not run JavaScript read the same tags
 * from the HTML itself: `apps/web/api/event-page.ts` puts them there, together
 * with the schema.org `Event` data, which is why none of that is repeated
 * here (two copies of the markup would be counted twice).
 */
const EventHelmet = ({ event }: { event: DisplayEvent }) => {
  const description = truncate(
    event.summary || `${event.title}, an event on KarmaCircle.`,
    200,
  );
  return (
    <Helmet>
      <title>{`${event.title} | KarmaCircle`}</title>
      <meta name="description" content={description} />
      <link
        rel="canonical"
        href={`${window.location.origin}/events/${encodeURIComponent(event.id)}`}
      />
    </Helmet>
  );
};

export default EventHelmet;
