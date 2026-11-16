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

  it("reads the start and end instants into the date and time fields", () => {
    const form = eventToFormState(stored);

    expect(form.startTime?.toISOString()).toBe(stored.startTime);
    expect(form.endTime?.toISOString()).toBe(stored.endTime);
    expect(form.startDate?.isSame(form.startTime, "day")).toBe(true);
    expect(form.endDate?.isSame(form.endTime, "day")).toBe(true);
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
