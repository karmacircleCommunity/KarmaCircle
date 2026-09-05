import { useEffect, useId, useRef, useState } from "react";

/**
 * A text field that suggests, without ever insisting.
 *
 * The distinction is the whole design: this is a `<input type="text">` that
 * happens to offer a list, not a `<select>` wearing a text field's clothes.
 * Whatever is typed is the value, a suggestion is only ever a shortcut to
 * typing it, and a place missing from the list costs the person nothing.
 * That rules out react-select (already a dependency, and used for exactly
 * the closed-set cases it suits): its free-text mode is `creatable`, which
 * announces "create option" for what is really just a place that exists.
 *
 * The parent owns the matching. This component owns only what a combobox
 * has to own to behave like one - when the list is open, which row is
 * active, the keyboard, and the ARIA that makes both legible to a screen
 * reader.
 */

export interface ComboboxOption {
  /** What lands in the field when this row is picked. */
  value: string;
  /** The row's primary text. Usually the same as `value`. */
  label: string;
  /** Muted text on the right of the row - the state, next to a city. */
  hint?: string;
  /** Passed to `onPick`, for callers that need the record behind the row. */
  data?: unknown;
}

interface ComboboxProps {
  /** The input's own id, so a sibling `<label htmlFor>` can point at it. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires only on an actual selection, never on typing. */
  onPick?: (option: ComboboxOption) => void;
  /** Already matched and ordered by the caller. Empty hides the list. */
  options: ComboboxOption[];
  placeholder?: string;
  maxLength?: number;
  /** Utility classes for the `<input>` itself. */
  className?: string;
  dataCy?: string;
  inputRef?: (element: HTMLInputElement | null) => void;
  /** Announced with the suggestion count, e.g. "cities". */
  noun?: string;
}

/**
 * Splits a label around the first case-insensitive occurrence of what has
 * been typed, so the matched run can be set in medium weight.
 *
 * Deliberately matched against the raw strings rather than the normalized
 * ones the ranking uses: normalization collapses punctuation and so shifts
 * character offsets, and a highlight drawn at a shifted offset is worse
 * than no highlight. When the raw text doesn't line up - an accented
 * spelling, a hyphen typed as a space - this simply finds nothing and the
 * row renders plain, which is the correct failure.
 */
const splitMatch = (label: string, query: string) => {
  const trimmed = query.trim();
  const at = trimmed ? label.toLowerCase().indexOf(trimmed.toLowerCase()) : -1;

  if (at === -1) return { before: label, match: "", after: "" };

  return {
    before: label.slice(0, at),
    match: label.slice(at, at + trimmed.length),
    after: label.slice(at + trimmed.length),
  };
};

const Combobox = ({
  id,
  value,
  onChange,
  onPick,
  options,
  placeholder,
  maxLength,
  className = "",
  dataCy,
  inputRef,
  noun = "suggestions",
}: ComboboxProps) => {
  const listId = useId();
  const wrapper = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLUListElement | null>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const showing = open && options.length > 0;

  // A new set of matches means the old highlight is meaningless - it was an
  // index into a list that no longer exists. Back to the best match.
  useEffect(() => {
    setActive(0);
  }, [options]);

  // Keeps the highlighted row inside the scrollable panel when it is being
  // walked with the arrow keys rather than the mouse.
  useEffect(() => {
    if (!showing) return;
    const row = list.current?.children[active];
    row?.scrollIntoView({ block: "nearest" });
  }, [active, showing]);

  // Closing on an outside press rather than on blur: blur fires when focus
  // moves to the browser's own chrome too, and a list that vanishes because
  // someone tabbed to another window and back is a list that feels broken.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (option: ComboboxOption) => {
    onChange(option.value);
    onPick?.(option);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!showing) {
        setOpen(true);
        return;
      }

      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
      return;
    }

    if (event.key === "Enter" && showing) {
      // Without this the keypress reaches the form and submits it, so
      // choosing a suggestion would also advance the whole wizard - one
      // press doing two things, only one of which was asked for.
      event.preventDefault();
      pick(options[active]);
      return;
    }

    if (event.key === "Escape" && showing) {
      // Contained: dismissing the list should not also close whatever the
      // field happens to be inside.
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapper} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showing ? `${listId}-${active}` : undefined}
        // The browser's own address autofill draws its menu in the same
        // place as this one, and two stacked dropdowns is not a choice
        // anybody can make.
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        // Deliberately no `onFocus` opener. These fields are often focused
        // by the page rather than by the person - the setup flow focuses the
        // first answer as each question arrives - and a list that unfurls
        // over a saved answer nobody has touched yet reads as an error.
        // Typing opens it, and so does ArrowDown.
        onKeyDown={onKeyDown}
        data-cy={dataCy}
        className={className}
      />

      {/* Count only, and only while the list is up: a screen reader that has
          just been told the field's label does not also need the first row
          read at it before the user has moved to one. */}
      <span role="status" aria-live="polite" className="sr-only">
        {showing ? `${options.length} ${noun}` : ""}
      </span>

      {showing && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          data-cy={dataCy ? `${dataCy}-options` : undefined}
          // `absolute` so the answer below never shifts down as matches
          // narrow - the page settling under the cursor mid-type is how a
          // field ends up filled with the wrong thing.
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-88 list-none overflow-y-auto overscroll-contain rounded-xl border border-brand-secondary/15 bg-white p-1 shadow-[0_16px_36px_-20px_rgba(56,44,36,0.45)] motion-safe:animate-pop-in"
        >
          {options.map((option, index) => {
            const { before, match, after } = splitMatch(option.label, value);

            return (
              <li key={`${option.value}-${option.hint ?? index}`}>
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // The press has to not blur the field first, or the
                  // outside-press handler closes the list out from under
                  // the click that was choosing from it.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                  onMouseMove={() => setActive(index)}
                  data-cy={
                    dataCy ? `${dataCy}-option-${option.value}` : undefined
                  }
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-none px-3 py-2.5 text-left font-outfit text-body transition-colors ${
                    index === active
                      ? "bg-brand/8 text-brand"
                      : "bg-transparent text-ink/80"
                  }`}
                >
                  <span className="truncate">
                    {before}
                    <span className="font-semibold">{match}</span>
                    {after}
                  </span>
                  {option.hint && (
                    <span
                      className={`shrink-0 font-outfit text-body ${
                        index === active ? "text-brand/70" : "text-ink/40"
                      }`}
                    >
                      {option.hint}
                    </span>
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

export default Combobox;
