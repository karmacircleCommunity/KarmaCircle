import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import {
  COVER_IMAGE_MAX_BYTES,
  COVER_IMAGE_MIME_TYPES,
  COVER_IMAGE_URL_MAX_LENGTH,
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_CITY_MAX_LENGTH,
  EVENT_COUNTRY_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_DESCRIPTION_MIN_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_NAME_MIN_LENGTH,
  EVENT_PLATFORM_LINK_MAX_LENGTH,
  EVENT_PLATFORM_MAX_LENGTH,
  EVENT_SEARCH_MAX_LENGTH,
  EVENT_STATE_MAX_LENGTH,
  RESERVED_EVENT_UIDS,
} from "./event.constants";

const OFFLINE_REQUIRED_FIELDS = [
  "city",
  "state",
  "country",
  "address",
] as const;
const ONLINE_REQUIRED_FIELDS = ["platform", "platformLink"] as const;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const COVER_IMAGE_DATA_URL_PATTERN = new RegExp(
  `^data:image/(?:${COVER_IMAGE_MIME_TYPES.join("|")});base64,`,
);
const BASE64_PAYLOAD_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
/** Longest data URL string that could still decode to the byte cap. */
const COVER_IMAGE_MAX_DATA_URL_LENGTH =
  Math.ceil(COVER_IMAGE_MAX_BYTES / 3) * 4 + 64;

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/** Decoded size of a base64 payload, from its length and `=` padding. */
const base64DecodedBytes = (payload: string) => {
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return (payload.length * 3) / 4 - padding;
};

/**
 * A cover image is either an https link or a base64 data URL of an allowed
 * image type no larger than the browser's own 5 MB file limit. Anything else
 * (http, javascript:, svg, other data types, oversized payloads) is rejected.
 */
const coverImageSchema = z
  .string()
  .min(1, "Missing Required Fields")
  .superRefine((value, ctx) => {
    if (value.startsWith("data:")) {
      if (value.length > COVER_IMAGE_MAX_DATA_URL_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cover image must be 5 MB or smaller",
        });
        return;
      }
      const header = COVER_IMAGE_DATA_URL_PATTERN.exec(value);
      if (!header) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cover image must be a PNG, JPEG, WebP or GIF image",
        });
        return;
      }
      const payload = value.slice(header[0].length);
      if (!BASE64_PAYLOAD_PATTERN.test(payload) || payload.length % 4 !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cover image data is not valid base64",
        });
        return;
      }
      if (base64DecodedBytes(payload) > COVER_IMAGE_MAX_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cover image must be 5 MB or smaller",
        });
      }
      return;
    }

    if (value.length > COVER_IMAGE_URL_MAX_LENGTH || !isHttpsUrl(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Cover image must be an https link or an uploaded PNG, JPEG, WebP or GIF image",
      });
    }
  });

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
    mode: z.enum(["Online", "Offline"]),
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
    /**
     * Organizer-settable, unlike `isGovernmentSponsored` (server/seed-only
     * — see event.model.ts). A statement about their own event, not a
     * claim about a third party, so there's no abuse concern in letting the
     * creator set it directly.
     */
    inviteOnly: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime.getTime() <= data.startTime.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time",
      });
    }

    if (data.startTime.getTime() < Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Start time must be in the future",
      });
    }

    const requiredFields =
      data.mode === "Offline"
        ? OFFLINE_REQUIRED_FIELDS
        : ONLINE_REQUIRED_FIELDS;

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
      data.mode === "Online" &&
      data.platformLink &&
      !isHttpUrl(data.platformLink)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformLink"],
        message: "Meeting link must start with http:// or https://",
      });
    }
  });

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
    mode: z.enum(["Online", "Offline"]).optional(),
    /** `true` is invite-only events, `false` is events open to everyone. */
    inviteOnly: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .merge(paginationQuerySchema);

export const eventUidParamsSchema = z.object({
  uid: z.string().trim().min(1),
});

export const myEventsQuerySchema = paginationQuerySchema.extend({
  period: z.enum(["upcoming", "past"]).default("upcoming"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type MyEventsQuery = z.infer<typeof myEventsQuerySchema>;
