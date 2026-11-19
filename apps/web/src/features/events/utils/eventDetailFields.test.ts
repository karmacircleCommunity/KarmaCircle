import { describe, expect, it } from "vitest";
import {
  DETAIL_FORM_KEYS,
  detailChanges,
  detailFieldsFromEvent,
  detailPayloadForCreate,
  emptyDetailFields,
  normalizeDetails,
  normalizedDetailsFromEvent,
  omitDetailFields,
  validateDetails,
} from "./eventDetailFields";
import { eventToFormState } from "./eventToFormState";
import type {
  ApiEvent,
  EventDetailFormFields,
  EventFormState,
} from "@features/events/types";

const base: ApiEvent = {
  _id: "1",
  uid: "beach-cleanup",
  name: "Beach clean-up drive",
  description: "Join us to clean the beach and sort the waste together",
  hostUsername: "seaside",
  hostName: "Seaside Trust",
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
  access: "open",
};

const rich: ApiEvent = {
  ...base,
  about: ["We meet at the gate.", "Gloves are provided."],
  contactEmail: "volunteer@riverbend.example",
  cost: { amount: 250, currency: "INR", note: "Snacks and gloves" },
  bringAlong: ["Water bottle", "Sun hat"],
  languages: ["English", "Hindi"],
  minimumAge: 12,
  agenda: [
    { time: "9:00 am", title: "Welcome", detail: "Briefing" },
    { time: "10:00 am", title: "Clean-up" },
  ],
  gettingThere: "Take the road behind the temple.",
};

const fields = (
  changes: Partial<EventDetailFormFields>,
): EventDetailFormFields => ({
  ...emptyDetailFields(),
  ...changes,
});

describe("normalizeDetails", () => {
  it("turns an empty form into nothing at all", () => {
    expect(normalizeDetails(emptyDetailFields(), "Offline")).toEqual({
      about: [],
      contactEmail: null,
      cost: null,
      bringAlong: [],
      languages: [],
      minimumAge: null,
      agenda: [],
      gettingThere: null,
      linkDelivery: null,
      joinRequirements: null,
    });
  });

  it("splits the write-up on blank lines, lists on lines, and languages on commas", () => {
    const result = normalizeDetails(
      fields({
        about: "First paragraph.\nStill the first.\n\n  \n\nSecond paragraph.",
        bringAlong: "  Water bottle \n\nSun hat\r\nGloves",
        languages: "English, Hindi ,\n Marathi,,",
      }),
      "Offline",
    );

    expect(result.about).toEqual([
      "First paragraph.\nStill the first.",
      "Second paragraph.",
    ]);
    expect(result.bringAlong).toEqual(["Water bottle", "Sun hat", "Gloves"]);
    expect(result.languages).toEqual(["English", "Hindi", "Marathi"]);
  });

  it("builds a cost only when there is a fee, upper-cases the currency and drops an empty note", () => {
    expect(
      normalizeDetails(
        fields({ costAmount: "250", costCurrency: "inr" }),
        "Offline",
      ).cost,
    ).toEqual({ amount: 250, currency: "INR" });
    expect(
      normalizeDetails(
        fields({
          costAmount: "99.5",
          costCurrency: "USD",
          costNote: " Lunch ",
        }),
        "Offline",
      ).cost,
    ).toEqual({ amount: 99.5, currency: "USD", note: "Lunch" });
    expect(
      normalizeDetails(fields({ costAmount: "  " }), "Offline").cost,
    ).toBeNull();
  });

  it("drops blank agenda rows and trims the rest", () => {
    const result = normalizeDetails(
      fields({
        agenda: [
          { time: " 9:00 am ", title: " Welcome ", detail: " " },
          { time: "", title: "", detail: "" },
          { time: "10:00 am", title: "Clean-up", detail: "Gloves on" },
        ],
      }),
      "Offline",
    );

    expect(result.agenda).toEqual([
      { time: "9:00 am", title: "Welcome" },
      { time: "10:00 am", title: "Clean-up", detail: "Gloves on" },
    ]);
  });

  it("keeps only the chosen mode's notes", () => {
    const all = fields({
      gettingThere: "Use the north gate",
      linkDelivery: "Emailed the day before",
      joinRequirements: "A camera",
    });

    expect(normalizeDetails(all, "Offline")).toMatchObject({
      gettingThere: "Use the north gate",
      linkDelivery: null,
      joinRequirements: null,
    });
    expect(normalizeDetails(all, "Online")).toMatchObject({
      gettingThere: null,
      linkDelivery: "Emailed the day before",
      joinRequirements: "A camera",
    });
  });
});

describe("detailFieldsFromEvent", () => {
  it("round-trips a stored event with no spurious change", () => {
    expect(detailChanges(eventToFormState(rich), rich)).toEqual({});
    expect(detailChanges(eventToFormState(base), base)).toEqual({});
    expect(normalizeDetails(detailFieldsFromEvent(rich), "Offline")).toEqual(
      normalizedDetailsFromEvent(rich),
    );
  });

  it("reads a stored event into plain form text", () => {
    expect(detailFieldsFromEvent(rich)).toMatchObject({
      about: "We meet at the gate.\n\nGloves are provided.",
      costAmount: "250",
      costCurrency: "INR",
      costNote: "Snacks and gloves",
      bringAlong: "Water bottle\nSun hat",
      languages: "English, Hindi",
      minimumAge: "12",
    });
    expect(detailFieldsFromEvent(rich).agenda).toEqual([
      { time: "9:00 am", title: "Welcome", detail: "Briefing" },
      { time: "10:00 am", title: "Clean-up", detail: "" },
    ]);
  });
});

describe("detailChanges", () => {
  const form = (changes: Partial<EventFormState>): EventFormState => ({
    ...eventToFormState(rich),
    ...changes,
  });

  it("sends only the details that changed", () => {
    expect(
      detailChanges(form({ contactEmail: "new@riverbend.example" }), rich),
    ).toEqual({ contactEmail: "new@riverbend.example" });
  });

  it("sends null to clear a scalar or the cost, and [] to clear a list", () => {
    expect(
      detailChanges(
        form({
          contactEmail: "",
          costAmount: "",
          minimumAge: "",
          gettingThere: "",
          about: "",
          bringAlong: "",
          languages: "",
          agenda: [],
        }),
        rich,
      ),
    ).toEqual({
      contactEmail: null,
      cost: null,
      minimumAge: null,
      gettingThere: null,
      about: [],
      bringAlong: [],
      languages: [],
      agenda: [],
    });
  });

  it("sends a whole new cost when any part of it changes", () => {
    expect(detailChanges(form({ costAmount: "300" }), rich)).toEqual({
      cost: { amount: 300, currency: "INR", note: "Snacks and gloves" },
    });
  });

  it("clears the other mode's notes when the mode switches", () => {
    const online = form({ mode: "Online" });
    expect(detailChanges(online, rich)).toEqual({ gettingThere: null });
  });
});

describe("detailPayloadForCreate", () => {
  it("sends nothing for a basic event", () => {
    expect(detailPayloadForCreate({ ...eventToFormState(base) })).toEqual({});
  });

  it("sends only the filled-in details", () => {
    const payload = detailPayloadForCreate({
      ...eventToFormState(base),
      contactEmail: "hello@example.com",
      costAmount: "100",
      costCurrency: "INR",
      languages: "English",
    });
    expect(payload).toEqual({
      contactEmail: "hello@example.com",
      cost: { amount: 100, currency: "INR" },
      languages: ["English"],
    });
  });
});

describe("omitDetailFields", () => {
  it("removes every detail key so the form text is never posted as-is", () => {
    const result = omitDetailFields({
      ...eventToFormState(rich),
    });
    for (const key of DETAIL_FORM_KEYS) expect(result).not.toHaveProperty(key);
    expect(result).toHaveProperty("name", "Beach clean-up drive");
    expect(result).toHaveProperty("capacity");
  });
});

describe("validateDetails", () => {
  it("accepts an empty form and a complete one", () => {
    expect(validateDetails(emptyDetailFields(), "Offline")).toEqual({});
    expect(validateDetails(detailFieldsFromEvent(rich), "Offline")).toEqual({});
  });

  it.each<[keyof EventDetailFormFields, Partial<EventDetailFormFields>]>([
    ["contactEmail", { contactEmail: "nope" }],
    ["costAmount", { costAmount: "0" }],
    ["costAmount", { costAmount: "-4" }],
    ["costAmount", { costAmount: "abc" }],
    ["costAmount", { costAmount: "10000001" }],
    ["costCurrency", { costAmount: "5", costCurrency: "rupees" }],
    ["costNote", { costNote: "x".repeat(201) }],
    ["minimumAge", { minimumAge: "0" }],
    ["minimumAge", { minimumAge: "121" }],
    ["minimumAge", { minimumAge: "12.5" }],
    [
      "bringAlong",
      {
        bringAlong: Array.from({ length: 21 }, (_, i) => `item ${i}`).join(
          "\n",
        ),
      },
    ],
    ["bringAlong", { bringAlong: "x".repeat(101) }],
    [
      "languages",
      { languages: Array.from({ length: 11 }, (_, i) => `l${i}`).join(",") },
    ],
    [
      "about",
      { about: Array.from({ length: 21 }, (_, i) => `p${i}`).join("\n\n") },
    ],
    ["about", { about: "x".repeat(4001) }],
    ["agenda", { agenda: [{ time: "", title: "No time", detail: "" }] }],
    ["agenda", { agenda: [{ time: "9 am", title: "", detail: "" }] }],
    [
      "agenda",
      { agenda: [{ time: "9 am", title: "x".repeat(101), detail: "" }] },
    ],
  ])("flags an invalid %s (case %#)", (key, change) => {
    const errors = validateDetails(fields(change), "Offline");
    expect(errors[key]).toBeTruthy();
  });

  it("ignores an empty agenda row but flags a half-filled one", () => {
    expect(
      validateDetails(
        fields({ agenda: [{ time: "", title: "", detail: "" }] }),
        "Offline",
      ),
    ).toEqual({});
    expect(
      validateDetails(
        fields({ agenda: [{ time: "", title: "", detail: "just a detail" }] }),
        "Offline",
      ).agenda,
    ).toBeTruthy();
  });

  it("only checks the mode's own notes", () => {
    const tooLong = "x".repeat(501);
    expect(
      validateDetails(fields({ gettingThere: tooLong }), "Online"),
    ).toEqual({});
    expect(
      validateDetails(fields({ gettingThere: tooLong }), "Offline")
        .gettingThere,
    ).toBeTruthy();
    expect(
      validateDetails(fields({ linkDelivery: "x".repeat(301) }), "Offline"),
    ).toEqual({});
    expect(
      validateDetails(fields({ linkDelivery: "x".repeat(301) }), "Online")
        .linkDelivery,
    ).toBeTruthy();
  });
});

describe("hybrid events keep both modes' notes", () => {
  const all = fields({
    gettingThere: "Use the north gate",
    linkDelivery: "Emailed the day before",
    joinRequirements: "A camera",
  });

  it("normalizes directions and link notes together", () => {
    expect(normalizeDetails(all, "Hybrid")).toMatchObject({
      gettingThere: "Use the north gate",
      linkDelivery: "Emailed the day before",
      joinRequirements: "A camera",
    });
  });

  it("checks both sets of notes for length", () => {
    const errors = validateDetails(
      fields({
        gettingThere: "x".repeat(501),
        linkDelivery: "x".repeat(301),
      }),
      "Hybrid",
    );
    expect(errors.gettingThere).toBeTruthy();
    expect(errors.linkDelivery).toBeTruthy();
  });
});
