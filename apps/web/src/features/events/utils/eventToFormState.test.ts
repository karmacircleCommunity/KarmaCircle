import { describe, expect, it } from "vitest";
import { eventToFormState } from "./eventToFormState";
import type { ApiEvent } from "@features/events/types";

const stored: ApiEvent = {
  _id: "1",
  uid: "beach-cleanup",
  name: "Beach clean-up drive",
  description: "Join us to clean the beach and sort the waste together",
  hostUsername: "seaside",
  hostName: "Seaside Trust",
  organizerHandle: "seaside",
  coverImage: "https://example.com/cover.png",
  mode: "Offline",
  address: "Juhu Beach, gate 2",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  startDate: "2030-05-01T00:00:00.000Z",
  endDate: "2030-05-01T00:00:00.000Z",
  startTime: "2030-05-01T09:30:00.000Z",
  endTime: "2030-05-01T12:00:00.000Z",
  isGovernmentSponsored: false,
  inviteOnly: true,
};

describe("eventToFormState", () => {
  it("copies the editable fields and keeps the page address", () => {
    const form = eventToFormState(stored);

    expect(form).toMatchObject({
      uid: "beach-cleanup",
      name: "Beach clean-up drive",
      description: stored.description,
      coverImage: "https://example.com/cover.png",
      mode: "Offline",
      address: "Juhu Beach, gate 2",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      inviteOnly: true,
    });
  });

  it("reads the start and end into the date and time fields, as wall-clock digits", () => {
    const form = eventToFormState(stored);

    // `stored` has no timezone, so the pickers read it in the browser's (UTC here).
    expect(form.startDate?.format("YYYY-MM-DD")).toBe("2030-05-01");
    expect(form.startTime?.format("HH:mm")).toBe("09:30");
    expect(form.endDate?.format("YYYY-MM-DD")).toBe("2030-05-01");
    expect(form.endTime?.format("HH:mm")).toBe("12:00");
  });

  it("falls back to the form defaults for fields the mode does not use", () => {
    const form = eventToFormState({
      ...stored,
      mode: "Online",
      address: undefined,
      city: undefined,
      state: undefined,
      country: undefined,
      platform: undefined,
      platformLink: undefined,
      coverImage: undefined,
    });

    expect(form).toMatchObject({
      address: "",
      city: "",
      state: "",
      country: "India",
      platform: "Zoom Meeting",
      platformLink: "",
      coverImage: "",
    });
  });
});

describe("eventToFormState capacity", () => {
  it("is empty for no limit and the typed number otherwise", () => {
    expect(eventToFormState(stored).capacity).toBe("");
    expect(eventToFormState({ ...stored, capacity: 40 }).capacity).toBe("40");
  });
});

describe("eventToFormState timezone", () => {
  it("reads the times as the wall clock in the event's own zone", () => {
    // 04:30 UTC is 10:00 in Kolkata.
    const form = eventToFormState({
      ...stored,
      timezone: "Asia/Kolkata",
      startTime: "2030-05-01T04:30:00.000Z",
      endTime: "2030-05-01T07:00:00.000Z",
    });

    expect(form.timezone).toBe("Asia/Kolkata");
    expect(form.startDate?.format("YYYY-MM-DD")).toBe("2030-05-01");
    expect(form.startTime?.format("HH:mm")).toBe("10:00");
    expect(form.endTime?.format("HH:mm")).toBe("12:30");
  });

  it("can land on a different calendar day than UTC", () => {
    const form = eventToFormState({
      ...stored,
      timezone: "Asia/Tokyo",
      startTime: "2030-04-30T20:00:00.000Z",
      endTime: "2030-04-30T22:00:00.000Z",
    });
    expect(form.startDate?.format("YYYY-MM-DD")).toBe("2030-05-01");
    expect(form.startTime?.format("HH:mm")).toBe("05:00");
  });

  it("falls back to the browser's zone for an older event, or a bogus stored one", () => {
    expect(eventToFormState(stored).timezone).toBe("UTC");
    expect(
      eventToFormState({ ...stored, timezone: "Mars/Base" }).timezone,
    ).toBe("UTC");
  });
});
