import { useMemo, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import useSWR from "swr";
import { DirectoryToolbar, Footer, Navbar } from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import { useSectionReveal } from "@hooks";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import CreateEvent from "../components/CreateEvent";
import EventCard from "../components/EventCard";
import { groupEventsByDay } from "../utils/groupEventsByDay";
import { toDisplayEvent } from "../utils/toDisplayEvent";
import type { ApiEventList, EventCardEvent } from "../types";

type TimeFilter = "Upcoming" | "Past";
const TIME_FILTERS: TimeFilter[] = ["Upcoming", "Past"];

/**
 * The events directory, routed at `/events`.
 *
 * **Live data, September 2026** — `GET /events` (`eventEndpoints.directory()`)
 * via `useSWR`, mapped through `utils/toDisplayEvent.ts`. Replaces the
 * fixture `constants/eventDirectory.ts` used to render — that file, its
 * `eventDetails.ts` companion, and the `cause`/`going`/`spotsLeft` fields
 * they invented are deleted, not just unused; `DetailedEvent.tsx` is wired
 * to live data too now (`utils/toDisplayEventDetail.ts`).
 *
 * Two real differences from `/organizations`' directory, both because an
 * event has a date and an organization doesn't:
 * - The filter chips are **Upcoming/Past**, not a cause taxonomy — a live
 *   event has no cause field at all (`event.model.ts`), and "what's
 *   happening soon" is the question this page actually answers.
 * - Results are grouped into same-day sections (`groupEventsByDay`) rather
 *   than one flat grid — with only a handful of real events today, a flat
 *   3-column grid reads as mostly empty space; a dated list reads as
 *   intentional. See that file's own comment.
 *
 * `GET /events` has no server-side search filter to send (unlike
 * `organizations`' `search`/`domain` params — `listEventsQuerySchema` only
 * knows `uid`/`slug`/`host`/pagination), so search and the Upcoming/Past
 * split both run client-side over one generously-paged fetch
 * (`eventEndpoints.directory()`'s default `limit=100`) rather than being
 * sent to the backend.
 *
 * The "Create An Event" button still opens `CreateEvent`, which per
 * `docs/specs/known-issues.md` patches the user's profile instead of
 * creating an event. That bug is untouched here — it is the modal's, not
 * this page's.
 */
const Events = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [query, setQuery] = useState("");
  const [when, setWhen] = useState<TimeFilter>("Upcoming");

  const { data, isLoading } = useSWR<ApiEventList>(
    eventEndpoints.directory(),
    fetcher,
  );

  // Stable for the life of the page, not recomputed on every render — an
  // event doesn't need to hop from "Upcoming" to "Past" mid-scroll because
  // a re-render happened to land a few milliseconds later.
  const now = useMemo(() => Date.now(), []);

  const events = useMemo(
    () => (data?.data ?? []).map(toDisplayEvent),
    [data],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = events.filter((event) => {
      const upcoming = new Date(event.startsAt).getTime() >= now;
      if (when === "Upcoming" && !upcoming) return false;
      if (when === "Past" && upcoming) return false;
      if (!needle) return true;

      return [
        event.title,
        event.organizer,
        event.summary,
        event.city ?? "",
        event.country ?? "",
        event.platform ?? "",
        event.mode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    // Soonest-first for what's coming up; most-recent-first for history —
    // the direction someone actually wants to read each list in.
    matches.sort((a, b) => {
      const diff = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      return when === "Upcoming" ? diff : -diff;
    });

    return matches;
  }, [events, query, when, now]);

  const groups = useMemo(() => groupEventsByDay(results), [results]);

  // Scoped to the grid so the reveal never reaches the page chrome above
  // it, and re-run on filter changes so cards revealed by a new filter
  // don't stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, when]);

  return (
    <>
      <ComponentHelmet type="Events" />
      <Navbar />

      <div className="mx-auto max-w-7xl px-9 pt-10 pb-6 sm:px-10 lg:px-12 lg:pt-14">
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
          searchPlaceholder="Search by event, organizer or city"
          searchLabel="Search events"
          options={TIME_FILTERS}
          active={when}
          onSelect={setWhen}
          filterLabel="Filter by time"
          summary={
            <>
              {isLoading && !data
                ? "Loading events"
                : `${results.length} ${results.length === 1 ? "event" : "events"}`}
              {when === "Past" && results.length > 0 && " · past"}
            </>
          }
          action={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-6 font-poppins text-body font-medium whitespace-nowrap text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-colors duration-300 ease-out hover:bg-brand-hover motion-safe:active:scale-97"
            >
              <FaPlus aria-hidden="true" className="size-3.5" />
              Create an event
            </button>
          }
        />
      </div>

      <div className="mx-auto max-w-7xl px-9 pb-20 sm:px-10 lg:px-12">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-16 text-center">
            <h2 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
              {query
                ? "Nothing matches that yet"
                : when === "Upcoming"
                  ? "No upcoming events yet"
                  : "No past events yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65">
              {query
                ? "Try a broader search, or clear it to see every event in the circle."
                : when === "Upcoming"
                  ? "Nothing's on the calendar right now — check back soon, or look at past events."
                  : "Nothing's happened here yet."}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-6 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 motion-safe:active:scale-97"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div ref={gridRef} className="flex flex-col gap-10">
            {groups.map((group) => (
              <section key={group.label} aria-labelledby={`day-${group.label}`}>
                <h2
                  id={`day-${group.label}`}
                  className="mb-4 font-outfit text-caption font-semibold tracking-[0.14em] text-ink/45 uppercase"
                >
                  {group.label}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {group.events.map((event: EventCardEvent) => (
                    <EventCard event={event} key={event.id} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEvent setShowCreateModal={setShowCreateModal} />
      )}

      <Footer />
    </>
  );
};

export default Events;
