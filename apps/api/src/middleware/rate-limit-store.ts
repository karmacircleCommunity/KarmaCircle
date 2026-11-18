import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { MemoryStore } from "express-rate-limit";
import { logger } from "../config/logger";

/** The two Redis calls the store makes. `ioredis` provides both. */
export interface RedisCommands {
  eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

// Adds one hit and starts the window on the first one, in a single step, so
// two servers hitting the same key at once cannot both think they are first
// and cannot leave a counter that never expires.
const INCREMENT_SCRIPT = `
local hits = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if hits == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { hits, ttl }
`;

// Takes one hit back, but only from a counter that exists.
const DECREMENT_SCRIPT = `
if redis.call("EXISTS", KEYS[1]) == 1 then
  return redis.call("DECR", KEYS[1])
end
return 0
`;

/**
 * Counts requests in Redis, so every server instance shares one count per
 * client. A fixed window, the same as `express-rate-limit`'s own memory store:
 * the window starts at a client's first request and the counter expires with it.
 */
export class RedisRateLimitStore implements Store {
  private windowMs = 15 * 60 * 1000;

  constructor(
    private readonly redis: RedisCommands,
    readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [hits, ttl] = (await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      this.prefix + key,
      this.windowMs,
    )) as [number, number];
    return {
      totalHits: hits,
      resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.eval(DECREMENT_SCRIPT, 1, this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.prefix + key);
  }
}

/**
 * Uses the shared store while it works and the instance's own memory when it
 * does not, so a Redis outage lowers the protection from "shared across
 * servers" to "per server" instead of taking the API down or switching the
 * limits off.
 *
 * After a failure it keeps using memory for `cooldownMs`, so requests do not
 * each wait for a Redis timeout while it is down.
 */
export class FailoverStore implements Store {
  private readonly fallback = new MemoryStore();
  private retryAt = 0;

  constructor(
    private readonly primary: Store,
    private readonly name: string,
    private readonly cooldownMs = 5000,
    private readonly now: () => number = Date.now,
  ) {}

  init(options: Options): void {
    this.primary.init?.(options);
    this.fallback.init(options);
  }

  private async run<T>(
    useShared: (store: Store) => Promise<T> | T,
  ): Promise<T> {
    if (this.now() >= this.retryAt) {
      try {
        return await useShared(this.primary);
      } catch (error) {
        this.retryAt = this.now() + this.cooldownMs;
        logger.warn(
          { err: error, limiter: this.name, retryInMs: this.cooldownMs },
          "Shared rate limit store failed, counting in memory for now",
        );
      }
    }
    return useShared(this.fallback);
  }

  increment(key: string) {
    return this.run((store) =>
      store.increment(key),
    ) as Promise<ClientRateLimitInfo>;
  }

  decrement(key: string) {
    return this.run((store) => store.decrement(key)) as Promise<void>;
  }

  resetKey(key: string) {
    return this.run((store) => store.resetKey(key)) as Promise<void>;
  }

  shutdown() {
    this.fallback.shutdown();
  }
}
