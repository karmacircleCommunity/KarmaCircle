import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { buildCreatePayload, buildEventChanges } from "./buildEventChanges";
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
  timezone: "UTC",
  address: "Juhu Beach, gate 2",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  startDate: "2030-05-01T00:00:00.000Z",
  endDate: "2030-05-01T00:00:00.000Z",
  startTime: "2030-05-01T09:30:20.000Z",
  endTime: "2030-05-01T12:00:00.000Z",
  isGovernmentSponsored: false,
  access: "open",
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
      edit(offline, { name: "Beach clean-up drive 2", access: "approval" }),
      offline,
    );

    expect(changes).toEqual({
      name: "Beach clean-up drive 2",
      access: "approval",
    });
  });

  it("sends the waitlist switch only when it differs from the stored one", () => {
    // An event with no stored `waitlistEnabled` reads as on.
    expect(
      buildEventChanges(edit(offline, { waitlistEnabled: true }), offline),
    ).toEqual({});
    expect(
      buildEventChanges(edit(offline, { waitlistEnabled: false }), offline),
    ).toEqual({ waitlistEnabled: false });
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

describe("buildEventChanges hybrid", () => {
  const hybrid: ApiEvent = {
    ...offline,
    mode: "Hybrid",
    platform: "Zoom Meeting",
    platformLink: "https://zoom.example.com/j/1",
  };

  it("sends nothing while a hybrid event is untouched", () => {
    expect(buildEventChanges(eventToFormState(hybrid), hybrid)).toEqual({});
  });

  it("sends both location groups when one field of a hybrid event changes", () => {
    expect(buildEventChanges(edit(hybrid, { city: "Pune" }), hybrid)).toEqual({
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      address: "Juhu Beach, gate 2",
      platform: "Zoom Meeting",
      platformLink: "https://zoom.example.com/j/1",
    });
  });

  it("sends the mode and both groups when an in-person event becomes hybrid", () => {
    expect(
      buildEventChanges(
        edit(offline, {
          mode: "Hybrid",
          platform: "Google Meet",
          platformLink: "https://meet.example.com/abc",
        }),
        offline,
      ),
    ).toEqual({
      mode: "Hybrid",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      address: "Juhu Beach, gate 2",
      platform: "Google Meet",
      platformLink: "https://meet.example.com/abc",
    });
  });
});

describe("buildEventChanges kind and tags", () => {
  const typed: ApiEvent = {
    ...offline,
    eventType: "workshop",
    tags: ["first-aid", "families"],
  };

  it("sends nothing while they are untouched", () => {
    expect(buildEventChanges(eventToFormState(typed), typed)).toEqual({});
    expect(buildEventChanges(eventToFormState(offline), offline)).toEqual({});
  });

  it("sends a changed kind", () => {
    expect(
      buildEventChanges(edit(typed, { eventType: "fundraiser" }), typed),
    ).toEqual({ eventType: "fundraiser" });
  });

  it("sends a kind for an event that had none", () => {
    expect(
      buildEventChanges(edit(offline, { eventType: "meetup" }), offline),
    ).toEqual({ eventType: "meetup" });
  });

  it("never sends an empty kind (the form requires one)", () => {
    expect(buildEventChanges(edit(typed, { eventType: "" }), typed)).toEqual(
      {},
    );
  });

  it("sends the tags as a normalized list, [] to clear them", () => {
    expect(
      buildEventChanges(edit(typed, { tags: "Gala, dinner, GALA" }), typed),
    ).toEqual({ tags: ["gala", "dinner"] });
    expect(buildEventChanges(edit(typed, { tags: "" }), typed)).toEqual({
      tags: [],
    });
  });

  it("does not call a tag list changed just for its spacing or case", () => {
    expect(
      buildEventChanges(edit(typed, { tags: " First-Aid ,Families" }), typed),
    ).toEqual({});
  });
});

describe("buildEventChanges timezone", () => {
  const zoned: ApiEvent = {
    ...offline,
    timezone: "Asia/Kolkata",
    startTime: "2030-05-01T04:30:00.000Z",
    endTime: "2030-05-01T07:00:00.000Z",
  };

  it("sends nothing while a zoned event is untouched", () => {
    expect(buildEventChanges(eventToFormState(zoned), zoned)).toEqual({});
  });

  it("moves the real start and end when only the timezone changes (same wall clock, other clock)", () => {
    const changes = buildEventChanges(
      edit(zoned, { timezone: "Asia/Tokyo" }),
      zoned,
    );

    expect(changes.timezone).toBe("Asia/Tokyo");
    // 10:00 in Tokyo is 01:00 UTC, not 04:30.
    expect((changes.startTime as Date).toISOString()).toBe(
      "2030-05-01T01:00:00.000Z",
    );
    expect((changes.endTime as Date).toISOString()).toBe(
      "2030-05-01T03:30:00.000Z",
    );
  });

  it("keeps the real moment when the wall clock is changed along with the zone", () => {
    // 10:00 Kolkata == 13:30 Tokyo, so picking Tokyo and 13:30 changes nothing real.
    const form = edit(zoned, {
      timezone: "Asia/Tokyo",
      startTime: dayjs("2000-01-01T13:30"),
      endTime: dayjs("2000-01-01T16:00"),
    });
    const changes = buildEventChanges(form, zoned);

    expect(changes).toEqual({ timezone: "Asia/Tokyo" });
  });

  it("sends a moved start as the instant in the event's zone", () => {
    const changes = buildEventChanges(
      edit(zoned, { startTime: dayjs("2000-01-01T11:00") }),
      zoned,
    );
    expect((changes.startTime as Date).toISOString()).toBe(
      "2030-05-01T05:30:00.000Z",
    );
    expect(changes).not.toHaveProperty("timezone");
  });

  it("does not pin a timezone onto an older event unless something else is saved", () => {
    const legacy: ApiEvent = { ...offline, timezone: undefined };
    expect(buildEventChanges(eventToFormState(legacy), legacy)).toEqual({});

    const renamed = buildEventChanges(
      edit(legacy, { name: "Renamed clean-up drive" }),
      legacy,
    );
    expect(renamed).toEqual({
      name: "Renamed clean-up drive",
      timezone: "UTC",
    });
  });
});

/** A draft saved with nothing but its name, format and dates. */
const bareDraft: ApiEvent = {
  _id: "2",
  uid: "bare-draft",
  name: "Beach clean-up drive",
  hostUsername: "seaside",
  hostName: "Seaside Trust",
  mode: "Offline",
  timezone: "UTC",
  startDate: "2030-05-01T00:00:00.000Z",
  endDate: "2030-05-01T00:00:00.000Z",
  startTime: "2030-05-01T09:30:00.000Z",
  endTime: "2030-05-01T12:00:00.000Z",
  isGovernmentSponsored: false,
  access: "open",
  status: "draft",
};

describe("buildEventChanges for drafts", () => {
  it("sees no change in a draft that is missing almost everything", () => {
    expect(buildEventChanges(eventToFormState(bareDraft), bareDraft)).toEqual(
      {},
    );
  });

  it("sends only the venue fields that have been filled in", () => {
    expect(
      buildEventChanges(edit(bareDraft, { city: "Pune" }), bareDraft),
    ).toEqual({ city: "Pune" });
  });

  it("sends a description that is still short", () => {
    expect(
      buildEventChanges(edit(bareDraft, { description: "Soon" }), bareDraft),
    ).toEqual({ description: "Soon" });
  });

  it("treats a box of spaces as empty", () => {
    expect(
      buildEventChanges(
        edit(bareDraft, { description: "   ", city: "  " }),
        bareDraft,
      ),
    ).toEqual({});
  });

  it("sends null to clear a description or a venue field that was saved", () => {
    const saved: ApiEvent = {
      ...bareDraft,
      description: "Half written",
      city: "Pune",
    };
    expect(
      buildEventChanges(edit(saved, { description: "", city: "" }), saved),
    ).toEqual({ description: null, city: null });
  });

  it("leaves an empty meeting link out when a draft changes format", () => {
    expect(
      buildEventChanges(
        edit(bareDraft, { mode: "Online", platform: "Google Meet" }),
        bareDraft,
      ),
    ).toEqual({ mode: "Online", platform: "Google Meet" });
  });
});

describe("buildCreatePayload", () => {
  /** The create form with only a name and dates typed. */
  const bare: EventFormState = {
    ...eventToFormState(bareDraft),
    country: "India",
  };

  it("sends a draft with only what is there: no empty strings", () => {
    const body = buildCreatePayload(bare, "draft");

    expect(JSON.parse(JSON.stringify(body))).toEqual({
      name: "Beach clean-up drive",
      uid: "bare-draft",
      mode: "Offline",
      timezone: "UTC",
      access: "open",
      waitlistEnabled: true,
      country: "India",
      tags: [],
      status: "draft",
      startDate: "2030-05-01T00:00:00.000Z",
      endDate: "2030-05-01T00:00:00.000Z",
      startTime: "2030-05-01T09:30:00.000Z",
      endTime: "2030-05-01T12:00:00.000Z",
    });
  });

  it("drops fields holding only spaces", () => {
    const body = buildCreatePayload(
      { ...bare, description: "   ", city: " ", capacity: "  " },
      "draft",
    );
    expect(body).not.toHaveProperty("description");
    expect(body).not.toHaveProperty("city");
    expect(body).not.toHaveProperty("capacity");
  });

  it("sends only the chosen format's venue or joining fields", () => {
    const filled: EventFormState = {
      ...bare,
      city: "Pune",
      state: "Maharashtra",
      address: "Gate 2",
      platform: "Google Meet",
      platformLink: "https://meet.example.com/abc",
    };

    const offlineBody = buildCreatePayload(filled, "publish");
    expect(offlineBody).toMatchObject({ city: "Pune", address: "Gate 2" });
    expect(offlineBody).not.toHaveProperty("platform");
    expect(offlineBody).not.toHaveProperty("platformLink");

    const onlineBody = buildCreatePayload(
      { ...filled, mode: "Online" },
      "publish",
    );
    expect(onlineBody).toMatchObject({
      platform: "Google Meet",
      platformLink: "https://meet.example.com/abc",
    });
    for (const field of ["address", "city", "state", "country"]) {
      expect(onlineBody).not.toHaveProperty(field);
    }
  });

  it("sends a published event without a status, with typed numbers and lists", () => {
    const body = buildCreatePayload(
      {
        ...bare,
        description: "Join us to clean the beach together",
        coverImage: "https://example.com/c.png",
        eventType: "volunteering",
        tags: "Beach, families",
        capacity: "25",
        contactEmail: "hello@example.com",
      },
      "publish",
    );

    expect(body).not.toHaveProperty("status");
    expect(body).toMatchObject({
      description: "Join us to clean the beach together",
      coverImage: "https://example.com/c.png",
      eventType: "volunteering",
      tags: ["beach", "families"],
      capacity: 25,
      contactEmail: "hello@example.com",
    });
    // Form-only boxes never travel as typed.
    expect(body).not.toHaveProperty("costAmount");
    expect(body).not.toHaveProperty("about");
  });

  it("turns the wall clock into instants in the event's timezone", () => {
    const body = buildCreatePayload(
      { ...bare, timezone: "Asia/Kolkata" },
      "draft",
    );
    expect((body.startTime as Date).toISOString()).toBe(
      "2030-05-01T04:00:00.000Z",
    );
    expect((body.startDate as Date).toISOString()).toBe(
      "2030-04-30T18:30:00.000Z",
    );
  });
});
