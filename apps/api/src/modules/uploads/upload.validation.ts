import { z } from "zod";
import { COVER_IMAGE_MAX_BYTES } from "../events/event.constants";

/** The image types an event cover can be, as full media types. */
export const COVER_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;
export type CoverImageContentType = (typeof COVER_IMAGE_CONTENT_TYPES)[number];

/**
 * What the browser says about the file it is about to upload. The type and size
 * are enforced again where the bytes land (Blob checks the token's limits, the
 * local driver checks the bytes themselves), so this is the early, friendly
 * answer rather than the only guard.
 */
export const coverUploadRequestSchema = z
  .object({
    contentType: z.enum(COVER_IMAGE_CONTENT_TYPES, {
      errorMap: () => ({
        message: "Cover image must be a PNG, JPEG, WebP or GIF image",
      }),
    }),
    size: z
      .number()
      .int()
      .min(1, "Cover image is empty")
      .max(COVER_IMAGE_MAX_BYTES, "Cover image must be 5 MB or smaller"),
  })
  .strict();

export type CoverUploadRequest = z.infer<typeof coverUploadRequestSchema>;
