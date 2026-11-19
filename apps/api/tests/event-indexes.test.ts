import { Event, EventRegistration } from "../src/modules/events/event.model";

/**
 * DB-3: the event list queries used to scan the whole collection. These tests
 * build the real indexes in the in-memory database and ask MongoDB how it would
 * run the same queries `findAll` builds.
 */
const HOUR_MS = 3_600_000;

async function seedEvents() {
  const now = Date.now();
  await Event.collection.insertMany(
    Array.from({ length: 60 }, (_, i) => ({
      uid: `index-event-${i}`,
      name: `Index event number ${i}`,
      status: "published",
      hostUsername: i % 2 === 0 ? "host-a" : "host-b",
      organizerHandle: i % 2 === 0 ? "host-a" : "host-b",
      startTime: new Date(now + (i - 30) * HOUR_MS),
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
  const explained = await Event.find(filter).sort(sort).explain("queryPlanner");
  return stagesOf(
    (explained as unknown as { queryPlanner: { winningPlan: object } })
      .queryPlanner.winningPlan as Record<string, unknown>,
  );
}

describe("event list indexes", () => {
  beforeEach(seedEvents);

  it("serves the directory's period split and order from an index", async () => {
    const stages = await plan(
      { status: { $ne: "draft" }, startTime: { $gte: new Date() } },
      { startTime: 1, _id: 1 },
    );

    expect(stages).toContain("IXSCAN");
    expect(stages).not.toContain("COLLSCAN");
    expect(stages).not.toContain("SORT");
  });

  it("serves the past list, newest first, from an index", async () => {
    const stages = await plan(
      { status: { $ne: "draft" }, startTime: { $lt: new Date() } },
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
          { startTime: { $gte: new Date() } },
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
