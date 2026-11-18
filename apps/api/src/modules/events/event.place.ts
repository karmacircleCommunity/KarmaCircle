/** The fields that say where an event is held. */
export interface PlaceFacts {
  mode: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  platform?: string;
}

const venueOf = (facts: PlaceFacts) =>
  [facts.address, facts.city, facts.state, facts.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

/**
 * Where an event is held, in words an email or a calendar entry can use:
 * the venue address, `Online (Zoom)`, or both for a hybrid event. One place
 * for it, so the reminder emails and the calendar file never describe the
 * same event differently.
 */
export function placeOf(facts: PlaceFacts): string {
  const online = facts.platform?.trim()
    ? `Online (${facts.platform.trim()})`
    : "Online";
  if (facts.mode === "Online") return online;
  if (facts.mode === "Hybrid") {
    const venue = venueOf(facts);
    return venue ? `${venue}, and ${online}` : online;
  }
  return venueOf(facts);
}
