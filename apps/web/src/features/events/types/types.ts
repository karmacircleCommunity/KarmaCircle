import type { EventFormState } from "./interfaces";

/** The real event-creation shape — `CreateEvents.jsx` + `useEvent.js`. */
export type EventMode = "Online" | "Offline";

export type EventFormErrors = Partial<Record<keyof EventFormState, string>>;
