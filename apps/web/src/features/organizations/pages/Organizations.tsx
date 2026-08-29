import { useMemo, useRef, useState } from "react";
import { PiCaretRightBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { DirectoryToolbar, Footer, Navbar } from "@components";
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
 * Search and the cause filter both actually filter (the previous version's
 * input and "Filters" button had no handlers at all). Matching is done on
 * name, tagline, cause, city and country so typing "kolkata" or "water"
 * finds something, not just an exact name prefix. The chrome around them -
 * field, filter row, result count - is the shared `DirectoryToolbar`, the
 * same component `/events` renders; the filtering state and logic stay
 * here.
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

        <DirectoryToolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder="Search by name, cause or city"
          searchLabel="Search organizations"
          options={CAUSE_FILTERS}
          active={cause}
          onSelect={setCause}
          filterLabel="Filter by cause"
          summary={
            <>
              {results.length}{" "}
              {results.length === 1 ? "organization" : "organizations"}
              {cause !== "All" && ` in ${cause}`}
            </>
          }
          action={
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-6 font-poppins text-body font-medium whitespace-nowrap text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-colors duration-300 ease-out hover:bg-brand-hover motion-safe:active:scale-97"
            >
              Your dashboard
              <PiCaretRightBold aria-hidden="true" className="size-4" />
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
