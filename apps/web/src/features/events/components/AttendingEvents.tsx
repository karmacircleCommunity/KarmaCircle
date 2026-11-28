import { useSelector } from "react-redux";
import { InfiniteScroll, SkeletonRegion, SkeletonRows } from "@components";
import { usePagedList } from "@hooks";
import { selectUser } from "@app/store/slices/userSlice";
import { FiCalendar, FiMapPin, FiRadio, FiVideo } from "react-icons/fi";
import { Link } from "react-router-dom";
import MyEventsTabs from "@features/events/components/MyEventsTabs";
import { ATTENDING_LISTS } from "@features/events/constants/myEvents";
import type {
  ApiEvent,
  ApiEventList,
  MyEventsTab,
} from "@features/events/types";
import { describeWhere } from "@features/events/utils/eventMode";
import {
  eventPhase,
  formatEventDate,
} from "@features/events/utils/formatEventFacts";
import {
  myEventStatusLabel,
  myEventsUrl,
} from "@features/events/utils/myEvents";

const COPY: Record<
  MyEventsTab,
  { loading: string; error: string; emptyTitle: string; emptyBody: string }
> = {
  Upcoming: {
    loading: "Loading your events…",
    error: "Could not load your events",
    emptyTitle: "No upcoming events",
    emptyBody: "Events you join will show up here.",
  },
  Past: {
    loading: "Loading your events…",
    error: "Could not load your events",
    emptyTitle: "No past events",
    emptyBody: "Your completed event visits will show up here.",
  },
  Invited: {
    loading: "Loading your invitations…",
    error: "Could not load your invitations",
    emptyTitle: "No invitations",
    emptyBody:
      "When an organizer invites your email address to an event, it shows up here.",
  },
};
/** Rows per page; the next one loads as the reader nears the end. */
const PAGE_SIZE = 20;

interface AttendingEventsProps {
  list: MyEventsTab;
  onList: (list: MyEventsTab) => void;
}

/**
 * My Events' Attending view: what the signed-in account joined or asked to join
 * (Upcoming, which includes events running now, and Past) and the invitations
 * waiting for an answer (Invited). Every row opens the event page, which is
 * where an invitation is accepted. Organizations attend events too. Each list
 * loads a page at a time as the reader scrolls.
 */
const AttendingEvents = ({ list, onList }: AttendingEventsProps) => {
  const user = useSelector(selectUser);

  const {
    items: events,
    total,
    remaining,
    loadedPages,
    error,
    isLoading,
    isLoadingMore,
    mutate,
    scroll,
  } = usePagedList<ApiEvent, ApiEventList>({
    getKey: (page) =>
      user.email
        ? ([myEventsUrl(list, page, PAGE_SIZE), user.email] as const)
        : null,
    itemKey: (event) => event.uid,
  });

  const copy = COPY[list];

  return (
    <>
      <MyEventsTabs
        label="Events you are attending"
        idPrefix="my-events-tab"
        panelId="my-events-panel"
        options={ATTENDING_LISTS.map((value) => ({ value, label: value }))}
        selected={list}
        onSelect={onList}
        variant="line"
      />

      <div
        id="my-events-panel"
        role="tabpanel"
        aria-labelledby={`my-events-tab-${list}`}
      >
        {isLoading ? (
          <SkeletonRegion label={copy.loading} className="mt-6">
            <SkeletonRows trailing="pill" testId="event-row-skeleton" />
          </SkeletonRegion>
        ) : error && events.length === 0 ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-error/25 bg-error/5 px-6 py-8"
          >
            <p className="m-0 font-outfit text-lg font-medium text-brand-secondary">
              {copy.error}
            </p>
            <p className="mt-2 font-poppins text-body text-ink/70">
              Please try again.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-4 cursor-pointer rounded-lg border-none bg-brand px-5 py-2.5 font-poppins text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-12 sm:text-center">
            <FiCalendar
              aria-hidden
              className="size-8 text-brand/70 sm:mx-auto"
            />
            <p className="mt-4 font-outfit text-lg font-medium text-brand-secondary">
              {copy.emptyTitle}
            </p>
            <p className="mt-2 font-poppins text-body text-ink/65">
              {copy.emptyBody}
            </p>
            {list !== "Past" && (
              <Link
                to="/events"
                className="mt-6 inline-flex rounded-lg bg-brand px-6 py-3 font-poppins text-[15px] font-semibold text-white no-underline transition-colors hover:bg-brand-hover"
              >
                Explore events
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-6 flex list-none flex-col gap-3 p-0">
            {events.map((event) => (
              <li key={event.uid}>
                <Link
                  to={`/events/${event.uid}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-brand-secondary/10 bg-white p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div className="min-w-0">
                    <p className="m-0 font-outfit text-body-lg font-semibold break-words text-brand-secondary">
                      {event.name}
                    </p>
                    <p className="mt-1 font-poppins text-sm text-ink/65">
                      Hosted by {event.hostName}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-poppins text-sm text-ink/65">
                      {event.status !== "cancelled" &&
                        eventPhase(event.startTime, event.endTime) ===
                          "ongoing" && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-brand-hover">
                            <FiRadio aria-hidden className="size-4" />
                            Happening now
                          </span>
                        )}
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar aria-hidden className="size-4 text-brand" />
                        {formatEventDate(event.startTime, event.timezone)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {event.mode === "Online" ? (
                          <FiVideo aria-hidden className="size-4 text-brand" />
                        ) : (
                          <FiMapPin aria-hidden className="size-4 text-brand" />
                        )}
                        {describeWhere(event)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-brand/8 px-3 py-1.5 font-poppins text-xs font-medium text-brand-secondary sm:self-center">
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${event.status === "cancelled" ? "bg-error" : "bg-brand"}`}
                    />{" "}
                    {myEventStatusLabel(event, list)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLoadingMore && (
        <SkeletonRows
          count={Math.min(remaining, 3)}
          trailing="pill"
          testId="event-row-skeleton"
          className="mt-3"
        />
      )}
      {events.length > 0 && (
        <InfiniteScroll
          {...scroll}
          itemsName="events"
          endMessage={
            loadedPages > 1 ? `That's all ${total} events.` : undefined
          }
        />
      )}
    </>
  );
};

export default AttendingEvents;
