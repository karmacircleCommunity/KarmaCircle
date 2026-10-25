import type { ReactNode } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import Combobox, { type ComboboxOption } from "./inputs/Combobox";
import FilterDropdown from "./inputs/FilterDropdown";

interface SuggestionsConfig {
  /** The `Combobox`'s own id — must be unique per page. */
  id: string;
  /** Already matched and ordered by the caller, e.g. the current result
   * set capped to a handful of rows. Empty hides the panel. */
  options: ComboboxOption[];
  /** Fires when a suggestion is picked — typically a direct navigation to
   * the record's own page, not just filling the field. */
  onPick: (option: ComboboxOption) => void;
  /** Announced with the suggestion count, e.g. "organizations". */
  noun?: string;
}

/**
 * A second, independent `FilterDropdown` rendered right after the first -
 * for a page with more than one filterable dimension (e.g. `/events`'
 * Upcoming/Past time split plus an invite/mode taxonomy). Its own generic
 * `U`, not reused from the primary filter's `T`: the two taxonomies are
 * unrelated string unions.
 */
interface SecondaryFilterConfig<U extends string> {
  options: readonly U[];
  active: U;
  onSelect: (option: U) => void;
  filterLabel: string;
}

interface DirectoryToolbarProps<T extends string, U extends string = string> {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  /** The filter taxonomy, `"All"` pseudo-option included. */
  options: readonly T[];
  active: T;
  onSelect: (option: T) => void;
  filterLabel: string;
  /** A second, independent filter dropdown - omitted by `/organizations`
   *  (one dimension: cause). `/events` passes one for its invite/mode
   *  taxonomy, alongside the primary Upcoming/Past filter. */
  secondaryFilter?: SecondaryFilterConfig<U>;
  /**
   * Live result count, e.g. `12 events in Relief`. Optional — omitted by
   * `/organizations` (September 2026, direct feedback that a bare count
   * added nothing above a grid the visitor can just look at); `/events`
   * still passes one, since a dated list benefits from knowing "how many"
   * before scrolling it in a way a visible photo grid doesn't.
   */
  summary?: ReactNode;
  /** The page's single primary action, rendered top-right. */
  action?: ReactNode;
  /**
   * Opt-in live-suggestions dropdown. Omitted (the default, and what
   * `/events` still uses): the field stays a plain `role="searchbox"`
   * input, byte-identical to before this existed. Provided: the field
   * renders through the shared `Combobox` instead (`role="combobox"`),
   * suggesting matches as the visitor types.
   */
  suggestions?: SuggestionsConfig;
}

/**
 * The shared chrome above `/events` and `/organizations`: search, the cause
 * filter, a live result count, and the page's one primary button.
 *
 * Both directories used to inline their own copy of this block, which is
 * how they drifted into looking like two products. It lives here so a
 * change to the toolbar can only ever land on both at once.
 *
 * **Pill toolbar (September 2026).** Field: a flat `surface-muted` pill at
 * rest (that token is the design system's own documented "input/panel
 * background" — see [01-tokens.md](../../../docs/specs/design-system/01-tokens.md)),
 * no shadow until it actually has focus, where it lifts to a white surface
 * with a brand border and one purposeful shadow. Filters: a dropdown
 * trigger in the search row, not a row of always-visible chips — see
 * [`FilterDropdown`](./inputs/FilterDropdown.tsx) and the research behind
 * that switch. `/organizations` passes one (cause); `/events` passes two,
 * `options`/`active`/`onSelect` for Upcoming/Past plus `secondaryFilter`
 * for its invite/mode taxonomy (September 2026) - both are still
 * single-select `FilterDropdown`s, just two independent ones rather than
 * a multi-facet panel, since the two questions ("when" and "what kind")
 * don't need to combine through one control. See
 * [08-components-shared.md](../../../docs/specs/design-system/08-components-shared.md#directorytoolbar)
 * for the full rationale and exact classes.
 */
const DirectoryToolbar = <T extends string, U extends string = string>({
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
  suggestions,
  secondaryFilter,
}: DirectoryToolbarProps<T, U>) => (
  <div className="mt-8 lg:mt-10">
    {/* Search + filter dropdown + primary action. One row from `sm` up; on
        a phone each drops onto its own line rather than squeezing down. */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="group flex flex-1 items-center gap-3 rounded-full border border-transparent bg-surface-muted px-5 py-3 transition-[background-color,border-color,box-shadow] duration-200 focus-within:border-brand/45 focus-within:bg-white focus-within:shadow-[0_10px_24px_-16px_color-mix(in_srgb,var(--color-brand)_45%,transparent)]">
        <FiSearch
          aria-hidden="true"
          className="size-4.5 shrink-0 text-ink/35 transition-colors duration-200 group-focus-within:text-brand"
        />

        {suggestions ? (
          <>
            {/* `Combobox` has no `aria-label` prop of its own — it expects a
                sibling `<label htmlFor>`, per its own doc comment. */}
            <label htmlFor={suggestions.id} className="sr-only">
              {searchLabel}
            </label>
            <Combobox
              id={suggestions.id}
              value={query}
              onChange={onQueryChange}
              onPick={suggestions.onPick}
              options={suggestions.options}
              placeholder={searchPlaceholder}
              noun={suggestions.noun}
              // `w-full`, not `min-w-0 flex-1`: this `<input>` isn't the flex
              // item in DirectoryToolbar's row — `Combobox`'s own wrapper div
              // is (see that component's comment on its `min-w-0 flex-1`).
              // The input needs to fill *that* wrapper, or it falls back to
              // its browser-default ~20ch intrinsic width and `truncate`
              // clips the placeholder well short of the pill's real width.
              className="w-full truncate border-none bg-transparent font-poppins text-body-lg text-ink outline-none placeholder:text-ink/35"
            />
          </>
        ) : (
          <input
            // Deliberately `type="text"` with `role="searchbox"`, not
            // `type="search"`: this component already renders its own icon
            // and clear button, but `type="search"` still draws browser-native
            // chrome on top of that — a magnifier/clear glyph in some
            // browsers, and specifically a native clear "×" in Firefox that
            // `::-webkit-search-cancel-button` (Chrome/Safari-only) never
            // touches. Two clear controls appearing/disappearing at slightly
            // different times is what read as "a weird animation" — not this
            // component's own transitions, which are unchanged.
            type="text"
            role="searchbox"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="min-w-0 flex-1 truncate border-none bg-transparent font-poppins text-body-lg text-ink outline-none placeholder:text-ink/35"
          />
        )}

        {/* Rendered at all times (not conditionally mounted) so it fades in
          rather than popping into existence and nudging the field's
          content — `invisible` still removes it from the tab order via
          `aria-hidden`/`tabIndex`, it just doesn't unmount. */}
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          aria-hidden={!query}
          tabIndex={query ? 0 : -1}
          className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink/40 transition-[opacity,color] duration-200 hover:text-brand ${
            query ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <FiX className="size-4" />
        </button>
      </div>

      <FilterDropdown
        label={filterLabel}
        options={options}
        active={active}
        onSelect={onSelect}
      />

      {secondaryFilter && (
        <FilterDropdown
          label={secondaryFilter.filterLabel}
          options={secondaryFilter.options}
          active={secondaryFilter.active}
          onSelect={secondaryFilter.onSelect}
        />
      )}

      {action}
    </div>

    {/* Live result count. Used to sit beside a row of always-visible
        chips; now that the taxonomy lives inside `FilterDropdown`'s own
        panel, this is the row's only remaining content — and, on
        `/organizations`, not rendered at all (see `summary`'s own doc
        comment above). */}
    {summary && (
      <p
        aria-live="polite"
        className="mt-4 font-poppins text-caption tracking-wide text-ink/45 uppercase"
      >
        {summary}
      </p>
    )}
  </div>
);

export default DirectoryToolbar;
