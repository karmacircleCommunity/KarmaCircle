import { Footer, Navbar } from "@components";
import OrganizationSetupGate from "@features/organizations/components/OrganizationSetupGate";
import { useMyOrganization } from "@features/organizations/hooks/useMyOrganization";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import {
  FiArrowUpRight,
  FiCalendar,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiUsers,
  FiVideo,
  FiXCircle,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useState } from "react";
import useSWR from "swr";
import CancelEventDialog from "@features/events/components/CancelEventDialog";
import { formatEventDate } from "@features/events/utils/formatEventFacts";
import { CancelEvent } from "@services/KarmaCircleApi";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import type { ApiEvent, ApiEventList } from "@features/events/types";

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
 * This is a live host list. It fetches `GET /events?host={handle}` — the filter runs
 * server-side, so nothing is hidden on page two. Live records carry no
 * cover photo, cause or capacity, which is why these are plain rows rather
 * than `EventCard`s: the card needs three fields a real event does not
 * have yet. See docs/specs/events.md.
 *
 * **Edit and cancel (PG-1, PG-2).** Each event that has not ended and is not
 * already cancelled gets an Edit link (`/organization/events/:uid/edit`) and
 * a Cancel button that opens a confirmation dialog. A cancelled event stays in
 * the list with a "Cancelled" label and no actions; an ended one keeps just
 * its link.
 */
const YourEvents = () => {
  const { organization } = useMyOrganization();
  const [cancelTarget, setCancelTarget] = useState<ApiEvent | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const hostKey = organization?.isLive
    ? eventEndpoints.byHost(organization.handle)
    : null;
  const { data, isLoading, mutate } = useSWR<ApiEventList>(hostKey, fetcher);

  const events = data?.data ?? [];

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const result = await CancelEvent(cancelTarget.uid);
    setCancelling(false);

    if (result.ok) {
      showSuccessToast("Event cancelled");
      setCancelTarget(null);
      void mutate();
    } else {
      showErrorToast(
        result.message ?? "Could not cancel the event. Try again.",
      );
    }
  };

  return (
    <OrganizationSetupGate
      title="Your events open up once your profile is live"
      description="Events are how people meet your organization, and right now nobody can find it — your profile is still a draft. Finish the details and you can start hosting."
    >
      <Navbar />

      <div className="mx-auto max-w-4xl px-9 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              Your events
            </h1>
            <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
              Everything {organization?.name ?? "your organization"} is hosting,
              as it appears to everyone else.
            </p>
          </div>
          <Link
            to="/organization/events/new"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-outfit text-body font-semibold text-white no-underline transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <FiPlus aria-hidden="true" />
            Create event
          </Link>
        </header>

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
          </div>
        ) : (
          <ul className="mt-10 flex list-none flex-col gap-3 p-0">
            {events.map((event) => (
              <li
                key={event._id}
                className="rounded-2xl border border-brand-secondary/10 bg-white transition-colors hover:border-brand/35"
              >
                <Link
                  to={`/events/${event.uid}`}
                  className="flex flex-col gap-2 p-5 no-underline sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div>
                    <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-outfit text-body-lg font-medium text-brand-secondary">
                      {event.name}
                      {event.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-error/25 bg-error/8 px-2.5 py-0.5 font-outfit text-caption font-medium tracking-wide text-error uppercase">
                          <FiXCircle aria-hidden className="size-3.5" />
                          Cancelled
                        </span>
                      )}
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
                <div className="flex flex-wrap gap-3 border-t border-brand-secondary/8 px-5 py-3">
                  <Link
                    to={`/organization/events/${event.uid}/attendees`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-secondary/15 px-4 font-outfit text-body font-medium text-brand-secondary no-underline transition hover:border-brand/45 hover:text-brand"
                  >
                    <FiUsers aria-hidden className="size-4" />
                    Attendees
                    <span className="sr-only"> for {event.name}</span>
                  </Link>
                  {canManage(event) && (
                    <>
                      <Link
                        to={`/organization/events/${event.uid}/edit`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-brand-secondary/15 px-4 font-outfit text-body font-medium text-brand-secondary no-underline transition hover:border-brand/45 hover:text-brand"
                      >
                        <FiEdit2 aria-hidden className="size-4" />
                        Edit
                        <span className="sr-only"> {event.name}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCancelTarget(event)}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-error/25 bg-transparent px-4 font-outfit text-body font-medium text-error transition hover:bg-error/5"
                      >
                        <FiXCircle aria-hidden className="size-4" />
                        Cancel event
                        <span className="sr-only"> {event.name}</span>
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cancelTarget && (
        <CancelEventDialog
          eventName={cancelTarget.name}
          cancelling={cancelling}
          onConfirm={confirmCancel}
          onClose={() => !cancelling && setCancelTarget(null)}
        />
      )}

      <Footer />
    </OrganizationSetupGate>
  );
};

/** Edit and cancel apply until an event ends, and never to a cancelled one. */
const canManage = (event: ApiEvent) =>
  event.status !== "cancelled" &&
  new Date(event.endTime).getTime() >= Date.now();

export default YourEvents;
