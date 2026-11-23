import type { Options, Store, ClientRateLimitInfo } from "express-rate-limit";
import mongoose from "mongoose";

const COLLECTION = "ratelimits";

/**
 * Keeps `express-rate-limit` counts in MongoDB instead of in each server's
 * memory (S-2). On Vercel many instances run at once and each used to start
 * from zero, so the sign-in limit was easy to get around. The database is
 * already there, so this adds no new service.
 *
 * One document per key. Each hit is a single atomic update that either adds one
 * or starts a new window. A TTL index deletes documents once their window ends.
 */
export class MongoRateLimitStore implements Store {
  private windowMs = 0;
  private indexReady?: Promise<unknown>;

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private collection() {
    const collection = mongoose.connection.collection(COLLECTION);
    // Best effort: only the clean-up of old documents depends on this index.
    this.indexReady ??= collection
      .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 })
      .catch(() => undefined);
    return collection;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const next = new Date(now.getTime() + this.windowMs);
    const live = { $gt: ["$resetAt", now] };

    const result = await this.collection().findOneAndUpdate(
      { _id: key as unknown as never },
      [
        {
          $set: {
            count: { $cond: [live, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
            resetAt: { $cond: [live, "$resetAt", next] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" },
    );

    const doc = result.value;
    return {
      totalHits: Number(doc?.count ?? 1),
      resetTime: doc?.resetAt instanceof Date ? doc.resetAt : next,
    };
  }

  async decrement(key: string): Promise<void> {
    await this.collection().updateOne(
      { _id: key as unknown as never, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
  }

  async resetKey(key: string): Promise<void> {
    await this.collection().deleteOne({ _id: key as unknown as never });
  }
}
