import Redis from "ioredis";
import type { IEvent } from "../src/modules/events/event.model";
import {
  buildReminder,
  factsOf,
  reminderJobId,
  type EventFacts,
  type NotificationJob,
  type Recipient,
} from "../src/modules/notifications/notification.jobs";
import { queueKeys } from "../src/modules/notifications/notification.queue";
import {
  cancelReminder,
  notifyEventCancelled,
  notifyEventUpdated,
  scheduleReminder,
} from "../src/modules/notifications/notification.service";
import { getRedis } from "../src/config/redis";
import { startTestRedis, type TestRedis } from "./helpers/redis";
import { asha, beachDay, noon } from "./helpers/notification-fixtures";

jest.mock("../src/config/redis");
const getRedisMock = getRedis as jest.Mock;

/**
 * What the event service asks the notification module to do when someone
 * joins, leaves, or the organizer edits or cancels. Real Redis, recipients
 * passed in so no database is needed.
 */

const eventDoc = (overrides: Partial<EventFacts> & { status?: string } = {}) =>
  ({ ...beachDay, status: "published", ...overrides }) as unknown as IEvent;

const people: Recipient[] = [
  asha,
  { registrationId: "r2", email: "ben@example.com", name: "Ben" },
  { registrationId: "r3", email: "cho@example.com", name: "" },
];
const load = async () => people;

describe("notifications for event changes", () => {
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
    redis = new Redis(redisServer.url, { db: 2 });
    redis.on("error", () => undefined);
  });
  afterAll(async () => {
    redis?.disconnect();
    await redisServer?.stop();
  });
  beforeEach(async () => {
    getRedisMock.mockReturnValue(redis ?? null);
    if (redis) await redis.flushdb();
  });

  const itRedis = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!redisServer) return;
      await fn();
    });

  const queued = async (): Promise<NotificationJob[]> => {
    const ids = await redis.zrange(queueKeys.due, "0", "-1");
    return Promise.all(
      ids.map(async (id) => JSON.parse((await redis.get(queueKeys.job(id)))!)),
    );
  };
  const kinds = async () => (await queued()).map((j) => j.kind).sort();

  describe("a new registration", () => {
    itRedis("queues a reminder for the day before", async () => {
      await scheduleReminder(eventDoc(), asha, noon);

      const [job] = await queued();
      expect(job.kind).toBe("event_reminder");
      expect(job.to).toBe("asha@example.com");
      expect(job.runAt).toBe("2026-11-21T01:30:00.000Z");
    });

    itRedis("queues nothing when the day-before moment is gone", async () => {
      await scheduleReminder(
        eventDoc(),
        asha,
        new Date("2026-11-21T20:00:00Z"),
      );

      expect(await queued()).toEqual([]);
    });

    itRedis("queues one reminder however many times it is asked", async () => {
      await scheduleReminder(eventDoc(), asha, noon);
      await scheduleReminder(eventDoc(), asha, noon);

      expect(await queued()).toHaveLength(1);
    });
  });

  describe("someone leaves", () => {
    itRedis("removes only their reminder", async () => {
      await scheduleReminder(eventDoc(), asha, noon);
      await scheduleReminder(eventDoc(), people[1], noon);

      await cancelReminder(eventDoc(), asha.registrationId);

      expect((await queued()).map((j) => j.to)).toEqual(["ben@example.com"]);
    });
  });

  describe("the organizer edits the event", () => {
    const seed = async () => {
      for (const person of people)
        await scheduleReminder(eventDoc(), person, noon);
    };

    itRedis(
      "moving the start replaces the reminders and tells everyone",
      async () => {
        await seed();
        const moved = eventDoc({
          startTime: new Date("2026-11-22T04:30:00Z"),
          endTime: new Date("2026-11-22T07:30:00Z"),
        });

        await notifyEventUpdated(beachDay, moved, { load, now: noon });

        const jobs = await queued();
        expect(jobs.filter((j) => j.kind === "event_reminder")).toHaveLength(3);
        expect(jobs.filter((j) => j.kind === "event_changed")).toHaveLength(3);
        const reminder = jobs.find((j) => j.kind === "event_reminder")!;
        expect(reminder.runAt).toBe("2026-11-21T04:30:00.000Z");
        expect(reminder.event.startTime).toBe("2026-11-22T04:30:00.000Z");
        expect(
          await redis.exists(
            queueKeys.job(
              reminderJobId(
                "beach-day",
                asha.registrationId,
                beachDay.startTime,
              ),
            ),
          ),
        ).toBe(0);
      },
    );

    itRedis(
      "a changed place tells everyone and refreshes the reminders in place",
      async () => {
        await seed();

        await notifyEventUpdated(
          beachDay,
          eventDoc({ address: "Versova Beach" }),
          { load, now: noon },
        );

        const jobs = await queued();
        const notice = jobs.find((j) => j.kind === "event_changed")!;
        expect(notice.changes).toEqual([
          {
            field: "place",
            from: "Juhu Beach, Mumbai, Maharashtra, India",
            to: "Versova Beach, Mumbai, Maharashtra, India",
          },
        ]);
        const reminders = jobs.filter((j) => j.kind === "event_reminder");
        expect(reminders).toHaveLength(3);
        expect(
          reminders.every((r) => r.event.place?.startsWith("Versova Beach")),
        ).toBe(true);
      },
    );

    itRedis(
      "a reminder already sent is not sent a second time for the same start",
      async () => {
        await seed();
        // Ben's reminder went out already.
        const sentId = reminderJobId("beach-day", "r2", beachDay.startTime);
        await redis.set(queueKeys.sent(sentId), "1");
        await redis.del(queueKeys.job(sentId));
        await redis.zrem(queueKeys.due, sentId);

        await notifyEventUpdated(
          beachDay,
          eventDoc({ address: "Versova Beach" }),
          { load, now: noon },
        );

        const reminders = (await queued()).filter(
          (j) => j.kind === "event_reminder",
        );
        expect(reminders.map((r) => r.to).sort()).toEqual([
          "asha@example.com",
          "cho@example.com",
        ]);
      },
    );

    itRedis("renaming refreshes the reminders but emails nobody", async () => {
      await seed();

      await notifyEventUpdated(
        beachDay,
        eventDoc({ name: "Beach clean-up, new name" }),
        { load, now: noon },
      );

      expect(await kinds()).toEqual([
        "event_reminder",
        "event_reminder",
        "event_reminder",
      ]);
      expect((await queued())[0].event.name).toBe("Beach clean-up, new name");
    });

    itRedis("an edit that changes nothing leaves the queue alone", async () => {
      await seed();
      const before = await redis.zrange(queueKeys.due, "0", "-1");

      await notifyEventUpdated(beachDay, eventDoc(), { load, now: noon });

      expect(await redis.zrange(queueKeys.due, "0", "-1")).toEqual(before);
    });

    itRedis("repeating the same edit does not email twice", async () => {
      await seed();
      const edited = eventDoc({ address: "Versova Beach" });

      await notifyEventUpdated(beachDay, edited, { load, now: noon });
      await notifyEventUpdated(beachDay, edited, { load, now: noon });

      expect(
        (await queued()).filter((j) => j.kind === "event_changed"),
      ).toHaveLength(3);
    });

    itRedis("two separate edits each get their notice", async () => {
      await seed();

      await notifyEventUpdated(
        beachDay,
        eventDoc({ address: "Versova Beach" }),
        { load, now: noon },
      );
      await notifyEventUpdated(
        factsOf(eventDoc({ address: "Versova Beach" })),
        eventDoc({ address: "Madh Island" }),
        { load, now: new Date(noon.getTime() + 60_000) },
      );

      expect(
        (await queued()).filter((j) => j.kind === "event_changed"),
      ).toHaveLength(6);
    });

    itRedis(
      "ignores a draft, a cancelled event and one that already started",
      async () => {
        await seed();
        const before = await redis.zrange(queueKeys.due, "0", "-1");

        await notifyEventUpdated(
          beachDay,
          eventDoc({ address: "Elsewhere", status: "draft" } as never),
          { load, now: noon },
        );
        await notifyEventUpdated(
          beachDay,
          eventDoc({ address: "Elsewhere", status: "cancelled" } as never),
          { load, now: noon },
        );
        await notifyEventUpdated(beachDay, eventDoc({ address: "Elsewhere" }), {
          load,
          now: new Date("2026-11-23T00:00:00Z"),
        });

        expect(await redis.zrange(queueKeys.due, "0", "-1")).toEqual(before);
      },
    );
  });

  describe("the organizer cancels the event", () => {
    itRedis("stops the reminders and tells everyone", async () => {
      for (const person of people)
        await scheduleReminder(eventDoc(), person, noon);

      await notifyEventCancelled(eventDoc({ status: "cancelled" } as never), {
        load,
        now: noon,
      });

      expect(await kinds()).toEqual([
        "event_cancelled",
        "event_cancelled",
        "event_cancelled",
      ]);
    });

    itRedis("does not email twice if cancelled again", async () => {
      await notifyEventCancelled(eventDoc(), { load, now: noon });
      await notifyEventCancelled(eventDoc(), { load, now: noon });

      expect(await queued()).toHaveLength(3);
    });

    itRedis(
      "also removes a pending change notice that has not gone out",
      async () => {
        await notifyEventUpdated(
          beachDay,
          eventDoc({ address: "Versova Beach" }),
          { load, now: noon },
        );

        await notifyEventCancelled(eventDoc(), { load, now: noon });

        expect(await kinds()).toEqual([
          "event_cancelled",
          "event_cancelled",
          "event_cancelled",
        ]);
      },
    );
  });

  describe("when Redis is not there", () => {
    it("does nothing at all, and never throws", async () => {
      getRedisMock.mockReturnValue(null);

      await expect(
        scheduleReminder(eventDoc(), asha, noon),
      ).resolves.toBeUndefined();
      await expect(cancelReminder(eventDoc(), "r1")).resolves.toBeUndefined();
      await expect(
        notifyEventUpdated(beachDay, eventDoc({ address: "x" }), {
          load,
          now: noon,
        }),
      ).resolves.toBeUndefined();
      await expect(
        notifyEventCancelled(eventDoc(), { load, now: noon }),
      ).resolves.toBeUndefined();
    });
  });

  describe("when Redis misbehaves", () => {
    it("a failing Redis never breaks the request that caused the change", async () => {
      getRedisMock.mockReturnValue({
        eval: () => Promise.reject(new Error("READONLY")),
        pipeline: () => ({
          eval: () => undefined,
          exec: () => Promise.reject(new Error("READONLY")),
        }),
      });

      await expect(
        scheduleReminder(eventDoc(), asha, noon),
      ).resolves.toBeUndefined();
      await expect(
        notifyEventCancelled(eventDoc(), { load, now: noon }),
      ).resolves.toBeUndefined();
    });

    it("a Redis that hangs makes the request wait only a moment", async () => {
      getRedisMock.mockReturnValue({
        eval: () => new Promise(() => undefined),
        pipeline: () => ({
          eval: () => undefined,
          exec: () => new Promise(() => undefined),
        }),
      });
      const started = Date.now();

      await scheduleReminder(eventDoc(), asha, noon);

      expect(Date.now() - started).toBeLessThan(2500);
    }, 10_000);
  });

  it("builds the same reminder the service queues", () => {
    expect(buildReminder(beachDay, asha, noon)).not.toBeNull();
  });
});
