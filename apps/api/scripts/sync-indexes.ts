/**
 * Brings the database's indexes in line with the model definitions (DB-2,
 * DB-3, DB-6) and checks the one thing that can make that unsafe first.
 *
 * Why this exists: the app only ever *adds* indexes (Mongoose's autoIndex),
 * and it cannot replace one. `User.userName` used to have a plain index and
 * is now unique, and MongoDB refuses to create the unique one next to the
 * plain one with the same name (IndexOptionsConflict), so on an existing
 * database uniqueness would silently not be enforced. `syncIndexes()` drops
 * the stale indexes and builds the declared ones.
 *
 * Refuses to apply when two users already share a `userName`, because the
 * unique index could not be built over them. Fix those names first.
 *
 * Dry run by default: prints what would be dropped and created.
 *
 * Usage:
 *   npx tsx scripts/sync-indexes.ts            # dry run
 *   npx tsx scripts/sync-indexes.ts --apply    # drop and create indexes
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import { User } from "../src/modules/users/user.model";

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set (check apps/api/.env)");
  }
  const apply = process.argv.includes("--apply");

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const duplicates = await User.aggregate([
    { $group: { _id: "$userName", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (duplicates.length > 0) {
    console.log(
      `\n${duplicates.length} userName value(s) are shared by more than one user:`,
    );
    for (const { _id, count } of duplicates)
      console.log(`  ${_id}  (${count} users)`);
    console.log(
      "\nThe unique index on userName cannot be built until these are renamed.",
    );
  } else {
    console.log("\nNo duplicate userName values.");
  }

  for (const model of [Event, EventRegistration, User]) {
    const diff = await model.diffIndexes();
    console.log(`\n${model.modelName}`);
    console.log(
      `  drop:   ${diff.toDrop.length ? diff.toDrop.join(", ") : "nothing"}`,
    );
    console.log(
      `  create: ${diff.toCreate.length ? diff.toCreate.map((i) => JSON.stringify(i)).join(", ") : "nothing"}`,
    );
  }

  if (!apply) {
    console.log(
      "\nDry run. Nothing changed. Pass --apply to make these changes.",
    );
  } else if (duplicates.length > 0) {
    console.log("\nNot applied: fix the duplicate userName values first.");
    process.exitCode = 1;
  } else {
    for (const model of [Event, EventRegistration, User]) {
      const dropped = await model.syncIndexes();
      console.log(
        `${model.modelName}: dropped ${dropped.length ? dropped.join(", ") : "nothing"}, indexes now match the model.`,
      );
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
