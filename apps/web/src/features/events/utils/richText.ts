/**
 * A deliberately small formatted-text format for an event's full write-up
 * (PG-12), parsed into plain data and rendered as React elements by
 * `components/RichText.tsx`. It never produces HTML, so there is nothing to
 * sanitize: whatever an organizer types can only ever become text, bold, italic,
 * an http(s) link, a bullet or a numbered list, or a line break.
 *
 * Supported, per paragraph (paragraphs are separated by a blank line):
 * - `**bold**`, `*italic*` and `_italic_`
 * - `[link text](https://example.org)`, http or https only (a `javascript:` or
 *   any other address is left as the literal text it was typed as)
 * - lines starting with `- ` or `* ` form a bullet list
 * - lines starting with `1. ` form a numbered list
 * - any other single line break stays a line break
 *
 * Not supported on purpose: headings, images, tables, code, raw HTML, nesting
 * (bold inside a link, and so on). Unsupported syntax is shown as typed.
 */

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "link"; text: string; href: string };

export type RichBlock =
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "bulletList"; items: InlineNode[][] }
  | { type: "numberedList"; items: InlineNode[][] };

// Order matters: `**` must be tried before `*`. Emphasis must hug its text (no
// space just inside the marks) so a stray `*` or a `snake_case_name` is not
// mistaken for formatting, and `_` only counts at the edge of a word.
const INLINE_PATTERN =
  /\*\*(?!\s)([^*\n]*[^*\s])\*\*|\*(?!\s)([^*\n]*[^*\s])\*|(?<![A-Za-z0-9])_(?!\s)([^_\n]*[^_\s])_(?![A-Za-z0-9])|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Splits one line of text into plain, bold, italic and link pieces. */
export function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;

  for (const match of line.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last)
      nodes.push({ type: "text", text: line.slice(last, index) });

    if (match[1] !== undefined) nodes.push({ type: "bold", text: match[1] });
    else if (match[2] !== undefined)
      nodes.push({ type: "italic", text: match[2] });
    else if (match[3] !== undefined)
      nodes.push({ type: "italic", text: match[3] });
    else nodes.push({ type: "link", text: match[4], href: match[5] });

    last = index + match[0].length;
  }

  if (last < line.length) nodes.push({ type: "text", text: line.slice(last) });
  return nodes;
}

const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;

/**
 * One paragraph's lines into blocks: runs of bullet lines and runs of numbered
 * lines become lists, and the lines between them stay a paragraph.
 */
export function parseParagraph(paragraph: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  const lines = paragraph.split(/\r?\n/).filter((line) => line.trim() !== "");

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const previous = blocks[blocks.length - 1];

    if (bullet) {
      const item = parseInline(bullet[1]);
      if (previous?.type === "bulletList") previous.items.push(item);
      else blocks.push({ type: "bulletList", items: [item] });
    } else if (numbered) {
      const item = parseInline(numbered[1]);
      if (previous?.type === "numberedList") previous.items.push(item);
      else blocks.push({ type: "numberedList", items: [item] });
    } else {
      const parsed = parseInline(line);
      if (previous?.type === "paragraph") previous.lines.push(parsed);
      else blocks.push({ type: "paragraph", lines: [parsed] });
    }
  }
  return blocks;
}

/** The blocks of a whole write-up: one entry per paragraph the API stores. */
export function parseRichText(paragraphs: readonly string[]): RichBlock[][] {
  return paragraphs.map(parseParagraph);
}
