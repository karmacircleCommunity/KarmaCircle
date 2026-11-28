import { useRef } from "react";
import type { KeyboardEvent } from "react";

interface MyEventsTabsProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string;
  /** Each tab's id is `<idPrefix>-<value>`, for its panel to point at. */
  idPrefix: string;
  panelId: string;
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
  selected: T;
  onSelect: (value: T) => void;
  /** `switch` is the Attending/Hosting control, `line` the lists under it. */
  variant: "switch" | "line";
}

const LIST_CLASS = {
  switch:
    "mt-8 flex w-full gap-1 rounded-xl bg-brand-secondary/6 p-1 sm:inline-flex sm:w-auto",
  line: "flex flex-wrap gap-x-1 border-b border-brand-secondary/10 sm:gap-x-2",
};

const TAB_CLASS = {
  switch: {
    base: "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none px-4 font-outfit text-body font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand sm:min-w-36 sm:flex-none",
    on: "bg-white text-brand-secondary shadow-sm",
    off: "bg-transparent text-ink/65 hover:text-brand-secondary",
  },
  line: {
    base: "inline-flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-2.5 py-3 font-poppins text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-4",
    on: "border-brand text-brand-secondary",
    off: "border-transparent text-ink/65 hover:text-brand-secondary",
  },
};

/** A keyboard-usable tab list: arrows, Home and End move and select. */
function MyEventsTabs<T extends string>({
  label,
  idPrefix,
  panelId,
  options,
  selected,
  onSelect,
  variant,
}: MyEventsTabsProps<T>) {
  const refs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((option) => option.value === selected);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % options.length;
    else if (event.key === "ArrowLeft") {
      next = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next < 0) return;

    event.preventDefault();
    const { value } = options[next];
    onSelect(value);
    refs.current[value]?.focus();
  };

  const style = TAB_CLASS[variant];

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={LIST_CLASS[variant]}
    >
      {options.map((option) => {
        const on = option.value === selected;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[option.value] = node;
            }}
            id={`${idPrefix}-${option.value}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(option.value)}
            className={`${style.base} ${on ? style.on : style.off}`}
          >
            {option.label}
            {option.count ? (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 font-poppins text-caption text-brand-hover tabular-nums">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default MyEventsTabs;
