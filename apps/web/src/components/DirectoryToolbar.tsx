import type { ReactNode } from "react";
import { FiSearch, FiX } from "react-icons/fi";

interface DirectoryToolbarProps<T extends string> {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  /** The filter taxonomy, `"All"` pseudo-option included. */
  options: readonly T[];
  active: T;
  onSelect: (option: T) => void;
  filterLabel: string;
  /** Live result count, e.g. `12 events in Relief`. */
  summary: ReactNode;
  /** The page's single primary action, rendered top-right. */
  action?: ReactNode;
}

/**
 * The shared chrome above `/events` and `/organizations`: search, the cause
 * filter, a live result count, and the page's one primary button.
 *
 * Both directories used to inline their own copy of this block, which is
 * how they drifted into looking like two products. It lives here so a
 * change to the toolbar can only ever land on both at once.
 *
 * The visual weight is deliberately low. The earlier version stacked a
 * shadowed white search pill, nine outlined chips and a separate uppercase
 * count line - three heavy rows of chrome above the content the visitor
 * actually came for. Here the field is a single underline, the filters are
 * plain text with the active one underlined in brand, and the count shares
 * the filter row, so the solid button is the only filled surface on the
 * page above the cards.
 */
const DirectoryToolbar = <T extends string>({
  query,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  options,
  active,
  onSelect,
  filterLabel,
  summary,
  action,
}: DirectoryToolbarProps<T>) => (
  <div className="mt-8 lg:mt-10">
    {/* Search + primary action. One row from `sm` up; on a phone the button
        drops below the field rather than squeezing the input down to a few
        characters. */}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="group flex flex-1 items-center gap-3 border-b border-brand-secondary/15 pb-3 transition-colors duration-200 focus-within:border-brand/55">
        <FiSearch
          aria-hidden="true"
          className="size-4.5 shrink-0 text-ink/35 transition-colors duration-200 group-focus-within:text-brand"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          // Safari draws its own clear affordance on type="search"; this
          // component renders its own so the two don't stack.
          className="min-w-0 flex-1 border-none bg-transparent font-poppins text-body-lg text-ink outline-none placeholder:text-ink/35 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink/40 transition-colors duration-200 hover:text-brand"
          >
            <FiX className="size-4" />
          </button>
        )}
      </div>

      {action}
    </div>

    {/* Filters + count. A horizontal scroller on narrow screens rather than
        a wrapping four-row block that pushes the grid below the fold. */}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <div
        role="group"
        aria-label={filterLabel}
        className="-mx-9 flex gap-6 overflow-x-auto px-9 pb-1 sm:mx-0 sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const selected = option === active;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option)}
              className={`shrink-0 cursor-pointer border-none bg-transparent p-0 pb-1 font-outfit text-body whitespace-nowrap transition-colors duration-200 ${
                selected
                  ? "border-b-2 border-solid border-brand font-medium text-brand"
                  : "border-b-2 border-solid border-transparent text-ink/55 hover:text-brand-secondary"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="shrink-0 font-poppins text-caption tracking-wide text-ink/45 uppercase"
      >
        {summary}
      </p>
    </div>
  </div>
);

export default DirectoryToolbar;
