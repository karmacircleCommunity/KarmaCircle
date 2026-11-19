import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Starts and stops one in-memory MongoDB before any test file runs.
 * Each test file starts its own server, and on a fresh machine (a CI runner
 * with a cold cache) they all try to download and lock the same mongod binary
 * at once, which sometimes fails with "UnableToUnlockLockfileError". Doing the
 * first start here, alone, leaves the binary cached for the parallel workers.
 */
export default async function globalSetup(): Promise<void> {
  const server = await MongoMemoryServer.create();
  await server.stop();
}
