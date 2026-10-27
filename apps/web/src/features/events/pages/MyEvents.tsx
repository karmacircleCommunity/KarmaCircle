import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import useSWRInfinite from "swr/infinite";
import { Footer, Navbar } from "@components";
import { selectUser } from "@app/store/slices/userSlice";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import { FiCalendar, FiMapPin, FiVideo } from "react-icons/fi";
import { Link } from "react-router-dom";
import type { ApiEventList } from "../types";
import { formatEventDate } from "../utils/formatEventFacts";

type EventTab = "Upcoming" | "Past";
const PAGE_SIZE = 100;

const MyEvents = () => {
  const user = useSelector(selectUser);
  const [tab, setTab] = useState<EventTab>("Upcoming");

  const getKey = (pageIndex: number, previousPage: ApiEventList | null) => {
    if (
      !user.email ||
      (previousPage && pageIndex >= previousPage.pagination.totalPages)
    ) {
      return null;
    }

    const url = new URL(eventEndpoints.mine());
    url.searchParams.set("page", String(pageIndex + 1));
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("period", tab.toLowerCase());
    return [url.toString(), user.email] as const;
  };

  const { data, error, isLoading, mutate, size, setSize } =
    useSWRInfinite<ApiEventList>(getKey, ([url]) => fetcher<ApiEventList>(url));

  const events = useMemo(() => {
    return (data ?? []).flatMap((page) => page.data);
  }, [data]);

  const visibleEvents = events;

  const totalPages = data?.[0]?.pagination.totalPages ?? 0;
  const hasMore = size < totalPages;

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-6xl px-6 pt-10 pb-20 sm:px-10 lg:px-12 lg:pt-14">
        <p className="m-0 font-poppins text-sm font-medium tracking-[0.14em] text-brand uppercase">
          Your plans
        </p>
        <h1 className="mt-2 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
          My events
        </h1>
        <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
          Events you have joined, all in one place.
        </p>

        <div
          className="mt-8 flex gap-2 border-b border-brand-secondary/10"
          role="tablist"
          aria-label="My event time period"
        >
          {(["Upcoming", "Past"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => {
                setTab(option);
                void setSize(1);
              }}
              className={`border-b-2 px-4 py-3 font-poppins text-sm font-medium transition-colors ${tab === option ? "border-brand text-brand-secondary" : "border-transparent text-ink/55 hover:text-brand-secondary"}`}
            >
              {option}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-8 font-poppins text-body text-ink/55" role="status">
            Loading your events…
          </p>
        ) : error && events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
            <p className="m-0 font-outfit text-lg font-medium text-brand-secondary">
              Could not load your events
            </p>
            <p className="mt-2 font-poppins text-body text-ink/65">
              Please try again.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-4 rounded-lg bg-brand px-5 py-2.5 font-poppins text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Try again
            </button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-12 text-center">
            <FiCalendar aria-hidden className="mx-auto size-8 text-brand/70" />
            <p className="mt-4 font-outfit text-lg font-medium text-brand-secondary">
              No {tab.toLowerCase()} events
            </p>
            <p className="mt-2 font-poppins text-body text-ink/60">
              {tab === "Upcoming"
                ? "Events you join will show up here."
                : "Your completed event visits will show up here."}
            </p>
            {tab === "Upcoming" && (
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
            {visibleEvents.map((event) => (
              <li key={event.uid}>
                <Link
                  to={`/events/${event.uid}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-brand-secondary/10 bg-white p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div className="min-w-0">
                    <p className="m-0 font-outfit text-body-lg font-semibold text-brand-secondary">
                      {event.name}
                    </p>
                    <p className="mt-1 font-poppins text-sm text-ink/55">
                      Hosted by {event.hostName}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-poppins text-sm text-ink/65">
                      <span className="inline-flex items-center gap-1.5">
                        <FiCalendar aria-hidden className="size-4 text-brand" />
                        {formatEventDate(event.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        {event.mode === "Online" ? (
                          <FiVideo aria-hidden className="size-4 text-brand" />
                        ) : (
                          <FiMapPin aria-hidden className="size-4 text-brand" />
                        )}
                        {event.mode === "Online"
                          ? event.platform || "Online"
                          : [event.city, event.country]
                              .filter(Boolean)
                              .join(", ") || "Location details on event page"}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-brand/8 px-3 py-1.5 font-poppins text-xs font-medium text-brand-secondary sm:self-center">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-brand"
                    />{" "}
                    You&apos;re going
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {error && events.length > 0 && (
          <p className="mt-5 font-poppins text-sm text-red-700" role="status">
            Could not load more events. Try again below.
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => (error ? void mutate() : void setSize(size + 1))}
            className="mt-6 rounded-lg border border-brand-secondary/15 px-5 py-2.5 font-poppins text-sm font-medium text-brand-secondary transition-colors hover:border-brand/40"
          >
            {error ? "Retry loading events" : "Load more events"}
          </button>
        )}
      </main>
      <Footer />
    </>
  );
};

export default MyEvents;
