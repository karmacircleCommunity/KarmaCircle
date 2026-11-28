import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  formErrorsFromApi,
  formFieldForApiPath,
  onlyKindStopsPublish,
  validateEventForm,
} from "./validateEvent";
import { eventToFormState } from "./eventToFormState";
import type { ApiEvent, EventFormState } from "@features/events/types";

/** A draft saved with nothing but its name, format and dates. */
const bareDraft: ApiEvent = {
  _id: "1",
  uid: "beach-cleanup",
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

const complete: ApiEvent = {
  ...bareDraft,
  status: "published",
  description: "Join us to clean the beach and sort the waste together",
  coverImage: "https://example.com/cover.png",
  eventType: "volunteering",
  address: "Juhu Beach, gate 2",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
};

const bare = (changes: Partial<EventFormState> = {}): EventFormState => ({
  ...eventToFormState(bareDraft),
  ...changes,
});

const full = (changes: Partial<EventFormState> = {}): EventFormState => ({
  ...eventToFormState(complete),
  ...changes,
});

/** What the create form sends to be checked: no stored event behind it. */
const keys = (errors: object) => Object.keys(errors).sort();

describe("validateEventForm for a draft", () => {
  it.each(["Offline", "Online", "Hybrid"] as const)(
    "needs only the name, address, format and dates (%s)",
    (mode) => {
      expect(validateEventForm(bare({ mode }), "draft")).toEqual({});
    },
  );

  it("still needs the name, the page address and every date and time", () => {
    const errors = validateEventForm(
      bare({
        name: "",
        uid: "",
        startDate: null,
        startTime: null,
        endDate: null,
        endTime: null,
      }),
      "draft",
    );

    expect(keys(errors)).toEqual(
      ["endDate", "endTime", "name", "startDate", "startTime", "uid"].sort(),
    );
    expect(errors.name).toBe("Name is required");
  });

  it("holds the name to its length", () => {
    for (const name of ["Short", "x".repeat(81), "          "]) {
      expect(validateEventForm(bare({ name }), "draft").name).toBeTruthy();
    }
  });

  it("refuses a bad or reserved page address on a new event", () => {
    expect(validateEventForm(bare({ uid: "Bad Address" }), "draft").uid).toBe(
      "Use lowercase letters, numbers, and single hyphens only",
    );
    expect(validateEventForm(bare({ uid: "mine" }), "draft").uid).toMatch(
      /reserved/,
    );
  });

  it("lets a description be shorter than publishing asks, but not too long", () => {
    expect(validateEventForm(bare({ description: "Soon" }), "draft")).toEqual(
      {},
    );
    expect(
      validateEventForm(bare({ description: "x".repeat(201) }), "draft")
        .description,
    ).toBe("Keep the description to 200 characters or fewer");
  });

  it.each<[keyof EventFormState, Partial<EventFormState>]>([
    ["city", { city: "x".repeat(101) }],
    ["state", { state: "x".repeat(101) }],
    ["country", { country: "x".repeat(101) }],
    ["address", { address: "x".repeat(201) }],
    ["platformLink", { mode: "Online", platformLink: "meet.example.com" }],
    ["platformLink", { mode: "Hybrid", platformLink: "ftp://example.com" }],
    [
      "platformLink",
      {
        mode: "Online",
        platformLink: `https://example.com/${"x".repeat(2048)}`,
      },
    ],
    ["capacity", { capacity: "0" }],
    ["capacity", { capacity: "2.5" }],
    ["tags", { tags: "a,b,c,d,e,f,g,h,i" }],
    ["contactEmail", { contactEmail: "nope" }],
    ["costAmount", { costAmount: "0" }],
    ["agenda", { agenda: [{ time: "9 am", title: "", detail: "" }] }],
  ])("refuses a filled-in but invalid %s (case %#)", (field, change) => {
    const errors = validateEventForm(bare(change), "draft");
    expect(keys(errors)).toEqual([field]);
  });

  it("ignores the other format's boxes", () => {
    expect(
      validateEventForm(bare({ platformLink: "not a link" }), "draft"),
    ).toEqual({});
  });

  it("needs the end to follow the start", () => {
    expect(
      validateEventForm(bare({ endTime: dayjs("2000-01-01T09:30") }), "draft")
        .endTime,
    ).toBe("End date and time must follow the start date and time");
  });

  it("needs a new or moved start to be in the future", () => {
    const past = {
      startDate: dayjs("2020-05-01"),
      endDate: dayjs("2020-05-01"),
    };
    expect(validateEventForm(bare(past), "draft").startTime).toBeTruthy();
    expect(
      validateEventForm(bare(past), "draft", bareDraft).startTime,
    ).toBeTruthy();
  });

  it("lets a draft whose start has passed be saved without moving it", () => {
    const stale: ApiEvent = {
      ...bareDraft,
      startTime: "2020-05-01T09:30:00.000Z",
      endTime: "2099-05-01T12:00:00.000Z",
    };
    expect(validateEventForm(eventToFormState(stale), "draft", stale)).toEqual(
      {},
    );
    // Publishing it needs a start that has not passed.
    expect(
      validateEventForm(eventToFormState(stale), "publish", stale).startTime,
    ).toBe("Start date and time must be in the future");
  });
});

describe("validateEventForm for publishing", () => {
  it("accepts a complete event, new or stored", () => {
    expect(validateEventForm(full(), "publish")).toEqual({});
    expect(validateEventForm(full(), "publish", complete)).toEqual({});
  });

  it("asks a bare in-person draft for everything it left out", () => {
    const errors = validateEventForm(bare(), "publish", bareDraft);

    expect(keys(errors)).toEqual(
      [
        "address",
        "city",
        "country",
        "coverImage",
        "description",
        "eventType",
        "state",
      ].sort(),
    );
    expect(errors.description).toBe("Description is required");
    expect(errors.coverImage).toBe("Cover image is required");
    expect(errors.eventType).toBe("Choose what kind of event this is");
  });

  it("asks an online event for a platform and a link instead of a venue", () => {
    const errors = validateEventForm(
      bare({ mode: "Online", platform: "" }),
      "publish",
    );

    expect(errors.platform).toBe("Choose an online platform");
    expect(errors.platformLink).toBe("Please provide a meeting link");
    expect(errors.city).toBeUndefined();
  });

  it("asks a hybrid event for both", () => {
    const errors = validateEventForm(bare({ mode: "Hybrid" }), "publish");

    expect(errors).toHaveProperty("city");
    expect(errors).toHaveProperty("platformLink");
  });

  it("holds the description to its publishing minimum", () => {
    expect(
      validateEventForm(full({ description: "Too short" }), "publish")
        .description,
    ).toBe("Description should be between 20 and 200 characters");
  });

  it("holds a published event to the same rules when it is saved", () => {
    const errors = validateEventForm(
      full({ description: "", city: "" }),
      "publish",
      complete,
    );
    expect(keys(errors)).toEqual(["city", "description"]);
  });

  it("lets a running published event keep its past start", () => {
    const running: ApiEvent = {
      ...complete,
      startTime: "2020-05-01T09:30:00.000Z",
      endTime: "2099-05-01T12:00:00.000Z",
    };
    expect(
      validateEventForm(eventToFormState(running), "publish", running),
    ).toEqual({});
  });
});

describe("onlyKindStopsPublish", () => {
  const noKind: ApiEvent = {
    ...complete,
    status: "draft",
    eventType: undefined,
  };

  it("stops a draft that lacks nothing but its kind", () => {
    expect(onlyKindStopsPublish(noKind)).toBe(true);
  });

  it("leaves a draft with a kind to the API", () => {
    expect(onlyKindStopsPublish({ ...bareDraft, eventType: "meetup" })).toBe(
      false,
    );
    expect(onlyKindStopsPublish({ ...noKind, eventType: "meetup" })).toBe(
      false,
    );
  });

  it.each<[string, Partial<ApiEvent>]>([
    ["a description", { description: undefined }],
    ["a long enough description", { description: "Soon" }],
    ["a cover", { coverImage: undefined }],
    ["the venue", { city: undefined }],
    ["a start still to come", { startTime: "2020-05-01T09:30:00.000Z" }],
  ])("lets the API answer when %s is missing too", (_gap, change) => {
    expect(onlyKindStopsPublish({ ...noKind, ...change })).toBe(false);
  });
});

describe("formFieldForApiPath", () => {
  it.each([
    ["coverImage", "coverImage"],
    ["description", "description"],
    ["city", "city"],
    ["tags.2", "tags"],
    ["about.0", "about"],
    ["agenda.1.title", "agenda"],
    ["cost", "costAmount"],
    ["cost.currency", "costCurrency"],
    ["cost.note", "costNote"],
    ["status", undefined],
    ["", undefined],
  ])("reads %s", (path, field) => {
    expect(formFieldForApiPath(path)).toBe(field);
  });
});

describe("formErrorsFromApi", () => {
  it("keeps the first message for each field the form has", () => {
    expect(
      formErrorsFromApi([
        { path: "description", message: "Add a description" },
        { path: "tags.0", message: "Tag too long" },
        { path: "tags.1", message: "Another tag" },
        { path: "status", message: "Not a box on the form" },
      ]),
    ).toEqual({ description: "Add a description", tags: "Tag too long" });
  });

  it("copes with no list, and with entries that name no field", () => {
    expect(formErrorsFromApi(undefined)).toEqual({});
    expect(
      formErrorsFromApi([
        "Path `name` is required." as unknown as { message: string },
        { message: "No path" },
      ]),
    ).toEqual({});
  });
});
