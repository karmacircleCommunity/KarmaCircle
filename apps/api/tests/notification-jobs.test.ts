import { readFileSync } from "node:fs";
import path from "node:path";
import {
  REMINDER_LEAD_MS,
  buildCancelled,
  buildChanged,
  buildReminder,
  cancelledJobId,
  changedJobId,
  diffEvent,
  placeOf,
  reminderIsStale,
  reminderJobId,
  type EventFacts,
} from "../src/modules/notifications/notification.jobs";
import { asha, beachDay, noon } from "./helpers/notification-fixtures";

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      path.resolve(
        __dirname,
        "../../notification-worker/testdata/contract",
        name,
      ),
      "utf8",
    ),
  );

const moved: EventFacts = {
  ...beachDay,
  startTime: new Date("2026-11-22T04:30:00Z"),
  endTime: new Date("2026-11-22T07:30:00Z"),
  address: "Versova Beach",
};

describe("the contract with the Go worker", () => {
  // The Go tests read the same files (internal/job/contract_test.go), so a
  // change to the shape on either side fails a test on the other.
  it("reminder jobs match the shared fixture", () => {
    expect(buildReminder(beachDay, asha, noon)).toEqual(
      fixture("reminder.json"),
    );
  });

  it("change notices match the shared fixture", () => {
    expect(buildChanged(moved, asha, diffEvent(beachDay, moved), noon)).toEqual(
      fixture("changed.json"),
    );
  });

  it("cancellation notices match the shared fixture", () => {
    expect(buildCancelled(beachDay, asha, noon)).toEqual(
      fixture("cancelled.json"),
    );
  });
});

describe("buildReminder", () => {
  it("is due a day before the start", () => {
    const job = buildReminder(beachDay, asha, noon)!;

    expect(new Date(job.runAt).getTime()).toBe(
      beachDay.startTime.getTime() - REMINDER_LEAD_MS,
    );
    expect(job.kind).toBe("event_reminder");
    expect(job.to).toBe("asha@example.com");
  });

  it("has an id that changes only when the start time does", () => {
    const first = buildReminder(beachDay, asha, noon)!;
    const same = buildReminder({ ...beachDay, name: "Renamed" }, asha, noon)!;
    const later = buildReminder(moved, asha, noon)!;

    expect(same.id).toBe(first.id);
    expect(later.id).not.toBe(first.id);
    expect(first.id).toBe(
      reminderJobId("beach-day", asha.registrationId, beachDay.startTime),
    );
  });

  it("is not queued when the reminder time has already passed", () => {
    // Joined 6 hours before the start: the day-before moment is gone.
    const lateJoiner = new Date(beachDay.startTime.getTime() - 6 * 3600_000);

    expect(buildReminder(beachDay, asha, lateJoiner)).toBeNull();
  });

  it("is not queued when it would go out within a minute", () => {
    const almost = new Date(
      beachDay.startTime.getTime() - REMINDER_LEAD_MS - 30_000,
    );

    expect(buildReminder(beachDay, asha, almost)).toBeNull();
  });

  it("is queued when it is a few minutes away", () => {
    const soon = new Date(
      beachDay.startTime.getTime() - REMINDER_LEAD_MS - 5 * 60_000,
    );

    expect(buildReminder(beachDay, asha, soon)).not.toBeNull();
  });

  it("leaves out the name when the person has none", () => {
    const job = buildReminder(beachDay, { ...asha, name: "  " }, noon)!;

    expect("name" in job).toBe(false);
  });

  it("never carries more than the email needs", () => {
    const keys = Object.keys(buildReminder(beachDay, asha, noon)!.event).sort();

    expect(keys).toEqual([
      "mode",
      "name",
      "place",
      "startTime",
      "timezone",
      "uid",
    ]);
  });
});

describe("placeOf", () => {
  it("joins the address parts of an in-person event", () => {
    expect(placeOf(beachDay)).toBe("Juhu Beach, Mumbai, Maharashtra, India");
  });

  it("names the platform of an online event", () => {
    expect(placeOf({ ...beachDay, mode: "Online", platform: "Zoom" })).toBe(
      "Online (Zoom)",
    );
    expect(placeOf({ ...beachDay, mode: "Online", platform: undefined })).toBe(
      "Online",
    );
  });

  it("describes both for a hybrid event", () => {
    expect(placeOf({ ...beachDay, mode: "Hybrid", platform: "Zoom" })).toBe(
      "Juhu Beach, Mumbai, Maharashtra, India, and Online (Zoom)",
    );
  });

  it("is empty when there is nothing to say", () => {
    expect(
      placeOf({
        ...beachDay,
        city: undefined,
        state: undefined,
        country: undefined,
        address: undefined,
      }),
    ).toBe("");
  });
});

describe("diffEvent", () => {
  it("finds nothing when nothing an attendee cares about changed", () => {
    expect(
      diffEvent(beachDay, { ...beachDay, name: "A new name", timezone: "UTC" }),
    ).toEqual([]);
  });

  it("finds a moved start and end", () => {
    const fields = diffEvent(beachDay, moved).map((c) => c.field);

    expect(fields).toEqual(["start", "end", "place"]);
  });

  it("finds a changed format, place and meeting link", () => {
    const online: EventFacts = {
      ...beachDay,
      mode: "Online",
      platform: "Zoom",
      platformLink: "https://zoom.example/1",
    };

    expect(diffEvent(beachDay, online).map((c) => c.field)).toEqual([
      "mode",
      "place",
      "link",
    ]);
  });

  it("treats an unchanged time as unchanged even for a new Date object", () => {
    expect(
      diffEvent(beachDay, {
        ...beachDay,
        startTime: new Date(beachDay.startTime),
      }),
    ).toEqual([]);
  });
});

describe("reminderIsStale", () => {
  it("is true when a name or zone changed, even though nobody is emailed about it", () => {
    expect(reminderIsStale(beachDay, { ...beachDay, name: "Renamed" })).toBe(
      true,
    );
    expect(reminderIsStale(beachDay, { ...beachDay, timezone: "UTC" })).toBe(
      true,
    );
  });

  it("is false for an edit that touched nothing a reminder says", () => {
    expect(reminderIsStale(beachDay, { ...beachDay })).toBe(false);
  });
});

describe("job ids", () => {
  it("keep one email of each kind per person", () => {
    expect(cancelledJobId("beach-day", "r1")).toBe("cancelled:beach-day:r1");
    expect(changedJobId("beach-day", "r1", noon)).toBe(
      `changed:beach-day:r1:${noon.getTime()}`,
    );
  });

  it("let two separate edits each send a notice", () => {
    const later = new Date(noon.getTime() + 1000);

    expect(changedJobId("beach-day", "r1", later)).not.toBe(
      changedJobId("beach-day", "r1", noon),
    );
  });
});
