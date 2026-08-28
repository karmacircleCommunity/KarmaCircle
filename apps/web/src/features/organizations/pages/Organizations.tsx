import { useMemo, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { PiCaretRightBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { Footer, Navbar } from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import OrganizationCard from "@features/organizations/components/OrganizationCard";
import { useSectionReveal } from "@hooks";
import {
  CAUSES,
  organizationDirectory,
} from "../constants/organizationDirectory";
import type { CauseFilter } from "../types";

const CAUSE_FILTERS: CauseFilter[] = ["All", ...CAUSES];

/**
 * The organizations directory, routed at `/organizations`.
 *
 * **The list is sample content, not live data** — see
 * `constants/organizationDirectory.ts`. `services/Organizations.ts`'s
 * `getOrganizations()` is still the un-called real fetch; wiring this up
 * means swapping `organizationDirectory` for a `useSWR` call and keeping
 * the filtering below, which is deliberately pure client-side work over
 * whatever array it is handed.
 *
 * Search and the cause chips both actually filter (the previous version's
 * input and "Filters" button had no handlers at all). Matching is done on
 * name, tagline, cause, city and country so typing "kolkata" or "water"
 * finds something, not just an exact name prefix.
 */
const Organizations = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState<CauseFilter>("All");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return organizationDirectory.filter((org) => {
      if (cause !== "All" && org.cause !== cause) return false;
      if (!needle) return true;

      return [org.name, org.tagLine, org.cause, org.city, org.country]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, cause]);

  // The results grid gets the same scroll entrance the landing sections
  // use, scoped to the grid so it never reaches the page chrome above it.
  // Re-runs when the result set changes, otherwise cards revealed by a new
  // filter would stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, cause]);

  return (
    <>
      <ComponentHelmet type="Organizations" />
      <Navbar />

      <div className="mx-auto max-w-7xl px-9 pt-10 pb-6 sm:px-10 lg:px-12 lg:pt-14">
        <h1 className="font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
          Organizations on <span className="text-brand">KarmaCircle</span>
        </h1>
        <p className="mt-3 max-w-xl font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
          Clubs, trusts and collectives running drives in the open. Find one by
          cause, by city, or by name.
        </p>

        {/* Search + dashboard. One row from `sm` up; the dashboard button
            drops below the field on a phone rather than squeezing the input
            down to a few characters. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group flex h-13 flex-1 items-center gap-3 rounded-full border border-brand-secondary/12 bg-white px-5 shadow-[0_2px_14px_-10px_var(--color-brand-secondary)] transition-[border-color,box-shadow] duration-200 focus-within:border-brand/45 focus-within:shadow-[0_6px_20px_-12px_var(--color-brand)]">
            <FiSearch
              aria-hidden="true"
              className="size-4.5 shrink-0 text-ink/40 transition-colors duration-200 group-focus-within:text-brand"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, cause or city"
              aria-label="Search organizations"
              // Safari draws its own clear affordance on type="search";
              // this component renders its own so the two don't stack.
              className="size-full min-w-0 border-none bg-transparent font-poppins text-body text-ink outline-none placeholder:text-ink/40 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-brand-secondary/6 text-ink/55 transition-colors duration-200 hover:bg-brand/12 hover:text-brand"
              >
                <FiX className="size-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex h-13 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-7 font-poppins text-body font-medium whitespace-nowrap text-white shadow-[0_8px_24px_-12px_var(--color-brand)] transition-colors duration-300 ease-out hover:bg-brand-hover motion-safe:active:scale-97"
          >
            Your dashboard
            <PiCaretRightBold aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* Cause chips. A horizontal scroller on narrow screens rather than
            a wrapping four-row block that pushes the grid below the fold. */}
        <div
          role="group"
          aria-label="Filter by cause"
          className="-mx-9 mt-5 flex gap-2 overflow-x-auto px-9 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {CAUSE_FILTERS.map((option) => {
            const active = option === cause;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setCause(option)}
                className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 font-outfit text-body whitespace-nowrap transition-colors duration-200 motion-safe:active:scale-97 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-brand-secondary/12 bg-white text-ink/70 hover:border-brand/40 hover:text-brand"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <p
          aria-live="polite"
          className="mt-6 font-poppins text-caption tracking-wide text-ink/50 uppercase"
        >
          {results.length}{" "}
          {results.length === 1 ? "organization" : "organizations"}
          {cause !== "All" && ` in ${cause}`}
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-9 pb-20 sm:px-10 lg:px-12">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-secondary/15 bg-white/60 px-8 py-16 text-center">
            <h2 className="font-outfit text-xl font-semibold tracking-tight text-brand-secondary">
              Nothing matches that yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65">
              Try a broader search, or clear the cause filter to see every
              organization in the circle.
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
            {results.map((organization) => (
              <OrganizationCard
                organization={organization}
                key={organization._id}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default Organizations;
