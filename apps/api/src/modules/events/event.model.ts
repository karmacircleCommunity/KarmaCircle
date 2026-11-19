import mongoose, { Document, Schema } from "mongoose";
import {
  EVENT_ACCESS_LEVELS,
  EVENT_TYPES,
  REGISTRATION_STATUSES,
  type EventAccess,
  type EventType,
  type RegistrationStatus,
} from "./event.constants";

/**
 * Where an event happens. `Hybrid` (PG-10) has both a venue and a live stream,
 * so it needs the in-person fields and the online ones.
 */
export type EventMode = "Online" | "Offline" | "Hybrid";

/**
 * Where an event is in its life. A `draft` (PG-15) is saved but visible only
 * to its own organization; `published` is public; `cancelled` (PG-2) stays
 * public with a badge. Postponed events are still to do. A document with no
 * stored status was saved before this field existed and reads as `published`.
 */
export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** One line of the run sheet on the event detail page — pre-formatted, not a
 *  timestamp: a schedule is written in the event's own timezone, and
 *  converting "9:00 pm" into a reader's own would be actively wrong for
 *  anyone reading from elsewhere (same rule the frontend's own
 *  `EventAgendaItem` type already documents). */
export interface IEventAgendaItem {
  time: string;
  title: string;
  detail?: string;
}

/** What an event costs to attend. Absent on the document means free, which
 *  is the case for almost every event on the circle — these are nonprofit
 *  drives, so a price is the exception worth spelling out rather than a
 *  field to fill with a zero. */
export interface IEventCost {
  amount: number;
  currency: string;
  note?: string;
}

/** The money an event is raising alongside the volunteering, if any. Same
 *  vocabulary as `Organization.fundsRaised`/`fundsGoal` — raised-of-goal, a
 *  currency, supporters — so one progress bar reads the same way
 *  everywhere in the app. */
export interface IEventFundraiser {
  purpose: string;
  goal: number;
  raised: number;
  currency: string;
  supporters: number;
}

export interface IEvent extends Document {
  name: string;
  uid: string;
  description: string;
  hostUsername: string;
  hostName: string;
  /**
   * The real link to the `organizations` collection, set automatically at
   * creation time from the authenticated host's own organization record
   * (never client-supplied) — `hostUsername`/`hostName` above are the
   * pre-existing free-text snapshot and stay unchanged for backward
   * compatibility. `event.service.ts#createEvent` rejects a non-organization
   * host outright (September 2026 - every event is an NGO-run drive), so
   * this is never unset for a newly created event; still optional on the
   * schema only for defensive typing against pre-existing/malformed data.
   */
  organizerHandle?: string;
  coverImage?: string;
  mode: EventMode;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  mapIframe?: string;
  platform?: string;
  platformLink?: string;
  startTime: Date;
  endTime: Date;
  startDate: Date;
  endDate: Date;
  /**
   * A trust badge, not a real government API integration — same treatment
   * as `Organization.verified`: server/seed-set only, never accepted from
   * `createEventSchema`. Letting the event's own creator self-declare
   * government backing would be trivially fake-able, exactly the reason
   * `Organization.verified` isn't client-writable either.
   */
  isGovernmentSponsored: boolean;
  /**
   * Who can join (PG-4). Organizer-settable, unlike `isGovernmentSponsored`:
   * it is a statement about their own event. Absent on events saved before it
   * existed; read it through `effectiveAccess`, never directly.
   */
  access?: EventAccess;
  /**
   * The retired yes/no flag `access` replaced. Never written any more, and
   * only read to give an old event an access level (`inviteOnly: true` was an
   * approval-style event). Stripped from the JSON the API returns.
   */
  inviteOnly?: boolean;
  /**
   * Whether a full event takes a waitlist (PG-14). When off, a full event just
   * refuses the next person, as before. Defaults to on.
   */
  waitlistEnabled: boolean;
  /**
   * The IANA timezone the event is held in, such as `Asia/Kolkata` (PG-11).
   * The start and end are real instants either way; this says which clock the
   * organizer meant, so every viewer sees the event's own time (and their own
   * beside it). Absent on events saved before it existed, which are shown in the
   * viewer's own timezone as they always were.
   */
  timezone?: string;
  /** What kind of event this is (PG-9). Absent on events saved before it existed. */
  eventType?: EventType;
  /** Free-text tags, lower-case, at most 8 (PG-9). */
  tags: string[];
  /**
   * Most people who can join. Absent means no limit (PG-5). A soft limit
   * (PG-14): invited people and the organizer's own approvals can go past it.
   */
  capacity?: number;
  /**
   * How many people are going, kept in step with the `going` rows of
   * `EventRegistration` by `joinEvent`, `leaveEvent` and the organizer's
   * approvals with atomic `$inc`s, so the last spot cannot be taken twice by
   * two open joins. Pending, waitlisted and declined people are not counted.
   * Only meaningful (and only shown) when `capacity` is set; `updateEvent`
   * recounts it whenever it sets a capacity, which also covers events saved
   * before the field existed.
   */
  registrationCount: number;
  /** `cancelled` events stay visible with a badge and refuse new joins. */
  status: EventStatus;
  /** Set when `status` becomes `cancelled`; never cleared (no reinstate yet). */
  cancelledAt?: Date;
  /** Long-form description, one paragraph per entry, for the detail page's
   *  "About this event" section. */
  about?: string[];
  /** The timeline/run sheet. Absent or empty — the detail page simply skips
   *  that section, per this codebase's "nothing invented" rule. */
  agenda?: IEventAgendaItem[];
  /** What an attendee should turn up with, or be ready for. */
  bringAlong?: string[];
  /** Offline events — directions, alongside the existing `address`/`city`. */
  gettingThere?: string;
  /** Online events — how/when the join link reaches an attendee. */
  linkDelivery?: string;
  /** Online events — anything they need working before they join. */
  joinRequirements?: string;
  cost?: IEventCost;
  fundraiser?: IEventFundraiser;
  /** Languages the session is actually run in. */
  languages?: string[];
  /** Set only where there is a real restriction. */
  minimumAge?: number;
  contactEmail?: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The access level an event really has: its `access`, or for an event saved
 * before that field existed, `approval` when it was flagged `inviteOnly` and
 * `open` otherwise.
 */
export function effectiveAccess(
  event: Pick<IEvent, "access" | "inviteOnly">,
): EventAccess {
  return event.access ?? (event.inviteOnly ? "approval" : "open");
}

export interface IEventRegistration extends Document {
  eventUid: string;
  userId: mongoose.Types.ObjectId;
  attendeeEmail: string;
  attendeeName: string;
  /** Absent on rows saved before it existed, which are `going` (PG-14). */
  status?: RegistrationStatus;
  /** What the person wrote when asking to join an approval event (PG-4). */
  note?: string;
  /** When the organizer last approved or declined the person (PG-14). */
  decidedAt?: Date;
  /** Set by the organizer when the attendee turns up (PG-6). */
  checkedInAt?: Date;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** An email the organizer invited to an event (PG-4). */
export interface IEventInvite extends Document {
  eventUid: string;
  /** Lower-cased. The invited person must sign in with this exact email. */
  email: string;
  /** Email of the organization account that sent the invite. */
  invitedBy: string;
  /** Set when the person registers through the invite. */
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agendaItemSchema = new Schema<IEventAgendaItem>(
  {
    time: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    detail: { type: String, trim: true },
  },
  { _id: false },
);

const costSchema = new Schema<IEventCost>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const fundraiserSchema = new Schema<IEventFundraiser>(
  {
    purpose: { type: String, required: true, trim: true },
    goal: { type: Number, required: true, min: 0 },
    raised: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, trim: true },
    supporters: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const eventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    hostUsername: {
      type: String,
      required: true,
    },
    hostName: {
      type: String,
      required: true,
      trim: true,
    },
    organizerHandle: {
      type: String,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ["Online", "Offline", "Hybrid"],
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    mapIframe: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      trim: true,
    },
    platformLink: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isGovernmentSponsored: {
      type: Boolean,
      default: false,
    },
    access: {
      type: String,
      enum: EVENT_ACCESS_LEVELS,
    },
    inviteOnly: {
      type: Boolean,
    },
    waitlistEnabled: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      enum: EVENT_TYPES,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    capacity: {
      type: Number,
      min: 1,
    },
    registrationCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: "published",
    },
    cancelledAt: {
      type: Date,
    },
    about: [{ type: String, trim: true }],
    agenda: { type: [agendaItemSchema], default: undefined },
    bringAlong: [{ type: String, trim: true }],
    gettingThere: { type: String, trim: true },
    linkDelivery: { type: String, trim: true },
    joinRequirements: { type: String, trim: true },
    cost: { type: costSchema, default: undefined },
    fundraiser: { type: fundraiserSchema, default: undefined },
    languages: [{ type: String, trim: true }],
    minimumAge: { type: Number, min: 0 },
    contactEmail: { type: String, trim: true },
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      // The API speaks `access`; the retired `inviteOnly` flag is folded into
      // it for old documents and never sent.
      transform: (_doc, ret) => {
        ret.access = effectiveAccess(ret as Pick<IEvent, "access" | "inviteOnly">);
        delete ret.inviteOnly;
        return ret;
      },
    },
  },
);

// Indexes for the list queries in `findAll` (DB-3). The directory splits on
// `startTime` and sorts by it, with `_id` breaking ties. A host's own list
// matches `hostUsername` or `organizerHandle` (each branch of the `$or` uses its
// own index) and sorts newest first, or soonest first for a period; carrying
// `_id` in the key lets either direction come straight off the index. `uid` is
// unique on its own.
eventSchema.index({ startTime: 1, _id: 1 });
eventSchema.index({ hostUsername: 1, startTime: -1, _id: -1 });
eventSchema.index({ organizerHandle: 1, startTime: -1, _id: -1 });

export const Event = mongoose.model<IEvent>("Event", eventSchema);

const eventRegistrationSchema = new Schema<IEventRegistration>(
  {
    eventUid: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    attendeeEmail: { type: String, required: true },
    attendeeName: { type: String, required: true },
    status: { type: String, enum: REGISTRATION_STATUSES },
    note: { type: String, trim: true },
    decidedAt: { type: Date },
    checkedInAt: { type: Date },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

eventRegistrationSchema.index({ eventUid: 1, userId: 1 }, { unique: true });
eventRegistrationSchema.index({ eventUid: 1, status: 1, createdAt: 1 });

export const EventRegistration = mongoose.model<IEventRegistration>(
  "EventRegistration",
  eventRegistrationSchema,
);

const eventInviteSchema = new Schema<IEventInvite>(
  {
    eventUid: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    invitedBy: { type: String, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

eventInviteSchema.index({ eventUid: 1, email: 1 }, { unique: true });
// "Which events am I invited to": looked up by the invited email alone.
eventInviteSchema.index({ email: 1 });

export const EventInvite = mongoose.model<IEventInvite>(
  "EventInvite",
  eventInviteSchema,
);
