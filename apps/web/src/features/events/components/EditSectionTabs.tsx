import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import {
  sectionPanelId,
  sectionTabId,
} from "@features/events/components/EventFormParts";

export interface EditSectionTab<K extends string> {
  key: K;
  label: string;
  /** Whether a field in this section failed validation. */
  hasError: boolean;
}

interface EditSectionTabsProps<K extends string> {
  tabs: readonly EditSectionTab<K>[];
  active: K;
  onChange: (key: K) => void;
}

/**
 * The section tabs of the event edit form (Basics, Date & place, Attendance,
 * More details). Underline tabs in the page flow, like the Upcoming / Past tabs
 * on My events: they scroll away with the form instead of floating over it,
 * because the form is a handful of short sections and a bar pinned to the top of
 * the window only ever covered the fields it was meant to help with.
 *
 * Follows the ARIA tabs pattern: one tab stop (the active tab), Left and Right
 * move between tabs, Home and End jump to the ends, and the tab that gets focus
 * is the one that opens, since every panel is already on the page. Each tab
 * controls its `FormSection` panel (see `sectionPanelId`).
 */
const EditSectionTabs = <K extends string>({
  tabs,
  active,
  onChange,
}: EditSectionTabsProps<K>) => {
  const refs = useRef<Partial<Record<K, HTMLButtonElement | null>>>({});

  // On a narrow screen the row scrolls sideways; keep the open tab in view.
  useEffect(() => {
    refs.current[active]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.key === active);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next < 0) return;

    event.preventDefault();
    const key = tabs[next].key;
    onChange(key);
    refs.current[key]?.focus();
  };

  return (
    <div
      id="event-edit-sections"
      role="tablist"
      aria-label="Event sections"
      onKeyDown={onKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-brand-secondary/12 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(node) => {
              refs.current[tab.key] = node;
            }}
            id={sectionTabId(tab.key)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={sectionPanelId(tab.key)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3.5 font-outfit text-body font-medium whitespace-nowrap transition-colors outline-none focus-visible:rounded-t-lg focus-visible:ring-2 focus-visible:ring-brand/25 ${
              selected
                ? "border-brand text-brand-secondary"
                : "border-transparent text-ink/60 hover:text-brand-secondary"
            }`}
          >
            <span
              aria-hidden="true"
              className={`font-poppins text-caption tabular-nums ${selected ? "text-brand" : "text-ink/35"}`}
            >
              0{index + 1}
            </span>
            {tab.label}
            {tab.hasError && (
              <>
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-error"
                />
                <span className="sr-only">, has errors to fix</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default EditSectionTabs;
