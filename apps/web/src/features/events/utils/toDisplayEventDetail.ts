import type { ApiEvent, DetailedEventRecord } from "../types";

/**
 * Maps one live `GET /events?uid=` record onto what `DetailedEvent.tsx`
 * renders — the detail-page equivalent of `toDisplayEvent.ts`, and the
 * same pattern `organizations/utils/toDisplayOrganization.ts` already
 * follows for `OrganizationProfile.tsx`.
 *
 * **Nothing is invented.** `going`/`spotsLeft` stay `undefined` (this app
 * doesn't track attendance yet — see `EventCardEvent`'s own comment);
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
      summary: event.description,
      organizer: event.hostName,
      organizerUserName: event.organizerHandle,
      cover: event.coverImage || undefined,
      coverAlt: event.coverImage ? `${event.name} cover photo` : undefined,
      mode: event.mode,
      address: event.address,
      city: event.city,
      state: event.state,
      country: event.country,
      platform: event.platform,
      platformLink: event.platformLink,
      startsAt: event.startTime,
      endsAt: event.endTime,
      going: undefined,
      spotsLeft: undefined,
      isGovernmentSponsored: event.isGovernmentSponsored,
      inviteOnly: event.inviteOnly,
    },
    detail: {
      about: event.about ?? [],
      agenda: event.agenda ?? [],
      bringAlong: event.bringAlong ?? [],
      gettingThere: event.gettingThere,
      linkDelivery: event.linkDelivery,
      joinRequirements: event.joinRequirements,
      cost: event.cost,
      fundraiser: event.fundraiser,
      languages: event.languages ?? [],
      minimumAge: event.minimumAge,
      contactEmail: event.contactEmail,
    },
  };
}
