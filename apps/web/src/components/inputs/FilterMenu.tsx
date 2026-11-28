import { useEffect, useId, useRef, useState } from "react";
import { FiFilter, FiX } from "react-icons/fi";
import FilterGroupField from "./FilterGroupField";

export interface FilterGroup {
  /** The question this group answers, e.g. "When". */
  legend: string;
  options: readonly string[];
  /** The applied value. */
  value: string;
  /** The value that narrows nothing. Anything else counts as an active
   *  filter, and "Clear all" returns to it. */
  defaultValue: string;
  /** Called on "Apply filters", only if the value changed. */
  onChange: (value: string) => void;
  /** `segmented` is a full-width switch for two or three short options.
   *  The default is a list with one option per row. */
  layout?: "list" | "segmented";
}

interface FilterMenuProps {
  groups: readonly FilterGroup[];
}

interface FilterDialogProps extends FilterMenuProps {
  id: string;
  onClose: () => void;
}

/** What the dialog holds until it is applied, by group legend. */
type Draft = Record<string, string>;

const draftOf = (
  groups: readonly FilterGroup[],
  pick: (group: FilterGroup) => string,
): Draft =>
  Object.fromEntries(groups.map((group) => [group.legend, pick(group)]));

/**
 * The open panel. It is mounted only while open, so its draft starts from the
 * applied values each time and closing it any other way than "Apply filters"
 * throws the draft away.
 */
const FilterDialog = ({ id, groups, onClose }: FilterDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(() =>
    draftOf(groups, (group) => group.value),
  );

  const titleId = `${id}-title`;
  const canClear = groups.some(
    (group) => draft[group.legend] !== group.defaultValue,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // A modal dialog leaves the page behind it scrollable. The gutter is held so
  // hiding the scrollbar does not shift the page sideways.
  useEffect(() => {
    const { style } = document.documentElement;
    const { overflow, scrollbarGutter } = style;
    style.overflow = "hidden";
    style.scrollbarGutter = "stable";
    return () => {
      style.overflow = overflow;
      style.scrollbarGutter = scrollbarGutter;
    };
  }, []);

  // Closed through the element first: the page behind a modal dialog is inert,
  // so the button that opened it cannot take focus back until then.
  const close = () => {
    dialogRef.current?.close();
    onClose();
  };

  const apply = () => {
    groups.forEach((group) => {
      const next = draft[group.legend];
      if (next !== group.value) group.onChange(next);
    });
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      // Escape closes the element without going through `close`.
      onClose={onClose}
      // The content covers the dialog, so a press that lands on the dialog
      // itself is a press on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      // Keeps the smooth-scroll wrapper from moving the page instead.
      data-lenis-prevent
      className="liquid-glass fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-full flex-col overflow-hidden rounded-t-3xl border-0 p-0 text-ink backdrop:bg-brand-secondary/25 backdrop:backdrop-blur-[2px] open:flex motion-safe:animate-rise-in sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:w-[min(38rem,calc(100%-3rem))] sm:rounded-3xl sm:motion-safe:animate-pop-in"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-brand-secondary/10 py-3 pr-6 pl-9 sm:pr-4 sm:pl-7">
        <h2
          id={titleId}
          className="m-0 font-outfit text-xl font-semibold tracking-tight text-brand-secondary"
        >
          Filters
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close filters"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink/65 transition-colors duration-200 hover:bg-white/70 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <FiX aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-6 overflow-y-auto overscroll-contain px-9 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
        {groups.map((group) => (
          <FilterGroupField
            key={group.legend}
            group={group}
            name={`${id}-${group.legend}`}
            selected={draft[group.legend]}
            onSelect={(option) =>
              setDraft((current) => ({ ...current, [group.legend]: option }))
            }
          />
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-5 border-t border-brand-secondary/10 px-9 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-4">
        {/* `aria-disabled`, not `disabled`: pressing it must not drop focus
            out of the dialog. */}
        <button
          type="button"
          aria-disabled={!canClear}
          onClick={() =>
            setDraft(draftOf(groups, (group) => group.defaultValue))
          }
          className="min-h-11 shrink-0 cursor-pointer border-none bg-transparent p-0 font-poppins text-body font-medium text-brand underline-offset-4 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-disabled:cursor-default aria-disabled:text-ink/40 aria-disabled:no-underline"
        >
          Clear all
        </button>
        <button
          type="button"
          onClick={apply}
          className="min-h-11 flex-1 cursor-pointer rounded-full border-none bg-brand px-7 font-poppins text-body font-medium text-white shadow-[0_8px_24px_-14px_var(--color-brand)] transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:flex-none"
        >
          Apply filters
        </button>
      </div>
    </dialog>
  );
};

/**
 * Every filter of a list behind one "Filters" button: a dialog from `sm` up, a
 * bottom sheet below it. Choices are a draft until "Apply filters", so the list
 * changes, and is fetched, once. See
 * [08-components-shared.md](../../../../docs/specs/design-system/08-components-shared.md#filtermenu).
 */
const FilterMenu = ({ groups }: FilterMenuProps) => {
  const dialogId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Safari does not focus a button that is clicked, so the browser's own
  // return of focus has nowhere to go back to.
  const closed = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const activeCount = groups.filter(
    (group) => group.value !== group.defaultValue,
  ).length;

  return (
    <div className="shrink-0 self-start sm:self-auto">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={activeCount ? `Filters, ${activeCount} active` : "Filters"}
        onClick={() => setOpen(true)}
        className={`flex h-12 cursor-pointer items-center gap-2 rounded-full border px-5 font-outfit text-body whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          activeCount
            ? "border-brand/45 bg-white text-brand-secondary"
            : "border-brand-secondary/15 bg-transparent text-ink/65 hover:border-brand/35 hover:text-brand-secondary"
        }`}
      >
        <FiFilter aria-hidden="true" className="size-4" />
        Filters
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            data-testid="filter-count"
            className="flex size-5 items-center justify-center rounded-full bg-brand font-poppins text-xs font-medium text-white"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && <FilterDialog id={dialogId} groups={groups} onClose={closed} />}
    </div>
  );
};

export default FilterMenu;
