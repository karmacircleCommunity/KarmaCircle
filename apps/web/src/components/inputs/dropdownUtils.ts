/**
 * The pure logic behind `Dropdown`: filtering, keyboard stepping, type-ahead
 * and panel placement. Kept out of the component so it can be unit-tested
 * without a browser (`dropdownUtils.test.ts`) and so the component file is only
 * about rendering and events.
 */

export interface DropdownOption<T extends string = string> {
  /** What `onChange` receives and what `value` matches against. */
  value: T;
  /** What people read, in the trigger and in the list. Also what search and
   * type-ahead match against. */
  label: string;
  /** An optional second line under the label in the list (not in the trigger). */
  description?: string;
  /** Extra words search should match, e.g. a country's old name. Never shown. */
  keywords?: string;
  disabled?: boolean;
}

/** Lower-cases and strips accents, so "Sao" finds "São Tomé". */
export const normalize = (text: string): string =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * The options that match `query`, best matches first: label starts with the
 * query, then a word in the label starts with it, then it appears anywhere in
 * the label, description or keywords. Within a rank the original order holds,
 * so an alphabetical list stays alphabetical. An empty query returns every
 * option untouched.
 */
export function filterOptions<T extends string>(
  options: readonly DropdownOption<T>[],
  query: string,
): readonly DropdownOption<T>[] {
  const needle = normalize(query.trim());
  if (!needle) return options;

  const ranked: { option: DropdownOption<T>; rank: number; index: number }[] =
    [];

  options.forEach((option, index) => {
    const label = normalize(option.label);
    let rank = -1;
    if (label.startsWith(needle)) rank = 0;
    else if (label.split(/[^a-z0-9]+/).some((word) => word.startsWith(needle)))
      rank = 1;
    else {
      const rest = normalize(
        `${label} ${option.description ?? ""} ${option.keywords ?? ""}`,
      );
      if (rest.includes(needle)) rank = 2;
    }
    if (rank >= 0) ranked.push({ option, rank, index });
  });

  return ranked
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ option }) => option);
}

/**
 * The next enabled option when stepping from `from` by `step` (1 or -1),
 * wrapping at either end. Returns -1 when nothing is enabled. Pass `from = -1`
 * with `step = 1` to find the first enabled option.
 */
export function nextEnabledIndex(
  options: readonly Pick<DropdownOption, "disabled">[],
  from: number,
  step: 1 | -1,
): number {
  const count = options.length;
  if (count === 0) return -1;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (((from + step * offset) % count) + count) % count;
    if (!options[index].disabled) return index;
  }
  return -1;
}

/** The last enabled option, or -1. */
export function lastEnabledIndex(
  options: readonly Pick<DropdownOption, "disabled">[],
): number {
  return nextEnabledIndex(options, 0, -1);
}

/**
 * Type-ahead on a closed or non-searchable list: the first enabled option whose
 * label starts with what was typed, searching from the current one. Typing the
 * same letter repeatedly cycles through the options that start with it, the way
 * a native `<select>` does. Returns -1 when nothing matches.
 */
export function findTypeaheadIndex(
  options: readonly Pick<DropdownOption, "label" | "disabled">[],
  buffer: string,
  current: number,
): number {
  const typed = normalize(buffer);
  if (!typed || options.length === 0) return -1;

  const repeated = [...typed].every((character) => character === typed[0]);
  const needle = repeated ? typed[0] : typed;
  const start = repeated ? current + 1 : Math.max(current, 0);

  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset) % options.length;
    const option = options[index];
    if (!option.disabled && normalize(option.label).startsWith(needle)) {
      return index;
    }
  }
  return -1;
}

export interface PanelPlacementInput {
  trigger: { top: number; bottom: number; left: number; width: number };
  viewport: { width: number; height: number };
  /** The tallest the panel is allowed to be, in px. */
  maxPanelHeight: number;
  /** The narrowest the panel is allowed to be, in px. */
  minPanelWidth: number;
  /** Gap between the trigger and the panel, in px. */
  gap?: number;
  /** Breathing room kept between the panel and the viewport edge, in px. */
  margin?: number;
}

export interface PanelPlacement {
  side: "bottom" | "top";
  left: number;
  width: number;
  /** Set when `side` is "bottom": distance from the viewport top. */
  top?: number;
  /** Set when `side` is "top": distance from the viewport bottom. */
  bottom?: number;
  maxHeight: number;
}

/** The room a panel needs before opening downward is preferred over upward. */
const COMFORTABLE_HEIGHT = 280;

/**
 * Where to put the panel, in viewport (fixed) coordinates. It opens below the
 * trigger unless there is less room there than above and not enough for a
 * comfortable list, in which case it flips upward. Its height is capped to the
 * room on the chosen side, and it is slid sideways so it never leaves the
 * viewport.
 */
export function computePanelPlacement({
  trigger,
  viewport,
  maxPanelHeight,
  minPanelWidth,
  gap = 8,
  margin = 12,
}: PanelPlacementInput): PanelPlacement {
  const roomBelow = viewport.height - trigger.bottom - gap - margin;
  const roomAbove = trigger.top - gap - margin;
  const comfortable = Math.min(maxPanelHeight, COMFORTABLE_HEIGHT);
  const side: "bottom" | "top" =
    roomBelow >= comfortable || roomBelow >= roomAbove ? "bottom" : "top";

  const width = Math.min(
    Math.max(trigger.width, minPanelWidth),
    viewport.width - margin * 2,
  );
  const left = Math.min(
    Math.max(trigger.left, margin),
    viewport.width - width - margin,
  );
  const room = side === "bottom" ? roomBelow : roomAbove;
  const maxHeight = Math.max(Math.min(maxPanelHeight, room), 120);

  return side === "bottom"
    ? { side, left, width, maxHeight, top: trigger.bottom + gap }
    : {
        side,
        left,
        width,
        maxHeight,
        bottom: viewport.height - trigger.top + gap,
      };
}
