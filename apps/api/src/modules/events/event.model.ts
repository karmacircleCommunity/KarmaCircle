import mongoose, { Document, Schema } from "mongoose";

export type EventMode = "Online" | "Offline";

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
   * compatibility. Absent for an event created by an individual host.
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
   * Unlike `isGovernmentSponsored`, this one *is* organizer-settable — it's
   * a statement about their own event, not a claim about a third party, so
   * there's no abuse concern. `EventJoinPanel` on the frontend replaces the
   * Join control with an honest "ask the organizer" state when this is set,
   * rather than a button that looks live and silently does nothing.
   */
  inviteOnly: boolean;
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
      index: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      enum: ["Online", "Offline"],
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
    inviteOnly: {
      type: Boolean,
      default: false,
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
  },
  { timestamps: true },
);

export const Event = mongoose.model<IEvent>("Event", eventSchema);
