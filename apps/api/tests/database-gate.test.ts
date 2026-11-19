import { createConnectionGate } from "../src/config/database";

/**
 * O-1: the serverless handler used to keep its first connection attempt for
 * good, so one failed attempt broke every later request on that instance.
 */
describe("createConnectionGate", () => {
  it("connects once and shares the attempt between requests", async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    const ensureConnected = createConnectionGate(connect);

    await Promise.all([ensureConnected(), ensureConnected(), ensureConnected()]);
    await ensureConnected();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("forgets a failed attempt and tries again on the next request", async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error("first attempt failed"))
      .mockResolvedValueOnce(undefined);
    const ensureConnected = createConnectionGate(connect);

    await expect(ensureConnected()).rejects.toThrow("first attempt failed");
    await expect(ensureConnected()).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("gives every request waiting on a failed attempt the same failure", async () => {
    const connect = jest.fn().mockRejectedValue(new Error("down"));
    const ensureConnected = createConnectionGate(connect);

    const results = await Promise.allSettled([
      ensureConnected(),
      ensureConnected(),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
