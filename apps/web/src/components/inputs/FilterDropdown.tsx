import { useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiFilter } from "react-icons/fi";

interface FilterDropdownProps<T extends string> {
  /** Accessible name for the control, e.g. "Filter by cause". Never shown
   * as its own line of text — carried as `aria-label` on the trigger and
   * the listbox, and read aloud by a screen reader without costing the
   * sighted layout anything. */
  label: string;
  /** The taxonomy to choose from. */
  options: readonly T[];
  /** The trigger always displays this value directly, the same way a
   * native `<select>` does — there is no separate "nothing chosen" state
   * for callers to model, whether or not their taxonomy happens to lead
   * with an "All" pseudo-option. */
  active: T;
  onSelect: (option: T) => void;
  dataCy?: string;
}

/** The panel's `w-56`, plus the least room to leave at the screen's left edge. */
const PANEL_SPACE_PX = 224 + 16;

/**
 * A single-select taxonomy picker that opens a small listbox panel instead
 * of drawing every option on screen at once — see
 * [08-components-shared.md](../../../../docs/specs/design-system/08-components-shared.md#filterdropdown)
 * for the research and rationale behind replacing `DirectoryToolbar`'s old
 * always-visible chip row with this.
 */
const FilterDropdown = <T extends string>({
  label,
  options,
  active,
  onSelect,
  dataCy,
}: FilterDropdownProps<T>) => {
  const listId = useId();
  const wrapper = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [alignStart, setAlignStart] = useState(false);

  const toggle = () => {
    // Measured as the panel opens: a trigger near the left edge (the first
    // one on a wrapped toolbar row) has no room for a right-aligned panel.
    if (!open && wrapper.current) {
      const { right } = wrapper.current.getBoundingClientRect();
      setAlignStart(right < PANEL_SPACE_PX);
    }
    setOpen((value) => !value);
  };

  // Same reasoning as `Combobox`: close on an outside press rather than on
  // blur, so a panel doesn't vanish just because focus briefly left the
  // window (e.g. a press that lands on browser chrome).
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (option: T) => {
    onSelect(option);
    setOpen(false);
  };

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${active}`}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        data-cy={dataCy}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-outfit text-sm whitespace-nowrap transition-colors duration-200 ${
          open
            ? "border-brand/45 bg-white text-brand-secondary"
            : "border-brand-secondary/15 bg-transparent text-ink/55 hover:border-brand/35 hover:text-brand-secondary"
        }`}
      >
        <FiFilter aria-hidden="true" className="size-3" />
        {active}
        <FiChevronDown
          aria-hidden="true"
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          data-cy={dataCy ? `${dataCy}-options` : undefined}
          // `right-0` by default: this trigger usually sits mid-row, between
          // the search field and the primary action, so a left-anchored panel
          // risks overlapping or outgrowing the action button beside it on
          // narrow widths. `left-0` only when the right-anchored panel would
          // leave the screen (see `toggle`).
          className={`absolute top-full z-30 mt-2 max-h-72 w-56 list-none overflow-y-auto overscroll-contain rounded-xl border border-brand-secondary/15 bg-white p-1 shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in ${alignStart ? "left-0" : "right-0"}`}
        >
          {options.map((option) => {
            const selected = option === active;
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(option)}
                  data-cy={dataCy ? `${dataCy}-option-${option}` : undefined}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-none px-3 py-2.5 text-left font-outfit text-body transition-colors ${
                    selected
                      ? "bg-brand/8 font-medium text-brand"
                      : "bg-transparent text-ink/80 hover:bg-surface-muted"
                  }`}
                >
                  {option}
                  {selected && (
                    <FiCheck aria-hidden="true" className="size-4 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FilterDropdown;
