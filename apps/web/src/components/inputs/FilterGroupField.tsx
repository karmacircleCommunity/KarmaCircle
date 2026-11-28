import { useState } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import { visibleOptions } from "@utils/filterOptions";
import type { FilterGroup } from "./FilterMenu";

interface FilterGroupFieldProps {
  group: FilterGroup;
  /** Unique within the page; names the radio group. */
  name: string;
  selected: string;
  onSelect: (option: string) => void;
}

/**
 * One question inside `FilterMenu`. A list that outgrows
 * `utils/filterOptions.ts`'s limits shows its first choices with "Show all",
 * and then a search box, so a growing taxonomy never fills the dialog.
 */
const FilterGroupField = ({
  group,
  name,
  selected,
  onSelect,
}: FilterGroupFieldProps) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const segmented = group.layout === "segmented";
  const { shown, choiceCount, searchable, collapsible, noMatches } =
    visibleOptions({
      options: group.options,
      defaultValue: group.defaultValue,
      selected,
      expanded: segmented || expanded,
      query,
    });
  const searchLabel = `Search ${group.legend.toLowerCase()}`;

  return (
    <fieldset
      className={`m-0 min-w-0 border-0 p-0 ${segmented ? "sm:col-span-2" : ""}`}
    >
      <legend className="mb-2 p-0 font-outfit text-body font-semibold text-brand-secondary">
        {group.legend}
      </legend>

      {!segmented && searchable && (
        <div className="mb-2 flex min-h-11 items-center gap-2.5 rounded-lg border border-brand-secondary/15 bg-white/70 px-3 focus-within:border-brand/45 focus-within:bg-white sm:min-h-10">
          <FiSearch
            aria-hidden="true"
            className="size-4 shrink-0 text-ink/50"
          />
          <input
            type="text"
            role="searchbox"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // 16px on a phone, so iOS does not zoom the page on focus.
            className="min-w-0 flex-1 border-none bg-transparent font-poppins text-base text-ink outline-none placeholder:text-ink/60 sm:text-sm"
          />
        </div>
      )}

      <div
        className={
          segmented
            ? "grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-brand-secondary/8 p-1"
            : "flex flex-col gap-0.5"
        }
      >
        {shown.map((option) => {
          const checked = option === selected;
          return (
            <label
              key={option}
              className={`relative flex min-h-11 items-center rounded-lg font-poppins text-sm transition-[background-color,color,box-shadow] duration-200 has-focus-visible:outline-2 has-focus-visible:outline-brand sm:min-h-10 ${
                segmented ? "justify-center px-3" : "gap-3 px-3 py-1.5"
              } ${
                checked
                  ? "bg-white/85 font-medium text-brand-secondary shadow-[inset_0_1px_0_white,0_6px_16px_-10px_rgba(47,36,30,0.45)]"
                  : "text-ink/80 hover:bg-white/55 hover:text-brand-secondary"
              }`}
            >
              {/* Covers the row, so the whole row is the radio. */}
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onSelect(option)}
                className="absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-lg opacity-0"
              />
              {!segmented && (
                <span
                  aria-hidden="true"
                  className={`size-4 shrink-0 rounded-full bg-white transition-[border-width,border-color] duration-200 ${
                    checked
                      ? "border-[5px] border-brand"
                      : "border border-brand-secondary/30"
                  }`}
                />
              )}
              {option}
            </label>
          );
        })}
      </div>

      {noMatches && (
        <p
          role="status"
          className="m-0 px-3 py-2 font-poppins text-sm text-ink/70"
        >
          No matches.
        </p>
      )}

      {!segmented && collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-transparent px-3 font-poppins text-sm font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand sm:min-h-10"
        >
          {expanded ? "Show less" : `Show all ${choiceCount}`}
          <FiChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </fieldset>
  );
};

export default FilterGroupField;
