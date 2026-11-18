import Redis from "ioredis";
import {
  cancelEventJobs,
  cancelJob,
  enqueueJobs,
  queueKeys,
} from "../src/modules/notifications/notification.queue";
import {
  buildCancelled,
  buildReminder,
  type NotificationJob,
} from "../src/modules/notifications/notification.jobs";
import { startTestRedis, type TestRedis } from "./helpers/redis";
import { asha, beachDay } from "./helpers/notification-fixtures";

/**
 * The API's half of the notification queue, against a real Redis. The Go
 * worker (apps/notification-worker/internal/queue) reads exactly these keys.
 */

const longBefore = new Date("2026-11-01T00:00:00Z");
const recipients = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    registrationId: `r${i}`,
    email: `p${i}@example.com`,
    name: `P${i}`,
  }));
const reminders = (n: number): NotificationJob[] =>
  recipients(n).map((r) => buildReminder(beachDay, r, longBefore)!);

describe("notification queue (API side)", () => {
  let redisServer: TestRedis | null;
  let redis: Redis;

  beforeAll(async () => {
    redisServer = await startTestRedis();
    if (!redisServer) {
      console.warn(
        "Redis tests SKIPPED: no redis-server installed and REDIS_TEST_URL is not set",
      );
      return;
    }
    // Its own database number, so test files sharing one Redis (CI) do not touch each other.
    redis = new Redis(redisServer.url, { db: 1 });
    redis.on("error", () => undefined);
  });
  afterAll(async () => {
    redis?.disconnect();
    await redisServer?.stop();
  });
  beforeEach(async () => {
    if (redis) await redis.flushdb();
  });

  const itRedis = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!redisServer) return;
      await fn();
    });

  itRedis("uses the key layout the Go worker reads", async () => {
    const [job] = reminders(1);

    await enqueueJobs([job], redis);

    expect(await redis.zscore("{notif}:due", job.id)).toBe(
      String(new Date(job.runAt).getTime()),
    );
    expect(JSON.parse((await redis.get(`{notif}:job:${job.id}`))!)).toEqual(
      job,
    );
    expect(await redis.sismember("{notif}:event:beach-day", job.id)).toBe(1);
    expect(queueKeys.due).toBe("{notif}:due");
    expect(queueKeys.inflight).toBe("{notif}:inflight");
    expect(queueKeys.dead).toBe("{notif}:dead");
  });

  itRedis("adds each job once, however often it is asked", async () => {
    const jobs = reminders(3);

    expect(await enqueueJobs(jobs, redis)).toBe(3);
    expect(await enqueueJobs(jobs, redis)).toBe(0);
    expect(await redis.zcard("{notif}:due")).toBe(3);
  });

  itRedis("does not queue a job that was already sent", async () => {
    const [job] = reminders(1);
    await redis.set(queueKeys.sent(job.id), "1");

    expect(await enqueueJobs([job], redis)).toBe(0);
    expect(await redis.zcard("{notif}:due")).toBe(0);
  });

  itRedis("expires what it stores, so nothing lives for ever", async () => {
    const [job] = reminders(1);
    await enqueueJobs([job], redis);

    expect(await redis.ttl(queueKeys.job(job.id))).toBeGreaterThan(0);
    expect(await redis.ttl(queueKeys.event("beach-day"))).toBeGreaterThan(0);
  });

  itRedis("queues many jobs in one go", async () => {
    expect(await enqueueJobs(reminders(200), redis)).toBe(200);
    expect(await redis.zcard("{notif}:due")).toBe(200);
  });

  itRedis("does nothing for an empty list", async () => {
    expect(await enqueueJobs([], redis)).toBe(0);
  });

  itRedis("cancels one job wherever it is", async () => {
    const [waiting, leased] = reminders(2);
    await enqueueJobs([waiting, leased], redis);
    await redis.zrem("{notif}:due", leased.id);
    await redis.zadd("{notif}:inflight", Date.now() + 60_000, leased.id); // the worker holds it

    expect(await cancelJob(waiting.id, "beach-day", redis)).toBe(true);
    expect(await cancelJob(leased.id, "beach-day", redis)).toBe(true);

    expect(await redis.zcard("{notif}:due")).toBe(0);
    expect(await redis.zcard("{notif}:inflight")).toBe(0);
    expect(
      await redis.exists(queueKeys.job(waiting.id), queueKeys.job(leased.id)),
    ).toBe(0);
    expect(await redis.scard("{notif}:event:beach-day")).toBe(0);
  });

  itRedis("says so when there was nothing to cancel", async () => {
    expect(await cancelJob("reminder:nope", "beach-day", redis)).toBe(false);
  });

  itRedis("cancels an event's jobs by kind and leaves the others", async () => {
    const [r0, r1] = reminders(2);
    const cancelled = buildCancelled(beachDay, asha, longBefore);
    const otherEvent = buildReminder(
      { ...beachDay, uid: "other" },
      asha,
      longBefore,
    )!;
    await enqueueJobs([r0, r1, cancelled, otherEvent], redis);

    expect(await cancelEventJobs("beach-day", "reminder:", redis)).toBe(2);

    expect(await redis.zrange("{notif}:due", "0", "-1")).toEqual(
      expect.arrayContaining([cancelled.id, otherEvent.id]),
    );
    expect(await redis.zcard("{notif}:due")).toBe(2);
    expect(await redis.smembers("{notif}:event:beach-day")).toEqual([
      cancelled.id,
    ]);
  });

  itRedis("cancels all of an event's jobs with no prefix", async () => {
    await enqueueJobs(
      [...reminders(3), buildCancelled(beachDay, asha, longBefore)],
      redis,
    );

    expect(await cancelEventJobs("beach-day", "", redis)).toBe(4);
    expect(await redis.zcard("{notif}:due")).toBe(0);
  });

  itRedis("does nothing for an event with no jobs", async () => {
    expect(await cancelEventJobs("empty", "", redis)).toBe(0);
  });

  it("does nothing, and says so, with no Redis", async () => {
    expect(await enqueueJobs(reminders(2), null)).toBe(0);
    expect(await cancelJob("x", "y", null)).toBe(false);
    expect(await cancelEventJobs("y", "", null)).toBe(0);
  });
});
