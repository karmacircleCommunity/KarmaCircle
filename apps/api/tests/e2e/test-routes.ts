/**
 * Test-only routes for the Playwright E2E server (./server.ts), mounted in
 * front of the real app so they never exist in `createApp()` itself and can
 * never ship with the API.
 *
 * Why this exists: the API deliberately refuses to create an event that
 * starts in the past, and refuses to let anyone join an event that has
 * already started. A browser test that needs a completed event, or a past
 * registration on My Events, therefore has no way to build one through the
 * public routes. It creates a future event, lets people join it, and then
 * calls `POST /__test__/events/:uid/backdate` to move it into the past, the
 * same state a real event reaches when its start time goes by.
 */
import express, { Router } from "express";
import { Event } from "../../src/modules/events/event.model";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function createE2eTestRouter() {
  const router = Router();
  router.use(express.json());

  /**
   * Moves an event so it started `daysAgo` days ago and ended two hours
   * later. Registrations are untouched. 404 when the event does not exist.
   */
  router.post("/__test__/events/:uid/backdate", async (req, res) => {
    const daysAgo = Number(req.body?.daysAgo ?? 1);
    if (!Number.isFinite(daysAgo) || daysAgo <= 0) {
      res.status(400).json({ message: "daysAgo must be a positive number" });
      return;
    }

    const startTime = new Date(Date.now() - daysAgo * DAY_MS);
    const endTime = new Date(startTime.getTime() + 2 * HOUR_MS);
    const startOfDay = new Date(startTime);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(endTime);
    endOfDay.setUTCHours(0, 0, 0, 0);

    const result = await Event.updateOne(
      { uid: req.params.uid },
      {
        $set: {
          startTime,
          endTime,
          startDate: startOfDay,
          endDate: endOfDay,
        },
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.status(204).end();
  });

  return router;
}
