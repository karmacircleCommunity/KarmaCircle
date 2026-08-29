import { useMemo, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { DirectoryToolbar, Footer, Navbar } from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import { useSectionReveal } from "@hooks";
import { CAUSES } from "@features/organizations/constants/organizationDirectory";
import type { CauseFilter } from "@features/organizations/types";
import CreateEvent from "../components/CreateEvent";
import EventCard from "../components/EventCard";
import { eventDirectory } from "../constants/eventDirectory";

const CAUSE_FILTERS: CauseFilter[] = ["All", ...CAUSES];

/**
 * The events directory, routed at `/events`.
 *
 * **The list is sample content, not live data** - see
 * `constants/eventDirectory.ts`. `services/Events.ts`'s `getEvents()` is
 * still the un-called real fetch; wiring this up means swapping
 * `eventDirectory` for a `useSWR` call and keeping the filtering below,
 * which is deliberately pure client-side work over whatever array it is
 * handed.
 *
 * Deliberately the same page as `/organizations`: the two directories list
 * the same kind of thing for the same visitor, and the previous version - a
 * search box and a "Filters" button with no handlers at all, above a
 * hand-rolled carousel of hardcoded featured cards - had them looking like
 * two different products. The carousel and its
 * `FeaturedEventCard`/`FeaturedEventImage` slides were deleted with it;
 * nothing else imported them. The search/filter/count chrome is now the
 * shared `DirectoryToolbar`, so the two pages can no longer drift apart -
 * this page only supplies the copy, the taxonomy and its own primary
 * button.
 *
 * The "Create An Event" button still opens `CreateEvent`, which per
 * `docs/specs/known-issues.md` patches the user's profile instead of
 * creating an event. That bug is untouched here - it is the modal's, not
 * this page's - but it is the reason this button leads somewhere that
 * cannot yet add a card to this grid.
 */
const Events = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState<CauseFilter>("All");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return eventDirectory.filter((event) => {
      if (cause !== "All" && event.cause !== cause) return false;
      if (!needle) return true;

      return [
        event.title,
        event.organizer,
        event.summary,
        event.cause,
        event.city ?? "",
        event.country ?? "",
        event.platform ?? "",
        event.mode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, cause]);

  // Scoped to the grid so the reveal never reaches the page chrome above
  // it, and re-run on filter changes so cards revealed by a new filter
  // don't stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, cause]);

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
          one by cause, by city, or by name.
        </p>

        <DirectoryToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search by event, organizer or city"
          searchLabel="Search events"
          options={CAUSE_FILTERS}
          active={cause}
          onSelect={setCause}
          filterLabel="Filter by cause"
          summary={
            <>
              {results.length} {results.length === 1 ? "event" : "events"}
              {cause !== "All" && ` in ${cause}`}
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
              Nothing matches that yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65">
              Try a broader search, or clear the cause filter to see every event
              in the circle.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCause("All");
              }}
              className="mt-6 cursor-pointer rounded-full border border-brand/35 bg-transparent px-6 py-2.5 font-poppins text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8 motion-safe:active:scale-97"
            >
              Reset filters
            </button>
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
