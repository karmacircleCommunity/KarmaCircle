import type { DetailedEventRecord, EventFormState } from "./interfaces";

/** The real event-creation shape — `CreateEvents.jsx` + `useEvent.js`. */
export type EventMode = "Online" | "Offline";

export type EventFormErrors = Partial<Record<keyof EventFormState, string>>;

/**
 * The three detail-page panels that need the whole record and nothing else.
 * Aliases rather than empty extending interfaces, which say the same thing
 * with more words.
 */
export type EventHeroProps = DetailedEventRecord;

export type EventFactsProps = DetailedEventRecord;

export type EventLocationPanelProps = DetailedEventRecord;
