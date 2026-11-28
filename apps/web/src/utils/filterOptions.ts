/** How many choices a long list shows before "Show all". */
export const PREVIEW_CHOICES = 8;
/** A list with more choices than this can be searched. */
export const SEARCH_ABOVE_CHOICES = 15;

interface VisibleOptionsInput {
  options: readonly string[];
  /** The "All ..." option. It narrows nothing and is not counted. */
  defaultValue: string;
  selected: string;
  expanded: boolean;
  query: string;
}

interface VisibleOptions {
  /** What to draw, in the order of `options`. */
  shown: string[];
  /** How many choices there are besides the default. */
  choiceCount: number;
  searchable: boolean;
  /** The list is long enough to open and close. */
  collapsible: boolean;
  noMatches: boolean;
}

/**
 * Which options of a single-choice filter to draw. A short list is drawn whole.
 * A long one starts with its first choices, and a longer one can be searched.
 * The selected option is always drawn.
 */
export const visibleOptions = ({
  options,
  defaultValue,
  selected,
  expanded,
  query,
}: VisibleOptionsInput): VisibleOptions => {
  const choices = options.filter((option) => option !== defaultValue);
  const searchable = choices.length > SEARCH_ABOVE_CHOICES;
  const term = searchable ? query.trim().toLowerCase() : "";
  // Hiding a single choice would cost the same room as showing it.
  const collapsible = choices.length > PREVIEW_CHOICES + 1;

  let matches = choices;
  if (term) {
    matches = choices.filter((option) => option.toLowerCase().includes(term));
  } else if (collapsible && !expanded) {
    matches = choices.slice(0, PREVIEW_CHOICES);
  }

  const wanted = new Set(matches);
  wanted.add(selected);
  if (!term) wanted.add(defaultValue);

  return {
    shown: options.filter((option) => wanted.has(option)),
    choiceCount: choices.length,
    searchable,
    collapsible: collapsible && !term,
    noMatches: Boolean(term) && matches.length === 0,
  };
};
