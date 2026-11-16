import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { buildEventChanges } from "./buildEventChanges";
import { eventToFormState } from "./eventToFormState";
import type { ApiEvent, EventFormState } from "@features/events/types";

const offline: ApiEvent = {
  _id: "1",
  uid: "beach-cleanup",
  name: "Beach clean-up drive",
  description: "Join us to clean the beach and sort the waste together",
  hostUsername: "seaside",
  hostName: "Seaside Trust",
  organizerHandle: "seaside",
  coverImage: "data:image/png;base64,AAAA",
  mode: "Offline",
  address: "Juhu Beach, gate 2",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  startDate: "2030-05-01T00:00:00.000Z",
  endDate: "2030-05-01T00:00:00.000Z",
  startTime: "2030-05-01T09:30:20.000Z",
  endTime: "2030-05-01T12:00:00.000Z",
  isGovernmentSponsored: false,
  inviteOnly: false,
};

const online: ApiEvent = {
  ...offline,
  mode: "Online",
  address: undefined,
  city: undefined,
  state: undefined,
  country: undefined,
  platform: "Zoom Meeting",
  platformLink: "https://zoom.example.com/j/1",
};

const edit = (
  event: ApiEvent,
  changes: Partial<EventFormState>,
): EventFormState => ({ ...eventToFormState(event), ...changes });

describe("buildEventChanges", () => {
  it("sends nothing when the form still matches the stored event", () => {
    expect(buildEventChanges(eventToFormState(offline), offline)).toEqual({});
    expect(buildEventChanges(eventToFormState(online), online)).toEqual({});
  });

  it("sends only the text fields that changed", () => {
    const changes = buildEventChanges(
      edit(offline, { name: "Beach clean-up drive 2", inviteOnly: true }),
      offline,
    );

    expect(changes).toEqual({
      name: "Beach clean-up drive 2",
      inviteOnly: true,
    });
  });

  it("leaves the cover image out unless a new one was chosen", () => {
    expect(
      buildEventChanges(
        edit(offline, { name: "Renamed clean-up drive" }),
        offline,
      ),
    ).not.toHaveProperty("coverImage");

    expect(
      buildEventChanges(
        edit(offline, { coverImage: "https://example.com/new.png" }),
        offline,
      ),
    ).toEqual({ coverImage: "https://example.com/new.png" });
  });

  it("does not re-send a start time that only differs by stored seconds", () => {
    // The stored start has :20 seconds; the form always works in whole minutes.
    const changes = buildEventChanges(eventToFormState(offline), offline);

    expect(changes).not.toHaveProperty("startTime");
    expect(changes).not.toHaveProperty("startDate");
  });

  it("sends a moved start with its date, and a moved end with its date", () => {
    const form = eventToFormState(offline);
    const changes = buildEventChanges(
      {
        ...form,
        startTime: dayjs(offline.startTime).add(1, "hour"),
        endTime: dayjs(offline.endTime).add(1, "hour"),
      },
      offline,
    );

    expect(changes.startTime).toBeInstanceOf(Date);
    expect(changes.startDate).toBeInstanceOf(Date);
    expect(changes.endTime).toBeInstanceOf(Date);
    expect(changes.endDate).toBeInstanceOf(Date);
  });

  it("sends the whole location group when one in-person field changes", () => {
    const changes = buildEventChanges(edit(offline, { city: "Pune" }), offline);

    expect(changes).toEqual({
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      address: "Juhu Beach, gate 2",
    });
  });

  it("sends the whole online group when the link changes", () => {
    const changes = buildEventChanges(
      edit(online, { platformLink: "https://zoom.example.com/j/2" }),
      online,
    );

    expect(changes).toEqual({
      platform: "Zoom Meeting",
      platformLink: "https://zoom.example.com/j/2",
    });
  });

  it("sends the mode and the new mode's fields when the mode changes", () => {
    const changes = buildEventChanges(
      edit(offline, {
        mode: "Online",
        platform: "Google Meet",
        platformLink: "https://meet.example.com/abc",
      }),
      offline,
    );

    expect(changes).toEqual({
      mode: "Online",
      platform: "Google Meet",
      platformLink: "https://meet.example.com/abc",
    });
  });
});

describe("buildEventChanges capacity", () => {
  it("sends nothing while the capacity is untouched", () => {
    const capped = { ...offline, capacity: 20 };
    expect(buildEventChanges(eventToFormState(capped), capped)).toEqual({});
  });

  it("sends the new number as a number", () => {
    expect(
      buildEventChanges(edit(offline, { capacity: "50" }), offline),
    ).toEqual({ capacity: 50 });
    const capped = { ...offline, capacity: 20 };
    expect(buildEventChanges(edit(capped, { capacity: "25" }), capped)).toEqual(
      { capacity: 25 },
    );
  });

  it("sends null to remove an existing limit, since leaving the key out means unchanged", () => {
    const capped = { ...offline, capacity: 20 };
    expect(buildEventChanges(edit(capped, { capacity: "" }), capped)).toEqual({
      capacity: null,
    });
    expect(
      buildEventChanges(edit(capped, { capacity: "   " }), capped),
    ).toEqual({ capacity: null });
  });
});
