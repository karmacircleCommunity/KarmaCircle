import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectIsLoggedIn, selectUser } from "@app/store/slices/userSlice";
import { FaPlus } from "react-icons/fa6";
import {
  DirectoryToolbar,
  FilterMenu,
  Footer,
  InfiniteScroll,
  Navbar,
} from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import { usePagedList, useSectionReveal } from "@hooks";
import { eventEndpoints } from "@services/ApiEndpoints";
import { EVENT_TYPE_OPTIONS } from "@features/events/constants/eventTypes";
import EventCard from "@features/events/components/EventCard";
import EventCardSkeleton from "@features/events/components/EventCardSkeleton";
import { toDisplayEvent } from "@features/events/utils/toDisplayEvent";
import type { ApiEvent, ApiEventList } from "@features/events/types";
import { Link } from "react-router-dom";

type TimeFilter = "Upcoming" | "Past";
const TIME_FILTERS: TimeFilter[] = ["Upcoming", "Past"];

/**
 * The second, independent filter dimension (September 2026) - who can join
 * (`access`) and mode (`Online`/`Offline`/`Hybrid`) are two unrelated fields on
 * `event.model.ts`, not values of one taxonomy, but this directory
 * exposes them as one flat single-select group. Picking one clears the
 * others, so "online" and "invite only" can't be combined here; that tradeoff
 * was a deliberate choice over building a multi-select variant for a short
 * list.
 */
const ALL_FORMATS = "All formats";
type TypeFilter =
  | typeof ALL_FORMATS
  | "Open to all"
  | "Approval required"
  | "Invite only"
  | "Online"
  | "Offline"
  | "Hybrid";
const TYPE_FILTERS: TypeFilter[] = [
  ALL_FORMATS,
  "Open to all",
  "Approval required",
  "Invite only",
  "Online",
  "Offline",
  "Hybrid",
];

/**
 * The third filter (PG-9): what kind of event it is. Its own group rather
 * than more options in `TypeFilter`, because kind and access/mode are
 * independent questions that can be asked together.
 */
const ALL_KINDS = "All kinds";
const KIND_FILTERS = [
  ALL_KINDS,
  ...EVENT_TYPE_OPTIONS.map((option) => option.label),
];

/** The API `type` param a chosen kind label stands for. */
const kindToParams = (kind: string) => {
  const option = EVENT_TYPE_OPTIONS.find((o) => o.label === kind);
  return option ? { type: option.value } : {};
};

/** Cards per page: divides evenly into the 1, 2 and 3 column grids. */
const PAGE_SIZE = 12;
/** Columns of the widest grid. */
const COLUMNS_MAX = 3;
/** How long typing must pause before the search is sent to the API. */
const SEARCH_DEBOUNCE_MS = 300;

/** The API query params a `TypeFilter` choice stands for. */
const typeToParams = (type: TypeFilter) => {
  switch (type) {
    case "Open to all":
      return { access: "open" as const };
    case "Approval required":
      return { access: "approval" as const };
    case "Invite only":
      return { access: "invite" as const };
    case "Online":
      return { mode: "Online" as const };
    case "Offline":
      return { mode: "Offline" as const };
    case "Hybrid":
      return { mode: "Hybrid" as const };
    default:
      return {};
  }
};

/**
 * The events directory, routed at `/events`.
 *
 * **Live data, September 2026** — `GET /events` (`eventEndpoints.directory()`)
 * via `usePagedList`, mapped through `utils/toDisplayEvent.ts`. Replaces the
 * fixture `constants/eventDirectory.ts` used to render — that file, its
 * `eventDetails.ts` companion, and the `cause`/`going`/`spotsLeft` fields
 * they invented are deleted, not just unused; `DetailedEvent.tsx` is wired
 * to live data too now (`utils/toDisplayEventDetail.ts`).
 *
 * Real differences from `/organizations`' directory, all because an event
 * has a date and a couple of access/mode flags an organization doesn't:
 * - The primary filter is **Upcoming/Past**, not a cause taxonomy — a live
 *   event has no cause field at all (`event.model.ts`), and "what's
 *   happening soon" is the question this page actually answers.
 * - A second filter (`TypeFilter`, September 2026) narrows by
 *   who can join (open, approval, invite) and online/offline/hybrid — two real
 *   fields on `event.model.ts` (`access`, `mode`), flattened into one
 *   single-select list rather than combinable checkboxes (see that type's
 *   own comment for the tradeoff).
 * - All three filters (when, format, kind) sit behind one "Filters" button
 *   (`FilterMenu`, 2026-11-28, replacing three dropdowns in the toolbar).
 *   Choices take effect on "Apply filters", as one request.
 * - Results render as one flat grid, sorted soonest-first for Upcoming and
 *   most-recent-first for Past. They used to be bucketed into same-day
 *   sections (`groupEventsByDay`, removed September 2026) - with the seed
 *   data's real spread of dates, most sections held exactly one event, so
 *   the headers added structure without adding information; `EventCard`'s
 *   own date badge already says which day an event is on.
 *
 * Search, the Upcoming/Past split and the type filter all run on the API
 * (`GET /events`, `eventEndpoints.directory()`), one page of
 * `PAGE_SIZE` at a time, loaded with `usePagedList`. The next page loads
 * itself as the end of the grid comes near (`InfiniteScroll`), with card
 * placeholders while it does (2026-11-27, replacing a "Load more events"
 * button). The API orders every page (`startTime`, then `_id`), so
 * pages never repeat or skip an event and the count above the grid is the
 * API's own `pagination.total`, not the number of cards fetched so far.
 * Search is matched on event name, city and organizer, and is sent after a
 * short pause in typing so a request is not fired for every keystroke.
 *
 * Organization accounts can open the shared, working creation form.
 */
const Events = () => {
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const canCreateEvent = isLoggedIn && user.userType === "organization";
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<TimeFilter>("Upcoming");
  const [type, setType] = useState<TypeFilter>(ALL_FORMATS);
  const [kind, setKind] = useState<string>(ALL_KINDS);

  // The box updates on every keystroke; the API only hears about it once
  // typing pauses.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const {
    items,
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
      eventEndpoints.directory({
        period: when === "Upcoming" ? "upcoming" : "past",
        search,
        ...typeToParams(type),
        ...kindToParams(kind),
        page,
        limit: PAGE_SIZE,
      }),
    itemKey: (event) => event.uid,
    // Keeps the cards on screen while a new search or filter loads, instead of
    // flashing an empty grid between the two.
    config: { keepPreviousData: true },
  });

  const results = useMemo(() => items.map(toDisplayEvent), [items]);

  const loadFailed = Boolean(error) && results.length === 0;
  // A new search or filter is on its way and the previous cards are still up.
  const updating = isLoading && results.length > 0;
  // Placeholders for what is about to arrive, up to one row of the grid.
  const pendingCards = Math.min(remaining, COLUMNS_MAX);
  const hasFilters = Boolean(
    query || type !== ALL_FORMATS || kind !== ALL_KINDS,
  );

  // Scoped to the grid so the reveal never reaches the page chrome above
  // it, and re-run on filter changes so cards revealed by a new filter
  // don't stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, when, type, kind, search]);

  return (
    <>
      <ComponentHelmet type="Events" />
      <Navbar />

      <div className="mx-auto max-w-6xl px-9 pt-10 pb-6 sm:px-10 lg:px-12 lg:pt-14">
        <h1 className="font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
          Events on <span className="text-brand">KarmaCircle</span>
        </h1>
        <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
          Shifts, camps, classes and clean-ups you can actually turn up to. Find
          one by name, by organizer, or by city.
        </p>

        <DirectoryToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search events"
          searchLabel="Search events"
          filters={
            <FilterMenu
              groups={[
                {
                  legend: "When",
                  layout: "segmented",
                  options: TIME_FILTERS,
                  value: when,
                  defaultValue: "Upcoming",
                  onChange: (value) => setWhen(value as TimeFilter),
                },
                {
                  legend: "Format",
                  options: TYPE_FILTERS,
                  value: type,
                  defaultValue: ALL_FORMATS,
                  onChange: (value) => setType(value as TypeFilter),
                },
                {
                  legend: "Kind",
                  options: KIND_FILTERS,
                  value: kind,
                  defaultValue: ALL_KINDS,
                  onChange: setKind,
                },
              ]}
            />
          }
          summary={
            // Nothing to count after a failed first load: "0 events" above the
            // error would say the directory is empty.
            loadFailed ? undefined : (
              <>
                {isLoading && loadedPages === 0
                  ? "Loading events"
                  : updating
                    ? // The count on hand still belongs to the old filters.
                      "Updating events"
                    : `${total} ${total === 1 ? "event" : "events"}`}
                {!updating && when === "Past" && total > 0 && " · past"}
                {!updating &&
                  type !== ALL_FORMATS &&
                  total > 0 &&
                  ` · ${type.toLowerCase()}`}
                {!updating &&
                  kind !== ALL_KINDS &&
                  total > 0 &&
                  ` · ${kind.toLowerCase()}`}
              </>
            )
          }
          action={
            canCreateEvent ? (
              <Link
                to="/organization/events/new"
                className="group flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-6 font-poppins text-body font-medium whitespace-nowrap text-white no-underline shadow-[0_8px_24px_-14px_var(--color-brand)] transition-[background-color,box-shadow] duration-300 ease-out hover:bg-brand-hover hover:shadow-[0_16px_34px_-12px_var(--color-brand)]"
              >
                <FaPlus
                  aria-hidden="true"
                  className="size-3.5 transition-transform duration-300 ease-out motion-safe:group-hover:rotate-90"
                />
                Create an event
              </Link>
            ) : undefined
          }
        />
      </div>

      <div className="mx-auto max-w-6xl px-9 pb-20 sm:px-10 lg:px-12">
        {loadFailed ? (
          <div
            role="alert"
            className="rounded-2xl border border-error/25 bg-error/5 px-8 py-12"
          >
            <h2 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
              Could not load events
            </h2>
            <p className="mt-2 font-poppins text-body leading-6 text-ink/70">
              Please try again.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-6 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 hover:text-brand-hover motion-safe:active:scale-97"
            >
              Try again
            </button>
          </div>
        ) : results.length === 0 && isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-10 sm:py-16 sm:text-center">
            <h2 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
              {hasFilters
                ? "Nothing matches that yet"
                : when === "Upcoming"
                  ? "No upcoming events yet"
                  : "No past events yet"}
            </h2>
            <p className="mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65 sm:mx-auto">
              {hasFilters
                ? "Try a broader search, or clear the filters to see every event in the circle."
                : when === "Upcoming"
                  ? "Nothing's on the calendar right now. Check back soon, or look at past events."
                  : "Nothing's happened here yet."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                  setType(ALL_FORMATS);
                  setKind(ALL_KINDS);
                }}
                className="mt-6 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 hover:text-brand-hover motion-safe:active:scale-97"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div
            ref={gridRef}
            aria-busy={updating}
            // Dimmed only if the answer is slow, so a quick one never blinks.
            className={`grid grid-cols-1 gap-6 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3 ${updating ? "opacity-60 delay-200" : ""}`}
          >
            {results.map((event) => (
              <EventCard event={event} key={event.id} />
            ))}
            {isLoadingMore &&
              Array.from({ length: pendingCards }, (_, index) => (
                <EventCardSkeleton key={`pending-${index}`} />
              ))}
          </div>
        )}

        {results.length > 0 && (
          <InfiniteScroll {...scroll} itemsName="events" />
        )}
      </div>

      <Footer />
    </>
  );
};

export default Events;
