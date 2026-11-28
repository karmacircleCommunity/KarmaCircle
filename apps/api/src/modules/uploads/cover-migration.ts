import { Event } from "../events/event.model";
import { sniffImageType } from "./upload.service";
import type { CoverImageContentType } from "./upload.validation";

/**
 * Moves event covers that were saved as base64 data URLs (before DB-1) into
 * object storage and leaves only the https link on the event. Used by
 * `scripts/migrate-event-covers.ts`, which supplies the real upload; kept
 * separate from it so the logic runs against the test database.
 */

export interface ParsedCover {
  contentType: CoverImageContentType;
  bytes: Buffer;
}

const DATA_URL =
  /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * The type and bytes inside an image data URL, or `null` when the value is not
 * a well-formed one of the four allowed image types whose bytes match that type.
 */
export function parseCoverDataUrl(value: string): ParsedCover | null {
  const match = DATA_URL.exec(value);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  const contentType = match[1] as CoverImageContentType;
  return sniffImageType(bytes) === contentType ? { contentType, bytes } : null;
}

export interface CoverMigrationResult {
  /** Events whose cover was a data URL. */
  found: number;
  /** Events now holding a link instead. */
  migrated: number;
  /** Events left as they were, with the reason. */
  skipped: { uid: string; reason: string }[];
  /** Data URL characters taken out of the event records. */
  bytesFreed: number;
}

export async function migrateEventCovers(
  upload: (cover: ParsedCover, uid: string) => Promise<string>,
  options: { dryRun?: boolean; log?: (line: string) => void } = {},
): Promise<CoverMigrationResult> {
  const { dryRun = false, log = () => undefined } = options;
  const result: CoverMigrationResult = {
    found: 0,
    migrated: 0,
    skipped: [],
    bytesFreed: 0,
  };

  // Only the fields needed, and one event at a time: a data URL can be megabytes.
  const cursor = Event.find({ coverImage: /^data:/ })
    .select({ uid: 1, coverImage: 1 })
    .lean()
    .cursor();

  for await (const event of cursor) {
    result.found += 1;
    const value = event.coverImage ?? "";
    const cover = parseCoverDataUrl(value);
    if (!cover) {
      result.skipped.push({
        uid: event.uid,
        reason: "not a well-formed PNG, JPEG, WebP or GIF data URL",
      });
      log(`skip   ${event.uid}: not a well-formed image data URL`);
      continue;
    }

    if (dryRun) {
      log(
        `would  ${event.uid}: ${cover.contentType}, ${cover.bytes.length} bytes`,
      );
      continue;
    }

    const url = await upload(cover, event.uid);
    // Guarded on the old value, so an organizer who changed the cover while
    // this ran keeps theirs; and `__v` moves on, so an edit already in flight
    // cannot save the old cover back.
    const updated = await Event.updateOne(
      { uid: event.uid, coverImage: value },
      { $set: { coverImage: url }, $inc: { __v: 1 } },
    );
    if (updated.modifiedCount === 1) {
      result.migrated += 1;
      result.bytesFreed += value.length;
      log(`moved  ${event.uid} -> ${url}`);
    } else {
      result.skipped.push({
        uid: event.uid,
        reason: "the cover changed while the migration ran",
      });
      log(`skip   ${event.uid}: the cover changed meanwhile`);
    }
  }

  return result;
}
