import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

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

export const createEventSchema = z
  .object({
    uid: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and single hyphens in the event page address",
      ),
    name: z.string().min(1, "Missing Required Fields"),
    description: z.string().min(1, "Missing Required Fields"),
    coverImage: z.string().min(1, "Missing Required Fields"),
    mode: z.enum(["Online", "Offline"]),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    address: z.string().optional(),
    mapIframe: z.string().optional(),
    platform: z.string().optional(),
    platformLink: z.string().trim().optional(),
    /**
     * Organizer-settable, unlike `isGovernmentSponsored` (server/seed-only
     * — see event.model.ts). A statement about their own event, not a
     * claim about a third party, so there's no abuse concern in letting the
     * creator set it directly.
     */
    inviteOnly: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
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
