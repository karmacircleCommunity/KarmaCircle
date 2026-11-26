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

/** The panel's `w-56`, and the least room to leave at either screen edge. */
const PANEL_WIDTH_PX = 224;
const PANEL_EDGE_PX = 16;

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
  // The panel's left edge, relative to the trigger.
  const [panelLeft, setPanelLeft] = useState(0);

  const toggle = () => {
    // Measured as the panel opens. It lines up with the trigger's right edge,
    // or with its left edge when that would cross the screen's edge, then
    // slides as far as it must to stay on screen: a wrapped toolbar can put the
    // trigger anywhere across a phone.
    if (!open && wrapper.current) {
      const { left, right } = wrapper.current.getBoundingClientRect();
      const furthest =
        document.documentElement.clientWidth - PANEL_EDGE_PX - PANEL_WIDTH_PX;
      const endAligned = right - PANEL_WIDTH_PX;
      const preferred = endAligned >= PANEL_EDGE_PX ? endAligned : left;
      const onScreen = Math.max(PANEL_EDGE_PX, Math.min(preferred, furthest));
      setPanelLeft(onScreen - left);
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
            : "border-brand-secondary/15 bg-transparent text-ink/65 hover:border-brand/35 hover:text-brand-secondary"
        }`}
      >
        {/* Dropped on a phone, where its width costs a toolbar line. */}
        <FiFilter aria-hidden="true" className="hidden size-3 sm:block" />
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
          className="absolute top-full z-30 mt-2 max-h-72 w-56 list-none overflow-y-auto overscroll-contain rounded-xl border border-brand-secondary/15 bg-white p-1 shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in"
          style={{ left: panelLeft }}
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
                      ? "bg-brand/8 font-medium text-brand-hover"
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
