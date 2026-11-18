import type { Schema } from "mongoose";
import { Event, EventRegistration } from "../src/modules/events/event.model";
import { User } from "../src/modules/users/user.model";

/**
 * DB-2, DB-3, DB-6: the indexes the schemas declare. These read the schema
 * definitions only, so they need no database. They guard against an index
 * being dropped by accident; the query plans themselves are compared with
 * `npx tsx scripts/explain-events.ts`.
 */

type Spec = Record<string, 1 | -1>;
const declared = (schema: Schema) =>
  schema.indexes().map(([keys, options]) => ({ keys: keys as Spec, options }));
const hasKeys = (list: ReturnType<typeof declared>, keys: Spec) =>
  list.some((index) => JSON.stringify(index.keys) === JSON.stringify(keys));

describe("Event indexes", () => {
  const indexes = declared(Event.schema);

  it("serves the directory list: startTime range with the id tiebreaker", () => {
    expect(hasKeys(indexes, { startTime: 1, _id: 1 })).toBe(true);
  });

  it("serves one host's list through both fields the host filter reads", () => {
    expect(hasKeys(indexes, { hostUsername: 1, startTime: -1, _id: -1 })).toBe(
      true,
    );
    expect(
      hasKeys(indexes, { organizerHandle: 1, startTime: -1, _id: -1 }),
    ).toBe(true);
  });

  it("does not keep a standalone organizerHandle index the compound one covers", () => {
    expect(hasKeys(indexes, { organizerHandle: 1 })).toBe(false);
  });

  it("keeps the unique page address", () => {
    const uid = indexes.find((index) => hasKeys([index], { uid: 1 }));
    expect(uid?.options.unique).toBe(true);
  });
});

describe("EventRegistration indexes", () => {
  const indexes = declared(EventRegistration.schema);

  it("allows one registration per person per event", () => {
    const pair = indexes.find((index) =>
      hasKeys([index], { eventUid: 1, userId: 1 }),
    );
    expect(pair?.options.unique).toBe(true);
  });

  it("serves the attendee list in sign-up order", () => {
    expect(hasKeys(indexes, { eventUid: 1, createdAt: 1, _id: 1 })).toBe(true);
  });

  it("has no standalone eventUid index, the pair index already covers it", () => {
    expect(hasKeys(indexes, { eventUid: 1 })).toBe(false);
  });

  it("keeps the userId lookup used by My Events", () => {
    expect(hasKeys(indexes, { userId: 1 })).toBe(true);
  });
});

describe("User indexes", () => {
  const indexes = declared(User.schema);

  it("makes userName unique in the database", () => {
    const userName = indexes.find((index) => hasKeys([index], { userName: 1 }));
    expect(userName?.options.unique).toBe(true);
  });

  it("keeps email unique", () => {
    const email = indexes.find((index) => hasKeys([index], { email: 1 }));
    expect(email?.options.unique).toBe(true);
  });
});
