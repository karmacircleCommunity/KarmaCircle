import { useMemo, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import useSWR from "swr";
import { DirectoryToolbar, Footer, Navbar } from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import { useMagnetic, useSectionReveal } from "@hooks";
import { eventEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import CreateEvent from "../components/CreateEvent";
import EventCard from "../components/EventCard";
import { toDisplayEvent } from "../utils/toDisplayEvent";
import type { ApiEventList } from "../types";

type TimeFilter = "Upcoming" | "Past";
const TIME_FILTERS: TimeFilter[] = ["Upcoming", "Past"];

/**
 * The second, independent filter dimension (September 2026) - audience
 * (`inviteOnly`) and mode (`Online`/`Offline`) are two unrelated fields on
 * `event.model.ts`, not four values of one taxonomy, but this directory
 * exposes them as one flat single-select list rather than two more
 * dropdowns crowding the toolbar - matching how `/organizations`' single
 * cause `FilterDropdown` reads. Picking one clears the others (the same
 * "one value wins" behavior `FilterDropdown` already has), so "online" and
 * "invite only" can't be combined here; that tradeoff was a deliberate
 * choice over building a multi-select variant for a four-option list.
 */
type TypeFilter = "All" | "Invite only" | "Open to all" | "Online" | "Offline";
const TYPE_FILTERS: TypeFilter[] = [
  "All",
  "Invite only",
  "Open to all",
  "Online",
  "Offline",
];

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
 * Real differences from `/organizations`' directory, all because an event
 * has a date and a couple of access/mode flags an organization doesn't:
 * - The primary filter is **Upcoming/Past**, not a cause taxonomy — a live
 *   event has no cause field at all (`event.model.ts`), and "what's
 *   happening soon" is the question this page actually answers.
 * - A second filter (`TypeFilter`, September 2026) narrows by
 *   invite-only/open-to-all and online/offline — two real fields on
 *   `event.model.ts` (`inviteOnly`, `mode`), flattened into one
 *   single-select list rather than combinable checkboxes (see that type's
 *   own comment for the tradeoff).
 * - Results render as one flat grid, sorted soonest-first for Upcoming and
 *   most-recent-first for Past. They used to be bucketed into same-day
 *   sections (`groupEventsByDay`, removed September 2026) - with the seed
 *   data's real spread of dates, most sections held exactly one event, so
 *   the headers added structure without adding information; `EventCard`'s
 *   own date badge already says which day an event is on.
 *
 * `GET /events` has no server-side search filter to send (unlike
 * `organizations`' `search`/`domain` params — `listEventsQuerySchema` only
 * knows `uid`/`slug`/`host`/pagination), so search, the Upcoming/Past split
 * and the type filter all run client-side over one generously-paged fetch
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
  const [type, setType] = useState<TypeFilter>("All");

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

      if (type === "Invite only" && !event.inviteOnly) return false;
      if (type === "Open to all" && event.inviteOnly) return false;
      if (type === "Online" && event.mode !== "Online") return false;
      if (type === "Offline" && event.mode !== "Offline") return false;

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
  }, [events, query, when, type, now]);

  // Magnetic, matching `Organizations.tsx`'s "Your dashboard" button
  // (September 2026) — both directories' one primary action now lean
  // toward the cursor, rather than one gaining it and the other visibly
  // not. No `hover:-translate-*`/`active:scale-*` here: the hook owns the
  // element's transform.
  const createEventButtonRef = useMagnetic<HTMLButtonElement>({
    strength: 0.3,
    max: 8,
  });

  // Scoped to the grid so the reveal never reaches the page chrome above
  // it, and re-run on filter changes so cards revealed by a new filter
  // don't stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, when, type]);

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
          searchPlaceholder="Search by event, organizer or city"
          searchLabel="Search events"
          options={TIME_FILTERS}
          active={when}
          onSelect={setWhen}
          filterLabel="Filter by time"
          secondaryFilter={{
            options: TYPE_FILTERS,
            active: type,
            onSelect: setType,
            filterLabel: "Filter by type",
          }}
          summary={
            <>
              {isLoading && !data
                ? "Loading events"
                : `${results.length} ${results.length === 1 ? "event" : "events"}`}
              {when === "Past" && results.length > 0 && " · past"}
              {type !== "All" && results.length > 0 && ` · ${type.toLowerCase()}`}
            </>
          }
          action={
            <button
              ref={createEventButtonRef}
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-6 font-poppins text-body font-medium whitespace-nowrap text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-[background-color,box-shadow] duration-300 ease-out hover:bg-brand-hover hover:shadow-[0_16px_34px_-12px_var(--color-brand)]"
            >
              <FaPlus
                aria-hidden="true"
                className="size-3.5 transition-transform duration-300 ease-out motion-safe:group-hover:rotate-90"
              />
              Create an event
            </button>
          }
        />
      </div>

      <div className="mx-auto max-w-6xl px-9 pb-20 sm:px-10 lg:px-12">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-16 text-center">
            <h2 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
              {query || type !== "All"
                ? "Nothing matches that yet"
                : when === "Upcoming"
                  ? "No upcoming events yet"
                  : "No past events yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65">
              {query || type !== "All"
                ? "Try a broader search, or clear the filters to see every event in the circle."
                : when === "Upcoming"
                  ? "Nothing's on the calendar right now — check back soon, or look at past events."
                  : "Nothing's happened here yet."}
            </p>
            {(query || type !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setType("All");
                }}
                className="mt-6 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 motion-safe:active:scale-97"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {results.map((event) => (
              <EventCard event={event} key={event.id} />
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
