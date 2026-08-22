import type { Dayjs } from "dayjs";
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
