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
 * A directory-grade event: everything `EventCard.tsx` renders, and the
 * shape `constants/eventDirectory.ts` holds.
 *
 * Distinct from `EventRecord` above on purpose. `EventRecord` is the loose,
 * unverified guess at what `GET /events` returns; this one is the shape the
 * UI actually needs, so the two meeting in a mapping function is the point
 * where the fixture gets swapped for the API.
 *
 * `cause` is the organizations feature's taxonomy, not a second one - the
 * two directories filter by the same chips, and a drive is run by an
 * organization that already declared its cause.
 */
export interface DirectoryEvent {
  id: string;
  title: string;
  /** Display name of the organization running it. */
  organizer: string;
  /** That organization's `userName`, so the card can link to its profile. */
  organizerUserName: string;
  cause: Cause;
  summary: string;
  /** Cover photo, imported so Vite fingerprints it. Placeholder imagery
   *  standing in for what an organizer would upload for the event. */
  cover: string;
  /** Describes the photo itself; the event's own text is already in the card. */
  coverAlt: string;
  mode: EventMode;
  /** Offline events only. */
  city?: string;
  country?: string;
  /** Online events only - "Zoom", "Google Meet", matching `OnlinePlatform.ts`. */
  platform?: string;
  /** Real ISO timestamp, formatted at render. Not a pre-formatted string:
   *  the card needs to compare and sort by it too. */
  startsAt: string;
  going: number;
  /** 0 means the event is full; the card says so instead of showing a zero. */
  spotsLeft: number;
}

export interface EventCardProps {
  event: DirectoryEvent;
}

/** One line of the run sheet on the event detail page. */
export interface EventAgendaItem {
  /** Wall-clock label, pre-formatted: the schedule is written in the
   *  event's own timezone, not the reader's. */
  time: string;
  title: string;
  detail?: string;
}

/** Where an offline event physically happens. */
export interface EventVenue {
  name: string;
  /** Street lines, printed one per row above the city. */
  addressLines: string[];
  /** How to actually arrive - the nearest metro, which gate, where to park. */
  gettingThere: string;
  /** Fed to a maps search URL; kept as text so no map SDK is needed. */
  mapQuery: string;
}

/** How an online event is joined. */
export interface EventOnlineAccess {
  /** "Zoom", "Google Meet" - the same vocabulary as `DirectoryEvent.platform`. */
  platform: string;
  /** When and how the link reaches an attendee. */
  linkDelivery: string;
  /** Anything they need working before they turn up. */
  requirements: string;
}

/**
 * What an event costs to attend.
 *
 * Absent on a `DirectoryEvent`'s detail means free, which is the case for
 * almost every event on the circle - these are nonprofit drives, and a
 * price is the exception worth spelling out. The optional `note` covers
 * the middle ground: free to attend, but bring your own boots.
 */
export interface EventCost {
  amount: number;
  currency: string;
  /** What the money is for, shown next to the amount. */
  note: string;
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
 * Everything the detail page shows that a directory card does not.
 *
 * Kept separate from `DirectoryEvent` rather than bolted onto it: the grid
 * needs none of this, and a real API will almost certainly serve the list
 * and the single event from two endpoints. `constants/eventDetails.ts`
 * holds one of these per directory event, keyed by `DirectoryEvent.id`.
 */
export interface EventDetail {
  /** Long-form description, one paragraph per entry. */
  about: string[];
  /** Real ISO timestamp, so the page can print a duration rather than
   *  asking the reader to subtract two times. */
  endsAt: string;
  agenda: EventAgendaItem[];
  /** What an attendee should turn up with, or be ready for. */
  bringAlong: string[];
  /** Offline events. Exactly one of `venue`/`onlineAccess` is set, matching
   *  `DirectoryEvent.mode`. */
  venue?: EventVenue;
  /** Online events. */
  onlineAccess?: EventOnlineAccess;
  /** Omitted for the free events, which is most of them. */
  cost?: EventCost;
  fundraiser?: EventFundraiser;
  /** Languages the session is actually run in. */
  languages: string[];
  /** Set only where there is a real restriction. */
  minimumAge?: number;
  contactEmail: string;
}

/** A directory event joined to its detail record - what the page renders. */
export interface DetailedEventRecord {
  event: DirectoryEvent;
  detail: EventDetail;
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
