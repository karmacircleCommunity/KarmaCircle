/**
 * Moves event cover images that were stored inside the event record as base64
 * data URLs (DB-1) into Vercel Blob, and leaves only the https link on the event.
 *
 * Safe to run more than once: it only touches events whose cover still starts
 * with `data:`, and it never overwrites a cover an organizer changed meanwhile.
 *
 * Needs `MONGO_URI` (the database to fix) and `BLOB_READ_WRITE_TOKEN` (the Blob
 * store to fill), both from the environment or `apps/api/.env`.
 *
 * Run from `apps/api`:
 *   pnpm exec tsx scripts/migrate-event-covers.ts --dry-run     (lists, changes nothing)
 *   pnpm exec tsx scripts/migrate-event-covers.ts --confirm     (does it)
 */
import "dotenv/config";
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import mongoose from "mongoose";
import {
  migrateEventCovers,
  type ParsedCover,
} from "../src/modules/uploads/cover-migration";
import { EVENT_COVER_FOLDER } from "../src/modules/uploads/upload.service";

const EXTENSIONS: Record<ParsedCover["contentType"], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.argv.includes("--confirm")) {
    console.error("Pass --dry-run to look, or --confirm to migrate.");
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!mongoUri) throw new Error("MONGO_URI is required");
  if (!dryRun && !blobToken)
    throw new Error("BLOB_READ_WRITE_TOKEN is required");

  await mongoose.connect(mongoUri);
  console.log(
    `${dryRun ? "Dry run on" : "Migrating"} ${mongoose.connection.name}`,
  );

  try {
    const result = await migrateEventCovers(
      async (cover) => {
        const pathname = `${EVENT_COVER_FOLDER}/${crypto.randomUUID()}.${EXTENSIONS[cover.contentType]}`;
        const blob = await put(pathname, cover.bytes, {
          access: "public",
          token: blobToken,
          contentType: cover.contentType,
          addRandomSuffix: false,
          allowOverwrite: false,
        });
        return blob.url;
      },
      { dryRun, log: (line) => console.log(line) },
    );

    console.log(
      `\nFound ${result.found}, moved ${result.migrated}, skipped ${result.skipped.length}.` +
        (dryRun
          ? " Nothing was changed."
          : ` Took ${(result.bytesFreed / 1024 / 1024).toFixed(1)} MB out of the event records.`),
    );
    for (const skipped of result.skipped) {
      console.log(`  skipped ${skipped.uid}: ${skipped.reason}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
