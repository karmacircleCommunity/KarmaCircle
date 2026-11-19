/**
 * Splits what the organizer typed into the emails to invite: commas,
 * semicolons, spaces and new lines all separate, case is folded (the API
 * matches the invited email in lower case) and repeats are dropped. It does not
 * judge whether an entry is a valid email; the API does and says which one is
 * not.
 */
export const parseInviteEmails = (text: string): string[] => [
  ...new Set(
    text
      .split(/[\s,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  ),
];
