import { useMemo, useRef, useState } from "react";
import { PiCaretRightBold } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import type { ComboboxOption } from "@components/inputs/Combobox";
import {
  DirectoryToolbar,
  FilterDropdown,
  Footer,
  InfiniteScroll,
  Navbar,
  SkeletonRegion,
} from "@components";
import ComponentHelmet from "@components/ComponentHelmet";
import OrganizationCard from "@features/organizations/components/OrganizationCard";
import OrganizationCardSkeleton from "@features/organizations/components/OrganizationCardSkeleton";
import { useMagnetic, usePagedList, useSectionReveal } from "@hooks";
import { organizationEndpoints } from "@services/ApiEndpoints";
import fetcher from "@utils/Fetcher";
import { toDisplayOrganization } from "../utils/toDisplayOrganization";
import type {
  ApiOrganization,
  ApiOrganizationList,
  DisplayOrganization,
  OrganizationTaxonomy,
} from "../types";

/** Clears the domain filter. Not a domain the backend knows about. */
const ALL = "All";

/** Cards per page; the next one loads as the reader nears the end. */
const PAGE_SIZE = 12;
/** Columns of the widest grid. */
const COLUMNS_MAX = 3;

/**
 * The organizations directory, routed at `/organizations`.
 *
 * **Live data**, as of the organization model landing: `GET /organizations`
 * returns only organizations whose profile is complete enough to publish —
 * a half-finished signup is invisible here by design, not by accident (see
 * `docs/specs/organizations.md`). The twelve-organization sample fixture
 * this page used to render (`constants/organizationDirectory.ts`) is
 * deleted, not just unused — real demo data lives in
 * `apps/api/scripts/seed-demo-data.ts` now.
 *
 * Both the search term and the cause chip are sent to the backend rather
 * than applied to the fetched page — see the `usePagedList` key below. The chrome
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

  // Filtering is server-side: the directory is paginated, so filtering the
  // loaded pages in the browser would silently hide matches further down.
  // `keepPreviousData` is what stops the grid flashing empty on every
  // keystroke while the next response is in flight; `isLoading` with the old
  // cards still on screen is what lets the grid dim itself smoothly instead of
  // popping straight to the new set once it lands (see the wrapper below).
  // Further pages load as the reader scrolls and do not dim anything.
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
  } = usePagedList<ApiOrganization, ApiOrganizationList>({
    getKey: (page) =>
      organizationEndpoints.directory({
        search: query.trim() || undefined,
        domain: domain === ALL ? undefined : domain,
        page,
        limit: PAGE_SIZE,
      }),
    itemKey: (organization) => organization.id,
    config: { keepPreviousData: true },
  });

  const results = useMemo(() => items.map(toDisplayOrganization), [items]);
  const loadFailed = Boolean(error) && results.length === 0;

  // Live suggestions while typing, reusing the already-fetched, already
  // server-filtered `results` rather than a second request — capped so the
  // dropdown never outgrows `Combobox`'s own panel. Picking one jumps
  // straight to that organization's profile rather than just filling the
  // field, which is the point of a suggestion over the grid it sits above.
  const suggestionOptions = useMemo<ComboboxOption[]>(
    () =>
      query.trim()
        ? results.slice(0, 6).map((organization) => ({
            value: organization.name,
            label: organization.name,
            hint: organization.city,
            data: organization,
          }))
        : [],
    [results, query],
  );

  const handleSuggestionPick = (option: ComboboxOption) => {
    const organization = option.data as DisplayOrganization;
    navigate(`/organization/${organization.userName}`);
  };

  // Magnetic, so the primary action leans toward the cursor — matches
  // `OpenSource.tsx`'s primary CTA. Note it carries no `hover:-translate-*`/
  // `active:scale-*`: this hook owns its transform (see `useMagnetic.ts`);
  // the hover/press feedback here is expressed in shadow and colour instead.
  const dashboardButtonRef = useMagnetic<HTMLButtonElement>({
    strength: 0.3,
    max: 8,
  });

  // "Featured" means only what it says: an organization that actually
  // turned sponsorship on, never just "whichever came first" — this app's
  // own convention is not to invent significance a record doesn't have
  // (see the profile's "sections with nothing behind them don't render"
  // rule). The backend already sorts these first (organization.service.ts
  // #findLive), so this is a filter over an existing order, not a second
  // query. Only on the unfiltered view: a search or a domain filter is the
  // visitor asking a specific question, and a strip above the answer would
  // read as the page ignoring them.
  const isUnfiltered = query.trim() === "" && domain === ALL;
  const featured = isUnfiltered
    ? results.filter((org) => org.sponsorship?.enabled).slice(0, 2)
    : [];
  const featuredIds = new Set(featured.map((org) => org._id));
  const rest = results.filter((org) => !featuredIds.has(org._id));

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

      <div className="mx-auto max-w-6xl px-9 pt-10 pb-6 sm:px-10 lg:px-12 lg:pt-14">
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
          filters={
            <FilterDropdown
              label="Filter by cause"
              options={domainFilters}
              active={domain}
              onSelect={setDomain}
            />
          }
          suggestions={{
            id: "organizations-search",
            options: suggestionOptions,
            onPick: handleSuggestionPick,
            noun: "organizations",
          }}
          action={
            <button
              ref={dashboardButtonRef}
              type="button"
              onClick={() => navigate("/dashboard")}
              className="group flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand px-6 font-poppins text-body font-medium whitespace-nowrap text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-[background-color,box-shadow] duration-300 ease-out hover:bg-brand-hover hover:shadow-[0_16px_34px_-12px_var(--color-brand)]"
            >
              Your dashboard
              <PiCaretRightBold
                aria-hidden="true"
                className="size-4 transition-transform duration-300 ease-out motion-safe:group-hover:translate-x-1"
              />
            </button>
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
              Could not load organizations
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
        ) : isLoading && loadedPages === 0 ? (
          // The true first load, before any page has ever arrived — a
          // skeleton grid rather than either a bare spinner or, worse, the
          // empty state (results.length is legitimately 0 while nothing has
          // loaded yet, and rendering "No organizations here yet" for a
          // fraction of a second on every visit is its own separate bug,
          // fixed here alongside the skeleton).
          <SkeletonRegion
            label="Loading organizations"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <OrganizationCardSkeleton key={index} />
            ))}
          </SkeletonRegion>
        ) : results.length === 0 ? (
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
          // Dims (and, briefly, ignores pointer events on) the previous
          // page's cards while a filter/search change is revalidating —
          // `keepPreviousData` is what makes there be a previous page to
          // dim at all — so the swap to the new set reads as a soft
          // crossfade instead of an instant pop, without hand-rolling a
          // prev/next animation state machine for it.
          <div
            ref={gridRef}
            className={`transition-opacity duration-300 ease-out ${
              isLoading ? "pointer-events-none opacity-50" : "opacity-100"
            }`}
          >
            {featured.length > 0 && (
              <div className="mb-10">
                {/* No "Featured organizations" heading here (removed
                    September 2026) — each card already carries its own
                    "Featured" pill (`OrganizationCard`'s `featured` prop),
                    so the section label above the grid was saying the same
                    thing twice. */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {featured.map((organization) => (
                    <OrganizationCard
                      organization={organization}
                      featured
                      key={organization._id}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((organization) => (
                <OrganizationCard
                  organization={organization}
                  key={organization._id}
                />
              ))}
              {isLoadingMore &&
                Array.from(
                  { length: Math.min(remaining, COLUMNS_MAX) },
                  (_, index) => (
                    <OrganizationCardSkeleton key={`pending-${index}`} />
                  ),
                )}
            </div>
          </div>
        )}
        {results.length > 0 && (
          <InfiniteScroll
            {...scroll}
            itemsName="organizations"
            endMessage={
              loadedPages > 1 ? `That's all ${total} organizations.` : undefined
            }
          />
        )}
      </div>

      <Footer />
    </>
  );
};

export default Organizations;
