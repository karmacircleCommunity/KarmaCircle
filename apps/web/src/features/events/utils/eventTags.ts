import {
  EVENT_TAG_MAX_LENGTH,
  EVENT_TAGS_MAX_ITEMS,
} from "@features/events/constants/eventTypes";

/**
 * Tags are typed into one box separated by commas (or new lines). The API
 * lower-cases and de-duplicates them too; doing the same here keeps "what the
 * form shows as unchanged" equal to "what the API stores".
 */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[,\n]/)) {
    const tag = part.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** A stored tag list as the box's text. */
export const formatTags = (tags: readonly string[] | undefined) =>
  (tags ?? []).join(", ");

/** The message to show under the tags box, or `undefined` if it is fine. */
export function validateTags(text: string): string | undefined {
  const tags = parseTags(text);
  if (tags.length > EVENT_TAGS_MAX_ITEMS) {
    return `Use at most ${EVENT_TAGS_MAX_ITEMS} tags`;
  }
  if (tags.some((tag) => tag.length > EVENT_TAG_MAX_LENGTH)) {
    return `Keep each tag under ${EVENT_TAG_MAX_LENGTH} characters`;
  }
  return undefined;
}
