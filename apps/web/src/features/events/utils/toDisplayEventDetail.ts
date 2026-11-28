import type { ApiEvent, DetailedEventRecord } from "@features/events/types";
import { capacityCounts } from "@features/events/utils/toDisplayEvent";

/**
 * Maps one live `GET /events?uid=` record onto what `DetailedEvent.tsx`
 * renders — the detail-page equivalent of `toDisplayEvent.ts`, and the
 * same pattern `organizations/utils/toDisplayOrganization.ts` already
 * follows for `OrganizationProfile.tsx`.
 *
 * **Nothing is invented.** `going`/`spotsLeft` are only set for an event with
 * a capacity (`capacityCounts`), and stay `undefined` otherwise;
 * `about`/`agenda`/`bringAlong`/`languages` fall back to `[]` rather than
 * placeholder copy, so `EventSection`s with nothing behind them simply
 * don't render (the same rule `OrganizationProfileView` already follows
 * for its own optional sections).
 */
export function toDisplayEventDetail(event: ApiEvent): DetailedEventRecord {
  return {
    event: {
      id: event.uid,
      title: event.name,
      summary: event.description ?? "",
      organizer: event.hostName,
      organizerUserName: event.organizerHandle,
      cover: event.coverImage || undefined,
      coverAlt: event.coverImage ? `${event.name} cover photo` : undefined,
      mode: event.mode,
      address: event.address,
      city: event.city,
      state: event.state,
      country: event.country,
      platform: event.platform || undefined,
      platformLink: event.platformLink || undefined,
      startsAt: event.startTime,
      endsAt: event.endTime,
      ...capacityCounts(event),
      isGovernmentSponsored: event.isGovernmentSponsored,
      access: event.access,
      waitlistEnabled: event.waitlistEnabled !== false,
      cancelled: event.status === "cancelled",
      draft: event.status === "draft",
      eventType: event.eventType,
      timezone: event.timezone,
      tags: event.tags ?? [],
    },
    detail: {
      about: event.about ?? [],
      agenda: event.agenda ?? [],
      bringAlong: event.bringAlong ?? [],
      gettingThere: event.gettingThere,
      linkDelivery: event.linkDelivery || undefined,
      joinRequirements: event.joinRequirements,
      cost: event.cost,
      fundraiser: event.fundraiser,
      languages: event.languages ?? [],
      minimumAge: event.minimumAge,
      contactEmail: event.contactEmail,
    },
  };
}
