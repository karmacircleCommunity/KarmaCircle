import { useMemo, useRef, useState } from "react";
import { PiCaretRightBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { DirectoryToolbar, Footer, Navbar } from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import OrganizationCard from "@features/organizations/components/OrganizationCard";
import { useSectionReveal } from "@hooks";
import { organizationEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import { toDisplayOrganization } from "../utils/toDisplayOrganization";
import type { ApiOrganizationList, OrganizationTaxonomy } from "../types";

/** Clears the domain filter. Not a domain the backend knows about. */
const ALL = "All";

/**
 * The organizations directory, routed at `/organizations`.
 *
 * **Live data**, as of the organization model landing: `GET /organizations`
 * returns only organizations whose profile is complete enough to publish —
 * a half-finished signup is invisible here by design, not by accident (see
 * `docs/specs/organizations.md`). The sample fixture this page used to
 * render still exists in `constants/organizationDirectory.ts` but nothing
 * reads its records any more.
 *
 * Both the search term and the cause chip are sent to the backend rather
 * than applied to the fetched page — see the `useSWR` key below. The chrome
 * around them (field, chips, result count) is the shared
 * `DirectoryToolbar`, the same component `/events` renders.
 */
const Organizations = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>(ALL);

  // The filter chips are the backend's own domain list, fetched rather
  // than hardcoded — a chip the API would never match is a chip that looks
  // broken. See GET /organizations/taxonomy.
  const { data: taxonomy } = useSWR<OrganizationTaxonomy>(
    organizationEndpoints.taxonomy,
    fetcher,
  );

  // Filtering is server-side: the directory is paginated, so filtering a
  // single page in the browser would silently hide matches on page two.
  // `keepPreviousData` is what stops the grid flashing empty on every
  // keystroke while the next response is in flight.
  const { data, isLoading } = useSWR<ApiOrganizationList>(
    organizationEndpoints.directory({
      search: query.trim() || undefined,
      domain: domain === ALL ? undefined : domain,
    }),
    fetcher,
    { keepPreviousData: true },
  );

  const results = useMemo(
    () => (data?.data ?? []).map(toDisplayOrganization),
    [data],
  );

  const domainFilters = useMemo(
    () => [ALL, ...(taxonomy?.domains ?? [])],
    [taxonomy],
  );

  // The results grid gets the same scroll entrance the landing sections
  // use, scoped to the grid so it never reaches the page chrome above it.
  // Re-runs when the result set changes, otherwise cards revealed by a new
  // filter would stay at the hook's starting opacity.
  const gridRef = useRef<HTMLDivElement>(null);

  useSectionReveal(gridRef, [results.length, domain]);

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
          options={domainFilters}
          active={domain}
          onSelect={setDomain}
          filterLabel="Filter by cause"
          summary={
            <>
              {isLoading && !data
                ? "Loading organizations"
                : `${data?.pagination.total ?? results.length} ${
                    (data?.pagination.total ?? results.length) === 1
                      ? "organization"
                      : "organizations"
                  }`}
              {domain !== ALL && ` in ${domain}`}
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
              {query || domain !== ALL
                ? "Nothing matches that yet"
                : "No organizations here yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm font-poppins text-body leading-6 text-ink/65">
              {query || domain !== ALL
                ? "Try a broader search, or clear the cause filter to see every organization in the circle."
                : "An organization appears here once it has finished setting up its profile."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDomain(ALL);
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
