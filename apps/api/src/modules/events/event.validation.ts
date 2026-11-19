import { z } from "zod";
import { env } from "../../config/env";
import { paginationQuerySchema } from "../../utils/pagination";
import {
  COVER_IMAGE_URL_MAX_LENGTH,
  EVENT_ACCESS_LEVELS,
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_ABOUT_MAX_PARAGRAPHS,
  EVENT_ABOUT_PARAGRAPH_MAX_LENGTH,
  EVENT_AGENDA_DETAIL_MAX_LENGTH,
  EVENT_AGENDA_MAX_ITEMS,
  EVENT_AGENDA_TIME_MAX_LENGTH,
  EVENT_AGENDA_TITLE_MAX_LENGTH,
  EVENT_BRING_ALONG_ITEM_MAX_LENGTH,
  EVENT_BRING_ALONG_MAX_ITEMS,
  EVENT_CAPACITY_MAX,
  EVENT_CITY_MAX_LENGTH,
  EVENT_CONTACT_EMAIL_MAX_LENGTH,
  EVENT_COST_MAX_AMOUNT,
  EVENT_COST_NOTE_MAX_LENGTH,
  EVENT_GETTING_THERE_MAX_LENGTH,
  EVENT_INVITES_PER_REQUEST_MAX,
  EVENT_JOIN_NOTE_MAX_LENGTH,
  EVENT_LANGUAGE_MAX_LENGTH,
  EVENT_LANGUAGES_MAX_ITEMS,
  EVENT_MINIMUM_AGE_MAX,
  EVENT_COUNTRY_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_DESCRIPTION_MIN_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_NAME_MIN_LENGTH,
  EVENT_PLATFORM_LINK_MAX_LENGTH,
  EVENT_PLATFORM_MAX_LENGTH,
  EVENT_SEARCH_MAX_LENGTH,
  EVENT_TAG_MAX_LENGTH,
  EVENT_TIMEZONE_MAX_LENGTH,
  EVENT_TAGS_MAX_ITEMS,
  EVENT_TYPES,
  EVENT_STATE_MAX_LENGTH,
  REGISTRATION_NOTE_MAX_LENGTH,
  RESERVED_EVENT_UIDS,
} from "./event.constants";

const OFFLINE_REQUIRED_FIELDS = [
  "city",
  "state",
  "country",
  "address",
] as const;
const ONLINE_REQUIRED_FIELDS = ["platform", "platformLink"] as const;

/**
 * Whether `value` names a real IANA timezone in its full `Area/Location` form
 * (or `UTC`), by asking the runtime's own database (the same one that formats
 * the dates), so the list is never out of date and a made-up zone can never be
 * stored. The runtime also accepts legacy short aliases such as `IST` and `EST`;
 * those are refused because an abbreviation can mean more than one place.
 */
export const isValidTimeZone = (value: string) => {
  if (value !== "UTC" && !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Outside production, an image uploaded to this API's own disk (the `direct`
 * upload driver) is served over plain http from `/uploads/files/`, since local
 * development has no TLS. Accepted only there, and only for that path.
 */
const isLocalUploadUrl = (value: string) => {
  if (env.NODE_ENV === "production") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      url.pathname.startsWith("/uploads/files/event-covers/")
    );
  } catch {
    return false;
  }
};

/**
 * A cover image is an https link: to an image uploaded through
 * `POST /uploads/event-covers` (the form's own path), or to one hosted
 * elsewhere. A base64 data URL is refused: that is what used to put every
 * image inside the event document and every image inside every event list
 * (DB-1). Events saved that way before still read fine; `scripts/migrate-event-covers.ts`
 * moves them to storage.
 */
const coverImageSchema = z
  .string()
  .min(1, "Missing Required Fields")
  .superRefine((value, ctx) => {
    if (value.startsWith("data:")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Upload the cover image and send its https link, not the image data",
      });
      return;
    }

    if (
      value.length > COVER_IMAGE_URL_MAX_LENGTH ||
      !(isHttpsUrl(value) || isLocalUploadUrl(value))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cover image must be an https link to an uploaded image",
      });
    }
  });

/**
 * A list of short texts with each item trimmed and non-empty. On edit, `[]`
 * clears the field.
 */
const textList = (maxItems: number, maxLength: number) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);

/**
 * The optional detail-page fields (PG-7). Every one is optional, and `null`
 * means "remove it" when editing (and is ignored on create). `isGovernmentSponsored`
 * and `fundraiser` are deliberately not here: the first is a server-only trust
 * badge, the second waits on the money decision (PG-26).
 */
const detailShape = {
  /** Long-form paragraphs for "About this event". */
  about: textList(
    EVENT_ABOUT_MAX_PARAGRAPHS,
    EVENT_ABOUT_PARAGRAPH_MAX_LENGTH,
  ).optional(),
  /** Shown on the join panel. */
  contactEmail: z
    .string()
    .trim()
    .max(EVENT_CONTACT_EMAIL_MAX_LENGTH)
    .email("Enter a valid contact email")
    .nullable()
    .optional(),
  /** Absent means free. A price is the exception, so zero is rejected. */
  cost: z
    .object({
      amount: z
        .number()
        .positive("A fee must be more than zero. Leave the cost out for a free event")
        .max(EVENT_COST_MAX_AMOUNT),
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter code such as INR"),
      note: z.string().trim().max(EVENT_COST_NOTE_MAX_LENGTH).optional(),
    })
    .strict()
    .nullable()
    .optional(),
  bringAlong: textList(
    EVENT_BRING_ALONG_MAX_ITEMS,
    EVENT_BRING_ALONG_ITEM_MAX_LENGTH,
  ).optional(),
  languages: textList(
    EVENT_LANGUAGES_MAX_ITEMS,
    EVENT_LANGUAGE_MAX_LENGTH,
  ).optional(),
  minimumAge: z
    .number()
    .int("Minimum age must be a whole number")
    .min(1)
    .max(EVENT_MINIMUM_AGE_MAX)
    .nullable()
    .optional(),
  agenda: z
    .array(
      z
        .object({
          time: z.string().trim().min(1).max(EVENT_AGENDA_TIME_MAX_LENGTH),
          title: z.string().trim().min(1).max(EVENT_AGENDA_TITLE_MAX_LENGTH),
          detail: z
            .string()
            .trim()
            .max(EVENT_AGENDA_DETAIL_MAX_LENGTH)
            .optional(),
        })
        .strict(),
    )
    .max(EVENT_AGENDA_MAX_ITEMS)
    .optional(),
  /** Offline events: directions, alongside the address. */
  gettingThere: z
    .string()
    .trim()
    .max(EVENT_GETTING_THERE_MAX_LENGTH)
    .nullable()
    .optional(),
  /** Online events: how and when the join link reaches an attendee. */
  linkDelivery: z
    .string()
    .trim()
    .max(EVENT_JOIN_NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
  /** Online events: anything to have ready before joining. */
  joinRequirements: z
    .string()
    .trim()
    .max(EVENT_JOIN_NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
};

/**
 * The fields an organizer can set on an event, shared by create and edit. The
 * page address (`uid`) is deliberately not here: it is chosen once at creation
 * and never changes, because registrations point at it (see DB-5).
 */
const editableEventShape = {
  name: z
    .string()
    .min(EVENT_NAME_MIN_LENGTH, {
      message: `Name should be between ${EVENT_NAME_MIN_LENGTH} and ${EVENT_NAME_MAX_LENGTH} characters`,
    })
    .max(EVENT_NAME_MAX_LENGTH, {
      message: `Name should be between ${EVENT_NAME_MIN_LENGTH} and ${EVENT_NAME_MAX_LENGTH} characters`,
    }),
  description: z
    .string()
    .min(EVENT_DESCRIPTION_MIN_LENGTH, {
      message: `Description should be between ${EVENT_DESCRIPTION_MIN_LENGTH} and ${EVENT_DESCRIPTION_MAX_LENGTH} characters`,
    })
    .max(EVENT_DESCRIPTION_MAX_LENGTH, {
      message: `Description should be between ${EVENT_DESCRIPTION_MIN_LENGTH} and ${EVENT_DESCRIPTION_MAX_LENGTH} characters`,
    }),
  coverImage: coverImageSchema,
  mode: z.enum(["Online", "Offline", "Hybrid"]),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  city: z.string().max(EVENT_CITY_MAX_LENGTH).optional(),
  state: z.string().max(EVENT_STATE_MAX_LENGTH).optional(),
  country: z.string().max(EVENT_COUNTRY_MAX_LENGTH).optional(),
  address: z.string().max(EVENT_ADDRESS_MAX_LENGTH).optional(),
  mapIframe: z.string().optional(),
  platform: z.string().max(EVENT_PLATFORM_MAX_LENGTH).optional(),
  platformLink: z
    .string()
    .trim()
    .max(EVENT_PLATFORM_LINK_MAX_LENGTH)
    .optional(),
  ...detailShape,
  /**
   * The IANA timezone the event is held in (PG-11), for example `Asia/Kolkata`.
   * Optional for compatibility; the web form always sends one. It does not move
   * `startTime` or `endTime` (those are exact instants); it records which clock
   * the organizer was reading.
   */
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(EVENT_TIMEZONE_MAX_LENGTH)
    .refine(isValidTimeZone, { message: "Choose a valid timezone" })
    .optional(),
  /** What kind of event this is (PG-9). Optional for compatibility; the web form requires it. */
  eventType: z.enum(EVENT_TYPES).optional(),
  /** Free-text tags, lower-cased and de-duplicated; `[]` clears them on edit. */
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(EVENT_TAG_MAX_LENGTH))
    .max(EVENT_TAGS_MAX_ITEMS)
    .transform((tags) => [...new Set(tags)])
    .optional(),
  /**
   * Most people who can join (PG-5). Leave it out for no limit. `null` is only
   * meaningful when editing, where it removes an existing limit.
   */
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(EVENT_CAPACITY_MAX, `Capacity can be at most ${EVENT_CAPACITY_MAX}`)
    .nullable()
    .optional(),
  /**
   * Who can join (PG-4): `open` (the default), `approval` (the organizer
   * approves each person) or `invite` (only invited emails). Organizer-settable,
   * unlike `isGovernmentSponsored` (server/seed-only, see event.model.ts): it is
   * a statement about their own event, not a claim about a third party.
   */
  access: z.enum(EVENT_ACCESS_LEVELS).optional(),
  /** Whether a full event takes a waitlist (PG-14). On by default. */
  waitlistEnabled: z.boolean().optional(),
};

type EventRuleFields = {
  mode: "Online" | "Offline" | "Hybrid";
  startTime: Date;
  endTime: Date;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  platform?: string;
  platformLink?: string;
};

/**
 * The cross-field rules every saved event must satisfy: the end follows the
 * start, the start is not in the past (only checked when `requireFutureStart`
 * is set, so an edit that leaves a running event's start alone still passes),
 * and the fields the chosen mode needs are present.
 */
const addEventRuleIssues = (
  data: EventRuleFields,
  ctx: z.RefinementCtx,
  options: { requireFutureStart: boolean },
) => {
  if (data.endTime.getTime() <= data.startTime.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "End time must be after the start time",
    });
  }

  if (options.requireFutureStart && data.startTime.getTime() < Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startTime"],
      message: "Start time must be in the future",
    });
  }

  // Hybrid needs both a venue and a way to join online.
  const requiredFields: readonly (keyof EventRuleFields)[] =
    data.mode === "Offline"
      ? OFFLINE_REQUIRED_FIELDS
      : data.mode === "Online"
        ? ONLINE_REQUIRED_FIELDS
        : [...OFFLINE_REQUIRED_FIELDS, ...ONLINE_REQUIRED_FIELDS];

  for (const field of requiredFields) {
    if (!data[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: "Missing Required Fields",
      });
    }
  }

  if (
    data.mode !== "Offline" &&
    data.platformLink &&
    !isHttpUrl(data.platformLink)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["platformLink"],
      message: "Meeting link must start with http:// or https://",
    });
  }
};

export const createEventSchema = z
  .object({
    uid: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens in the event page address",
      )
      .refine((uid) => !RESERVED_EVENT_UIDS.includes(uid), {
        message: "That event page address is reserved. Choose another one",
      }),
    ...editableEventShape,
    /**
     * `draft` saves the event hidden from everyone but its organization (PG-15);
     * `published` (the default) makes it public. Only create sets this: after
     * that the publish, unpublish and cancel routes move it.
     */
    status: z.enum(["draft", "published"]).optional(),
  })
  .superRefine((data, ctx) =>
    addEventRuleIssues(data, ctx, { requireFutureStart: true }),
  );

/**
 * Edit body: any subset of the editable fields (never `uid`, which is
 * rejected as an unknown key). The cross-field rules run in the service on
 * the stored event merged with this body, because a lone `endTime` or `mode`
 * can only be judged against the rest of the event.
 */
export const updateEventSchema = z
  .object(editableEventShape)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Send at least one field to change",
  });

/**
 * Re-checks the cross-field rules on a merged event (service-side, for edit).
 * Throws a `ZodError`, which the global error handler returns as a `400`.
 */
export function assertEventRules(
  fields: EventRuleFields,
  options: { requireFutureStart: boolean },
) {
  z.custom<EventRuleFields>()
    .superRefine((data, ctx) => addEventRuleIssues(data, ctx, options))
    .parse(fields);
}

export const listEventsQuerySchema = z
  .object({
    uid: z.string().optional(),
    slug: z.string().optional(),
    /**
     * Filters to one host's own events — matched against either the real
     * `organizerHandle` link or the legacy free-text `hostUsername` (see
     * event.service.ts#findAll). This is what backs the organization's
     * "Your events" page and its public profile's "Events hosted" section
     * — the alternative, fetching every event and filtering in the
     * browser, silently hides matches on page two.
     */
    host: z.string().trim().min(1).optional(),
    /**
     * Case-insensitive text match on the event's name, city and host name
     * (event.service.ts#findAll). Capped so a pasted wall of text cannot
     * become an expensive pattern; a blank value is treated as no search.
     */
    search: z
      .string()
      .trim()
      .max(EVENT_SEARCH_MAX_LENGTH)
      .transform((value) => value || undefined)
      .optional(),
    /**
     * Splits the list on `startTime` against the server's clock. Left out,
     * every event is returned (the pre-pagination behavior other callers
     * rely on). `upcoming` sorts soonest first, `past` most recent first.
     */
    period: z.enum(["upcoming", "past"]).optional(),
    /** Narrow by where the event happens. */
    mode: z.enum(["Online", "Offline", "Hybrid"]).optional(),
    /** Narrow by what kind of event it is (PG-9). */
    type: z.enum(EVENT_TYPES).optional(),
    /** Narrow by who can join (PG-4). */
    access: z.enum(EVENT_ACCESS_LEVELS).optional(),
  })
  .merge(paginationQuerySchema);

export const eventUidParamsSchema = z.object({
  uid: z.string().trim().min(1),
});

/** `:registrationId` is a Mongo ObjectId, checked before it reaches a query. */
export const attendeeParamsSchema = eventUidParamsSchema.extend({
  registrationId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid registration id"),
});

export const attendeesQuerySchema = paginationQuerySchema.extend({
  /** Literal, case-insensitive match on the attendee's name or email. */
  search: z
    .string()
    .trim()
    .max(EVENT_SEARCH_MAX_LENGTH)
    .transform((value) => value || undefined)
    .optional(),
  /** Which registrations to list (PG-14). Left out, only people going. */
  status: z.enum(["going", "pending", "waitlisted", "declined", "all"]).default("going"),
});

export const checkInBodySchema = z.object({ checkedIn: z.boolean() }).strict();

/**
 * Optional body of a join (PG-4): the note a person can leave when asking to
 * join an approval event. Ignored for the other access levels.
 */
export const joinBodySchema = z
  .object({
    note: z
      .string()
      .trim()
      .max(
        REGISTRATION_NOTE_MAX_LENGTH,
        `Keep the note to ${REGISTRATION_NOTE_MAX_LENGTH} characters or fewer`,
      )
      .transform((value) => value || undefined)
      .optional(),
  })
  .strict()
  .default({});

/** The people the organizer invites by email (PG-4). */
export const inviteBodySchema = z
  .object({
    emails: z
      .array(z.string().trim().toLowerCase().email("Enter a valid email").max(254))
      .min(1, "Add at least one email")
      .max(
        EVENT_INVITES_PER_REQUEST_MAX,
        `Invite at most ${EVENT_INVITES_PER_REQUEST_MAX} people at a time`,
      )
      .transform((emails) => [...new Set(emails)]),
  })
  .strict();

export const inviteParamsSchema = eventUidParamsSchema.extend({
  inviteId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid invite id"),
});

export const myEventsQuerySchema = paginationQuerySchema.extend({
  period: z.enum(["upcoming", "past"]).default("upcoming"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type MyEventsQuery = z.infer<typeof myEventsQuerySchema>;
export type AttendeesQuery = z.infer<typeof attendeesQuerySchema>;
export type CheckInBody = z.infer<typeof checkInBodySchema>;
export type JoinBody = z.infer<typeof joinBodySchema>;
export type InviteBody = z.infer<typeof inviteBodySchema>;
