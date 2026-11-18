import type { DetailedEventRecord, EventFormState } from "./interfaces";

/** The real event-creation shape — `CreateEvents.jsx` + `useEvent.js`. */
export type EventMode = "Online" | "Offline" | "Hybrid";

/** What kind of event it is; mirrors `EVENT_TYPES` in the API's `event.constants.ts`. */
export type EventType =
  | "volunteering"
  | "fundraiser"
  | "workshop"
  | "awareness"
  | "meetup"
  | "cultural"
  | "other";

/**
 * What pressing a form button asks for: make the event public, or keep it as a
 * draft only its organization can see (PG-15).
 */
export type SubmitIntent = "publish" | "draft";

/** Mirrors `EventStatus` in `apps/api/src/modules/events/event.model.ts`. */
export type EventStatus = "draft" | "published" | "cancelled";

export type EventFormErrors = Partial<Record<keyof EventFormState, string>>;

/**
 * The three detail-page panels that need the whole record and nothing else.
 * Aliases rather than empty extending interfaces, which say the same thing
 * with more words.
 */
export type EventHeroProps = DetailedEventRecord;

export type EventFactsProps = DetailedEventRecord;

export type EventLocationPanelProps = DetailedEventRecord;

/**
 * How choosing a cover picture ended. `uploaded`: the image service stored it
 * and the event keeps the link. `inline`: the image service is not set up on
 * this server, so the picture goes inside the event as before. `failed`:
 * nothing changed, show the message. `cancelled`: another picture was chosen.
 */
export type CoverUploadOutcome =
  | { kind: "uploaded"; url: string }
  | { kind: "inline"; dataUrl: string }
  | { kind: "failed"; message: string }
  | { kind: "cancelled" };
