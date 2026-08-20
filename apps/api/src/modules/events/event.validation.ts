import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

const OFFLINE_REQUIRED_FIELDS = [
  "city",
  "state",
  "country",
  "address",
  "mapIframe",
] as const;

export const createEventSchema = z
  .object({
    uid: z.string().min(1, "Missing Required Fields"),
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
    platformLink: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "Offline") {
      return;
    }

    for (const field of OFFLINE_REQUIRED_FIELDS) {
      if (!data[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Missing Required Fields",
        });
      }
    }
  });

export const listEventsQuerySchema = z
  .object({
    uid: z.string().optional(),
    slug: z.string().optional(),
  })
  .merge(paginationQuerySchema);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
