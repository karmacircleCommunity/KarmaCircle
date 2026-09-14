import type { Dayjs } from "dayjs";
import type { Cause } from "@features/organizations/types";
import type { EventMode, EventFormErrors } from "./types";

/**
 * State shape used by the broken `CreateEvent.tsx` — copy-pasted from
 * `ProfileUpdate.tsx`/`ProfileCompletion.tsx` (profile-editing shape,
 * not an event shape) and never swapped over. Kept exactly as the
 * component actually uses it; see SPEC.md for the "eight inputs share
 * two state slots" bug this shape enables.
 */
export interface CreateEventCredentials {
  description: string;
  name: string;
  coverImage: string;
  eventMode: "online" | "offline";
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
}

export interface EventFormState {
  name: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  mode: EventMode;
  uid: string;
  description: string;
  city: string;
  state: string;
  address: string;
  country: string;
  mapIframe: string;
  coverImage: string;
  platform: string;
  platformLink: string;
}

export interface UseEventResult {
  validateEvent: () => EventFormErrors;
  submitCallback: (
    event: EventFormState,
    setshowCreateModal: (open: boolean) => void,
  ) => Promise<void>;
}

/**
 * Shape a real event record is expected to have, per `EventsMarqueeCards.jsx`
 * (the one component in this feature that actually reads an `event` prop)
 * and `useEvent.js`'s `EventFormState`. Response shape is unverified from
 * this repo (see SPEC.md) — loose by design, open index signature.
 */
export interface EventRecord {
  _id?: string;
  name?: string;
  coverImage?: string;
  mode?: EventMode | string;
  address?: string;
  platform?: string;
  startDate?: string;
  startTime?: string;
  [key: string]: unknown;
}

/**
 * What `EventCard` needs to render one event in the `/events` grid. Mapped
 * from a live `ApiEvent` by `utils/toDisplayEvent.ts` — every optional
 * field here (`cause`, `going`, `spotsLeft`, `cover`/`coverAlt`,
 * `organizerUserName`) is one a real `GET /events` record either never has
 * at all (no cause taxonomy, no capacity tracking) or only has
 * conditionally (a cover photo, an `organizerHandle`). Nothing is invented
 * to fill the gap — the card quietly omits what isn't there.
 */
export interface EventCardEvent {
  id: string;
  title: string;
  organizer: string;
  organizerUserName?: string;
  cause?: Cause;
  summary: string;
  cover?: string;
  coverAlt?: string;
  mode: EventMode;
  city?: string;
  country?: string;
  platform?: string;
  startsAt: string;
  going?: number;
  spotsLeft?: number;
  /**
   * A trust badge, not a real government integration — see the backend's
   * `event.model.ts` for why this can't be self-declared by the event's
   * own creator. `undefined`/`false` both render as "no badge"; the card
   * never shows a badge for a falsy value either way.
   */
  isGovernmentSponsored?: boolean;
  /** When set, the card shows an "Invite only" pill rather than implying
   *  anyone can just turn up. */
  inviteOnly?: boolean;
  /** Which `ORGANIZATION_ACCENTS` gradient to fall back to when `cover` is
   *  unset — same "stable per record, not stored" derivation as
   *  `organizations/utils/toDisplayOrganization.ts#accentFor`. */
  accent?: number;
}

export interface EventCardProps {
  event: EventCardEvent;
}

/** One line of the run sheet on the event detail page. */
export interface EventAgendaItem {
  /** Wall-clock label, pre-formatted: the schedule is written in the
   *  event's own timezone, not the reader's. */
  time: string;
  title: string;
  detail?: string;
}

/**
 * What an event costs to attend.
 *
 * Absent on the event means free, which is the case for almost every event
 * on the circle - these are nonprofit drives, and a price is the exception
 * worth spelling out. The `note` covers the middle ground: free to attend,
 * but bring your own boots. Never set `amount: 0` for a free event — omit
 * `cost` entirely instead, so the UI's "Free to attend" copy is the one
 * true free-event state rather than a zero that reads as a data bug.
 */
export interface EventCost {
  amount: number;
  currency: string;
  /** What the money is for, shown next to the amount. */
  note?: string;
}

/**
 * The money an event is raising alongside the volunteering, if any.
 *
 * Same vocabulary as `OrganizationDrive` on the organization profile
 * (raised-of-goal, supporters, a percentage bar) so a visitor reads one
 * progress bar the same way everywhere.
 */
export interface EventFundraiser {
  /** What the money buys, in the organizer's own words. */
  purpose: string;
  goal: number;
  raised: number;
  /** ISO 4217, formatted at render by `formatMoney`. */
  currency: string;
  supporters: number;
}

/**
 * Everything the event detail page (`DetailedEvent.tsx`) renders about the
 * event itself — mapped from a live `ApiEvent` by
 * `utils/toDisplayEventDetail.ts`, the same way `EventCardEvent` is mapped
 * by `toDisplayEvent.ts`. A near-superset of `EventCardEvent`'s fields plus
 * the ones only the detail page needs (`address`/`state`, `platformLink`,
 * `endsAt`, the two trust/access flags spelled out as always-boolean since
 * the page renders a badge/pill off them directly rather than checking for
 * `undefined` first).
 */
export interface DisplayEvent {
  id: string;
  title: string;
  summary: string;
  organizer: string;
  organizerUserName?: string;
  cover?: string;
  coverAlt?: string;
  mode: EventMode;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  platform?: string;
  platformLink?: string;
  /** Real ISO timestamps, not pre-formatted strings — the page needs to
   *  compute a duration from the two, not just print them. */
  startsAt: string;
  endsAt: string;
  going?: number;
  spotsLeft?: number;
  isGovernmentSponsored: boolean;
  inviteOnly: boolean;
}

/**
 * Everything the detail page shows that the card does not - long-form
 * content and the mode-specific "how do I actually get there" block.
 * Kept separate from `DisplayEvent` rather than merged into it, matching
 * `ApiEvent`'s own split on the backend: these are the fields a section
 * renders conditionally and omits, never invents, when a real event has
 * none of them.
 */
export interface EventDetailContent {
  /** Long-form description, one paragraph per entry. Empty — the "About
   *  this event" section simply doesn't render. */
  about: string[];
  agenda: EventAgendaItem[];
  /** What an attendee should turn up with, or be ready for. */
  bringAlong: string[];
  /** Offline events - directions, alongside `DisplayEvent.address`/`city`. */
  gettingThere?: string;
  /** Online events - how/when the join link reaches an attendee. */
  linkDelivery?: string;
  /** Online events - anything needed before joining. */
  joinRequirements?: string;
  /** Omitted for the free events, which is most of them. */
  cost?: EventCost;
  fundraiser?: EventFundraiser;
  /** Languages the session is actually run in. */
  languages: string[];
  /** Set only where there is a real restriction. */
  minimumAge?: number;
  contactEmail?: string;
}

/** The joined record the detail page actually renders - mirrors
 *  `OrganizationProfile.tsx`'s `{ organization }` prop shape. */
export interface DetailedEventRecord {
  event: DisplayEvent;
  detail: EventDetailContent;
}

export interface EventAgendaProps {
  agenda: EventAgendaItem[];
}

export interface EventFundraiserPanelProps {
  fundraiser: EventFundraiser;
}

export interface EventJoinPanelProps extends DetailedEventRecord {
  joined: boolean;
  onToggleJoin: () => void;
}

/**
 * One event exactly as `GET /events` returns it — the raw Mongoose
 * document. Mirrors `IEvent` in `apps/api/src/modules/events/event.model.ts`;
 * the two must change together.
 */
export interface ApiEvent {
  _id: string;
  uid: string;
  name: string;
  description: string;
  hostUsername: string;
  hostName: string;
  /** Set by the server from the host's own `Organization` record — absent
   *  for an individual host (event.model.ts). */
  organizerHandle?: string;
  coverImage?: string;
  mode: "Online" | "Offline";
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  mapIframe?: string;
  platform?: string;
  platformLink?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isGovernmentSponsored: boolean;
  inviteOnly: boolean;
  about?: string[];
  agenda?: EventAgendaItem[];
  bringAlong?: string[];
  gettingThere?: string;
  linkDelivery?: string;
  joinRequirements?: string;
  cost?: EventCost;
  fundraiser?: EventFundraiser;
  languages?: string[];
  minimumAge?: number;
  contactEmail?: string;
}

/** `GET /events` — the paginated list response. */
export interface ApiEventList {
  data: ApiEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
