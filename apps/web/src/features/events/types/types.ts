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
 * Who can join (PG-4): anyone, anyone the organizer approves, or only invited
 * emails. Mirrors `EventAccess` in the API's `event.constants.ts`.
 */
export type EventAccess = "open" | "approval" | "invite";

/**
 * Where a registration stands (PG-14): going holds a spot; pending (asked to
 * join), waitlisted (the event was full) and declined do not. Mirrors
 * `RegistrationStatus` in the API's `event.constants.ts`.
 */
export type RegistrationStatus =
  "going" | "pending" | "waitlisted" | "declined";

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
 * Where to send the bytes of one event cover (DB-1), as `POST /uploads/event-covers`
 * answers: straight to Vercel Blob with a short-lived token, or (development and
 * test) to a signed URL on the API itself. Either way the event keeps only the
 * resulting https link.
 */
export type CoverUploadTicket =
  | { strategy: "vercel-blob"; clientToken: string; pathname: string }
  | {
      strategy: "direct";
      uploadUrl: string;
      method: "PUT";
      publicUrl: string;
    };

/**
 * What the signed-in person can do about joining one event right now, worked
 * out by `utils/joinView.ts` and read by both join controls.
 */
export type JoinView =
  | { kind: "going" }
  | { kind: "pending" }
  | { kind: "waitlisted" }
  | { kind: "declined" }
  /** Invite-only, and the person has no invitation. */
  | { kind: "invite-only" }
  /** Full, and the organizer turned the waitlist off. */
  | { kind: "full" }
  /** Pressing the button joins, asks to join, or joins the waitlist. */
  | { kind: "join"; label: string; shortLabel: string };
