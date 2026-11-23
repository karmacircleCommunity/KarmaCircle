import { MongoRateLimitStore } from "../src/middleware/mongo-rate-limit-store";

describe("MongoRateLimitStore (S-2)", () => {
  function makeStore(windowMs = 60_000) {
    const store = new MongoRateLimitStore();
    store.init({ windowMs } as never);
    return store;
  }

  it("counts hits per key and keeps keys apart", async () => {
    const store = makeStore();

    expect((await store.increment("a")).totalHits).toBe(1);
    expect((await store.increment("a")).totalHits).toBe(2);
    expect((await store.increment("b")).totalHits).toBe(1);
  });

  it("is shared by two stores, as it is by two servers", async () => {
    await makeStore().increment("shared");

    expect((await makeStore().increment("shared")).totalHits).toBe(2);
  });

  it("starts a new window once the old one has ended", async () => {
    const store = makeStore(20);
    await store.increment("short");
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect((await store.increment("short")).totalHits).toBe(1);
  });

  it("decrements and resets", async () => {
    const store = makeStore();
    await store.increment("k");
    await store.increment("k");
    await store.decrement("k");
    expect((await store.increment("k")).totalHits).toBe(2);

    await store.resetKey("k");
    expect((await store.increment("k")).totalHits).toBe(1);
  });
});
