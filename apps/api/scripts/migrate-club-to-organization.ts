/**
 * One-off data migration: renames the "club" account type to
 * "organization" everywhere it's stored, to match the August 2026
 * "club" → "organization" rename across both apps' code (routes,
 * modules, types) and the `userType` discriminator in `user.model.ts`.
 *
 * Updates every `User` document with `userType: "club"` to
 * `userType: "organization"` via the **raw MongoDB driver**
 * (`mongoose.connection.db.collection("users")`), not
 * `User.updateMany()`. That's deliberate, not a style choice: Mongoose
 * silently no-ops a bulk `updateMany`/`updateOne` that `$set`s the
 * schema's `discriminatorKey` field (`userType` here) — it resolves
 * with `{ acknowledged: false }` and no error, so nothing gets written
 * and nothing throws. Confirmed against this database while writing
 * this script; see known-issues.md's "Mongoose discriminator-key bulk
 * updates silently no-op" entry. The raw driver has no such
 * restriction.
 *
 * Usage: npx tsx scripts/migrate-club-to-organization.ts
 * (reads MONGO_URI from apps/api/.env, same as the server does.)
 *
 * Idempotent: running it twice is harmless — the second run just
 * matches zero documents.
 */
import "dotenv/config";
import mongoose from "mongoose";

async function migrate() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set (check apps/api/.env)");
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("mongoose.connection.db is unexpectedly undefined");
  }
  const users = db.collection("users");

  const before = await users.countDocuments({ userType: "club" });
  console.log(`Found ${before} document(s) with userType: "club"`);

  if (before === 0) {
    console.log("Nothing to migrate. Done.");
    await mongoose.disconnect();
    return;
  }

  const result = await users.updateMany(
    { userType: "club" },
    { $set: { userType: "organization" } },
  );
  console.log(
    `acknowledged: ${result.acknowledged}, matched: ${result.matchedCount}, modified: ${result.modifiedCount}`,
  );

  const remaining = await users.countDocuments({ userType: "club" });
  const migrated = await users.countDocuments({ userType: "organization" });
  console.log(
    `After migration: ${remaining} document(s) still "club", ${migrated} document(s) now "organization"`,
  );

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
