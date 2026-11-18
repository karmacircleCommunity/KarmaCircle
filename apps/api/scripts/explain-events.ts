/**
 * Shows what the events indexes (DB-2, DB-3) change, with numbers.
 *
 * Starts a throwaway in-memory MongoDB (nothing real is touched), loads
 * 40,000 events and 100,000 registrations, then runs the same query shapes
 * the API uses twice: once with the indexes the schemas had before, once with
 * the current ones. For each query it prints the plan stages, how many index
 * keys and documents MongoDB looked at, whether it had to sort in memory, and
 * the time.
 *
 * Usage: npx tsx scripts/explain-events.ts
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Event, EventRegistration } from "../src/modules/events/event.model";

const EVENTS = 40_000;
const REGISTRATIONS = 100_000;
const HOSTS = 400;
const DAY = 24 * 60 * 60 * 1000;

async function seed() {
  const now = Date.now();
  for (let from = 0; from < EVENTS; from += 10_000) {
    const docs = Array.from({ length: 10_000 }, (_, k) => {
      const n = from + k;
      const host = `host-${n % HOSTS}`;
      return {
        name: `Event number ${n}`,
        uid: `event-${n}`,
        description: "Seeded for the explain demo",
        hostUsername: host,
        hostName: host,
        organizerHandle: host,
        mode: ["Online", "Offline", "Hybrid"][n % 3],
        status: n % 50 === 0 ? "draft" : "published",
        startTime: new Date(
          now + ((n % 730) - 365) * DAY + (n % 1440) * 60_000,
        ),
      };
    });
    await Event.collection.insertMany(docs);
  }
  for (let from = 0; from < REGISTRATIONS; from += 10_000) {
    const docs = Array.from({ length: 10_000 }, (_, k) => {
      const n = from + k;
      return {
        eventUid: `event-${n % 500}`,
        userId: new mongoose.Types.ObjectId(),
        attendeeEmail: `person${n}@example.com`,
        attendeeName: `Person ${n}`,
        createdAt: new Date(now - (REGISTRATIONS - n) * 1000),
      };
    });
    await EventRegistration.collection.insertMany(docs);
  }
}

/** The indexes before this change, to compare against. */
async function useOldIndexes() {
  for (const model of [Event, EventRegistration]) {
    await model.collection.dropIndexes();
  }
  await Event.collection.createIndex({ uid: 1 }, { unique: true });
  await Event.collection.createIndex({ organizerHandle: 1 });
  await EventRegistration.collection.createIndex({ eventUid: 1 });
  await EventRegistration.collection.createIndex({ userId: 1 });
  await EventRegistration.collection.createIndex(
    { eventUid: 1, userId: 1 },
    { unique: true },
  );
}

async function useCurrentIndexes() {
  for (const model of [Event, EventRegistration]) {
    await model.collection.dropIndexes();
    await model.syncIndexes();
  }
}

const now = new Date();
const notDraft = { status: { $ne: "draft" } };
const host = "host-7";

const queries = [
  {
    name: "Directory, upcoming, page 1",
    run: () =>
      Event.collection
        .find({ $and: [notDraft, { startTime: { $gte: now } }] })
        .sort({ startTime: 1, _id: 1 })
        .limit(12)
        .explain("executionStats"),
  },
  {
    name: "Directory, past, page 1",
    run: () =>
      Event.collection
        .find({ $and: [notDraft, { startTime: { $lt: now } }] })
        .sort({ startTime: -1, _id: -1 })
        .limit(12)
        .explain("executionStats"),
  },
  {
    name: "One host's events",
    run: () =>
      Event.collection
        .find({
          $and: [
            notDraft,
            { $or: [{ hostUsername: host }, { organizerHandle: host }] },
          ],
        })
        .sort({ startTime: -1, _id: -1 })
        .limit(12)
        .explain("executionStats"),
  },
  {
    name: "Attendee list for one event",
    run: () =>
      EventRegistration.collection
        .find({ eventUid: "event-42" })
        .sort({ createdAt: 1, _id: 1 })
        .limit(50)
        .explain("executionStats"),
  },
];

async function measure(label: string) {
  const rows = [];
  for (const query of queries) {
    const plan = await query.run();
    const stats = plan.executionStats;
    const stages = [
      ...new Set(
        JSON.stringify(plan.queryPlanner.winningPlan).match(
          /"stage":"[A-Z_]+"/g,
        ) ?? [],
      ),
    ].map((s) => s.slice(9, -1));
    rows.push({
      query: query.name,
      plan: label,
      stages: stages.join(" > "),
      "keys looked at": stats.totalKeysExamined,
      "docs looked at": stats.totalDocsExamined,
      returned: stats.nReturned,
      "sorted in memory": stages.some((s) => s === "SORT") ? "yes" : "no",
      ms: stats.executionTimeMillis,
    });
  }
  return rows;
}

async function main() {
  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  console.log(`Seeding ${EVENTS} events and ${REGISTRATIONS} registrations...`);
  await seed();

  await useOldIndexes();
  const before = await measure("before");
  await useCurrentIndexes();
  const after = await measure("after");

  console.table(
    [...before, ...after].sort(
      (a, b) => a.query.localeCompare(b.query) || (a.plan < b.plan ? 1 : -1),
    ),
  );

  await mongoose.disconnect();
  await server.stop();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
