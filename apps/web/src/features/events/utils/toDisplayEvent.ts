import { ORGANIZATION_ACCENTS } from "@features/organizations/constants/organizationDisplay";
import type { ApiEvent, EventCardEvent } from "../types";

/**
 * Same derivation as `organizations/utils/toDisplayOrganization.ts`'s
 * `accentFor` — a stable, un-stored color for a record with no cover
 * photo, so the same event gets the same gradient on every reload.
 */
function accentFor(uid: string): number {
  let hash = 0;
  for (const char of uid) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }
  return hash % ORGANIZATION_ACCENTS.length;
}

/**
 * Maps the live `GET /events` shape onto what `EventCard` (and `Events.tsx`'s
 * own filtering/grouping) render.
 *
 * Mirrors `organizations/utils/toDisplayOrganization.ts`'s own rule:
 * **nothing is invented.** A real event has no cause taxonomy and no
 * capacity/attendee tracking in `event.model.ts` — this leaves `cause`,
 * `going` and `spotsLeft` undefined rather than fabricating plausible
 * numbers the way the old `constants/eventDirectory.ts` fixture did
 * (invisibly — nothing on the page said "12 going" was made up).
 *
 * `organizerUserName` is only set when `organizerHandle` exists — an
 * individual host has none (`events.md`), and the card falls back to
 * plain text instead of a broken profile link.
 */
export function toDisplayEvent(event: ApiEvent): EventCardEvent {
  return {
    id: event.uid,
    title: event.name,
    organizer: event.hostName,
    organizerUserName: event.organizerHandle,
    summary: event.description,
    cover: event.coverImage || undefined,
    coverAlt: event.coverImage ? `${event.name} cover photo` : undefined,
    mode: event.mode,
    city: event.city,
    country: event.country,
    platform: event.platform,
    // `startTime` carries the actual wall-clock instant; `startDate` is
    // equal to it in every seeded record today, but the model keeps them
    // as separate fields (event.model.ts), so this is the one that stays
    // correct if they're ever set independently.
    startsAt: event.startTime,
    isGovernmentSponsored: event.isGovernmentSponsored || undefined,
    inviteOnly: event.inviteOnly || undefined,
    accent: accentFor(event.uid),
  };
}
