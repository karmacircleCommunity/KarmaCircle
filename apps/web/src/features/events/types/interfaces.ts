import type { Dayjs } from "dayjs";
import type { Cause } from "@features/organizations/types";
import type {
  EventAccess,
  EventMode,
  EventFormErrors,
  EventStatus,
  EventType,
  JoinAsk,
  JoinView,
  RegistrationStatus,
  SignInPrompt,
  SubmitIntent,
} from "./types";

/** One row of the agenda editor. */
export interface EventAgendaFormRow {
  time: string;
  title: string;
  detail: string;
}

/**
 * The optional detail fields (PG-7) as the form holds them: text for the
 * paragraph, line and list fields, and numbers as typed. See
 * `utils/eventDetailFields.ts` for the conversions.
 */
export interface EventDetailFormFields {
  /** Paragraphs separated by a blank line. */
  about: string;
  contactEmail: string;
  /** Empty means free. */
  costAmount: string;
  costCurrency: string;
  costNote: string;
  /** One item per line. */
  bringAlong: string;
  /** Comma- or newline-separated. */
  languages: string;
  minimumAge: string;
  agenda: EventAgendaFormRow[];
  /** In-person events only. */
  gettingThere: string;
  /** Online events only. */
  linkDelivery: string;
  joinRequirements: string;
}

export interface EventFormState extends EventDetailFormFields {
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
  coverImage: string;
  platform: string;
  platformLink: string;
  /** Who can join (PG-4). */
  access: EventAccess;
  /** Whether a full event takes a waitlist (PG-14). */
  waitlistEnabled: boolean;
  /** Most people who can join, as typed. Empty means no limit. */
  capacity: string;
  /** The IANA timezone the date and time pickers are read in (PG-11). */
  timezone: string;
  /** The chosen `EventType`, or empty until one is picked. */
  eventType: EventType | "";
  /** Tags as typed, separated by commas. */
  tags: string;
}

export interface UseEventResult {
  /** The form's problems for what is being attempted: a draft needs less. */
  validateEvent: (intent?: SubmitIntent) => EventFormErrors;
  /** Resolves with the fields the API refused, if it named any. */
  submitCallback: (
    event: EventFormState,
    onSuccess: () => void,
    errors: EventFormErrors,
    intent?: SubmitIntent,
  ) => Promise<EventFormErrors | undefined>;
}

/**
 * A loose shape for an event record, with an open index signature. Only the
 * organizations feature still uses it (`OrganizationEventsList`'s hosted-event
 * rows); the events feature itself works from `ApiEvent` and `DisplayEvent`.
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
  /** When it ends: what decides "Happening now" and "Completed". */
  endsAt?: string;
  going?: number;
  spotsLeft?: number;
  /**
   * A trust badge, not a real government integration — see the backend's
   * `event.model.ts` for why this can't be self-declared by the event's
   * own creator. `undefined`/`false` both render as "no badge"; the card
   * never shows a badge for a falsy value either way.
   */
  isGovernmentSponsored?: boolean;
  /** Set only when joining is restricted (`approval` or `invite`): the card
   *  shows a pill rather than implying anyone can just turn up. */
  access?: EventAccess;
  /** The signed-in person's own standing, on My Events only, when it is
   *  anything other than going. */
  registrationStatus?: RegistrationStatus;
  /** The organizer cancelled this event. The card stays in the list with a
   *  "Cancelled" label, and nothing about joining is offered. */
  cancelled?: boolean;
  /** What kind of event it is; the card shows its label when there is one. */
  eventType?: EventType;
  /** The event's own timezone; the card shows its time in it (PG-11). */
  timezone?: string;
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
  /** Who can join (PG-4). */
  access: EventAccess;
  /** Whether a full event takes a waitlist (PG-14). */
  waitlistEnabled: boolean;
  /** The organizer cancelled this event; see `EventCardEvent.cancelled`. */
  cancelled: boolean;
  /** A draft: saved but visible only to its own organization (PG-15). */
  draft: boolean;
  /** The event's own timezone, if it has one (PG-11). */
  timezone?: string;
  eventType?: EventType;
  tags: string[];
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
  /** The hosting organization, for the Contribute link (PG-8). */
  organizer?: string;
  organizerUserName?: string;
}

/** `EventJoinPanel` also needs to start leaving; the mobile bar does not. */
export interface EventJoinPanelFullProps extends EventJoinPanelProps {
  onRequestLeave: () => void;
}

export interface EventJoinPanelProps extends DetailedEventRecord {
  /** What the signed-in person can do about joining right now. */
  join: JoinView;
  joining: boolean;
  checkingRegistration: boolean;
  registrationCheckFailed: boolean;
  onToggleJoin: () => void;
  /** Set for a signed-out viewer who has no other way in (`signInPrompt`). */
  signInPrompt?: SignInPrompt;
  onSignIn: () => void;
}

/** The "Hosted by" sidebar card - just the organizer fields off
 *  `DisplayEvent`, not the whole detail record (`EventLocationPanel`'s own
 *  `EventDetailContent` half has nothing this card needs). */
export interface EventOrganizerPanelProps {
  event: DisplayEvent;
}

/** The stored event as the edit page holds it; see `useEventSnapshot`. */
export interface EventSnapshot {
  event?: ApiEvent;
  /** When `event` arrived, to judge whether it had already ended then. */
  loadedAt: number;
  error?: unknown;
  isLoading: boolean;
  retry: () => void;
  /** Puts in what the API stored after this page's own save. */
  replace: (event: ApiEvent) => void;
}

/** The optional-note dialog shown before a request or a waitlist join. */
export interface JoinNoteDialogProps {
  asks: JoinAsk;
  eventTitle: string;
  busy: boolean;
  /** Why the last attempt failed, shown inside the dialog. */
  error?: string;
  onSend: (note: string) => void;
  onClose: () => void;
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
  /** A draft may not have one yet. */
  description?: string;
  hostUsername: string;
  hostName: string;
  /** Set by the server from the host's own `Organization` record — absent
   *  for an individual host (event.model.ts). */
  organizerHandle?: string;
  coverImage?: string;
  mode: EventMode;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  mapIframe?: string;
  platform?: string;
  /** Sent only to the hosting organization and to a signed-in person who is
   *  going; left out of the response for everyone else. */
  platformLink?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isGovernmentSponsored: boolean;
  /** Who can join. The API always sends it (an event saved before it existed
   *  reads as `open`, or `approval` if it was flagged invite-only). */
  access: EventAccess;
  /** Whether a full event takes a waitlist; absent reads as on. */
  waitlistEnabled?: boolean;
  /** Only on the host's own list: people waiting on the organizer (pending
   *  requests and the waitlist). */
  requestCount?: number;
  /** Only on My Events: the signed-in person's own standing. */
  registrationStatus?: RegistrationStatus;
  /** Absent on events saved before the field existed; that reads as
   *  `published`. */
  status?: EventStatus;
  cancelledAt?: string;
  /** The IANA timezone the event is held in; absent on older events. */
  timezone?: string;
  /** What kind of event it is; absent on events saved before it existed. */
  eventType?: EventType;
  tags?: string[];
  /** Most people who can join; absent means no limit. */
  capacity?: number;
  /** People registered so far. Only meaningful when `capacity` is set. */
  registrationCount?: number;
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

/** One person on an event's attendee list, as the host sees them. */
export interface EventAttendee {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  /** Where the registration stands (PG-14). */
  status: RegistrationStatus;
  /** What the person wrote when asking to join an approval event. */
  note: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
}

/** `GET /events/:uid/attendees` - one page plus the overall totals. */
export interface ApiAttendeeList {
  event: {
    uid: string;
    name: string;
    status: EventStatus;
    capacity?: number;
    access: EventAccess;
    waitlistEnabled: boolean;
  };
  data: EventAttendee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    registered: number;
    checkedIn: number;
    /** People who asked to join and wait on the organizer. */
    pending: number;
    waitlisted: number;
    declined: number;
  };
}

/** `GET /events/:uid/registration`: the signed-in person's own standing. */
export interface ApiRegistration {
  /** True only for a person who is going. */
  joined: boolean;
  status: RegistrationStatus | "none";
  /** An unused invitation exists for the person's email. */
  invited: boolean;
}

/** One invitation the organizer sent (PG-4). */
export interface EventInvite {
  id: string;
  email: string;
  invitedAt: string;
  /** The person registered through the invite. */
  joined: boolean;
}

/** `POST /events/:uid/invites`: who was invited and who was skipped. */
export interface ApiInviteResult {
  invited: string[];
  skipped: {
    email: string;
    reason: "already-invited" | "already-registered";
  }[];
}
