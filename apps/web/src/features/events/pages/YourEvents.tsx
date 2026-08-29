import { Footer, Navbar } from "@components";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import { FiArrowUpRight, FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { formatEventDate } from "../constants/eventDirectory";
import type { ApiEventList } from "../types";

/**
 * The organization's own events, routed at `/organization/events` — where
 * the navbar's "Your events" now points. It used to point at
 * `/event/create`, a path no route has ever matched, so the menu item was
 * a 404.
 *
 * Behind `OrganizationSetupGate`: a draft organization gets told what is
 * still missing and a link that resumes setup, because an account that
 * nobody can find has nothing to host events for yet.
 *
 * **This is a live list, not the fixture** the public `/events` directory
 * still renders. It fetches `GET /events?host={handle}` — the filter runs
 * server-side, so nothing is hidden on page two. Live records carry no
 * cover photo, cause or capacity, which is why these are plain rows rather
 * than `EventCard`s: the card needs three fields a real event does not
 * have yet. See docs/specs/events.md.
 */
const YourEvents = () => {
  const { organization } = useMyOrganization();

  const { data, isLoading } = useSWR<ApiEventList>(
    organization?.isLive ? eventEndpoints.byHost(organization.handle) : null,
    fetcher,
  );

  const events = data?.data ?? [];

  return (
    <OrganizationSetupGate
      title="Your events open up once your profile is live"
      description="Events are how people meet your organization, and right now nobody can find it — your profile is still a draft. Finish the details and you can start hosting."
    >
      <Navbar />

      <div className="mx-auto max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <h1 className="font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
          Your events
        </h1>
        <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
          Everything {organization?.name ?? "your organization"} is hosting, as
          it appears to everyone else.
        </p>

        {isLoading ? (
          <p className="mt-10 font-poppins text-body text-ink/55">
            Loading your events…
          </p>
        ) : events.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-14 text-center">
            <p className="m-0 font-outfit text-body-lg font-medium text-brand-secondary">
              You haven&apos;t hosted anything yet
            </p>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body text-ink/60">
              Your first event shows up here the moment you create one, and on
              your public profile at the same time.
            </p>
            <Link
              to="/events"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-poppins text-[15px] font-semibold text-white no-underline transition-colors hover:bg-brand-hover"
            >
              Create an event
              <FiArrowUpRight aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="mt-10 flex list-none flex-col gap-3 p-0">
            {events.map((event) => (
              <li key={event._id}>
                <Link
                  to={`/events/${event.uid}`}
                  className="flex flex-col gap-2 rounded-2xl border border-brand-secondary/10 bg-white p-5 no-underline transition-colors hover:border-brand/35 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div>
                    <p className="m-0 font-outfit text-body-lg font-medium text-brand-secondary">
                      {event.name}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-poppins text-body text-ink/60">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar aria-hidden className="size-4" />
                        {formatEventDate(event.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {event.mode === "Online" ? (
                          <FiVideo aria-hidden className="size-4" />
                        ) : (
                          <FiMapPin aria-hidden className="size-4" />
                        )}
                        {event.mode === "Online"
                          ? (event.platform ?? "Online")
                          : [event.city, event.country]
                              .filter(Boolean)
                              .join(", ")}
                      </span>
                    </p>
                  </div>
                  <FiArrowUpRight
                    aria-hidden
                    className="hidden size-5 shrink-0 text-brand sm:block"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Footer />
    </OrganizationSetupGate>
  );
};

export default YourEvents;
