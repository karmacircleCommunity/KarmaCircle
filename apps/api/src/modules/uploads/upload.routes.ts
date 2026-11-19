import express, { Router } from "express";
import { AuthenticatedRequest, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { COVER_IMAGE_MAX_BYTES } from "../events/event.constants";
import * as uploadController from "./upload.controller";
import {
  COVER_IMAGE_CONTENT_TYPES,
  coverUploadRequestSchema,
} from "./upload.validation";

const router = Router();

/**
 * @openapi
 * /uploads/event-covers:
 *   post:
 *     summary: Ask for permission to upload one event cover image
 *     description: >
 *       Organization accounts only. The image bytes never pass through this API:
 *       the response says where to send them. `vercel-blob` returns a short-lived
 *       client token for Vercel Blob (one pathname, one content type, 5 MB).
 *       `direct` (development and test) returns a signed URL on this API to `PUT`
 *       the bytes to. Either way the event then keeps only the https link of the
 *       uploaded image as its `coverImage`.
 *     tags: [Uploads]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentType, size]
 *             properties:
 *               contentType: { type: string, enum: [image/png, image/jpeg, image/webp, image/gif] }
 *               size: { type: integer, minimum: 1, maximum: 5242880 }
 *     responses:
 *       201:
 *         description: >
 *           `{ strategy: "vercel-blob", clientToken, pathname }` or
 *           `{ strategy: "direct", uploadUrl, method: "PUT", publicUrl }`
 *       400: { description: Validation failed }
 *       401: { description: Unauthorized }
 *       403: { description: Not an organization account }
 *       503: { description: Image uploads are not set up on this server }
 */
router.post(
  "/event-covers",
  requireAuth,
  validate(coverUploadRequestSchema),
  asyncHandler<AuthenticatedRequest>(uploadController.requestCoverUpload),
);

/**
 * @openapi
 * /uploads/local/{token}:
 *   put:
 *     summary: Receive the bytes of a local (`direct`) cover upload
 *     description: >
 *       Development and test only; `404` anywhere a Blob token is configured and
 *       in production. The signed token in the path fixes the file name and the
 *       image type, and the real bytes must match that type.
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         image/png: { schema: { type: string, format: binary } }
 *         image/jpeg: { schema: { type: string, format: binary } }
 *         image/webp: { schema: { type: string, format: binary } }
 *         image/gif: { schema: { type: string, format: binary } }
 *     responses:
 *       200: { description: Image uploaded }
 *       400: { description: Wrong type, empty, or not a real image }
 *       403: { description: Invalid or expired token }
 *       409: { description: This ticket was already used }
 *       413: { description: Larger than 5 MB }
 */
router.put(
  "/local/:token",
  express.raw({
    type: [...COVER_IMAGE_CONTENT_TYPES],
    limit: COVER_IMAGE_MAX_BYTES,
  }),
  asyncHandler(uploadController.saveLocalUpload),
);

export default router;
