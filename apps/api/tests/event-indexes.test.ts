import { Event, EventRegistration } from "../src/modules/events/event.model";

/**
 * DB-3: the event list queries used to scan the whole collection. These tests
 * build the real indexes in the in-memory database and ask MongoDB how it would
 * run the same queries `findAll` builds.
 */
const HOUR_MS = 3_600_000;
/** The shape a directory grows into: a long history and a few ahead. */
const PAST_EVENTS = 580;
const UPCOMING_EVENTS = 20;

async function seedEvents() {
  const now = Date.now();
  await Event.collection.insertMany(
    Array.from({ length: PAST_EVENTS + UPCOMING_EVENTS }, (_, i) => ({
      uid: `index-event-${i}`,
      name: `Index event number ${i}`,
      status: "published",
      hostUsername: i % 2 === 0 ? "host-a" : "host-b",
      organizerHandle: i % 2 === 0 ? "host-a" : "host-b",
      startTime: new Date(now + (i - PAST_EVENTS) * HOUR_MS - 60_000),
      endTime: new Date(now + (i - PAST_EVENTS + 2) * HOUR_MS - 60_000),
    })),
  );
  await Event.syncIndexes();
}

/** Every stage name in the winning plan, flattened. */
function stagesOf(plan: Record<string, unknown>): string[] {
  const stages: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (typeof record.stage === "string") stages.push(record.stage);
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };
  walk(plan);
  return stages;
}

async function plan(
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
) {
  // A page, as every list query is.
  const explained = await Event.find(filter)
    .sort(sort)
    .limit(12)
    .explain("queryPlanner");
  return stagesOf(
    (explained as unknown as { queryPlanner: { winningPlan: object } })
      .queryPlanner.winningPlan as Record<string, unknown>,
  );
}

describe("event list indexes", () => {
  beforeEach(seedEvents);

  it("serves the upcoming directory list from an index", async () => {
    const stages = await plan(
      { status: { $ne: "draft" }, endTime: { $gte: new Date() } },
      { startTime: 1, _id: 1 },
    );

    expect(stages).toContain("IXSCAN");
    expect(stages).not.toContain("COLLSCAN");
  });

  it("counts the upcoming list from the endTime index", async () => {
    const explained = await Event.find({
      status: { $ne: "draft" },
      endTime: { $gte: new Date() },
    }).explain("executionStats");
    const { executionStats } = explained as unknown as {
      executionStats: { totalDocsExamined: number; nReturned: number };
    };

    // Only the events that have not ended are read, not the whole history.
    // One seeded event started over an hour ago and is still running, so it
    // counts alongside the others.
    expect(executionStats.nReturned).toBe(UPCOMING_EVENTS + 1);
    expect(executionStats.totalDocsExamined).toBe(executionStats.nReturned);
  });

  it("serves the past list, newest first, from an index", async () => {
    const stages = await plan(
      { status: { $ne: "draft" }, endTime: { $lt: new Date() } },
      { startTime: -1, _id: -1 },
    );

    expect(stages).toContain("IXSCAN");
    expect(stages).not.toContain("COLLSCAN");
    expect(stages).not.toContain("SORT");
  });

  it("serves a host's list (hostUsername or organizerHandle) from indexes", async () => {
    const stages = await plan(
      {
        $and: [
          { status: { $ne: "draft" } },
          { $or: [{ hostUsername: "host-a" }, { organizerHandle: "host-a" }] },
        ],
      },
      { startTime: -1, _id: -1 },
    );

    expect(stages).toContain("IXSCAN");
    expect(stages).not.toContain("COLLSCAN");
  });

  it("serves a host's upcoming list, soonest first, from indexes", async () => {
    const stages = await plan(
      {
        $and: [
          { $or: [{ hostUsername: "host-a" }, { organizerHandle: "host-a" }] },
          { endTime: { $gte: new Date() } },
        ],
      },
      { startTime: 1, _id: 1 },
    );

    expect(stages).toContain("IXSCAN");
    expect(stages).not.toContain("COLLSCAN");
  });
});

describe("registration indexes", () => {
  it("keeps one registration per person and event, and no redundant eventUid index", async () => {
    await EventRegistration.syncIndexes();
    const keys = (await EventRegistration.collection.indexes()).map((index) =>
      JSON.stringify(index.key),
    );

    expect(keys).toContain(JSON.stringify({ eventUid: 1, userId: 1 }));
    expect(keys).toContain(
      JSON.stringify({ eventUid: 1, status: 1, createdAt: 1 }),
    );
    expect(keys).not.toContain(JSON.stringify({ eventUid: 1 }));
  });
});
