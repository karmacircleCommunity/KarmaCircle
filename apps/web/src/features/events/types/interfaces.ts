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
