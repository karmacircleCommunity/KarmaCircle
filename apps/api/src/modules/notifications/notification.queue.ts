import type Redis from "ioredis";
import { getRedis } from "../../config/redis";
import { getRequestId } from "../../middleware/request-id";
import type { NotificationJob } from "./notification.jobs";

/**
 * The API's side of the queue that apps/notification-worker reads. The key
 * layout is documented in apps/notification-worker/internal/queue/queue.go
 * and must stay the same: `{notif}` is a hash tag that keeps every key in one
 * slot, so the scripts also work on a Redis Cluster.
 *
 * Every change is one Lua script, so a crash cannot leave a job half added or
 * half removed.
 */
export const queueKeys = {
  due: "{notif}:due",
  inflight: "{notif}:inflight",
  dead: "{notif}:dead",
  job: (id: string) => `{notif}:job:${id}`,
  event: (uid: string) => `{notif}:event:${uid}`,
  sent: (id: string) => `{notif}:sent:${id}`,
};
const JOB_PREFIX = "{notif}:job:";

const JOB_TTL_SECONDS = 30 * 24 * 60 * 60;
const EVENT_SET_TTL_SECONDS = 60 * 24 * 60 * 60;

// Adds a job unless the same id is queued or was already sent.
const ENQUEUE = `
if redis.call("EXISTS", KEYS[2]) == 1 or redis.call("EXISTS", KEYS[3]) == 1 then return 0 end
redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[4])
redis.call("ZADD", KEYS[1], ARGV[3], ARGV[1])
redis.call("SADD", KEYS[4], ARGV[1])
redis.call("EXPIRE", KEYS[4], ARGV[5])
return 1
`;

// Takes one job out of the queue, whether it is waiting or leased.
const CANCEL = `
redis.call("ZREM", KEYS[1], ARGV[1])
redis.call("ZREM", KEYS[2], ARGV[1])
local removed = redis.call("DEL", KEYS[3])
redis.call("SREM", KEYS[4], ARGV[1])
return removed
`;

// Takes out every job of one event whose id starts with a prefix ("" is all).
const CANCEL_EVENT = `
local ids = redis.call("SMEMBERS", KEYS[3])
local removed = 0
for _, id in ipairs(ids) do
  if string.sub(id, 1, string.len(ARGV[1])) == ARGV[1] then
    redis.call("ZREM", KEYS[1], id)
    redis.call("ZREM", KEYS[2], id)
    removed = removed + redis.call("DEL", ARGV[2] .. id)
    redis.call("SREM", KEYS[3], id)
  end
end
return removed
`;

const enqueueArgs = (job: NotificationJob) =>
  [
    queueKeys.due,
    queueKeys.job(job.id),
    queueKeys.sent(job.id),
    queueKeys.event(job.event.uid),
    job.id,
    JSON.stringify(job),
    new Date(job.runAt).getTime(),
    JOB_TTL_SECONDS,
    EVENT_SET_TTL_SECONDS,
  ] as const;

/** Whether notifications are on: they need Redis, so they need `REDIS_URL`. */
export const notificationsEnabled = () => getRedis() !== null;

/**
 * Adds jobs. Returns how many were new: a job whose id is already queued, or
 * was already sent, is left alone, which is what makes a repeated request or a
 * retry safe.
 */
export async function enqueueJobs(
  jobs: NotificationJob[],
  redis: Redis | null = getRedis(),
): Promise<number> {
  if (!redis || jobs.length === 0) return 0;
  const pipeline = redis.pipeline();
  const requestId = getRequestId();
  for (const original of jobs) {
    // Tag the job with the request that made it, unless the builder already did.
    const job =
      requestId && !original.requestId ? { ...original, requestId } : original;
    const [due, jobKey, sentKey, eventKey, id, json, runAt, jobTtl, setTtl] =
      enqueueArgs(job);
    pipeline.eval(
      ENQUEUE,
      4,
      due,
      jobKey,
      sentKey,
      eventKey,
      id,
      json,
      runAt,
      jobTtl,
      setTtl,
    );
  }
  const results = (await pipeline.exec()) ?? [];
  let added = 0;
  for (const [error, result] of results) {
    if (error) throw error;
    if (result === 1) added++;
  }
  return added;
}

/** Removes one job, wherever it is. True when there was one to remove. */
export async function cancelJob(
  id: string,
  eventUid: string,
  redis: Redis | null = getRedis(),
): Promise<boolean> {
  if (!redis) return false;
  const removed = await redis.eval(
    CANCEL,
    4,
    queueKeys.due,
    queueKeys.inflight,
    queueKeys.job(id),
    queueKeys.event(eventUid),
    id,
  );
  return removed === 1;
}

/** Removes an event's jobs whose id starts with `idPrefix` (all of them by default). */
export async function cancelEventJobs(
  eventUid: string,
  idPrefix = "",
  redis: Redis | null = getRedis(),
): Promise<number> {
  if (!redis) return 0;
  const removed = await redis.eval(
    CANCEL_EVENT,
    3,
    queueKeys.due,
    queueKeys.inflight,
    queueKeys.event(eventUid),
    idPrefix,
    JOB_PREFIX,
  );
  return Number(removed);
}
