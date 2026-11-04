/**
 * Image types the API accepts for an event cover. Mirrors
 * `COVER_IMAGE_MIME_TYPES` in
 * `apps/api/src/modules/events/event.constants.ts` (the API checks the
 * `data:image/<type>;base64,` header against the same four). Keep the two in
 * step: if the browser lets a type through that the API rejects, the organizer
 * fills the whole form and only learns about it from a 400 on submit.
 */
export const COVER_IMAGE_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

/** Value for the file input's `accept` attribute. */
export const COVER_IMAGE_ACCEPT = COVER_IMAGE_MIME_TYPES.join(",");

/** Shown when the chosen file is not one of the accepted types. */
export const COVER_IMAGE_TYPE_ERROR =
  "Cover image must be a PNG, JPEG, WebP or GIF image";
