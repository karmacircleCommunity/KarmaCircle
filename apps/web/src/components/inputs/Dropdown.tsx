import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";
import {
  computePanelPlacement,
  filterOptions,
  findTypeaheadIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./dropdownUtils";
import type { DropdownOption, PanelPlacement } from "./dropdownUtils";

export type { DropdownOption } from "./dropdownUtils";

export interface DropdownProps<T extends string = string> {
  /** The id of the trigger button. Point the field's `<label htmlFor>` at it,
   * so the label names the control and clicking the label opens it. */
  id: string;
  options: readonly DropdownOption<T>[];
  /** The chosen option's `value`, or `""` when nothing is chosen yet. */
  value: T | "";
  onChange: (value: T) => void;
  /** Shown in the trigger while `value` is empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Draws the error border. The message itself belongs to the field. */
  invalid?: boolean;
  /** `true` always shows a search box, `false` never does, and `"auto"` (the
   * default) shows one once the list is longer than `SEARCH_THRESHOLD`. */
  searchable?: boolean | "auto";
  searchPlaceholder?: string;
  /** Shown in the panel when a search matches nothing. */
  emptyMessage?: string;
  /** Needed only when no `<label htmlFor={id}>` names the trigger. */
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** Extra classes for the trigger, e.g. a different width. */
  className?: string;
  dataCy?: string;
}

/** Lists longer than this get a search box when `searchable` is `"auto"`. */
export const SEARCH_THRESHOLD = 10;
/** The tallest the open panel ever is, in px. */
const MAX_PANEL_HEIGHT = 360;
/** The narrowest the open panel ever is, in px, whatever the trigger's width. */
const MIN_PANEL_WIDTH = 224;
/** How long a pause ends a type-ahead word, in ms. */
const TYPEAHEAD_RESET_MS = 600;

/**
 * The app's one single-select dropdown: a form control that replaces the native
 * `<select>`, with a search box on long lists, full keyboard support and a panel
 * that flips and slides to stay on screen.
 *
 * The trigger is the ARIA "select-only combobox" and the panel a listbox, with
 * focus staying on the trigger (or the search box when there is one) and the
 * highlighted row exposed through `aria-activedescendant`. The panel is rendered
 * in a portal, so no `overflow: hidden` ancestor can clip it.
 *
 * Full spec, props and decisions:
 * [08-components-shared.md](../../../../../docs/specs/design-system/08-components-shared.md#dropdown).
 *
 * `FilterDropdown` is a different thing (a pill-shaped taxonomy filter in
 * `DirectoryToolbar`); this is the form-field control.
 */
const Dropdown = <T extends string = string>({
  id,
  options,
  value,
  onChange,
  placeholder = "Choose an option",
  disabled = false,
  invalid = false,
  searchable = "auto",
  searchPlaceholder = "Search",
  emptyMessage = "No matches",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  className = "",
  dataCy,
}: DropdownProps<T>) => {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLUListElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);
  const typeahead = useRef({ buffer: "", timer: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  const hasSearch =
    searchable === "auto" ? options.length > SEARCH_THRESHOLD : searchable;
  // A phone's on-screen keyboard would cover the list the moment the search box
  // took focus, so on touch the box is there but is not focused for you.
  const searchOwnsFocus =
    hasSearch &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: fine)").matches;

  const visible = useMemo(
    () => (hasSearch ? filterOptions(options, query) : options),
    [hasSearch, options, query],
  );
  const selected = options.find((option) => option.value === value);
  const optionId = (index: number) => `${listId}-option-${index}`;
  const activeId = open && active >= 0 ? optionId(active) : undefined;
  const placed = placement !== null;
  // The panel needs a name of its own. It is the trigger's own, which the
  // field's `<label htmlFor>` supplies when `aria-label` is not given.
  const accessibleName = open
    ? (ariaLabel ??
      document
        .querySelector(`label[for="${CSS.escape(id)}"]`)
        ?.textContent?.trim() ??
      "Options")
    : "Options";

  const openPanel = useCallback(
    (initialQuery = "") => {
      if (disabled) return;
      const shown = hasSearch ? filterOptions(options, initialQuery) : options;
      const chosen = initialQuery
        ? -1
        : shown.findIndex((option) => option.value === value);
      setQuery(initialQuery);
      setActive(chosen >= 0 ? chosen : nextEnabledIndex(shown, -1, 1));
      setOpen(true);
    },
    [disabled, hasSearch, options, value],
  );

  const closePanel = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setPlacement(null);
    if (returnFocus) trigger.current?.focus();
  }, []);

  const choose = (option: DropdownOption<T> | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    closePanel(true);
  };

  // Places the panel against the trigger, and keeps it there while the page
  // scrolls or resizes. If the trigger scrolls out of view the panel closes
  // rather than hanging in mid-air.
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closePanel(false);
        return;
      }
      const next = computePanelPlacement({
        trigger: rect,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        maxPanelHeight: MAX_PANEL_HEIGHT,
        minPanelWidth: MIN_PANEL_WIDTH,
      });
      // Scrolling the list inside the panel also lands here; keep the same
      // object when nothing moved so that does not re-render the panel.
      setPlacement((current) =>
        current &&
        current.side === next.side &&
        current.left === next.left &&
        current.width === next.width &&
        current.top === next.top &&
        current.bottom === next.bottom &&
        current.maxHeight === next.maxHeight
          ? current
          : next,
      );
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, closePanel]);

  // Closes on a press outside, not on blur: blur also fires when focus moves to
  // the browser's own chrome, and a list that vanishes then feels broken.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target))
        return;
      closePanel(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closePanel]);

  // Focus waits for `placed`: a hidden element cannot take focus.
  useEffect(() => {
    if (!open || !placed || !searchOwnsFocus) return;
    const input = search.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [open, placed, searchOwnsFocus]);

  useEffect(() => {
    if (!open || !placed || active < 0) return;
    list.current
      ?.querySelector(`[id="${listId}-option-${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, placed, active, listId]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const onQueryChange = (next: string) => {
    setQuery(next);
    setActive(nextEnabledIndex(filterOptions(options, next), -1, 1));
  };

  const runTypeahead = (character: string) => {
    window.clearTimeout(typeahead.current.timer);
    typeahead.current.buffer += character;
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.buffer = "";
    }, TYPEAHEAD_RESET_MS);

    const index = findTypeaheadIndex(visible, typeahead.current.buffer, active);
    if (index >= 0) setActive(index);
  };

  // One handler for both places focus can be: the trigger, or the search box.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const inSearch = event.target === search.current;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openPanel();
      } else if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        // Typing on a closed trigger opens it already searching (long lists) or
        // already jumped to that letter (short ones).
        event.preventDefault();
        if (hasSearch) openPanel(event.key);
        else {
          openPanel();
          runTypeahead(event.key);
        }
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        setActive((current) =>
          nextEnabledIndex(
            visible,
            current,
            event.key === "ArrowDown" ? 1 : -1,
          ),
        );
        break;
      case "Home":
        if (inSearch) return;
        event.preventDefault();
        setActive(nextEnabledIndex(visible, -1, 1));
        break;
      case "End":
        if (inSearch) return;
        event.preventDefault();
        setActive(lastEnabledIndex(visible));
        break;
      case "Enter":
        event.preventDefault();
        choose(visible[active]);
        break;
      case " ":
        if (inSearch) return;
        event.preventDefault();
        choose(visible[active]);
        break;
      case "Escape":
        event.preventDefault();
        // Keeps a surrounding dialog from also closing on this one press.
        event.stopPropagation();
        closePanel(true);
        break;
      case "Tab":
        // Hands focus back to the trigger first so Tab moves on from there, not
        // from a search box that is about to disappear.
        closePanel(true);
        break;
      default:
        if (
          !inSearch &&
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault();
          runTypeahead(event.key);
        }
    }
  };

  const triggerState = disabled
    ? "cursor-not-allowed border-brand-secondary/10 bg-surface-warm/45 text-ink/50"
    : invalid
      ? "border-error bg-white ring-2 ring-error/15"
      : open
        ? "border-brand/55 bg-white ring-2 ring-brand/15"
        : "border-brand-secondary/15 bg-white hover:border-brand/35 focus-visible:border-brand/55 focus-visible:ring-2 focus-visible:ring-brand/15";

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={searchOwnsFocus ? undefined : activeId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        data-value={value}
        data-cy={dataCy}
        onClick={() => (open ? closePanel(false) : openPanel())}
        onKeyDown={onKeyDown}
        // Firefox clicks a button on Space's keyup even when keydown was
        // handled, which would open the panel and shut it again at once.
        onKeyUp={(event) => {
          if (event.key === " ") event.preventDefault();
        }}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left font-outfit text-body transition outline-none ${triggerState} ${className}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected ? "text-ink" : "text-ink/40"}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <FiChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-ink/45 transition-transform duration-200 ${open ? "rotate-180 text-brand" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panel}
            // Invisible until placed, so it never flashes in the wrong spot.
            style={
              placement
                ? {
                    left: placement.left,
                    width: placement.width,
                    top: placement.top,
                    bottom: placement.bottom,
                    maxHeight: placement.maxHeight,
                  }
                : { visibility: "hidden" }
            }
            data-cy={dataCy ? `${dataCy}-panel` : undefined}
            className={`fixed z-50 flex flex-col overflow-hidden rounded-xl border border-brand-secondary/12 bg-white shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in ${placement?.side === "top" ? "origin-bottom" : "origin-top"}`}
          >
            {hasSearch && (
              <div className="flex shrink-0 items-center gap-2 border-b border-brand-secondary/10 px-3.5">
                <FiSearch
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink/40"
                />
                <input
                  ref={search}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={searchOwnsFocus ? activeId : undefined}
                  aria-autocomplete="list"
                  aria-label={`${accessibleName}, search`}
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-h-12 w-full min-w-0 border-none bg-transparent font-outfit text-body text-ink outline-none placeholder:text-ink/40"
                />
              </div>
            )}

            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-label={accessibleName}
              data-cy={dataCy ? `${dataCy}-options` : undefined}
              className="m-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-1.5"
            >
              {visible.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === active;
                return (
                  <li
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    data-cy={
                      dataCy ? `${dataCy}-option-${option.value}` : undefined
                    }
                    // Keeps focus on the trigger or search box through the press.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    onMouseMove={() => {
                      if (!option.disabled && index !== active)
                        setActive(index);
                    }}
                    className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 font-outfit text-body transition-colors ${
                      option.disabled
                        ? "cursor-not-allowed text-ink/35"
                        : "cursor-pointer"
                    } ${
                      isActive && isSelected
                        ? "bg-brand/8 font-medium text-brand"
                        : isActive
                          ? "bg-surface-muted text-ink"
                          : isSelected
                            ? "font-medium text-brand"
                            : "text-ink/80"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block break-words">{option.label}</span>
                      {option.description && (
                        <span className="mt-0.5 block font-poppins text-caption font-normal text-ink/55">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <FiCheck
                        aria-hidden="true"
                        className="size-4 shrink-0 text-brand"
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {visible.length === 0 && (
              <p className="m-0 px-4 py-6 text-center font-poppins text-body text-ink/55">
                {emptyMessage}
                {query.trim() ? ` for “${query.trim()}”` : ""}
              </p>
            )}

            {hasSearch && (
              <p role="status" className="sr-only">
                {visible.length === 0
                  ? emptyMessage
                  : `${visible.length} ${visible.length === 1 ? "option" : "options"} available`}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default Dropdown;
